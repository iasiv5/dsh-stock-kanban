#!/usr/bin/env node
// 一次性补丁：main.mjs（样式注入时机 + html lang 观察器）
import { readFileSync, writeFileSync } from "node:fs";

const f = "client/main.mjs";
let s = readFileSync(f, "utf8");
const patch = (from, to) => {
  if (!s.includes(from)) {
    console.error("MISS:", from.slice(0, 70));
    process.exit(1);
  }
  s = s.replace(from, to);
};

// 1) 样式在模块求值期注入（早于任何子组件 effect 的测量，修复左下角幽灵元素）
patch(
  "const store = createStore();",
  'injectStyles(); // 模块求值期注入：子组件的挂载钳位/测量必须在样式就绪后进行\n\nconst store = createStore();',
);

// 2) App effect：去掉 injectStyles，补 html lang 观察器（定义在观察器之前）
patch(
  `  useEffect(() => {
    injectStyles();
    store.refreshState().then(() => store.restartPolling()).catch((e) => store.setToast(t("toast.init-failed", { e: String(e?.message ?? e) })));
    const onVis = () => store.handleVisibility();
    document.addEventListener("visibilitychange", onVis);
    // 跟随系统语言：浏览器派发 languagechange（改首选语言/系统语言后）→ 切字典并重渲染
    const onLangChange = () => {
      setLang(resolveLang(navigator.language));
      bumpLang((v) => v + 1);
    };
    window.addEventListener("languagechange", onLangChange);`,
  `  useEffect(() => {
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
    window.addEventListener("languagechange", onLangChange);`,
);

// 3) 清理卸载路径
patch(
  `    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("languagechange", onLangChange);
    };`,
  `    langObserver.disconnect();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("languagechange", onLangChange);
      langObserver.disconnect();
    };`,
);

writeFileSync(f, s);
console.log("main.mjs patched");
