/**
 * 2026-11-10 优雅化 UI 重构的契约面（docs/ui-redesign.md §3/§4）：
 *   - icons.mjs 线性图标 DOM 契约（createElementNS、currentColor、未知名抛错）；
 *   - footer 图标化后的面板契约（SVG 子节点、quote-error 头部状态类）；
 *   - 样式令牌卫生：真实 DSH alias 在位、四个失效令牌不再出现
 *     （label-warning 仅存于测试钉死的 qwarn/qdanger 回退串，见 client-dom.test.mjs）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { iconEl } from "../client/icons.mjs";
import { FLOAT_STYLE_TEXT } from "../client/styles.mjs";
import { createPanel } from "../client/panel.mjs";
import { createList } from "../client/list.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

test("icons · svg 契约：NS 根、viewBox、currentColor 描边、aria-hidden", () => {
  const h = createDomHarness();
  try {
    for (const name of ["privacy", "privacy-off", "plus", "settings", "refresh", "close", "quota-on", "quota-off", "back", "trash"]) {
      const el = iconEl(h.document, name);
      assert.equal(el.namespaceURI, SVG_NS, `${name} 根在 SVG NS`);
      assert.equal(el.getAttribute("viewBox"), "0 0 14 14");
      assert.equal(el.getAttribute("stroke"), "currentColor");
      assert.equal(el.getAttribute("fill"), "none");
      assert.equal(el.getAttribute("aria-hidden"), "true");
      assert.ok(el.childNodes.length >= 1, `${name} 至少一个图形子元素`);
    }
  } finally {
    h.cleanup();
  }
});

test("icons · 未知名称抛错（拼写错误尽早暴露）", () => {
  const h = createDomHarness();
  try {
    assert.throws(() => iconEl(h.document, "nope"), /unknown icon/);
  } finally {
    h.cleanup();
  }
});

test("panel · footer 图标钮含 svg 子节点 + aria-label（data-action 契约不变）", () => {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  try {
    const host = h.document.createElement("div");
    h.document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
    const panel = createPanel({
      doc: h.document,
      win: h.window,
      store: { closePanel() {}, setCapsuleSymbol() {}, setPrivacy() {}, setShowAdd() {}, setShowSettings() {}, pollQuotes() {}, setQuotaMerge() {} },
      views: { list: stubView(), detail: stubView(), add: stubView(), backup: stubView() },
    });
    shadow.append(panel.el);
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    for (const action of ["privacy", "add", "settings", "refresh", "close"]) {
      const btn = panel.el.querySelector(`.skc-footer [data-action="${action}"]`);
      assert.ok(btn, `${action} 钮在位`);
      assert.ok(btn.querySelector("svg"), `${action} 钮为 SVG 图标`);
      assert.ok(btn.getAttribute("aria-label"), `${action} 钮有 aria-label`);
    }
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("panel · quote-error 头部状态类随 quoteMeta.error 切换", () => {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  try {
    const host = h.document.createElement("div");
    h.document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
    const panel = createPanel({
      doc: h.document,
      win: h.window,
      store: { closePanel() {}, setCapsuleSymbol() {}, setPrivacy() {}, setShowAdd() {}, setShowSettings() {}, pollQuotes() {}, setQuotaMerge() {} },
      views: { list: stubView(), detail: stubView(), add: stubView(), backup: stubView() },
    });
    shadow.append(panel.el);
    const baseUi = {
      panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false,
      lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
      capsuleSymbolId: null,
    };
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    panel.update({
      business: { rev: 1, settings: { privacyMode: false }, symbols: [] },
      quotes: {},
      quoteMeta: { fetchedAt: 1, error: "boom" },
      ui: { ...baseUi },
      toast: null,
      providers: null,
    });
    assert.equal(panel.el.classList.contains("skc-quote-error"), true, "异常 → quote-error 类");
    panel.update({
      business: { rev: 1, settings: { privacyMode: false }, symbols: [] },
      quotes: {},
      quoteMeta: { fetchedAt: 2, error: null },
      ui: { ...baseUi },
      toast: null,
      providers: null,
    });
    assert.equal(panel.el.classList.contains("skc-quote-error"), false, "恢复 → quote-error 类移除");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("styles · 令牌卫生：真实 DSH alias 在位、失效令牌清零（钉死回退串除外）", () => {
  const s = FLOAT_STYLE_TEXT;
  // 真实令牌已接线（border 阶梯 / 表面阶梯 / 交互反馈；border-l4 走 charts.mjs 的 style 属性，不在样式表断言）
  for (const token of [
    "--dsw-alias-border-l1", "--dsw-alias-border-l2", "--dsw-alias-border-l3",
    "--dsw-alias-bg-layer-2", "--dsw-alias-bg-layer-3",
    "--dsw-alias-interactive-bg-hover", "--dsw-alias-interactive-bg-active",
    "--dsw-alias-label-tertiary", "--dsw-alias-label-caption",
    "--dsw-alias-state-error-primary", "--dsw-alias-state-warn-label",
  ]) {
    assert.ok(s.includes(token), `${token} 在位`);
  }
  // 失效令牌仅允许出现在测试钉死的两串回退里（qwarn/qdanger，client-dom.test.mjs 钉死）
  const dead = ["--dsw-alias-border-secondary", "--dsw-alias-bg-elevated", "--dsw-alias-bg-hover"];
  for (const token of dead) assert.equal(s.includes(token), false, `${token} 已清零`);
  const warningUses = s.split("--dsw-alias-label-warning").length - 1;
  assert.equal(warningUses, 2, "label-warning 仅存于 qwarn/qdanger 钉死串");
});

test("styles · hidden 属性全局守卫（实拍抓获：.skc-layer 的 flex 击穿 UA [hidden]，双层叠渲染）", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(
    s.includes(":host [hidden]{display:none !important}"),
    "全局 hidden 守卫在位（作者 display 不再击穿 hidden）",
  );
});

test("icons · emoji 字形零回潮（2026-11-10 retro #6：client 源码除 i18n 外，图标必须走 icons.mjs）", () => {
  const PICTOGRAPH = /\p{Extended_Pictographic}/gu;
  const offenders = [];
  for (const name of readdirSync(new URL("../client/", import.meta.url))) {
    if (!name.endsWith(".mjs") || name === "i18n.mjs") continue; // i18n 文案豁免（「＋」等引用按钮名的 copy）
    const text = readFileSync(new URL(`../client/${name}`, import.meta.url), "utf8");
    const hits = [...new Set(text.match(PICTOGRAPH) ?? [])];
    if (hits.length > 0) offenders.push(`${name}: ${hits.join(" ")}`);
  }
  assert.deepEqual(offenders, [], `emoji 字形零容忍（图标走 icons.mjs 的 SVG），违例：${offenders.join("; ")}`);
});

test("styles · footer 两行制结构类在位", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(s.includes(".skc-footer-main"), "footer-main 行类");
  assert.ok(s.includes(".skc-title::before"), "头部品牌点伪元素");
});

/* ---------------- Round 2（impeccable polish，2026-11-10） ---------------- */

