/**
 * CEP v1 宿主侧（docs/interop/capsule-embed-protocol.md；ADR 0002）：
 * 检测 guest（[data-dsh-quota-watch-float] + body MutationObserver）→ 握手
 * （embed-probe / embed-capabilities，500ms 无回复即共存不隐藏）→ engage /
 * 5s heartbeat / disengage 生命周期 → overview 拉取与 quota pill 渲染 →
 * 降级矩阵（缺席/legacy/设置关/合并/宿主消失）。
 * 数据通道：document-relative GET api/dsh-quota-watch/overview（qw 同款拉法）；
 * 404 → 藏段 + 慢重试（retryMs）；传输错误 → 保留上次渲染 + 正常节奏（pollMs）。
 * 阈值语义与 guest 逐字对齐（warn >80≤95 / danger >95 / pulse >95，spec §9）；
 * percent 计算是 qw glmRowModel/copilotRowModel 的私有拷贝（GLM=5h 窗口，
 * Copilot=100−remaining），事件 detail 只含 rect/flag/版本（spec §8）。
 */

const NS = "dsh-quota-watch";
const GUEST_SELECTOR = "[data-dsh-quota-watch-float]";
const OVERVIEW_URL = "api/dsh-quota-watch/overview";
const REQUIRED_CAPABILITIES = ["hide-pill", "anchored-panel"];

import { attachFloatDrag } from "./capsule.mjs";

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

export function createQuotaEmbed({
  doc,
  win,
  storage,
  stack,
  host,
  fetchImpl = fetch,
  probeTimeoutMs = 500,
  pollMs = 30000,
  retryMs = 60000,
  heartbeatMs = 5000,
  onCapabilityChange,
}) {
  let disposed = false;
  let guestEl = null;
  let capable = false;
  let enabled = true; // ui.quotaMerge（update 快照驱动；默认开）
  let engaged = false;
  let probeTimer = null;
  let heartTimer = null;
  let pollTimer = null;

  /* ---------------- pill（解剖继承：skc-capsule + --quota 覆写） ---------------- */

  const el = doc.createElement("div");
  el.className = "skc-capsule skc-capsule--quota";
  el.setAttribute("data-dsh-stock-kanban-quota", "");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.setAttribute("aria-haspopup", "dialog");
  el.setAttribute("aria-expanded", "false");
  el.hidden = true;
  const glmSpan = doc.createElement("span");
  glmSpan.className = "skc-qval";
  glmSpan.hidden = true;
  const sepSpan = doc.createElement("span");
  sepSpan.className = "skc-qsep";
  sepSpan.textContent = "·";
  sepSpan.hidden = true;
  const copilotSpan = doc.createElement("span");
  copilotSpan.className = "skc-qval";
  copilotSpan.hidden = true;
  el.append(glmSpan, sepSpan, copilotSpan);

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

  const paintValue = (span, percent) => {
    const visible = typeof percent === "number" && Number.isFinite(percent);
    span.hidden = !visible;
    if (!visible) return false;
    span.textContent = `${span.dataset.label} ${formatPercent(percent)}`;
    span.classList.toggle("skc-qwarn", percent > 80 && percent <= 95);
    span.classList.toggle("skc-qdanger", percent > 95);
    return true;
  };

  const paintOverview = (data) => {
    const providers = Array.isArray(data?.providers) ? data.providers : [];
    const glm = glmPercent(providers.find((p) => p?.key === "glm"));
    const copilot = copilotPercent(providers.find((p) => p?.key === "copilot"));
    glmSpan.dataset.label = "GLM";
    copilotSpan.dataset.label = "Copilot";
    const glmShown = paintValue(glmSpan, glm);
    const copilotShown = paintValue(copilotSpan, copilot);
    sepSpan.hidden = !(glmShown && copilotShown);
    const anyDanger = [glm, copilot].some((p) => typeof p === "number" && p > 95);
    el.classList.toggle("skc-qpulse", anyDanger);
    el.hidden = !(glmShown || copilotShown);
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
      const res = await fetchImpl(OVERVIEW_URL, { headers: { accept: "application/json" } });
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
      // 传输错误：保留上次渲染，正常节奏重试（与访客自身语义一致）
      if (!disposed && engaged) schedulePoll(pollMs);
    }
  };

  /* ---------------- 生命周期 ---------------- */

  const armHeartbeat = () => {
    if (heartTimer !== null) win.clearInterval(heartTimer);
    heartTimer = win.setInterval(() => dispatch("embed-heartbeat", { v: 1 }), heartbeatMs);
  };

  const startEngage = () => {
    if (engaged || !capable || !enabled || disposed || !guestEl) return;
    engaged = true;
    stack.append(el);
    el.setAttribute("aria-expanded", "false");
    dispatch("embed-engage", { v: 1 });
    armHeartbeat();
    pull();
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

  const onTapOpen = () => {
    if (!engaged) return;
    let rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) rect = host.getBoundingClientRect();
    const anchor = {
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
    };
    dispatch("open-panel", { v: 1, anchor });
  };

  // 组拖动（S3）：与 stock 胶囊共享 attachFloatDrag——拖 = 移动 host、落同一
  // 位置记忆键；tap（非拖动）→ 派发 open-panel。
  const dragCtl = attachFloatDrag({ el, host, doc, win, storage, onTap: onTapOpen });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    if (probeTimer !== null) win.clearTimeout(probeTimer);
    stopEngage(false);
    dragCtl.dispose();
    win.removeEventListener(`${NS}:embed-capabilities`, onCapabilities);
    el.remove();
  };

  return { el, update, setEnabled, dispose };
}
