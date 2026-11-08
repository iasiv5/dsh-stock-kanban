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

  // 计划 B 缝：胶囊组 stack，未来第二枚 pill 直接追加
  const stack = doc.createElement("div");
  stack.className = "skc-stack";
  shadow.append(stack);

  const errorGlobal = doc.createElement("div");
  errorGlobal.className = "skc-error-global";
  errorGlobal.hidden = true;
  shadow.append(errorGlobal);

  /* ---------------- store 与视图簇 ---------------- */

  const store = createStore(storage);
  const views = {
    list: createList({ store }),
    detail: createDetail({ store }),
    add: createAdd({ store }),
    backup: createBackup({ store }),
  };
  const panel = createPanel({ doc, win, store, views });
  shadow.append(panel.el);

  const capsule = createCapsule({
    doc,
    win,
    storage,
    shadow,
    store,
    onTogglePanel: () => store.togglePanel(),
  });
  stack.append(capsule.el);

  /* ---------------- renderAll 漏斗 ---------------- */

  let wasOpen = false;
  const renderAll = (snapshot) => {
    capsule.update(snapshot);
    panel.update(snapshot);
    const quoteError = snapshot?.quoteMeta?.error;
    errorGlobal.textContent = quoteError ? t("app.quote-failed", { e: quoteError }) : "";
    errorGlobal.hidden = !quoteError;
    // 面板开启瞬间：以胶囊实测矩形锚定（锚定即位置，无独立位置记忆）
    const isOpenNow = snapshot?.ui?.panelOpen === true;
    if (isOpenNow && !wasOpen) {
      panel.openFrom(capsule.el.getBoundingClientRect());
    }
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

  doc.body.append(host);

  return () => {
    unsubscribe();
    store.dispose();
    capsule.dispose();
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
  const doc = ctx?.document ?? globalThis.document;
  const win = ctx?.window ?? globalThis.window;
  const storage = ctx?.storage ?? globalThis.localStorage;
  const mount = () => mountKanban({ doc, win, storage });
  if (typeof ctx?.effect === "function") {
    return ctx.effect(mount, "dsh-stock-kanban: float shell");
  }
  return mount(); // 无 effect 环境（测试）：直接挂载并透传 dispose
}

export { apply, inject };
