/**
 * 渲染切片广播——跨 tick 节点身份回归（渲染切片广播 Task 2/3/4 累积）。
 * 守住「不重建」承诺：守卫补丁退役后（detail 跳绘/光标恢复、list 焦点抢救/拖拽冻结），
 * 节点身份断言是唯一防回归锚（实施计划 Task 7 / verification §12.25 的单测对应物）。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createList } from "../client/list.mjs";
import { createDetail } from "../client/detail.mjs";
import { createPanel } from "../client/panel.mjs";

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

const SNAPB = (overrides = {}) => ({
  business: { rev: 1, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: true },
  quotes: {},
  quoteMeta: { fetchedAt: null, error: null },
  ui: {
    panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false,
    lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: null, quotaMerge: true, quotaCapable: false,
  },
  toast: null,
  providers: null,
  ...overrides,
});

const mkSym = (id, sort) => ({
  id, market: "cn", code: id, name: `标的${id}`, quantity: null, avgCost: null,
  buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort,
});

test("list · 拖拽中行情 tick：零节点增删、价格原位更新（§12.24 patch-only 修订）", () => {
  const h = createDomHarness();
  const prevDoc = globalThis.document;
  globalThis.document = h.document;
  let list = null;
  try {
    const symbols = [mkSym("a", 1), mkSym("b", 2)];
    const store = {
      getState: () => ({ business: { rev: 1, settings: { privacyMode: false }, loaded: true, symbols }, ui: { panelOpen: true, view: "list", lastMarket: "cn", holdingsOnly: false } }),
      setLastMarket() {}, pollQuotes() {}, openDetail() {}, setHoldingsOnly() {}, reorderSymbols() {},
    };
    list = createList({ store });
    h.document.body.append(list.el);
    list.update(SNAPB({ business: { rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true, symbols } }));
    assert.equal(list.el.querySelectorAll(".skc-row").length, 2, "前置：两行在位");
    const rowA = list.el.querySelector('.skc-row[data-id="a"]');
    const rowB = list.el.querySelector('.skc-row[data-id="b"]');

    // 起拖（mouse：位移 20 > slop 6 → lift；firePointer pointerId 恒 1）
    h.firePointer(rowB, "pointerdown", { x: 100, y: 100 });
    h.firePointer(rowB, "pointermove", { x: 120, y: 100 });

    // 拖拽中 quotes tick：patch-only（零节点增删，文本原位写）
    list.update(SNAPB({
      business: { rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true, symbols },
      quotes: { a: { id: "a", status: "ok", price: 99.5, changePercent: -1.2, quoteTime: "15:00:00" } },
      changed: { quotes: new Set(["a"]), business: false, ui: [], quoteMetaError: false },
    }));
    assert.equal(list.el.querySelectorAll(".skc-row").length, 2, "拖拽中零节点增删");
    assert.equal(list.el.querySelector('.skc-row[data-id="a"]'), rowA, "行 A 身份不变");
    assert.equal(list.el.querySelector('.skc-row[data-id="b"]'), rowB, "行 B 身份不变");
    assert.match(rowA?.querySelector(".skc-row-price")?.children[0]?.textContent ?? "", /99\.50/, "价格已原位更新");

    // 松手：拖拽内无换槽（y 未动）→ 顺序不变、不触发 reorder、行区完整
    h.firePointer(rowB, "pointerup", { x: 120, y: 100 });
    assert.equal(list.el.querySelectorAll(".skc-row").length, 2, "endDrag 后行区完整");
  } finally {
    list?.dispose();
    globalThis.document = prevDoc;
    h.cleanup();
  }
});

/* ---------------- detail（Task 3：骨架静态化 + 活区 patch + 图表按数据引用替换） ---------------- */

const DETAIL_SYMBOLS = [
  { id: "s1", market: "us", code: "AAPL", name: "Apple", quoteCurrency: "USD" },
  { id: "s2", market: "us", code: "MSFT", name: "Microsoft", quoteCurrency: "USD" },
];

const detailSnap = (overrides = {}) => SNAPB({
  business: { rev: 1, settings: { privacyMode: false }, symbols: DETAIL_SYMBOLS, driverKind: null, loaded: true },
  ui: { ...SNAPB().ui, view: "detail", detailId: "s1" },
  quotes: { s1: { id: "s1", status: "ok", price: 120, changePercent: 1, name: "Apple", quoteTime: "15:00:00", fetchedAt: 1 } },
  ...overrides,
});

const detailTick = (base, price) => SNAPB({
  business: base.business,
  ui: base.ui,
  quotes: { s1: { ...base.quotes.s1, price } },
  changed: { quotes: new Set(["s1"]), business: false, ui: [], quoteMetaError: false },
});

