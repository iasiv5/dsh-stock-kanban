import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { FLOAT_STYLE_TEXT } from "../client/styles.mjs";
import { createCapsule } from "../client/capsule.mjs";
import { createList } from "../client/list.mjs";
import { createDetail } from "../client/detail.mjs";
import { createAdd } from "../client/add.mjs";
import { createBackup } from "../client/backup.mjs";
import { createPanel } from "../client/panel.mjs";
import { buildMinuteChart, buildCandleChart } from "../client/charts.mjs";
import { MASK } from "../client/fmt.mjs";
import { t } from "../client/i18n.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

test("dom-harness · window/localStorage/body 可用", () => {
  const h = createDomHarness();
  try {
    assert.ok(h.window, "window 存在");
    assert.ok(h.document, "document 存在");
    assert.ok(h.document.body, "document.body 存在");
    h.localStorage.setItem("sk:probe", "v1");
    assert.equal(h.localStorage.getItem("sk:probe"), "v1", "localStorage 往返");
  } finally {
    h.cleanup();
  }
});

test("FLOAT_STYLE_TEXT · 关键常量在位", () => {
  const s = FLOAT_STYLE_TEXT;
  // ① :host 顶层直挂锚点（quota-watch 惯例格式）
  assert.ok(s.includes(":host { position: fixed; z-index: 2147483000; }"), ":host 规则");
  // ② 胶囊解剖（26px pill + 命中区 + grab）
  assert.ok(s.includes(".skc-capsule {"), ".skc-capsule 规则存在");
  assert.ok(
    s.includes("height:26px; padding:0 10px; border-radius:999px; touch-action:none; cursor:grab;"),
    "胶囊解剖常量连续段",
  );
  // ③ 命中区外扩 ::before
  assert.ok(
    s.includes('.skc-capsule::before { content:""; position:absolute; inset:-9px; }'),
    "::before 命中区",
  );
  // ④ 键盘可达 outline
  assert.ok(s.includes(".skc-capsule:focus-visible"), "focus-visible 规则存在");
  assert.ok(/\.skc-capsule:focus-visible\{[^}]*outline/.test(s), "focus-visible 有 outline");
  // ⑤ 面板视口锚定
  assert.ok(s.includes(".skc-panel { position:fixed; z-index:2147483000; }"), ".skc-panel 规则");
  // ⑥ 打印隐藏
  assert.ok(s.includes("@media print { :host { display:none !important } }"), "print 隐藏");
  // ⑦ 动效 reduced-motion 守卫
  assert.ok(s.includes("@media (prefers-reduced-motion: no-preference)"), "reduced-motion 守卫");
  // ⑧ 胶囊组 stack（计划 B 缝）
  assert.ok(
    s.includes(".skc-stack { display:flex; flex-direction:column; gap:6px; }"),
    ".skc-stack 规则",
  );
});

/* ---------------- capsule（Task 8：拖拽管线 + 键盘 + 点击） ---------------- */

function setupCapsule({ seed } = {}) {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  for (const [k, v] of Object.entries(seed ?? {})) h.localStorage.setItem(k, v);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const calls = [];
  const capsule = createCapsule({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    shadow,
    store: { togglePanel() { calls.push("store-toggle"); } },
    onTogglePanel() { calls.push("toggle"); },
  });
  shadow.append(capsule.el);
  return { h, host, shadow, capsule, calls };
}

