/**
 * 客户端入口：slot 挂载（shell.overlay）+ App 根组件。
 * 业务数据存 DSH 实例（服务端），界面偏好存本浏览器 localStorage（9.2）。
 */

import { createElement as h, useEffect, useState } from "react";
import { createStore, useStore } from "./store.mjs";
import { Panel } from "./panel.mjs";
import { Capsule } from "./capsule.mjs";
import { injectStyles } from "./styles.mjs";
import { t, resolveLang, setLang } from "./i18n.mjs";

injectStyles(); // 模块求值期注入：子组件的挂载钳位/测量必须在样式就绪后进行

const store = createStore();

function App() {
  const snapshot = useStore(store);
  const { ui, business, quotes, quoteMeta } = snapshot;
  const [, bumpLang] = useState(0); // 系统语言变化时递增，触发全树以新语言重渲染

  useEffect(() => {
    store.refreshState().then(() => store.restartPolling()).catch((e) => store.setToast(t("toast.init-failed", { e: String(e?.message ?? e) })));
    const onVis = () => store.handleVisibility();
    document.addEventListener("visibilitychange", onVis);
    // 跟随 DSH 界面语言：locale 特性把「设置 → 语言」镜像到 <html lang>，监听其实时变化
    const onLangChange = () => {
      setLang(resolveLang(navigator.language, document));
      bumpLang((v) => v + 1);
    };
    const langObserver = new MutationObserver(onLangChange);
    langObserver.observe(document.documentElement, { attributeFilter: ["lang"] });
    window.addEventListener("languagechange", onLangChange);
    // 组件与页面同生命周期；轮询定时器随页面关闭自然终止（无服务端常驻任务）
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("languagechange", onLangChange);
      langObserver.disconnect();
    };
  }, []);

  const capsuleId = ui.capsuleSymbolId ?? business.symbols[0]?.id ?? null;
  const capsuleSymbol = business.symbols.find((s) => s.id === capsuleId) ?? null;
  const capsuleQuote = capsuleId ? quotes[capsuleId] : null;

  return h("div", { className: "skc-root" },
    h(Capsule, { store, ui, symbol: capsuleSymbol, quote: capsuleQuote }),
    ui.panelOpen ? h(Panel, { store, snapshot }) : null,
    h("div", { className: "skc-error-global" }, quoteMeta?.error ? t("app.quote-failed", { e: quoteMeta.error }) : null),
  );
}

const inject = ["slots"];

function apply(ctx) {
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
    name: "shell.overlay",
    id: "stock-kanban",
  }, () => h(App)));
}

export { apply, inject };