/** detail 公共夹具：fetch stub（分时图）+ 入文档树 + 首帧 */
async function setupDetail(h) {
  const prevDoc = globalThis.document;
  globalThis.document = h.document;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (path) => {
    if (String(path).startsWith("/stock-kanban/minute")) {
      return { ok: true, json: async () => ({ points: [{ t: 1, p: 10, v: 1 }, { t: 2, p: 10.5, v: 2 }], prevClose: 10 }) };
    }
    throw new Error(`stub-fetch: ${String(path)}`);
  };
  const store = {
    backToList() {}, updateSymbol: async () => ({ ok: true }), removeSymbol: async () => ({ ok: true }),
    setToast() {}, setMaVisible() {},
  };
  const detail = createDetail({ store, win: h.window });
  h.document.body.append(detail.el); // jsdom focus() 仅对已入文档树的元素生效
  return {
    detail,
    async mount() {
      const base = detailSnap();
      detail.update(base);
      await sleepMs(10); // 图表异步加载 + 活区重画
      return base;
    },
    cleanup() {
      detail?.dispose();
      globalThis.fetch = realFetch;
      globalThis.document = prevDoc;
    },
  };
}

test("detail · quotes tick：图表 SVG 与输入框身份不变、报价行原位更新", async () => {
  const h = createDomHarness();
  let fixture = null;
  try {
    fixture = await setupDetail(h);
    const base = await fixture.mount();
    const svg1 = fixture.detail.el.querySelector("svg.skc-chart");
    const input1 = fixture.detail.el.querySelector('input[data-field="quantity"]');
    assert.ok(svg1, "图表在位");
    assert.ok(input1, "数量输入在位");
    fixture.detail.update(detailTick(base, 121));
    assert.equal(fixture.detail.el.querySelector("svg.skc-chart"), svg1, "quotes tick 图表零改动（数据引用未变）");
    assert.equal(fixture.detail.el.querySelector('input[data-field="quantity"]'), input1, "输入框身份不变");
    assert.match(fixture.detail.el.querySelector(".skc-quote-price")?.textContent ?? "", /121\.00/, "报价行原位更新");
  } finally {
    fixture?.cleanup();
    h.cleanup();
  }
});

test("detail · detailId 切换 → 骨架重建（输入框换新，不残留旧标的输入框）", async () => {
  const h = createDomHarness();
  let fixture = null;
  try {
    fixture = await setupDetail(h);
    await fixture.mount();
    const inputA = fixture.detail.el.querySelector('input[data-field="quantity"]');
    assert.ok(inputA, "标的 A 输入在位");
    fixture.detail.update(detailSnap({
      ui: { ...SNAPB().ui, view: "detail", detailId: "s2" },
      quotes: { s2: { id: "s2", status: "ok", price: 300, changePercent: 0.5, name: "Microsoft", quoteTime: "15:00:00", fetchedAt: 1 } },
      changed: { quotes: new Set(["s2"]), business: false, ui: ["view", "detailId"], quoteMetaError: false },
    }));
    const inputB = fixture.detail.el.querySelector('input[data-field="quantity"]');
    assert.ok(inputB, "标的 B 输入在位");
    assert.notEqual(inputB, inputA, "切换标的重建骨架（输入框随骨架换新）");
  } finally {
    fixture?.cleanup();
    h.cleanup();
  }
});

test("detail · list 视图 quotes tick → detail 层 DOM 不动（空转早退）", async () => {
  const h = createDomHarness();
  let fixture = null;
  try {
    fixture = await setupDetail(h);
    // 同步首帧：list 视图（detailId=null）→ 空态
    fixture.detail.update(SNAPB());
    const node0 = fixture.detail.el.firstChild;
    assert.ok(node0, "空态占位在位");
    fixture.detail.update(SNAPB({
      quotes: { x: { id: "x", status: "ok", price: 1, changePercent: 0, name: "X", quoteTime: "15:00:00", fetchedAt: 1 } },
      changed: { quotes: new Set(["x"]), business: false, ui: [], quoteMetaError: false },
    }));
    assert.equal(fixture.detail.el.firstChild, node0, "list 视图 tick 不触 detail DOM（不再白做空态重建）");
  } finally {
    fixture?.cleanup();
    h.cleanup();
  }
});

/* ---------------- panel（Task 4：chrome 门控 + toast 轻路径） ---------------- */

const PANEL_SYMBOLS = [
  { id: "c1", market: "cn", code: "c1", name: "标的c1", quantity: null, avgCost: null, buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort: 100 },
  { id: "c2", market: "cn", code: "c2", name: "标的c2", quantity: null, avgCost: null, buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort: 200 },
  { id: "h1", market: "hk", code: "h1", name: "标的h1", quantity: null, avgCost: null, buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort: 100 },
  { id: "u1", market: "us", code: "u1", name: "标的u1", quantity: null, avgCost: null, buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort: 200 },
  { id: "x1", market: "crypto", code: "x1", name: "标的x1", quantity: null, avgCost: null, buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort: 100 },
];