test("capsule · DOM 契约与默认位（host 定位，pill 流内）", () => {
  const { h, host, capsule } = setupCapsule();
  try {
    const el = capsule.el;
    assert.equal(el.getAttribute("role"), "button");
    assert.equal(el.tabIndex, 0);
    assert.ok(el.hasAttribute("data-dsh-stock-kanban-capsule"));
    assert.equal(el.getAttribute("aria-haspopup"), "dialog");
    // 无存储 → 默认右下；jsdom rect 全零 → FALLBACK 38×26（1024−8−38 / 768−8−26）
    assert.equal(host.style.left, "978px", "host.left 默认右下");
    assert.equal(host.style.top, "734px", "host.top 默认右下");
    assert.equal(el.style.left, "", "pill 自身无 left");
    assert.equal(el.style.top, "", "pill 自身无 top");
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

test("capsule · 首挂定位走实测尺寸（host rect 桩；jsdom rect 恒零漏网回归）", () => {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  try {
    const host = h.document.createElement("div");
    h.document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const stack = h.document.createElement("div");
    stack.className = "skc-stack";
    shadow.append(stack);
    // 桩：模拟 host 入文档且有内容后的实测矩形（真实浏览器语义；jsdom 原生恒零测不出）
    host.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 150, bottom: 26, width: 150, height: 26,
    });
    const capsule = createCapsule({
      doc: h.document,
      win: h.window,
      storage: h.localStorage,
      shadow,
      store: {},
      onTogglePanel() {},
    });
    // 先入树再定位：createCapsule 返回时 el 已在 stack（空 host 的真实 rect 是 0，
    // 不入树则首挂定位恒走回退——真实浏览器漏网路径）
    assert.equal(capsule.el.parentElement, stack, "胶囊在定位前已入 .skc-stack");
    // 实测数学：1024−8−0−150 = 866；回退数学会是 978（=1024−8−38）
    assert.equal(host.style.left, "866px", "默认位 x 用实测宽度 150 而非回退 38");
    assert.equal(host.style.top, "734px", "默认位 y 用实测高度 26");
    capsule.dispose();
  } finally {
    h.cleanup();
  }
});

test("capsule · 拖拽超 slop：host 位移 + 落盘终点钳位坐标", () => {
  // 起始位预置在视口中段（默认右下位已贴 maxX 钳位缘，+20 无法观测）
  const { h, host, capsule, calls } = setupCapsule({ seed: { "dsh-stock-kanban:float-position": JSON.stringify({ x: 300, y: 300 }) } });
  try {
    assert.equal(host.style.left, "300px", "seed 位置钳位应用");
    h.firePointer(capsule.el, "pointerdown", { x: 100, y: 100 });
    h.firePointer(capsule.el, "pointermove", { x: 120, y: 100 }); // 超 slop 6
    h.firePointer(capsule.el, "pointerup", { x: 120, y: 100 });
    assert.equal(host.style.left, "320px", "host 相对初始值位移 +20px");
    assert.equal(host.style.top, "300px");
    assert.equal(
      h.localStorage.getItem("dsh-stock-kanban:float-position"),
      JSON.stringify({ x: 320, y: 300 }),
      "落盘 = 终点钳位坐标",
    );
    assert.equal(calls.filter((c) => c === "toggle").length, 0, "拖拽不触发 toggle");
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

test("capsule · 未过 slop 的轻点：toggle 一次、不落盘", () => {
  const { h, host, capsule, calls } = setupCapsule();
  try {
    h.firePointer(capsule.el, "pointerdown", { x: 100, y: 100 });
    h.firePointer(capsule.el, "pointermove", { x: 103, y: 100 }); // 位移 3 < slop 6
    h.firePointer(capsule.el, "pointerup", { x: 103, y: 100 });
    assert.equal(calls.filter((c) => c === "toggle").length, 1, "onTogglePanel 恰一次");
    assert.equal(h.localStorage.getItem("dsh-stock-kanban:float-position"), null, "位置不落盘");
    assert.equal(host.style.left, "978px", "host 不动");
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

test("capsule · pointercancel：复位不落盘、不触发 toggle", () => {
  const { h, host, capsule, calls } = setupCapsule();
  try {
    h.firePointer(capsule.el, "pointerdown", { x: 100, y: 100 });
    h.firePointer(capsule.el, "pointermove", { x: 120, y: 100 }); // 超 slop，进入拖拽
    h.firePointer(capsule.el, "pointercancel", { x: 120, y: 100 });
    assert.equal(calls.length, 0, "不触发 toggle");
    assert.equal(h.localStorage.getItem("dsh-stock-kanban:float-position"), null, "无新落盘");
    assert.equal(host.style.transform, "", "transform 已清");
    assert.equal(host.style.left, "978px", "host 复位回 rest");
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

test("capsule · Enter 键盘 toggle", () => {
  const { h, capsule, calls } = setupCapsule();
  try {
    capsule.el.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.equal(calls.filter((c) => c === "toggle").length, 1);
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

/* ---------------- list（Task 9：列表视图 vanilla） ---------------- */

const LIST_SNAPSHOT = (overrides = {}) => ({
  business: {
    rev: 1,
    settings: { privacyMode: false },
    symbols: [
      { id: "s1", market: "cn", code: "sh600519", name: "贵州茅台", quantity: 100, buyTarget: 1500 },
      { id: "s2", market: "cn", code: "sz000001", name: "平安银行" },
    ],
    driverKind: null,
    loaded: true,
  },
  quotes: {
    s1: { status: "ok", price: 1450, changePercent: 1.2, target: { status: "fresh", buyTriggered: true, sellTriggered: false } },
    s2: { status: "ok", price: 10.5, changePercent: -0.3, target: { status: "no-targets" } },
  },
  quoteMeta: { fetchedAt: 1, error: null },
  ui: {
    panelOpen: true,
    view: "list",
    detailId: null,
    showAdd: false,
    showSettings: false,
    lastMarket: "cn",
    holdingsOnly: false,
    maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: "s1",
  },
  toast: null,
  providers: null,
  ...overrides,
});

function setupList() {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document, window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.document = h.document;
  globalThis.window = h.window;
  globalThis.localStorage = h.localStorage;
  const actions = [];
  const store = {
    setLastMarket: (m) => actions.push(["setLastMarket", m]),
    setHoldingsOnly: (v) => actions.push(["setHoldingsOnly", v]),
    pollQuotes: () => actions.push(["pollQuotes"]),
    openDetail: (id) => actions.push(["openDetail", id]),
  };
  const list = createList({ store });
  const restoreGlobals = () => {
    for (const [k, v] of Object.entries(prevGlobals)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  };
  return { h, list, store, actions, restoreGlobals };
}

test("list · 快照渲染两行 + 触价标记 + 行点击 openDetail", () => {
  const { h, list, actions, restoreGlobals } = setupList();
  try {
    list.update(LIST_SNAPSHOT());
    const rows = list.el.querySelectorAll(".skc-row");
    assert.equal(rows.length, 2, "两标的渲染两行");
    assert.ok(list.el.querySelector(".skc-tab-active"), "市场 Tab 在位");
    assert.ok(rows[0].querySelector(".skc-badge-buy"), "触发买点标有 Ⓑ badge");
    rows[0].dispatchEvent(new h.window.MouseEvent("click", { bubbles: true }));
    assert.deepEqual(
      actions.filter((a) => a[0] === "openDetail").map((a) => a[1]),
      ["s1"],
      "行点击 → openDetail(id)",
    );
  } finally {
    list.dispose();
    restoreGlobals();
    h.cleanup();
  }
});

test("list · holdingsOnly 过滤 + 隐私遮蔽 pnl", () => {
  const { h, list, restoreGlobals } = setupList();
  try {
    const base = LIST_SNAPSHOT();
    list.update({
      ...base,
      business: { ...base.business, settings: { privacyMode: true } },
      ui: { ...base.ui, holdingsOnly: true },
    });
    const rows = list.el.querySelectorAll(".skc-row");
    assert.equal(rows.length, 1, "只看持仓 → 一行");
    const pnl = rows[0].querySelector(".skc-pnl-amt");
    assert.ok(pnl, "持仓行含 pnl 列");
    assert.equal(pnl.textContent, MASK, "隐私模式 pnl 遮蔽");
  } finally {
    list.dispose();
    restoreGlobals();
    h.cleanup();
  }
});

/* ---------------- detail/charts（Task 10：详情 + SVG 直建） ---------------- */

const MINUTE_POINTS = [
  { t: 1760000000, p: 10.0, v: 100 },
  { t: 1760000060, p: 10.2, v: 200 },
  { t: 1760000120, p: 10.1, v: 150 },
  { t: 1760000180, p: 10.4, v: 300 },
];

const CANDLES = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
  time: `2026-01-0${i}`,
  open: 10 + i * 0.1,
  close: 10 + i * 0.15,
  high: 10 + i * 0.2,
  low: 10 + i * 0.05,
  volume: 100 * i,
}));

test("charts · buildMinuteChart 返回 NS 直建 SVG（价格 polyline + 昨收虚线）", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document };
  globalThis.document = h.document;
  try {
    const el = buildMinuteChart({ points: MINUTE_POINTS, prevClose: 10.1 }, { dark: false });
    assert.equal(el.tagName, "svg", "根元素为 svg");
    assert.equal(el.namespaceURI, SVG_NS, "createElementNS 命名空间");
    assert.ok(el.querySelector("polyline"), "价格线 polyline 在位");
    const base = el.querySelector("line[stroke-dasharray]");
    assert.ok(base, "昨收虚线 line 在位");
    assert.ok(el.querySelectorAll("rect").length >= 1, "成交量柱在位");
  } finally {
    globalThis.document = prevGlobals.document;
    h.cleanup();
  }
});

test("charts · buildCandleChart：maVisible 关 MA5 时无 MA5 线", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document };
  globalThis.document = h.document;
  try {
    const el = buildCandleChart(CANDLES, { maVisible: { 5: false, 10: true, 20: true, 60: true }, dark: false });
    assert.equal(el.tagName, "svg");
    const mas = el.querySelectorAll("polyline");
    assert.equal(mas.length, 3, "MA10/20/60 三条");
    assert.equal(el.querySelector('polyline[stroke="#e8e8e8"]'), null, "MA5 色线不存在");
    const all = buildCandleChart(CANDLES, { maVisible: { 5: true, 10: true, 20: true, 60: true }, dark: false });
    assert.equal(all.querySelectorAll("polyline").length, 4, "全开四条");
  } finally {
    globalThis.document = prevGlobals.document;
    h.cleanup();
  }
});

test("detail · 空标的走「无此标的」回退文案", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document, window: globalThis.window };
  globalThis.document = h.document;
  globalThis.window = h.window;
  try {
    const actions = [];
    const store = {
      backToList: () => actions.push("backToList"),
      updateSymbol: async () => ({ ok: true }),
      removeSymbol: async () => ({ ok: true }),
      setToast: () => actions.push("setToast"),
      setMaVisible: () => actions.push("setMaVisible"),
    };
    const detail = createDetail({ store });
    detail.update({ ...LIST_SNAPSHOT(), ui: { ...LIST_SNAPSHOT().ui, view: "detail", detailId: "nope" } });
    assert.ok(detail.el.textContent.includes(t("detail.missing")), "空标的回退文案");
    detail.dispose();
  } finally {
    globalThis.document = prevGlobals.document;
    globalThis.window = prevGlobals.window;
    h.cleanup();
  }
});

/* ---------------- add/backup（Task 11：对话框 vanilla） ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("add · 输入 + Enter 触发搜索（fetch 桩）→ 结果行 → 点击提交", async () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch };
  const fetchCalls = [];
  globalThis.document = h.document;
  globalThis.window = h.window;
  globalThis.fetch = async (url, opts) => {
    fetchCalls.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        rows: [{ id: "cn:sh600519", market: "cn", code: "sh600519", name: "贵州茅台" }],
      }),
    };
  };
  try {
    const addCalls = [];
    const toasts = [];
    const store = {
      addSymbol: async (market, code, patch) => {
        addCalls.push([market, code, patch]);
        return { ok: true };
      },
      setToast: (text) => toasts.push(text),
      setShowAdd: () => {},
    };
    const add = createAdd({ store });
    add.update(LIST_SNAPSHOT());
    const queryInput = add.el.querySelector('input[data-field="query"]');
    assert.ok(queryInput, "搜索输入在位");
    queryInput.value = "贵州茅台";
    queryInput.dispatchEvent(new h.window.Event("input", { bubbles: true }));
    queryInput.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(20);
    const row = add.el.querySelector(".skc-add-row");
    assert.ok(row, "结果行渲染");
    assert.ok(fetchCalls.some((u) => u.includes("/stock-kanban/search")), "走搜索 API");
    row.dispatchEvent(new h.window.MouseEvent("click", { bubbles: true }));
    await sleep(10);
    assert.deepEqual(addCalls, [["cn", "sh600519", null]], "点击行 → store.addSymbol 提交");
    add.dispose();
  } finally {
    globalThis.document = prevGlobals.document;
    globalThis.window = prevGlobals.window;
    globalThis.fetch = prevGlobals.fetch;
    h.cleanup();
  }
});

test("backup · 导出 href（exportUrl）与文件 input 在位", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document, window: globalThis.window };
  globalThis.document = h.document;
  globalThis.window = h.window;
  try {
    const store = {
      importBackup: async () => ({ ok: true }),
      setToast: () => {},
    };
    const backup = createBackup({ store });
    backup.update(LIST_SNAPSHOT());
    const exportLink = backup.el.querySelector('a[href="/stock-kanban/export"]');
    assert.ok(exportLink, "导出链接在位");
    assert.ok(exportLink.hasAttribute("download"), "download 属性");
    assert.ok(backup.el.querySelector('input[type="file"]'), "文件 input 在位");
    backup.dispose();
  } finally {
    globalThis.document = prevGlobals.document;
    globalThis.window = prevGlobals.window;
    h.cleanup();
  }
});

/* ---------------- panel（Task 12：锚定/sheet/Esc/外点/footer） ---------------- */

function setupPanel({ viewport = [1024, 768] } = {}) {
  const h = createDomHarness();
  h.setViewport(h.window, viewport[0], viewport[1]);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const actions = [];
  const store = {
    closePanel: () => actions.push("closePanel"),
    setCapsuleSymbol: (id) => actions.push(["setCapsuleSymbol", id]),
    setPrivacy: (v) => actions.push(["setPrivacy", v]),
    setShowAdd: (v) => actions.push(["setShowAdd", v]),
    setShowSettings: (v) => actions.push(["setShowSettings", v]),
    pollQuotes: () => actions.push("pollQuotes"),
  };
  const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
  const views = { list: stubView(), detail: stubView(), add: stubView(), backup: stubView() };
  const panel = createPanel({ doc: h.document, win: h.window, store, views });
  shadow.append(panel.el);
  return { h, host, shadow, panel, store, views, actions };
}

test("panel · openFrom 下方优先弹出（top = anchor.top + height + 8）", () => {
  const { h, panel } = setupPanel();
  try {
    assert.equal(panel.isOpen(), false, "初始关闭");
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    assert.equal(panel.el.style.top, "234px", "200+26+8");
    assert.equal(panel.el.style.left, "100px", "left 随锚");
    assert.equal(panel.isOpen(), true, "openFrom 后开启");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("panel · 视口矮时翻转到锚上方", () => {
  const { h, panel } = setupPanel({ viewport: [1024, 300] });
  try {
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    // 下方放不下（234+160 > 292）→ 翻上方：200−160−8 = 32
    assert.equal(panel.el.style.top, "32px", "翻转到锚上方");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("panel · 窄视口 ≤480 转底部 sheet", () => {
  const { h, panel } = setupPanel({ viewport: [400, 700] });
  try {
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    assert.ok(panel.el.classList.contains("skc-panel--sheet"), "sheet 类在位");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("panel · 外点关闭与 Esc 关闭", () => {
  const { h, panel, actions } = setupPanel();
  try {
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    h.firePointer(h.document.body, "pointerdown", { x: 5, y: 5 }); // 面板外
    assert.equal(panel.isOpen(), false, "外点关闭");
    assert.ok(actions.includes("closePanel"), "走 store.closePanel");

    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    h.document.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(panel.isOpen(), false, "Esc 关闭");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("panel · footer 含关闭按钮且点击关闭", () => {
  const { h, panel } = setupPanel();
  try {
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    const closeBtn = panel.el.querySelector('.skc-footer [data-action="close"]');
    assert.ok(closeBtn, "footer 关闭按钮在位");
    closeBtn.dispatchEvent(new h.window.MouseEvent("click", { bubbles: true }));
    assert.equal(panel.isOpen(), false, "点击关闭");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

/* ---------------- main（Task 13：body shadow host + renderAll 漏斗） ---------------- */

function injectGlobals(h) {
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
  };
  Object.assign(globalThis, {
    document: h.document,
    window: h.window,
    localStorage: h.localStorage,
  });
  return () => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  };
}

/** 查询串隔离模块实例（沿旧 contract-harness 惯例：pathToFileURL 二次编码会产畸形 URL） */
async function importMainModule(tag) {
  return import(new URL(`../client/main.mjs?case=${tag}`, import.meta.url).href);
}

test("main · mountKanban 挂载契约（host/shadow/style/stack/dedupe/dispose）", async () => {
  const h = createDomHarness();
  const restoreGlobals = injectGlobals(h);
  try {
    const mod = await importMainModule("mount");
    const dispose = mod.mountKanban({ doc: h.document, win: h.window, storage: h.localStorage });
    const host = h.document.body.querySelector("[data-dsh-stock-kanban-float]");
    assert.ok(host, "host 挂载于 body");
    assert.ok(host.shadowRoot, "open shadow root");
    const style = host.shadowRoot.querySelector("style");
    assert.ok(style, "style 注入 shadow");
    assert.ok(style.textContent.includes("2147483000"), "z-index 常量在样式文本中");
    assert.ok(host.shadowRoot.querySelector(".skc-stack .skc-capsule"), "stack 装胶囊");
    assert.ok(host.shadowRoot.querySelector(".skc-panel"), "面板同 root");

    const dispose2 = mod.mountKanban({ doc: h.document, win: h.window, storage: h.localStorage });
    assert.equal(
      h.document.body.querySelectorAll("[data-dsh-stock-kanban-float]").length,
      1,
      "重复挂载 noop",
    );
    dispose2(); // noop dispose 不炸

    dispose();
    assert.equal(
      h.document.body.querySelector("[data-dsh-stock-kanban-float]"),
      null,
      "dispose 后 host 移除",
    );
    h.window.dispatchEvent(new h.window.Event("resize")); // listeners 已清：不再报错
  } finally {
    restoreGlobals();
    h.cleanup();
  }
});

test("main · inject 为空数组 + apply 无 effect 时直接挂载并透传 dispose", async () => {
  const h = createDomHarness();
  const restoreGlobals = injectGlobals(h);
  try {
    const mod = await importMainModule("apply");
    assert.deepEqual(mod.inject, [], "inject lockstep：[]");
    const dispose = mod.apply({
      document: h.document,
      window: h.window,
      storage: h.localStorage,
    });
    assert.equal(typeof dispose, "function", "透传 dispose");
    assert.ok(h.document.body.querySelector("[data-dsh-stock-kanban-float]"), "apply 挂载");
    dispose();
    assert.equal(h.document.body.querySelector("[data-dsh-stock-kanban-float]"), null);
  } finally {
    restoreGlobals();
    h.cleanup();
  }
});

test("main · apply 有 effect 时经 ctx.effect 注册", async () => {
  const h = createDomHarness();
  const restoreGlobals = injectGlobals(h);
  try {
    const mod = await importMainModule("effect");
    let effectLabel = null;
    let effectDispose = null;
    const returned = mod.apply({
      document: h.document,
      window: h.window,
      storage: h.localStorage,
      effect(fn, label) {
        effectLabel = label;
        effectDispose = fn();
        return effectDispose;
      },
    });
    assert.equal(effectLabel, "dsh-stock-kanban: float shell", "effect 标签");
    assert.equal(returned, effectDispose, "apply 返回 effect 的返回值");
    assert.ok(h.document.body.querySelector("[data-dsh-stock-kanban-float]"));
    effectDispose();
    assert.equal(h.document.body.querySelector("[data-dsh-stock-kanban-float]"), null);
  } finally {
    restoreGlobals();
    h.cleanup();
  }
});

