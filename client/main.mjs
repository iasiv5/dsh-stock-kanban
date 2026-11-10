/**
 * 客户端入口（vanilla）：body 直挂浮动壳（open shadow host）+ renderAll 漏斗。
 * host = div[data-dsh-stock-kanban-float] → doc.body，位置记忆挂 host left/top；
 * shadow 内 div.skc-stack 装胶囊（计划 B 缝：未来第二枚 pill 直接追加）、面板同 root。
 * 业务数据存 DSH 实例（服务端），界面偏好与位置记忆存本浏览器 localStorage（9.2）。
 */

import { createStore } from "./store.mjs";
import { createCapsule } from "./capsule.mjs";
import { createPanel } from "./panel.mjs";
import { createList } from "./list.mjs";
import { createDetail } from "./detail.mjs";
import { createAdd } from "./add.mjs";
import { createBackup } from "./backup.mjs";
import { createQuotaEmbed } from "./quota-embed.mjs";
import { mirrorGuestFloatPosition } from "./float-prefs.mjs";
import { FLOAT_STYLE_TEXT } from "./styles.mjs";
import { t, resolveLang, setLang } from "./i18n.mjs";

const FLOAT_HOST_SELECTOR = "[data-dsh-stock-kanban-float]";

/**
 * 挂载浮动壳。dedupe 守卫：body 已存在同 selector host 即 noop（HMR 重挂载安全）。
 * 位置经 loadFloatPosition 从 localStorage 恢复（capsule 创建期钳位应用）。
 * @returns {() => void} dispose
 */
