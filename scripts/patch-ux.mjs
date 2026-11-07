#!/usr/bin/env node
// 一次性补丁：capsule/panel/store/fmt（贴近胶囊弹面板 + 拖拽手感 + 位置会话化 + 矩形上报）
import { readFileSync, writeFileSync } from "node:fs";
const patch = (f, from, to, optional = false) => {
  let s = readFileSync(f, "utf8");
  if (!s.includes(from)) {
    if (optional) { console.log("skip (absent):", f, from.slice(0, 50)); return; }
    console.error("MISS:", f, from.slice(0, 70));
    process.exit(1);
  }
  s = s.replace(from, to);
  writeFileSync(f, s);
};

/* ---- fmt.mjs：拖动阈值 6 → 4（更跟手的抓取） ---- */
patch("client/fmt.mjs", "export const DRAG_THRESHOLD_PX = 6;", "export const DRAG_THRESHOLD_PX = 4;");

/* ---- store.mjs：胶囊矩形（内存）+ panelPos 会话化（不再持久化） ---- */
patch("client/store.mjs",
  "  const listeners = new Set();",
  "  const listeners = new Set();\n  let capsuleRect = null; // 胶囊最近矩形（内存）：面板弹出锚点");
patch("client/store.mjs",
  "      const { panelOpen, view, detailId, showAdd, toast, ...persisted } = state.ui; // 会话态不落盘",
  "      const { panelOpen, view, detailId, showAdd, panelPos, toast, ...persisted } = state.ui; // 会话态不落盘");
patch("client/store.mjs",
  "  function setCapsulePos(pos) { setUi({ pos }); }",
  `  function setCapsulePos(pos) { setUi({ pos }); }
  /** 胶囊矩形上报（内存，不触发渲染）：面板弹出位置锚点 */
  function setCapsuleRect(rect) { capsuleRect = rect; }
  function getCapsuleRect() { return capsuleRect; }`);
patch("client/store.mjs",
  "    pollQuotes, restartPolling, openPanel, closePanel, togglePanel, openDetail, backToList,",
  "    pollQuotes, restartPolling, openPanel, closePanel, togglePanel, openDetail, backToList, setCapsuleRect, getCapsuleRect,");

/* ---- capsule.mjs：拖拽类名对齐新 CSS + 矩形上报 ---- */
patch("client/capsule.mjs", 'el.classList.add("skc-capsule-dragging");', 'el.classList.add("skc-capsule--dragging");');
patch("client/capsule.mjs", 'el.classList.remove("skc-capsule-dragging");', 'el.classList.remove("skc-capsule--dragging");');
// 挂载钳位处上报矩形
patch("client/capsule.mjs",
  `    const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
    el.style.left = \`\${snapped.x}px\`;
    el.style.top = \`\${snapped.y}px\`;
    store.setCapsulePos(snapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);`,
  `    const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
    el.style.left = \`\${snapped.x}px\`;
    el.style.top = \`\${snapped.y}px\`;
    store.setCapsulePos(snapped);
    store.setCapsuleRect({ left: snapped.x, top: snapped.y, width: rect.width, height: rect.height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);`);
// 拖动结束处上报矩形
patch("client/capsule.mjs",
  `      el.style.left = \`\${snapped.x}px\`;
      el.style.top = \`\${snapped.y}px\`;
      store.setCapsulePos(snapped); // 位置按访问端保存（9.2）`,
  `      el.style.left = \`\${snapped.x}px\`;
      el.style.top = \`\${snapped.y}px\`;
      store.setCapsulePos(snapped); // 位置按访问端保存（9.2）
      store.setCapsuleRect({ left: snapped.x, top: snapped.y, width: rect.width, height: rect.height });`);

/* ---- panel.mjs：弹出位置锚定胶囊附近；拖拽中加类；位置改会话内存 ---- */
// 位置计算：以胶囊为锚（下方优先，放不下放上方；水平随胶囊，钳位出视口）
patch("client/panel.mjs",
  `  // 面板位置钳位：任何视口下完整留在屏幕内（修复手机端收起按钮被推出屏幕的问题）
  const panelWidth = Math.min(400, window.innerWidth - 16);
  const clampPanel = (p) => ({
    x: Math.min(Math.max(p.x, 8), Math.max(8, window.innerWidth - panelWidth - 8)),
    y: Math.min(Math.max(p.y, 8), Math.max(8, window.innerHeight - 120)),
  });
  const pos = clampPanel(ui.panelPos ?? { x: window.innerWidth - panelWidth - 16, y: 14 });`,
  `  // 弹出位置锚定胶囊附近（下方优先，放不下放上方；水平随胶囊），任何视口钳回屏幕内。
  // 不再跨会话记忆面板位置：胶囊即锚点，位置可预期（用户反馈：卡片离胶囊太远）。
  const panelWidth = Math.min(400, window.innerWidth - 16);
  const clampPanel = (p) => ({
    x: Math.min(Math.max(p.x, 8), Math.max(8, window.innerWidth - panelWidth - 8)),
    y: Math.min(Math.max(p.y, 8), Math.max(8, window.innerHeight - 120)),
  });
  const anchor = store.getCapsuleRect?.() ?? null;
  const pos = clampPanel(anchor
    ? {
        x: anchor.left,
        y: anchor.top + anchor.height + 8 + 220 > window.innerHeight
          ? Math.max(8, anchor.top - 240)
          : anchor.top + anchor.height + 8,
      }
    : { x: window.innerWidth - panelWidth - 16, y: 14 });`);
// 拖拽类
patch("client/panel.mjs",
  `    if (!d.moved && shouldDrag(dx, dy)) d.moved = true;`,
  `    if (!d.moved && shouldDrag(dx, dy)) { d.moved = true; el.classList.add("skc-panel--dragging"); }`);
patch("client/panel.mjs",
  `    dragRef.current = null;
    if (d?.moved && el) {
      const rect = el.getBoundingClientRect();`,
  `    dragRef.current = null;
    el?.classList.remove("skc-panel--dragging");
    if (d?.moved && el) {
      const rect = el.getBoundingClientRect();`);
// 按钮标题 i18n
patch("client/panel.mjs",
  'title: t("app.footer.privacy"),',
  'title: privacy ? t("privacy.on") : t("privacy.off"),');
patch("client/panel.mjs",
  'h("button", { className: "skc-icon-btn", title: t("app.title"), onClick: () => store.closePanel() }, "—"),',
  'h("button", { className: "skc-icon-btn", title: t("app.collapse"), onClick: () => store.closePanel() }, "—"),');

console.log("all patched");
