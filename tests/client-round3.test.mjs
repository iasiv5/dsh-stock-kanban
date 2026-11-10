/**
 * 第三轮排版回归（2026-11-10，docs/ui-redesign.md §8）：
 *   - 面板 360px 宽（第四轮）；字号阶梯无 10px；图表轴字号 ≥ 11 且宽度可注入；
 *   - 对话框打开时面板切到流内模式（skc-panel--dialog），上升沿才触发搜索框聚焦；
 *   - 添加对话框：未搜索的教学空态 / 无匹配的恢复路径 / 直连代码的内联错误与重复提示；
 *   - 搜索竞态：慢响应不覆盖最新结果；
 *   - 客户端 store：重复添加不误报「数据已被其他页面更新」，版本冲突仍走刷新 + 提示；
 *   - 列表行具备 role=button；新增文案 key zh/en 双侧存在。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { FLOAT_STYLE_TEXT } from "../client/styles.mjs";
import { iconEl } from "../client/icons.mjs";
import { createPanel } from "../client/panel.mjs";
import { createAdd } from "../client/add.mjs";
import { createList } from "../client/list.mjs";
import { createStore } from "../client/store.mjs";
import { buildMinuteChart } from "../client/charts.mjs";
import { t, tErr, DICT_KEYS } from "../client/i18n.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 全局注入 DOM + 可替换的 fetch，用毕还原 */
function withGlobals(fetchImpl) {
  const h = createDomHarness();
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.document = h.document;
  globalThis.window = h.window;
  globalThis.localStorage = h.localStorage;
  globalThis.fetch = fetchImpl;
  return {
    h,
    restore() {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete globalThis[k];
        else globalThis[k] = v;
      }
      h.cleanup();
    },
  };
}

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

const SNAP = (overrides = {}) => ({
  business: { rev: 1, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: true },
  quotes: {},
  quoteMeta: { fetchedAt: null, error: null },
  ui: {
    panelOpen: true, view: "list", detailId: null, showAdd: true, showSettings: false,
    lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: null,
  },
  toast: null,
  providers: null,
  ...overrides,
});

const fire = (h, input, value) => {
  input.value = value;
  input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
};

test("styles · 面板宽：一级 360px、二级（详情/添加/设置）按 data-surface 展开 420px；字号阶梯无 10px；对话框流内模式规则在位", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(s.includes("width:min(var(--skc-panel-w),calc(100vw - 16px))"), "面板宽由表面变量决定（视口收窄）");
  assert.ok(s.includes("--skc-panel-w:360px"), "一级列表 360px（第四轮）");
  assert.ok(s.includes('.skc-panel[data-surface="dialog"]') && s.includes('.skc-panel[data-surface="detail"]'), "二级表面选择器在位");
  assert.ok(s.includes("--skc-panel-w:420px"), "二级视图展开 420px（第五轮）");
  assert.equal(/font-size:\s*10(\.5)?px/.test(s), false, "字号阶梯无 10px（辅助文案不小于 11px）");
  assert.ok(s.includes(".skc-panel--dialog > .skc-header"), "对话框模式隐藏面板头");
  assert.ok(s.includes(".skc-dialog-layer{display:flex"), "对话框层为流内布局");
});

test("panel · 对话框打开切到 skc-panel--dialog；onOpen 仅在上升沿触发", () => {
  const g = withGlobals(async () => okJson({}));
  try {
    const h = g.h;
    h.setViewport(h.window, 1024, 768);
    const host = h.document.createElement("div");
    h.document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    let opened = 0;
    const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
    const views = {
      list: stubView(),
      detail: stubView(),
      add: { ...stubView(), onOpen: () => { opened += 1; } },
      backup: stubView(),
    };
    const noop = () => {};
    const store = {
      closePanel: noop, setCapsuleSymbol: noop, setPrivacy: noop, setShowAdd: noop,
      setShowSettings: noop, pollQuotes: noop, setQuotaMerge: noop, setHoldingsOnly: noop,
    };
    const panel = createPanel({ doc: h.document, win: h.window, store, views });
    shadow.append(panel.el);
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    panel.update(SNAP({ ui: { ...SNAP().ui, showAdd: false } }));
    assert.equal(panel.el.classList.contains("skc-panel--dialog"), false, "列表态不带对话框类");
    panel.update(SNAP({ ui: { ...SNAP().ui, showAdd: true } }));
    assert.equal(panel.el.classList.contains("skc-panel--dialog"), true, "添加对话框打开 → 对话框模式");
    panel.update(SNAP({ ui: { ...SNAP().ui, showAdd: true } }));
    assert.equal(opened, 1, "onOpen 仅在上升沿触发一次（后续轮询不重复抢焦点）");
    panel.dispose();
  } finally {
    g.restore();
  }
});