test("styles · 浏览器原生面随主题：selection / caret（craft-floor「built not assembled」）", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(s.includes("::selection{"), "::selection 主题化");
  assert.ok(s.includes("caret-color:"), "输入光标色主题化");
});

test("styles · disabled/loading/empty 状态面在位", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(s.includes(".skc-btn:disabled"), "按钮 disabled 态");
  assert.ok(s.includes(".skc-add-row:disabled"), "添加行 disabled 态（沿袭）");
  assert.ok(s.includes(".skc-skeleton"), "图表加载骨架");
  assert.ok(s.includes(".skc-empty-icon"), "教学式空态图形座");
  const guardAt = s.indexOf("@media (prefers-reduced-motion: no-preference)");
  const guard = s.slice(guardAt);
  assert.ok(guard.includes("@keyframes skc-shimmer"), "shimmer 在 reduced-motion 守卫内");
  assert.equal(s.split("@keyframes skc-shimmer").length - 1, 1, "shimmer keyframes 只定义一次");
});

test("list · 行键盘可达：Enter/Space 打开详情", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document, window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.document = h.document;
  globalThis.window = h.window;
  globalThis.localStorage = h.localStorage;
  try {
    const actions = [];
    const store = {
      setLastMarket: () => {},
      setHoldingsOnly: () => {},
      pollQuotes: () => {},
      openDetail: (id) => actions.push(id),
    };
    const list = createList({ store });
    list.update({
      business: { rev: 1, settings: { privacyMode: false }, symbols: [{ id: "s1", market: "cn", code: "sh600519", name: "贵州茅台" }] },
      quotes: { s1: { status: "ok", price: 1450, changePercent: 1.2, target: { status: "no-targets" } } },
      quoteMeta: { fetchedAt: 1, error: null },
      ui: { panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false, lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true }, capsuleSymbolId: null },
      toast: null,
      providers: null,
    });
    const row = list.el.querySelector(".skc-row");
    assert.equal(row.tabIndex, 0, "行可 Tab 进入");
    row.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.deepEqual(actions, ["s1"], "Enter → openDetail");
    list.dispose();
  } finally {
    for (const [k, v] of Object.entries(prevGlobals)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
    h.cleanup();
  }
});