const PANEL_SNAP = (overrides = {}) => SNAPB({
  business: { rev: 1, settings: { privacyMode: false }, symbols: PANEL_SYMBOLS, driverKind: null, loaded: true },
  ui: { ...SNAPB().ui, capsuleSymbolId: "c1" },
  ...overrides,
});

const panelChanged = (over = {}) => ({ quotes: new Set(), business: false, ui: [], quoteMetaError: false, ...over });

function setupPanelFixture(h) {
  h.setViewport(h.window, 1024, 768);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
  const store = {
    closePanel() {}, setCapsuleSymbol() {}, setPrivacy() {}, setShowAdd() {},
    setShowSettings() {}, pollQuotes() {}, setQuotaMerge() {}, setHoldingsOnly() {},
  };
  const views = { list: stubView(), detail: stubView(), add: stubView(), backup: stubView() };
  const panel = createPanel({ doc: h.document, win: h.window, store, views });
  shadow.append(panel.el);
  panel.openFrom({ left: 10, top: 10, width: 70, height: 26 });
  return { panel, host };
}

const pickerOptions = (panel) => [...panel.el.querySelectorAll("select.skc-select option")];

test("panel · quotes-only tick：picker option 节点身份不变（chrome 不随行情重建）", () => {
  const h = createDomHarness();
  let fx = null;
  try {
    fx = setupPanelFixture(h);
    fx.panel.update(PANEL_SNAP());
    const opts1 = pickerOptions(fx.panel);
    assert.equal(opts1.length, 5, "前置：5 个 option（无数据市场不建组）");
    fx.panel.update(PANEL_SNAP({
      business: PANEL_SNAP().business, // 同引用：结构未变
      quotes: { c1: { id: "c1", status: "ok", price: 1, changePercent: 0, name: "标的c1", quoteTime: "15:00:00", fetchedAt: 1 } },
      changed: panelChanged({ quotes: new Set(["c1"]) }),
    }));
    const opts2 = pickerOptions(fx.panel);
    assert.equal(opts2.length, opts1.length, "tick 后 option 数不变");
    assert.equal(opts2.every((o, i) => o === opts1[i]), true, "option 节点身份不变（不随行情 tick 重建）");
  } finally {
    fx?.panel.dispose();
    fx?.host.remove();
    h.cleanup();
  }
});

test("panel · business 变化 → picker 整段重建且序 = A-H-U-C + sort 升序", () => {
  const h = createDomHarness();
  let fx = null;
  try {
    fx = setupPanelFixture(h);
    fx.panel.update(PANEL_SNAP());
    const opts1 = pickerOptions(fx.panel);
    const biz2 = { ...PANEL_SNAP().business, rev: 2 };
    fx.panel.update(PANEL_SNAP({
      business: biz2,
      changed: panelChanged({ business: true }),
    }));
    const opts2 = pickerOptions(fx.panel);
    assert.equal(opts2.every((o, i) => o !== opts1[i]), true, "rev 变化 → picker 重建");
    assert.deepEqual(opts2.map((o) => o.value), ["c1", "c2", "h1", "u1", "x1"], "组间 A-H-U-C、组内 sort 升序");
  } finally {
    fx?.panel.dispose();
    fx?.host.remove();
    h.cleanup();
  }
});

test("panel · toast 轻路径：显示/清除不改 picker 节点（不依赖全 render）", () => {
  const h = createDomHarness();
  let fx = null;
  try {
    fx = setupPanelFixture(h);
    fx.panel.update(PANEL_SNAP());
    const opts1 = pickerOptions(fx.panel);
    fx.panel.update(PANEL_SNAP({ toast: { text: "已保存", at: 1 }, changed: panelChanged() }));
    const toastEl = fx.panel.el.querySelector(".skc-toast");
    assert.equal(toastEl.hidden, false, "toast 显示（空切片 emit 也刷新）");
    assert.equal(toastEl.textContent, "已保存");
    fx.panel.update(PANEL_SNAP({ toast: null, changed: panelChanged() }));
    assert.equal(toastEl.hidden, true, "toast 清除（空切片 emit 也刷新）");
    const opts2 = pickerOptions(fx.panel);
    assert.equal(opts2.every((o, i) => o === opts1[i]), true, "toast 全程 picker 节点身份不变");
  } finally {
    fx?.panel.dispose();
    fx?.host.remove();
    h.cleanup();
  }
});