test("add · 未搜索给教学示例；无匹配给恢复路径并回显关键词", async () => {
  const g = withGlobals(async () => okJson({ rows: [], error: null }));
  let add = null;
  try {
    const store = { addSymbol: async () => ({ ok: true }), setToast() {}, setShowAdd() {} };
    add = createAdd({ store });
    add.update(SNAP());
    const guide = add.el.querySelector(".skc-guide");
    assert.ok(guide, "未搜索 → 教学空态");
    assert.equal(guide.textContent, t("add.guide.cn"), "示例文案随市场");
    const input = add.el.querySelector('input[data-field="query"]');
    fire(g.h, input, "zzz");
    input.dispatchEvent(new g.h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(20);
    assert.equal(add.el.querySelector(".skc-guide").textContent, t("add.no-match", { q: "zzz" }), "无匹配 → 恢复路径并回显关键词");
  } finally {
    add?.dispose();
    g.restore();
  }
});

test("add · 直连代码：校验失败与重复以内联错误呈现，输入即清除", async () => {
  const g = withGlobals(async () => okJson({ rows: [], error: null }));
  let add = null;
  try {
    const responses = [
      { ok: false, error: { status: 422, body: { error: "invalid-identity" } } },
      { ok: false, error: { status: 409, body: { error: "duplicate" } } },
    ];
    const store = { addSymbol: async () => responses.shift(), setToast() {}, setShowAdd() {} };
    add = createAdd({ store });
    add.update(SNAP());
    const direct = add.el.querySelector('input[data-field="direct"]');
    const btn = add.el.querySelector(".skc-direct .skc-btn");
    fire(g.h, direct, "xx");
    btn.click();
    await sleep(10);
    const first = add.el.querySelector(".skc-direct .skc-error");
    assert.ok(first, "422 → 内联错误（不只靠底部 toast）");
    assert.equal(first.textContent, t("add.not-found", { e: tErr("invalid-identity") }), "错误文案说明问题与恢复");
    fire(g.h, direct, "xxy");
    assert.equal(add.el.querySelector(".skc-direct .skc-error"), null, "输入即清除内联错误");
    btn.click();
    await sleep(10);
    assert.equal(add.el.querySelector(".skc-direct .skc-error").textContent, t("toast.duplicate"), "409 duplicate → 明确提示");
  } finally {
    add?.dispose();
    g.restore();
  }
});

test("add · 搜索竞态：慢响应不覆盖最新一次搜索结果", async () => {
  const pending = [];
  const g = withGlobals((url) => {
    const q = new URL(String(url), "http://skc.test").searchParams.get("q");
    return new Promise((resolve) => {
      pending.push({ q, resolve: (rows) => resolve(okJson({ rows, error: null })) });
    });
  });
  let add = null;
  try {
    const store = { addSymbol: async () => ({ ok: true }), setToast() {}, setShowAdd() {} };
    add = createAdd({ store });
    add.update(SNAP());
    const input = add.el.querySelector('input[data-field="query"]');
    const rowsFor = (q) => [{ id: `cn:sz${q}`, market: "cn", code: `sz${q}`, name: `NAME-${q}`, kind: "stock", quoteCurrency: "CNY" }];
    fire(g.h, input, "aa");
    await sleep(320); // 越过防抖 → 第一次搜索在途（慢）
    fire(g.h, input, "bb");
    await sleep(320); // 第二次搜索在途（快）
    pending.find((p) => p.q === "bb").resolve(rowsFor("bb"));
    await sleep(10);
    assert.equal(add.el.querySelector(".skc-add-name").textContent, "NAME-bb", "最新结果先到即显示");
    pending.find((p) => p.q === "aa").resolve(rowsFor("aa"));
    await sleep(10);
    assert.equal(add.el.querySelector(".skc-add-name").textContent, "NAME-bb", "过期的慢响应被丢弃");
  } finally {
    add?.dispose();
    g.restore();
  }
});

test("store · 重复添加：不刷新状态、不误报「数据已被其他页面更新」", async () => {
  const calls = [];
  const g = withGlobals(async (url) => {
    calls.push(String(url));
    return { ok: false, status: 409, json: async () => ({ error: "duplicate" }) };
  });
  try {
    const store = createStore({ getItem: () => null, setItem() {} });
    const result = await store.addSymbol("cn", "sh600519", null);
    assert.equal(result.ok, false);
    assert.equal(result.error.status, 409);
    assert.deepEqual(calls, ["/stock-kanban/symbols/add"], "重复 → 只一次请求（不 refreshState）");
    assert.equal(store.getState().toast, null, "addSymbol 静默：由添加对话框自行呈现");
    store.dispose();
  } finally {
    g.restore();
  }
});

test("store · 版本冲突 409（非重复）仍刷新状态并提示冲突", async () => {
  const calls = [];
  const g = withGlobals(async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/symbols/add")) return { ok: false, status: 409, json: async () => ({ error: "rev-conflict" }) };
    return okJson({ rev: 2, settings: { privacyMode: false }, symbols: [], driverKind: "file" });
  });
  try {
    const store = createStore({ getItem: () => null, setItem() {} });
    const result = await store.addSymbol("cn", "sh600519", null);
    assert.equal(result.conflict, true, "版本冲突标记保留");
    assert.ok(calls.some((u) => u.endsWith("/stock-kanban/state")), "冲突 → 刷新状态");
    assert.equal(store.getState().toast?.text, t("toast.conflict"), "冲突提示");
    store.dispose();
  } finally {
    g.restore();
  }
});