export function mountKanban({ doc, win, storage }) {
  if (!doc?.body || doc.body.querySelector(FLOAT_HOST_SELECTOR)) {
    return () => {}; // noop dispose
  }

  /* ---------------- 浮动壳 ---------------- */

  const host = doc.createElement("div");
  host.setAttribute("data-dsh-stock-kanban-float", "");
  const shadow = host.attachShadow({ mode: "open" });

  const style = doc.createElement("style");
  style.textContent = FLOAT_STYLE_TEXT;
  shadow.append(style);

  // 计划 B 缝：合并胶囊 stack，未来第二枚 pill 直接追加
  const stack = doc.createElement("div");
  stack.className = "skc-stack";
  shadow.append(stack);

  const errorGlobal = doc.createElement("div");
  errorGlobal.className = "skc-error-global";
  errorGlobal.hidden = true;
  shadow.append(errorGlobal);

  // 先 attach 再创建胶囊：首挂定位的尺寸测量（host.getBoundingClientRect）
  // 必须在 host 入文档后进行，否则真实浏览器恒走 38×26 回退（jsdom rect 恒零
  // 测不出此差异——quota-watch 同构：先 append 再 applyPosition）
  doc.body.append(host);

  /* ---------------- store 与视图簇 ---------------- */

  const store = createStore(storage);
  const views = {
    list: createList({ store }),
    detail: createDetail({ store, win }),
    add: createAdd({ store }),
    backup: createBackup({ store }),
  };
  const panel = createPanel({ doc, win, store, views });
  shadow.append(panel.el);

  /** 最近一次股票段切换的矩形（S8：面板开启上升沿以此锚定；开启或收起后清空） */
  let lastStock = null;
  const capsule = createCapsule({
    doc,
    win,
    storage,
    shadow,
    store,
    onTogglePanel: (segRect, capsuleRect) => {
      lastStock = { segRect, capsuleRect };
      store.togglePanel();
    },
    onQuotaTap: () => quotaEmbed.onQuotaTap(), // 延迟绑定：quotaEmbed 在 capsule 之后创建
    onPositionPersisted: (point) => mirrorGuestFloatPosition(storage, point), // 位置继承：拖动落盘镜像写回 qw 键
  });
  stack.append(capsule.el);

  /* ---------------- CEP v1 宿主侧：quota 嵌入（ADR 0002） ---------------- */
  // 先于 subscribe 创建：挂载前即存在的 guest 会同步回复握手，此刻须已知 quotaMerge 初值，
  // 否则同步握手会在首次 update 前抢先 engage（enabled 初值见 quota-embed.mjs）。
  // 能力变化经 onCapabilityChange 回写 store（footer 开关门控）；pill 随 stack 流动。
  const quotaEmbed = createQuotaEmbed({
    doc,
    win,
    storage,
    target: capsule.el,
    host,
    enabled: store.getState().ui.quotaMerge !== false,
    onCapabilityChange: (capable) => store.setQuotaCapable(capable),
  });

  /* ---------------- renderAll 漏斗 ---------------- */

  let wasOpen = false;
  let prevQuoteError; // errorGlobal 轻路径参照（渲染切片广播 Task 4：按 quoteMetaError 分片门控）
  const renderAll = (snapshot) => {
    capsule.update(snapshot);
    quotaEmbed.update(snapshot);
    panel.update(snapshot);
    // quotes-only tick 不重写全局错误条（undefined = 全量时照写：回放/语言切换路径）
    const quoteError = snapshot?.quoteMeta?.error ?? null;
    if (snapshot?.changed === undefined || quoteError !== prevQuoteError) {
      errorGlobal.textContent = quoteError ? t("app.quote-failed", { e: quoteError }) : "";
      errorGlobal.hidden = !quoteError;
      prevQuoteError = quoteError;
    }
    // 面板开启瞬间：以所点股票段矩形（水平推出）与胶囊矩形（顶边/回退）锚定；无记录时回退胶囊矩形
    const isOpenNow = snapshot?.ui?.panelOpen === true;
    if (isOpenNow && !wasOpen) {
      const capRect = capsule.el.getBoundingClientRect();
      panel.openFrom(lastStock?.segRect ?? capRect, lastStock?.capsuleRect ?? capRect);
      lastStock = null;
    }
    if (!isOpenNow) lastStock = null;
    wasOpen = isOpenNow;
  };

  const unsubscribe = store.subscribe(renderAll); // subscribe 即刻回放一次（首帧渲染）

  /* ---------------- 生命周期接线 ---------------- */

  store
    .refreshState()
    .then(() => store.restartPolling())
    .catch((e) => store.setToast(t("toast.init-failed", { e: String(e?.message ?? e) })));

  const onVisibility = () => store.handleVisibility();
  doc.addEventListener("visibilitychange", onVisibility);

  // 跟随 DSH 界面语言：locale 特性把「设置 → 语言」镜像到 <html lang>
  const onLangChange = () => {
    setLang(resolveLang(win.navigator?.language, doc));
    renderAll(store.getState());
  };
  const langObserver = new win.MutationObserver(onLangChange);
  langObserver.observe(doc.documentElement, { attributeFilter: ["lang"] });
  win.addEventListener("languagechange", onLangChange);

  return () => {
    unsubscribe();
    store.dispose();
    capsule.dispose();
    quotaEmbed.dispose(); // 挂在 capsule.dispose 之后（S5 装配约定）
    panel.dispose();
    for (const view of Object.values(views)) view.dispose();
    doc.removeEventListener("visibilitychange", onVisibility);
    langObserver.disconnect();
    win.removeEventListener("languagechange", onLangChange);
    host.remove();
  };
}

const inject = [];

function apply(ctx) {
  // 客户端运行时不提供 document/window/storage 服务（inject 只认 npm 包名服务），
  // 一律走 globalThis，避免 cordis proxy guard 抛 cannot get property ... without inject。
  const doc = globalThis.document;
  const win = globalThis.window;
  const storage = globalThis.localStorage;
  const mount = () => mountKanban({ doc, win, storage });
  if (ctx && typeof ctx.effect === "function") {
    return ctx.effect(mount, "dsh-stock-kanban: float shell");
  }
  return mount(); // 无 effect 环境（测试）：直接挂载并透传 dispose
}

export { apply, inject };
