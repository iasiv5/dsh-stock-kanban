/**
 * CEP v1 宿主侧（docs/interop/capsule-embed-protocol.md；ADR 0002）：
 * 检测 guest（[data-dsh-quota-watch-float] + body MutationObserver）→ 握手
 * （embed-probe / embed-capabilities，500ms 无回复即共存不隐藏）→ engage /
 * 5s heartbeat / disengage 生命周期 → overview 拉取与 quota pill 渲染 →
 * 降级矩阵（缺席/legacy/设置关/合并/宿主消失）。
 * 数据通道：document-relative GET api/dsh-quota-watch/overview（qw 同款拉法，单请求挂
 * pullTimeoutMs 超时，超时/传输错误均保留上次渲染 + 正常节奏续排）；
 * 404 → 藏段 + 慢重试（retryMs）；传输错误 → 保留上次渲染 + 正常节奏（pollMs）。
 * 阈值语义与 guest 逐字对齐（warn >80≤95 / danger >95 / pulse >95，spec §9）；
 * percent 计算是 qw glmRowModel/copilotRowModel 的私有拷贝（GLM=5h 窗口，
 * Copilot=100−remaining），事件 detail 只含 rect/flag/版本（spec §8）。
 */

const NS = "dsh-quota-watch";
const GUEST_SELECTOR = "[data-dsh-quota-watch-float]";
const OVERVIEW_URL = "api/dsh-quota-watch/overview";
const REQUIRED_CAPABILITIES = ["hide-pill", "anchored-panel"];

import { t } from "./i18n.mjs";
import { quotaSegmentModel } from "./quota-segment.mjs";
import { MARGIN, loadGuestFloatPosition, saveFloatPosition } from "./float-prefs.mjs";

function glmPercent(provider) {
  if (provider?.status === "missing" || provider?.status === "error") return undefined;
  const five = (provider?.plan?.windows ?? []).find((w) => w?.key === "5h");
  return typeof five?.percent === "number" && Number.isFinite(five.percent) ? five.percent : undefined;
}

function copilotPercent(provider) {
  if (provider?.status === "missing" || provider?.status === "error") return undefined;
  const quota = provider?.quota;
  if (quota?.balanceAvailable !== true) return undefined;
  const remaining = quota.percentRemaining;
  if (typeof remaining !== "number" || !Number.isFinite(remaining)) return undefined;
  return 100 - remaining; // remainingToUsed 反转（与 guest 同语义）
}

function formatPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const clamped = Math.max(0, Math.min(100, value));
  const rounded = clamped >= 10 ? Math.round(clamped) : Number(clamped.toFixed(1));
  return `${rounded}%`;
}

/**
 * open-panel 锚点矩形（S2）：tap 派发统一经此构造，含 right / bottom
 * （ADR 0003 第 7 条：锚点补充字段，接收方忽略未知字段）。
 */
export function buildAnchorRect({ left, top, width, height }) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

/**
 * 段落地（S4，ADR 0003 第 3 条）：只把 quotaSegmentModel 的结果写入 DOM，不做判断。
 * segEl 须含 .skc-qseg-divider / 两个 .skc-qval / .skc-qsep / .skc-qdot（由 createQuotaEmbed 构造）。
 * model 由 quotaSegmentModel 产出；tooltip 字段保留但文案版不使用（数字常驻，Q16）。
 */
export function renderSegment(segEl, model) {
  const divider = segEl.querySelector(".skc-qseg-divider");
  const sep = segEl.querySelector(".skc-qsep");
  const dot = segEl.querySelector(".skc-qdot");
  segEl.hidden = !model.segment;
  divider.hidden = !model.divider;
  dot.hidden = !model.dot;
  const labels = { glm: "GLM", copilot: "Copilot" }; // qw 同款全名文案
  const spans = segEl.querySelectorAll(".skc-qval");
  model.bars.forEach((b, i) => {
    const span = spans[i];
    span.hidden = false;
    span.dataset.label = labels[b.key] ?? b.key;
    span.classList.toggle("skc-qwarn", b.tone === "warn");
    span.classList.toggle("skc-qdanger", b.tone === "danger");
    span.style.opacity = b.stale ? "0.5" : "";
    span.textContent = `${labels[b.key] ?? b.key} ${formatPercent(b.percent)}`;
  });
  for (let i = model.bars.length; i < spans.length; i += 1) spans[i].hidden = true;
  sep.hidden = model.bars.length !== 2; // 仅两条都有数时显示「·」（与 qw 一致）
  segEl.classList.toggle("skc-qpulse", model.bars.some((b) => b.tone === "danger"));
  return model;
}