test("list · 行具备 role=button（读屏语义）", () => {
  const g = withGlobals(async () => okJson({}));
  let list = null;
  try {
    list = createList({ store: { setLastMarket() {}, pollQuotes() {}, openDetail() {}, setHoldingsOnly() {} } });
    list.update(SNAP({
      business: {
        rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true,
        symbols: [{ id: "cn:sh600519", market: "cn", code: "sh600519", name: "贵州茅台", quantity: null, avgCost: null }],
      },
      ui: { ...SNAP().ui, showAdd: false },
    }));
    assert.equal(list.el.querySelector(".skc-row").getAttribute("role"), "button");
  } finally {
    list?.dispose();
    g.restore();
  }
});

test("charts · 轴字号 ≥ 11px 且宽度可注入（随面板宽自适应）", () => {
  const g = withGlobals(async () => okJson({}));
  try {
    const points = Array.from({ length: 30 }, (_, i) => ({ t: 1700000000000 + i * 60000, p: 8 + i * 0.01, v: 1000 }));
    const svg = buildMinuteChart({ points, prevClose: 8.1 }, { width: 280 });
    assert.equal(svg.getAttribute("width"), "280", "宽度可注入");
    const texts = [...svg.querySelectorAll("text")];
    assert.ok(texts.length >= 3, "时间轴标注在位");
    for (const tx of texts) {
      assert.ok(Number(tx.getAttribute("font-size")) >= 11, `轴字号 ≥ 11（实际 ${tx.getAttribute("font-size")}）`);
    }
  } finally {
    g.restore();
  }
});

test("i18n · 第三轮新增 key zh/en 双侧存在", () => {
  for (const key of ["add.guide.cn", "add.guide.hk", "add.guide.us", "add.guide.crypto", "backup.export.hint", "backup.importing"]) {
    assert.ok(DICT_KEYS.zh.includes(key), `zh 含 ${key}`);
    assert.ok(DICT_KEYS.en.includes(key), `en 含 ${key}`);
  }
});

test("list · 轮询重绘保留键盘焦点（焦点行被替换后归还给同 id 的新行）", () => {
  const g = withGlobals(async () => okJson({}));
  let list = null;
  try {
    const h = g.h;
    list = createList({ store: { setLastMarket() {}, pollQuotes() {}, openDetail() {}, setHoldingsOnly() {} } });
    h.document.body.append(list.el);
    const snap = SNAP({
      business: {
        rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true,
        symbols: [
          { id: "cn:sh600519", market: "cn", code: "sh600519", name: "贵州茅台", quantity: null, avgCost: null },
          { id: "cn:sz000001", market: "cn", code: "sz000001", name: "平安银行", quantity: null, avgCost: null },
        ],
      },
      ui: { ...SNAP().ui, showAdd: false },
    });
    list.update(snap);
    const second = list.el.querySelectorAll(".skc-row")[1];
    second.focus();
    assert.equal(h.document.activeElement, second, "前置：第二行获得焦点");
    list.update(snap); // 轮询重绘
    const again = list.el.querySelectorAll(".skc-row")[1];
    assert.notEqual(again, second, "行节点已被替换");
    assert.equal(h.document.activeElement, again, "焦点归还同 id 的新行");
  } finally {
    list?.dispose();
    g.restore();
  }
});

test("add · 轮询重绘保留结果行焦点（按 id 归还）", async () => {
  const rows = [
    { id: "cn:sz000001", market: "cn", code: "sz000001", name: "平安银行", kind: "stock", quoteCurrency: "CNY" },
    { id: "cn:sh600519", market: "cn", code: "sh600519", name: "贵州茅台", kind: "stock", quoteCurrency: "CNY" },
  ];
  const g = withGlobals(async () => okJson({ rows, error: null }));
  let add = null;
  try {
    const h = g.h;
    const store = { addSymbol: async () => ({ ok: true }), setToast() {}, setShowAdd() {} };
    add = createAdd({ store });
    h.document.body.append(add.el);
    add.update(SNAP());
    const input = add.el.querySelector('input[data-field="query"]');
    fire(h, input, "pa");
    input.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await sleep(20);
    const second = add.el.querySelectorAll(".skc-add-row")[1];
    second.focus();
    assert.equal(h.document.activeElement, second, "前置：第二个结果行获得焦点");
    add.update(SNAP()); // 轮询重绘（结果保持）
    const again = add.el.querySelectorAll(".skc-add-row")[1];
    assert.notEqual(again, second, "结果行节点已被替换");
    assert.equal(h.document.activeElement, again, "焦点归还同 id 的结果行");
  } finally {
    add?.dispose();
    g.restore();
  }
});