export function createQuotaEmbed({
  doc,
  win,
  storage,
  target,
  host,
  fetchImpl = fetch,
  pullTimeoutMs = 15000,
  buildTimeoutSignal = (ms) =>
    typeof win.AbortSignal?.timeout === "function" ? win.AbortSignal.timeout(ms) : undefined,
  probeTimeoutMs = 500,
  pollMs = 30000,
  retryMs = 60000,
  heartbeatMs = 5000,
  onCapabilityChange,
  enabled: initialEnabled = true, // 挂载期初值（main 传入 ui.quotaMerge）：防同步握手在首次 update 前抢先 engage
}) {
  let disposed = false;
  let guestEl = null;
  let capable = false;
  let enabled = initialEnabled !== false; // ui.quotaMerge：初值取自 initialEnabled，此后由 update 快照驱动
  let engaged = false;
  let probeTimer = null;
  let heartTimer = null;
  let pollTimer = null;

  /* ---------------- 段（S5：段即根，直接并入胶囊） ---------------- */

  const el = doc.createElement("div"); // S5：段即根（pill 容器已拆除；承接原 pill 的 role/tabIndex/aria 属性）
  el.className = "skc-qseg";
  el.setAttribute("data-seg", "quota");
  el.setAttribute("data-dsh-stock-kanban-quota", "");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.setAttribute("aria-haspopup", "dialog");
  el.setAttribute("aria-expanded", "false");
  el.hidden = true;
  const divider = doc.createElement("span");
  divider.className = "skc-qseg-divider";
  const glmVal = doc.createElement("span"); // Q16–Q18（2026-11-10）：qw 胶囊同款文案，数字常驻
  glmVal.className = "skc-qval";
  glmVal.hidden = true;
  const sep = doc.createElement("span");
  sep.className = "skc-qsep";
  sep.textContent = "·";
  sep.hidden = true;
  const copilotVal = doc.createElement("span");
  copilotVal.className = "skc-qval";
  copilotVal.hidden = true;
  const dot = doc.createElement("span");
  dot.className = "skc-qdot";
  el.append(divider, glmVal, sep, copilotVal, dot);

  const dispatch = (type, detail) => {
    try {
      win.dispatchEvent(new win.CustomEvent(`${NS}:${type}`, { detail, composed: true, bubbles: true }));
    } catch {
      /* 无 CustomEvent 环境：协议不可用不拖垮宿主 */
    }
  };

  const notifyCapability = (v) => {
    if (typeof onCapabilityChange === "function") {
      try { onCapabilityChange(v) } catch { /* 订阅者异常不扩散 */ }
    }
  };

  /* ---------------- 渲染（warn >80≤95 / danger >95 / pulse >95） ---------------- */

  const paintOverview = (data) => {
    const providers = Array.isArray(data?.providers) ? data.providers : [];
    const glmProv = providers.find((p) => p?.key === "glm");
    const copilotProv = providers.find((p) => p?.key === "copilot");
    const model = renderSegment(
      el,
      quotaSegmentModel({
        glm: { percent: glmPercent(glmProv), stale: glmProv?.status === "stale" },
        copilot: { percent: copilotPercent(copilotProv), stale: copilotProv?.status === "stale" },
        outcomePending: data?.manualOutcome !== undefined || data?.manualOutcomeError !== undefined, // 待处理派生（与 qw client 同规则）
      }),
    );
    el.removeAttribute("title");
    if (model.bars.some((b) => b.stale)) el.title = t("quota.stale"); // 过期 title 落在段（S5）
  };

  /* ---------------- 拉取循环 ---------------- */

  const schedulePoll = (delay) => {
    if (disposed || !engaged) return;
    if (pollTimer !== null) win.clearTimeout(pollTimer);
    pollTimer = win.setTimeout(() => {
      pollTimer = null;
      pull();
    }, delay);
  };

  const pull = async () => {
    if (disposed || !engaged) return;
    try {
      // R1-1：单请求挂死不得冻结整条自排程链——超时 abort 落入下方 catch（stale title + 续排）
      const signal = buildTimeoutSignal(pullTimeoutMs);
      const res = await fetchImpl(OVERVIEW_URL, {
        headers: { accept: "application/json" },
        ...(signal ? { signal } : {}),
      });
      if (disposed || !engaged) return;
      if (res.status === 404) {
        el.hidden = true; // 路由缺席：藏段 + 慢重试（降级语义）
        schedulePoll(retryMs);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (disposed || !engaged) return;
      paintOverview(data);
      schedulePoll(pollMs);
    } catch {
      // 传输错误：保留上次渲染，正常节奏重试（与访客自身语义一致）；pill 标注过期（quota.stale）
      if (!disposed && engaged) {
        el.title = t("quota.stale");
        schedulePoll(pollMs);
      }
    }
  };

  /* ---------------- 可见性（R1/计划 A Task 2：回前台立即拉取，对齐 qw 独立态语义） ---------------- */

  const refreshNow = () => {
    if (pollTimer !== null) {
      win.clearTimeout(pollTimer);
      pollTimer = null;
    }
    return pull();
  };
  const onVisibilityChange = () => {
    if (engaged && doc.visibilityState === "visible") refreshNow();
  };
  doc.addEventListener("visibilitychange", onVisibilityChange);

  /* ---------------- 生命周期 ---------------- */

  const armHeartbeat = () => {
    if (heartTimer !== null) win.clearInterval(heartTimer);
    heartTimer = win.setInterval(() => dispatch("embed-heartbeat", { v: 1 }), heartbeatMs);
  };

  /** 位置继承（ADR 0003 第 11 条）：engage 时接管 qw 当前位置——sk 胶囊比 qw 宽，
   *  坐标按本胶囊实测宽重钳（空间不足时右缘贴视口、整体左移）；采纳结果同笔落 sk 键，双键即刻收敛 */
  const adoptGuestPosition = () => {
    const guestPos = loadGuestFloatPosition(win.localStorage);
    if (!guestPos) return;
    const rect =
      typeof target?.getBoundingClientRect === "function"
        ? target.getBoundingClientRect()
        : { width: 0, height: 0 };
    const vw = win.innerWidth;
    const vh = win.innerHeight;
    const maxX = Math.max(MARGIN, vw - MARGIN - rect.width);
    const maxY = Math.max(MARGIN, vh - MARGIN - rect.height);
    const point = {
      x: Math.min(Math.max(guestPos.x, MARGIN), maxX),
      y: Math.min(Math.max(guestPos.y, MARGIN), maxY),
    };
    host.style.left = `${Math.round(point.x)}px`;
    host.style.top = `${Math.round(point.y)}px`;
    try {
      saveFloatPosition(storage, point);
    } catch {
      /* 采纳坐标非法时不落盘，位置保留会话态 */
    }
  };

  const startEngage = () => {
    if (engaged || !capable || !enabled || disposed || !guestEl) return;
    engaged = true;
    adoptGuestPosition();
    target.append(el);
    el.setAttribute("aria-expanded", "false");
    dispatch("embed-engage", { v: 1 });
    armHeartbeat();
    refreshNow();
  };

  const stopEngage = (sendDisengage) => {
    if (heartTimer !== null) {
      win.clearInterval(heartTimer);
      heartTimer = null;
    }
    if (pollTimer !== null) {
      win.clearTimeout(pollTimer);
      pollTimer = null;
    }
    el.remove();
    el.hidden = true;
    if (!engaged) return;
    engaged = false;
    if (sendDisengage) dispatch("embed-disengage", { v: 1 });
  };

  /* ---------------- 握手 ---------------- */

  const probe = () => {
    if (disposed) return;
    dispatch("embed-probe", { v: 1, host: "dsh-stock-kanban" });
    if (probeTimer !== null) win.clearTimeout(probeTimer);
    probeTimer = win.setTimeout(() => {
      probeTimer = null;
      // 无回复 = legacy/缺席 → 共存不隐藏（降级矩阵行 2），无动作
    }, probeTimeoutMs);
  };

  const onCapabilities = (ev) => {
    if (disposed || capable) return;
    const caps = Array.isArray(ev?.detail?.capabilities) ? ev.detail.capabilities : [];
    if (!REQUIRED_CAPABILITIES.every((c) => caps.includes(c))) return; // 能力不足 → 共存
    capable = true;
    if (probeTimer !== null) {
      win.clearTimeout(probeTimer);
      probeTimer = null;
    }
    notifyCapability(true);
    startEngage();
  };

  win.addEventListener(`${NS}:embed-capabilities`, onCapabilities);

  /* ---------------- 检测（初始 + body childList 观察者） ---------------- */

  const syncGuest = () => {
    const found = doc.querySelector(GUEST_SELECTOR);
    if (found && found !== guestEl) {
      guestEl = found;
      probe();
    } else if (!found && guestEl !== null) {
      guestEl = null;
      capable = false;
      stopEngage(true); // guest 消失（禁用/HMR）→ 同 disengage
      notifyCapability(false);
    }
  };

  const observer = new win.MutationObserver(syncGuest);
  observer.observe(doc.body, { childList: true });
  syncGuest();

  /* ---------------- 对外接口 ---------------- */

  const applyEnabled = (next) => {
    if (next === enabled) return;
    enabled = next;
    if (!next) {
      stopEngage(true); // 设置关 → 立即退出合并（或永不进入）
      return;
    }
    if (guestEl) {
      // 重新握手（spec ⑥）：重置能力位并重新探测——验证 guest 仍在线
      // （off 期间可能被禁用/HMR 替换），回复到达后再 engage。
      capable = false;
      probe();
    }
  };

  const update = (snapshot) => {
    if (disposed) return;
    applyEnabled(snapshot?.ui?.quotaMerge !== false);
  };

  const setEnabled = (next) => {
    if (disposed) return;
    applyEnabled(next === true);
  };

  const onQuotaTap = () => {
    if (!engaged) return;
    let rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) rect = host.getBoundingClientRect();
    const anchor = buildAnchorRect({
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
    });
    dispatch("open-panel", { v: 1, anchor });
  };

  // S5：组拖动与 tap 路由已移交胶囊控制器（onTap(downTarget)，S6 装配）；此处只暴露 onQuotaTap。

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    if (probeTimer !== null) win.clearTimeout(probeTimer);
    stopEngage(true); // 拆除补发 embed-disengage（S2，ADR 0003 第 7 条）
    win.removeEventListener(`${NS}:embed-capabilities`, onCapabilities);
    el.remove();
  };

  return { el, update, setEnabled, onQuotaTap, dispose };
}