test("icons · settings 为齿轮（6 齿外轮廓 path + 中心孔 circle；第四轮由滑杆换齿轮）", () => {
  const h = createDomHarness();
  try {
    const svg = iconEl(h.document, "settings");
    assert.deepEqual([...svg.childNodes].map((n) => n.tagName), ["path", "circle"], "外轮廓 + 中心孔");
    const d = svg.querySelector("path").getAttribute("d");
    assert.ok(d.startsWith("M") && d.endsWith("Z"), "外轮廓为闭合路径");
    assert.equal((d.match(/[LM]/g) ?? []).length, 30, "6 齿 × 5 个节点（每齿 4 个角点 + 齿根中点）");
  } finally {
    h.cleanup();
  }
});

test("panel · 设置不渲染合并显示额度开关（第四轮隐藏）：额度在线也无开关，设置仅余备份与说明", () => {
  const g = withGlobals(async () => okJson({}));
  let panel = null;
  try {
    const h = g.h;
    h.setViewport(h.window, 1024, 768);
    const host = h.document.createElement("div");
    h.document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const noop = () => {};
    const backupEl = h.document.createElement("div");
    backupEl.className = "skc-backup";
    const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
    const store = {
      closePanel: noop, setCapsuleSymbol: noop, setPrivacy: noop, setShowAdd: noop,
      setShowSettings: noop, pollQuotes: noop, setQuotaMerge: noop, setHoldingsOnly: noop,
    };
    const views = {
      list: stubView(),
      detail: stubView(),
      add: stubView(),
      backup: { el: backupEl, update() {}, dispose() {} },
    };
    panel = createPanel({ doc: h.document, win: h.window, store, views });
    shadow.append(panel.el);
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    panel.update(SNAP({ ui: { ...SNAP().ui, showAdd: false, showSettings: true, quotaCapable: true, quotaMerge: true } }));
    assert.equal(panel.el.querySelector('[data-action="quota-merge"]'), null, "额度在线也不渲染合并开关");
    const settings = panel.el.querySelector(".skc-dialog--settings");
    assert.ok(settings, "设置对话框在位");
    assert.ok(settings.querySelector(".skc-backup"), "备份区在位");
    assert.ok(settings.querySelector(".skc-setting-notes"), "页尾说明在位");
    assert.equal(settings.querySelectorAll(".skc-setting-row").length, 0, "行式开关行已退役");
  } finally {
    panel?.dispose();
    g.restore();
  }
});

test("panel · 表面 data-surface 随视图切换：列表 / 详情 / 添加 / 设置（二级宽度由 CSS 展开）", () => {
  const g = withGlobals(async () => okJson({}));
  let panel = null;
  try {
    const h = g.h;
    h.setViewport(h.window, 1024, 768);
    const host = h.document.createElement("div");
    h.document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const noop = () => {};
    const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
    const store = {
      closePanel: noop, setCapsuleSymbol: noop, setPrivacy: noop, setShowAdd: noop,
      setShowSettings: noop, pollQuotes: noop, setQuotaMerge: noop, setHoldingsOnly: noop,
    };
    panel = createPanel({
      doc: h.document, win: h.window, store,
      views: { list: stubView(), detail: stubView(), add: stubView(), backup: stubView() },
    });
    shadow.append(panel.el);
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    const base = SNAP().ui;
    panel.update(SNAP({ ui: { ...base, view: "list", showAdd: false, showSettings: false } }));
    assert.equal(panel.el.dataset.surface, "list", "列表 → 一级表面（360）");
    panel.update(SNAP({ ui: { ...base, view: "detail", detailId: "s1", showAdd: false, showSettings: false } }));
    assert.equal(panel.el.dataset.surface, "detail", "详情 → 二级表面（420）");
    panel.update(SNAP({ ui: { ...base, view: "list", showAdd: true, showSettings: false } }));
    assert.equal(panel.el.dataset.surface, "dialog", "添加对话框 → 二级表面（420）");
    panel.update(SNAP({ ui: { ...base, view: "list", showAdd: false, showSettings: true } }));
    assert.equal(panel.el.dataset.surface, "dialog", "设置对话框 → 二级表面（420）");
  } finally {
    panel?.dispose();
    g.restore();
  }
});
