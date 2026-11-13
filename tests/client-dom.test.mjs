import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { FLOAT_STYLE_TEXT } from "../client/styles.mjs";
import { createCapsule } from "../client/capsule.mjs";
import { createQuotaEmbed } from "../client/quota-embed.mjs";
import { createList } from "../client/list.mjs";
import { createDetail } from "../client/detail.mjs";
import { createAdd } from "../client/add.mjs";
import { createBackup } from "../client/backup.mjs";
import { createPanel } from "../client/panel.mjs";
import { setLang, t } from "../client/i18n.mjs";
import { buildMinuteChart, buildCandleChart } from "../client/charts.mjs";
import { MASK } from "../client/fmt.mjs";

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
  // ⑧ 合并胶囊 stack（计划 B 缝）
  assert.ok(
    s.includes(".skc-stack { display:flex; flex-direction:column; gap:6px; }"),
    ".skc-stack 规则",
  );
  // 2026-11-10 溢出修复：胶囊不随宿主被视口剩余空间压窄、分区不参与 flex 压缩
  assert.ok(
    s.includes(".skc-stack{align-items:flex-start}"),
    "stack 不拉伸胶囊（胶囊按内容全宽渲染）",
  );
  assert.ok(
    s.includes(".skc-capsule [data-seg]{flex-shrink:0}"),
    "分区 flex-shrink:0（文案宽度恒为内容宽）",
  );
  assert.ok(
    s.includes(".skc-capsule{width:max-content}"),
    "胶囊永不窄于内容（width:max-content）",
  );
});

/** 取自 headerIdx 起、与其 { 配对的整段（含头部）：用于断言规则确实落在某个 @media 守卫块内 */
function balancedBlock(text, headerIdx) {
  const open = text.indexOf("{", headerIdx);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(headerIdx, i + 1);
    }
  }
  return "";
}

test("FLOAT_STYLE_TEXT · quota pill 样式：--quota cursor、tabular-nums、warn/danger 阈值色、pulse 仅在 reduced-motion 守卫块内", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(s.includes(".skc-capsule--quota{cursor:pointer}"), "--quota 覆写 cursor:pointer");
  assert.ok(s.includes(".skc-qval{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}"), "数值段对齐 qw 独立胶囊文字规格（11px/600 + tabular-nums，spec §9）");
  assert.ok(s.includes(".skc-qwarn{color:var(--dsw-alias-label-warning,#d29922)}"), "warn 色（与 qw 同名回退值）");
  assert.ok(s.includes(".skc-qdanger{color:var(--dsw-alias-label-danger,#c93c3c)}"), "danger 色对齐 qw 本体红（B26 琥珀退役，跨插件语义一致）");
  assert.ok(!s.includes(".skc-switch") && !s.includes(".skc-quota-merge-on"), "合并开关样式随隐藏退役（第四轮 2026-11-10）");
  const guardAt = s.indexOf("@media (prefers-reduced-motion: no-preference)");
  assert.ok(guardAt >= 0, "reduced-motion 守卫块存在");
  const guard = balancedBlock(s, guardAt);
  assert.ok(guard.includes(".skc-qpulse{"), "pulse 类在守卫块内");
  assert.ok(guard.includes("@keyframes skc-qpulse"), "pulse keyframes 在守卫块内");
  assert.equal(s.split("@keyframes skc-qpulse").length - 1, 1, "keyframes 只定义一次（守卫块内）");
  assert.equal(s.split(".skc-qpulse{").length - 1, 1, ".skc-qpulse 只出现一次（守卫块内）");
});

test("字形：额度危险态对齐 qw 本体红（B26 琥珀退役）", () => {
  assert.ok(
    FLOAT_STYLE_TEXT.includes(".skc-qdanger{color:var(--dsw-alias-label-danger,#c93c3c)}"),
    "danger 色对齐 qw 本体红——熟悉 qw 的同学看合并胶囊零陌生感",
  );
});

test("字形：股票标记为拉丁 B/S（B26）", () => {
  const { h, capsule } = setupCapsule();
  try {
    capsule.update({
      ui: { capsuleSymbolId: "s1", panelOpen: false },
      business: { symbols: [{ id: "s1", market: "cn", code: "sh600519", name: "贵州茅台" }] },
      quotes: {
        s1: { status: "ok", price: 1450, changePercent: 1.2, target: { status: "fresh", buyTriggered: true, sellTriggered: true } },
      },
    });
    assert.equal(capsule.el.querySelector(".skc-mark-buy").textContent, "B", "买入标记为拉丁 B");
    assert.equal(capsule.el.querySelector(".skc-mark-sell").textContent, "S", "卖出标记为拉丁 S");
    assert.ok(FLOAT_STYLE_TEXT.includes(".skc-capsule-mark{font-weight:500}"), "股票标记字重 500（B26 字形）");
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

test("字形：涨跌色只作用于股价与涨跌幅（B26）", () => {
  const { h, capsule } = setupCapsule();
  try {
    capsule.update({
      ui: { capsuleSymbolId: "s1", panelOpen: false },
      business: { symbols: [{ id: "s1", market: "cn", code: "sh600519", name: "贵州茅台" }] },
      quotes: {
        s1: { status: "ok", price: 1450, changePercent: 1.2, target: { status: "fresh", buyTriggered: true, sellTriggered: false } },
      },
    });
    const trend = /skc-(up|down|flat)/;
    const el = capsule.el;
    assert.match(el.querySelector(".skc-capsule-price").className, trend, "股价带涨跌色");
    assert.match(el.querySelector(".skc-capsule-pct").className, trend, "涨跌幅带涨跌色");
    assert.doesNotMatch(el.querySelector(".skc-capsule-name").className, trend, "名称不带涨跌色");
    assert.doesNotMatch(el.querySelector(".skc-mark-buy").className, trend, "买入标记不带涨跌色");
    assert.doesNotMatch(el.querySelector(".skc-mark-sell").className, trend, "卖出标记不带涨跌色");
  } finally {
    capsule.dispose();
    h.cleanup();
  }
});

test("字形：列表买卖徽章为拉丁 B/S（B26）", () => {
  const { h, list, restoreGlobals } = setupList();
  try {
    const snap = LIST_SNAPSHOT();
    snap.quotes.s1 = {
      status: "ok",
      price: 1450,
      changePercent: 1.2,
      target: { status: "fresh", buyTriggered: true, sellTriggered: true },
    };
    list.update(snap);
    const row = list.el.querySelector(".skc-row");
    assert.equal(row.querySelector(".skc-badge-buy").textContent, "B", "列表买入徽章为 B");
    assert.equal(row.querySelector(".skc-badge-sell").textContent, "S", "列表卖出徽章为 S");
  } finally {
    restoreGlobals();
    h.cleanup();
  }
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
    assert.ok(rows[0].querySelector(".skc-badge-buy"), "触发买点标有 B badge");
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

test("list · 展示序 = sort 升序（服务端乱序下发也重排）+ 把手/aria-keyshortcuts + Alt+↑ 走 reorderSymbols", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document, window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.document = h.document;
  globalThis.window = h.window;
  globalThis.localStorage = h.localStorage;
  const calls = [];
  const mkSym = (id, sort) => ({
    id, market: "cn", code: id, name: `名称${id}`, quantity: null, avgCost: null,
    addedAt: "2026-01-01T00:00:00.000Z", sort,
  });
  // getState 供拖拽排序的 marketState() 读权威全序（market: cn 三标的）
  const store = {
    getState: () => ({
      business: { rev: 1, settings: { privacyMode: false }, loaded: true, symbols: [mkSym("a", 1), mkSym("b", 2), mkSym("c", 3)] },
      ui: { panelOpen: true, view: "list", lastMarket: "cn", holdingsOnly: false },
    }),
    reorderSymbols: (market, ids) => calls.push(["reorder", market, ids]),
    openDetail: () => {},
    setLastMarket: () => {},
    pollQuotes: () => {},
    setHoldingsOnly: () => {},
  };
  const list = createList({ store });
  try {
    const snap = {
      business: { rev: 1, settings: { privacyMode: false }, loaded: true, symbols: [mkSym("c", 3), mkSym("a", 1), mkSym("b", 2)] },
      quotes: {},
      ui: { panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false, lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true }, capsuleSymbolId: null },
    };
    list.update(snap);
    const rows = [...list.el.querySelectorAll(".skc-row")];
    assert.deepEqual(rows.map((r) => r.dataset.id), ["a", "b", "c"], "乱序下发仍按 sort 升序渲染");
    assert.ok(rows[0].querySelector(".skc-row-grip svg"), "行尾把手在位");
    assert.equal(rows[0].getAttribute("aria-keyshortcuts"), "Alt+ArrowUp Alt+ArrowDown", "键盘等价路径声明");
    rows[2].dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }));
    assert.deepEqual(calls, [["reorder", "cn", ["a", "c", "b"]]], "Alt+↑ → c 上移一位的可见序提交");
    // 无 Alt 修饰的方向键不触发排序；Enter 仍走详情
    rows[0].dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    assert.equal(calls.length, 1, "裸方向键不触发排序");
  } finally {
    list.dispose();
    for (const [k, v] of Object.entries(prevGlobals)) {
      if (v !== undefined) globalThis[k] = v;
    }
    h.cleanup();
  }
});

/* ---------------- panel · 胶囊显示下拉与列表同序（2026-11-10） ---------------- */

test("panel · 胶囊显示下拉：A-H-U-C 分组（optgroup=Tab 名）+ 组内 sort 升序，与面板列表对齐", () => {
  const { h, panel } = setupPanel();
  try {
    const mk = (id, market, sort) => ({
      id, market, code: id, name: `标的${id}`, quantity: null, avgCost: null,
      buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort,
    });
    const snap = LIST_SNAPSHOT({
      business: {
        rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true,
        // 乱序下发：证明下拉按组序 + sort 序重建，而非 KV 原序
        symbols: [mk("u1", "us", 200), mk("c2", "cn", 200), mk("x1", "crypto", 100), mk("c1", "cn", 100), mk("h1", "hk", 100)],
      },
    });
    snap.ui.capsuleSymbolId = "c1";
    panel.openFrom({ left: 10, top: 10, width: 70, height: 26 }, { left: 10, top: 10, width: 150, height: 26 });
    panel.update(snap);
    const select = panel.el.querySelector("select");
    assert.ok(select, "胶囊显示 picker 在位");
    const order = [...select.querySelectorAll("option")].map((o) => o.value);
    assert.deepEqual(order, ["c1", "c2", "h1", "u1", "x1"], "组间 A-H-U-C、组内 sort 升序");
    const groups = [...select.querySelectorAll("optgroup")].map((g) => g.label);
    assert.deepEqual(groups, [t("market.cn"), t("market.hk"), t("market.us"), t("market.crypto")], "组标签 = 市场 Tab 名");
    assert.equal(select.value, "c1", "capsuleSymbolId 选中保持");
  } finally {
    panel.dispose();
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

test("charts · 分时轴锚定常规时段（§12.34）：A股数据止于 11:00，轴首尾仍为 09:30–15:00，线未到右缘", () => {
  const h = createDomHarness();
  const prevGlobals = { document: globalThis.document };
  globalThis.document = h.document;
  try {
    const t0 = Date.parse("2026-11-13T01:30:00Z") / 1000; // 北京 09:30
    const pts = Array.from({ length: 91 }, (_, i) => ({ t: t0 + i * 60, p: 10 + (i % 5) * 0.01, v: 5 }));
    const el = buildMinuteChart({ points: pts, prevClose: null }, { market: "cn", width: 280, height: 190 });
    const texts = [...el.querySelectorAll("text")].map((x) => x.textContent);
    assert.equal(texts[0], "09:30", "轴首 = 开市时间");
    assert.equal(texts[texts.length - 1], "15:00", "轴尾 = 收市时间（不随数据止点漂移）");
    assert.ok(texts.includes("13:00"), "午休边界 13:00 标注");
    const xs = el.querySelector("polyline").getAttribute("points").split(" ").map((s) => Number(s.split(",")[0]));
    const maxX = Math.max(...xs);
    assert.ok(maxX < 280 * 0.6, `数据止于 11:00 时线未到右缘（max x=${maxX.toFixed(1)}）`);
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
    setQuotaMerge: (v) => actions.push(["setQuotaMerge", v]),
  };
  const stubView = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
  const views = { list: stubView(), detail: stubView(), add: stubView(), backup: stubView() };
  const panel = createPanel({ doc: h.document, win: h.window, store, views });
  shadow.append(panel.el);
  return { h, host, shadow, panel, store, views, actions };
}

/** S8 面板夹具：高度桩 160px；宽度不桩（offsetWidth 为 0 → WIDTH_FALLBACK 360，与 CSS 面板宽一致） */
function setupPanelAnchored(viewport) {
  const s = setupPanel({ viewport });
  Object.defineProperty(s.panel.el, "offsetHeight", { configurable: true, get: () => 160 });
  return s;
}

test("水平推出：优先右侧", () => {
  const { h, panel } = setupPanelAnchored([1024, 768]);
  try {
    panel.openFrom(
      { left: 200, top: 204, width: 70, height: 26 }, // segRect（分区）
      { left: 200, top: 200, width: 150, height: 26 }, // capsuleRect（胶囊）
    );
    assert.equal(panel.el.style.left, "278px", "left = segRect.right + 8（优先右侧）");
    assert.equal(panel.el.style.top, "200px", "top = capsuleRect.top（顶边与胶囊对齐）");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("水平推出：放不下则左侧", () => {
  const { h, panel } = setupPanelAnchored([1024, 768]);
  try {
    panel.openFrom(
      { left: 900, top: 204, width: 70, height: 26 },
      { left: 200, top: 200, width: 150, height: 26 },
    );
    // 右侧放不下（900+70+8 = 978 > 1024−360−8 = 656）→ 左侧：900 − 360 − 8 = 532（面板宽 360，第四轮 2026-11-10）
    assert.equal(panel.el.style.left, "532px", "放不下右侧 → left = segRect.left − width − 8");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("垂直回退：两侧都放不下时下方优先", () => {
  const { h, panel } = setupPanelAnchored([500, 768]);
  try {
    // 锚点取 left=200：右侧 278 > 500−360−8 = 132，左侧 200−368 < 8 → 两侧都放不下（面板 360 宽）
    panel.openFrom(
      { left: 200, top: 204, width: 70, height: 26 },
      { left: 200, top: 200, width: 150, height: 26 },
    );
    // 两侧都放不下 → 下方优先：capsuleRect.bottom + 8 = 234
    assert.equal(panel.el.style.top, "234px", "下方优先：capsuleRect.bottom + 8");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("垂直回退：下方放不下时翻到锚上方", () => {
  const { h, panel } = setupPanelAnchored([500, 300]);
  try {
    panel.openFrom(
      { left: 200, top: 204, width: 70, height: 26 },
      { left: 200, top: 200, width: 150, height: 26 },
    );
    // 下方放不下（234+160 > 292）→ 翻上方：capsuleRect.top − 160 − 8 = 32（补回原「视口矮时翻转」覆盖）
    assert.equal(panel.el.style.top, "32px", "翻转到胶囊上方");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("水平推出：顶边与胶囊对齐并贴底钳位", () => {
  const { h, panel } = setupPanelAnchored([1024, 768]);
  try {
    panel.openFrom(
      { left: 200, top: 704, width: 70, height: 26 },
      { left: 200, top: 700, width: 150, height: 26 },
    );
    // 顶边取 capsuleRect.top = 700，贴底钳位：768 − 160 − 8 = 600
    assert.equal(panel.el.style.top, "600px", "顶边对齐胶囊并贴底钳位");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("sheet：视口不超过 480px 为底部 sheet", () => {
  const { h, panel } = setupPanelAnchored([400, 768]);
  try {
    panel.openFrom(
      { left: 200, top: 204, width: 70, height: 26 },
      { left: 200, top: 200, width: 150, height: 26 },
    );
    assert.equal(panel.el.classList.contains("skc-panel--sheet"), true, "窄视口为底部 sheet");
    assert.equal(panel.el.style.left, "", "sheet 丢弃内联锚定坐标");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("滑入：打开时带 skc-panel--slide，关闭后移除该类", () => {
  const { h, panel } = setupPanel();
  try {
    panel.openFrom({ left: 200, top: 204, width: 70, height: 26 });
    assert.equal(panel.el.classList.contains("skc-panel--slide"), true, "打开时带滑入类");
    panel.close();
    assert.equal(panel.el.classList.contains("skc-panel--slide"), false, "关闭后移除滑入类");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("滑入：样式位于减少动态效果守卫内", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.ok(
    s.indexOf(".skc-panel--slide") >= 0 &&
      s.indexOf(".skc-panel--slide") > s.indexOf("prefers-reduced-motion: no-preference"),
    "滑入样式存在且位于 reduced-motion 守卫之内",
  );
});

test("滑入：时长约 150 毫秒（CSS 含 150ms）", () => {
  assert.ok(FLOAT_STYLE_TEXT.includes("150ms"), "滑入时长 150ms（CSS 含 150ms）");
});

/* ---------------- S10：窄屏降级（B30；Step 1 先红） ---------------- */

test("窄屏：视口 400 时胶囊带 skc-compact", () => {
  const { h, capsule } = setupCapsule();
  try {
    h.setViewport(h.window, 400, 768);
    h.window.dispatchEvent(new h.window.Event("resize"));
    assert.equal(capsule.el.classList.contains("skc-compact"), true, "视口 400 → 胶囊带 skc-compact");
    capsule.dispose();
  } finally {
    h.cleanup();
  }
});

test("窄屏：视口 800 时胶囊不带 skc-compact", () => {
  const { h, capsule } = setupCapsule();
  try {
    h.setViewport(h.window, 800, 768);
    h.window.dispatchEvent(new h.window.Event("resize"));
    assert.equal(capsule.el.classList.contains("skc-compact"), false, "视口 800 → 胶囊不带 skc-compact");
    capsule.dispose();
  } finally {
    h.cleanup();
  }
});

test("窄屏：额度段热区扩到 44px", () => {
  const s = FLOAT_STYLE_TEXT;
  assert.match(
    s,
    /\[data-seg="quota"\]::before\{[^}]*inset:-10px[^}]*\}/,
    "额度段热区伪元素 inset:-10px（段高 24 + 2×10 = 44px）",
  );
  assert.match(
    s,
    /\[data-seg="quota"\]\{[^}]*align-self:stretch[^}]*\}/,
    "额度段 align-self:stretch（段高为内高 24，热区才达 44px）",
  );
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

test("panel · header 右上关闭钮且点击关闭（qw 语言：关闭在右上）", () => {
  const { h, panel } = setupPanel();
  try {
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    const closeBtn = panel.el.querySelector('.skc-header [data-action="close"]');
    assert.ok(closeBtn, "header 关闭按钮在位");
    closeBtn.dispatchEvent(new h.window.MouseEvent("click", { bubbles: true }));
    assert.equal(panel.isOpen(), false, "点击关闭");
    panel.dispose();
  } finally {
    h.cleanup();
  }
});

test("panel · 设置不渲染合并显示额度开关（第四轮 2026-11-10 隐藏）：quotaCapable 在线也无开关；默认合并为既定行为", () => {
  const { h, panel } = setupPanel();
  const base = {
    panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false,
    lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: null,
  };
  try {
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    panel.update({
      business: { rev: 1, settings: { privacyMode: false }, symbols: [] },
      quoteMeta: { fetchedAt: null, error: null },
      toast: null,
      providers: null,
      ui: { ...base, showSettings: true, quotaCapable: true, quotaMerge: true },
    });
    assert.equal(panel.el.querySelector('[data-action="quota-merge"]'), null, "额度在线 → 设置内仍无合并开关");
    assert.equal(panel.el.querySelector(".skc-switch"), null, "开关控件已退役");
  } finally {
    panel.dispose();
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

/* ---------------- S6：分区分流（胶囊根 pointer 路径 + 额度段 onQuotaTap；Step 1 先红） ---------------- */

const QUOTA_OK_OVERVIEW = {
  providers: [
    { key: "glm", status: "ready", plan: { windows: [{ key: "5h", percent: 40 }] } },
    { key: "copilot", status: "ready", quota: { balanceAvailable: true, percentRemaining: 60 } },
  ],
};

async function setupCapsuleWithQuota() {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const stack = h.document.createElement("div");
  stack.className = "skc-stack";
  shadow.append(stack);
  const calls = [];
  const opened = [];
  h.window.addEventListener("dsh-quota-watch:open-panel", (ev) => opened.push(ev.detail));
  let embed = null;
  const capsule = createCapsule({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    shadow,
    store: null,
    onTogglePanel: (segRect, capsuleRect) => calls.push({ segRect, capsuleRect }),
    onQuotaTap: () => embed?.onQuotaTap(),
  });
  embed = createQuotaEmbed({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    target: capsule.el,
    host,
    fetchImpl: async () =>
      new Response(JSON.stringify(QUOTA_OK_OVERVIEW), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    probeTimeoutMs: 50,
    pollMs: 10000,
    retryMs: 10000,
    heartbeatMs: 80,
    buildTimeoutSignal: () => undefined, // R1-1：同 client-quota-embed setup，避免 jsdom 超时定时器拖住事件循环
  });
  const guest = h.document.createElement("div");
  guest.setAttribute("data-dsh-quota-watch-float", "");
  h.document.body.append(guest);
  await sleep(30);
  h.window.dispatchEvent(
    new h.window.CustomEvent("dsh-quota-watch:embed-capabilities", {
      detail: { v: 1, capabilities: ["hide-pill", "anchored-panel", "poll-pause"], guestVersion: "0.1.38" },
      composed: true,
      bubbles: true,
    }),
  );
  await sleep(80);
  return { h, host, shadow, stack, capsule, embed, calls, opened };
}

function disposeCapsuleWithQuota(s) {
  s.embed.dispose();
  s.capsule.dispose();
  s.h.cleanup();
}

const STOCK_RECT = { left: 12, top: 34, width: 80, height: 24, right: 92, bottom: 58, x: 12, y: 34 };

test("分区：额度段轻点 → 股票 toggle 0 次、open-panel 1 次", async () => {
  const s = await setupCapsuleWithQuota();
  try {
    const seg = s.capsule.el.querySelector('[data-seg="quota"]');
    assert.ok(seg, "额度段是胶囊子节点");
    s.h.firePointer(seg, "pointerdown", { x: 60, y: 33 });
    s.h.firePointer(seg, "pointerup", { x: 60, y: 33 });
    assert.equal(s.calls.length, 0, "股票 toggle 0 次");
    assert.equal(s.opened.length, 1, "open-panel 1 次");
  } finally {
    disposeCapsuleWithQuota(s);
  }
});

test("分区：股票段轻点 → 股票 toggle 1 次且带股票段矩形、open-panel 0 次", async () => {
  const s = await setupCapsuleWithQuota();
  try {
    const stockSeg = s.capsule.el.querySelector('[data-seg="stock"]');
    assert.ok(stockSeg, "股票段是胶囊子节点");
    stockSeg.getBoundingClientRect = () => STOCK_RECT;
    s.h.firePointer(stockSeg, "pointerdown", { x: 40, y: 40 });
    s.h.firePointer(stockSeg, "pointerup", { x: 40, y: 40 });
    assert.equal(s.calls.length, 1, "股票 toggle 1 次");
    assert.deepEqual(s.calls[0].segRect, STOCK_RECT, "带股票段矩形");
    assert.equal(s.opened.length, 0, "open-panel 0 次");
  } finally {
    disposeCapsuleWithQuota(s);
  }
});

test("分区：pointerdown 在额度段、pointerup 在胶囊根 → 仍按额度段处理", async () => {
  const s = await setupCapsuleWithQuota();
  try {
    const seg = s.capsule.el.querySelector('[data-seg="quota"]');
    s.h.firePointer(seg, "pointerdown", { x: 60, y: 33 });
    s.h.firePointer(s.capsule.el, "pointerup", { x: 60, y: 33 });
    assert.equal(s.calls.length, 0, "未误走股票 toggle");
    assert.equal(s.opened.length, 1, "仍按额度段处理：open-panel 1 次");
  } finally {
    disposeCapsuleWithQuota(s);
  }
});

test("分区：拖拽释放 → 不触发任何 tap", async () => {
  const s = await setupCapsuleWithQuota();
  try {
    const seg = s.capsule.el.querySelector('[data-seg="quota"]');
    s.h.firePointer(seg, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(seg, "pointermove", { x: 120, y: 100 }); // 超 slop 6
    s.h.firePointer(seg, "pointerup", { x: 120, y: 100 });
    assert.equal(s.calls.length, 0, "无股票 toggle");
    assert.equal(s.opened.length, 0, "无 open-panel");
  } finally {
    disposeCapsuleWithQuota(s);
  }
});

test("分区：键盘 Enter 开股票面板时带股票段矩形", async () => {
  const s = await setupCapsuleWithQuota();
  try {
    const stockSeg = s.capsule.el.querySelector('[data-seg="stock"]');
    stockSeg.getBoundingClientRect = () => STOCK_RECT;
    s.capsule.el.dispatchEvent(new s.h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.equal(s.calls.length, 1, "键盘 Enter → 股票 toggle 1 次");
    assert.deepEqual(s.calls[0].segRect, STOCK_RECT, "键盘路径带股票段矩形");
    assert.equal(s.opened.length, 0, "open-panel 0 次");
  } finally {
    disposeCapsuleWithQuota(s);
  }
});

test("分区：胶囊根命中就近归属——gap 点击按 x 就近开对应卡", async () => {
  const s = await setupCapsuleWithQuota();
  try {
    s.capsule.el.querySelector('[data-seg="stock"]').getBoundingClientRect =
      () => ({ left: 0, top: 0, right: 100, bottom: 26, width: 100, height: 26 });
    s.capsule.el.querySelector('[data-seg="quota"]').getBoundingClientRect =
      () => ({ left: 107, top: 0, right: 227, bottom: 26, width: 120, height: 26 });
    const capEl = s.capsule.el;
    s.h.firePointer(capEl, "pointerdown", { x: 120, y: 13 }); // 更近额度段中心 167（股票段中心 50）
    s.h.firePointer(capEl, "pointerup", { x: 120, y: 13 });
    assert.equal(s.opened.length, 1, "gap 内靠近额度段的点击派发 open-panel");
    assert.equal(s.calls.length, 0, "不误走股票 toggle");
    s.h.firePointer(capEl, "pointerdown", { x: 90, y: 13 }); // 更近股票段中心 50
    s.h.firePointer(capEl, "pointerup", { x: 90, y: 13 });
    assert.equal(s.calls.length, 1, "gap 内靠近股票段的点击走股票 toggle");
    assert.equal(s.opened.length, 1, "open-panel 不新增");
  } finally {
    disposeCapsuleWithQuota(s);
  }
});

/* ---------------- S6b：面板开着时再点胶囊（Q14；Q15=A；Step 1 先红） ---------------- */

/** 最小 store 桩：panelOpen 语义与 store.mjs 一致（togglePanel/closePanel 通知订阅者），不触发网络 */
function makePanelStoreStub() {
  let state = {
    business: { rev: 0, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: true },
    quotes: {},
    quoteMeta: { fetchedAt: null, error: null },
    ui: {
      panelOpen: false,
      view: "list",
      detailId: null,
      showAdd: false,
      showSettings: false,
      capsuleSymbolId: null,
      lastMarket: "cn",
      holdingsOnly: false,
      quotaMerge: true,
    },
    toast: null,
    providers: null,
  };
  const listeners = new Set();
  const setUi = (patch) => {
    state = { ...state, ui: { ...state.ui, ...patch } };
    for (const fn of [...listeners]) fn(state);
  };
  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      fn(state); // 即刻回放一次（与 store.subscribe 同语义）
      return () => listeners.delete(fn);
    },
    togglePanel() {
      setUi({ panelOpen: !state.ui.panelOpen });
    },
    closePanel() {
      setUi({ panelOpen: false });
    },
    restartPolling() {},
    pollQuotes() {},
    setCapsuleSymbol() {},
    setShowAdd() {},
    setShowSettings() {},
    setPrivacy() {},
    setQuotaMerge() {},
    setToast() {},
  };
}

const panelViewStub = (doc) => ({ el: doc.createElement("div"), update() {}, dispose() {} });

async function setupStockPanelWithQuota() {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const stack = h.document.createElement("div");
  stack.className = "skc-stack";
  shadow.append(stack);
  const store = makePanelStoreStub();
  const panel = createPanel({
    doc: h.document,
    win: h.window,
    store,
    views: {
      list: panelViewStub(h.document),
      detail: panelViewStub(h.document),
      add: panelViewStub(h.document),
      backup: panelViewStub(h.document),
    },
  });
  shadow.append(panel.el);
  let embed = null;
  const capsule = createCapsule({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    shadow,
    store,
    onTogglePanel: () => store.togglePanel(),
    onQuotaTap: () => embed?.onQuotaTap(),
  });
  stack.append(capsule.el);
  let wasOpen = false;
  // 与 main.mjs 的 renderAll 同构：面板开启瞬间以胶囊矩形锚定
  const unsubscribe = store.subscribe((snapshot) => {
    capsule.update(snapshot);
    panel.update(snapshot);
    const isOpenNow = snapshot.ui.panelOpen === true;
    if (isOpenNow && !wasOpen) panel.openFrom(capsule.el.getBoundingClientRect());
    wasOpen = isOpenNow;
  });
  embed = createQuotaEmbed({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    target: capsule.el,
    host,
    fetchImpl: async () =>
      new Response(JSON.stringify(QUOTA_OK_OVERVIEW), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    probeTimeoutMs: 50,
    pollMs: 10000,
    retryMs: 10000,
    heartbeatMs: 80,
    buildTimeoutSignal: () => undefined, // R1-1：同 client-quota-embed setup，避免 jsdom 超时定时器拖住事件循环
  });
  const guest = h.document.createElement("div");
  guest.setAttribute("data-dsh-quota-watch-float", "");
  h.document.body.append(guest);
  await sleep(30);
  h.window.dispatchEvent(
    new h.window.CustomEvent("dsh-quota-watch:embed-capabilities", {
      detail: { v: 1, capabilities: ["hide-pill", "anchored-panel", "poll-pause"], guestVersion: "0.1.38" },
      composed: true,
      bubbles: true,
    }),
  );
  await sleep(80);
  return { h, host, capsule, panel, store, embed, unsubscribe };
}

function disposeStockPanel(s) {
  s.unsubscribe();
  s.embed.dispose();
  s.panel.dispose();
  s.capsule.dispose();
  s.h.cleanup();
}

/** 轻点股票段打开面板（真实 pointer 路径：pointerdown + 未拖动 pointerup） */
function tapStockOpen(s) {
  const stockSeg = s.capsule.el.querySelector('[data-seg="stock"]');
  s.h.firePointer(stockSeg, "pointerdown", { x: 40, y: 40 });
  s.h.firePointer(stockSeg, "pointerup", { x: 40, y: 40 });
}

test("再点胶囊：面板开着时点股票胶囊最终关闭", async () => {
  const s = await setupStockPanelWithQuota();
  try {
    const stockSeg = s.capsule.el.querySelector('[data-seg="stock"]');
    tapStockOpen(s);
    assert.equal(s.panel.isOpen(), true, "(a) 面板已打开");
    s.h.firePointer(stockSeg, "pointerdown", { x: 40, y: 40 });
    assert.equal(s.panel.isOpen(), true, "(b) 胶囊 pointerdown 后面板仍开");
    s.h.firePointer(stockSeg, "pointerup", { x: 40, y: 40 });
    assert.equal(s.panel.isOpen(), false, "(c) 未拖动 pointerup 后面板最终关闭");
  } finally {
    disposeStockPanel(s);
  }
});

test("再点胶囊：点面板外普通元素仍关闭", async () => {
  const s = await setupStockPanelWithQuota();
  try {
    tapStockOpen(s);
    assert.equal(s.panel.isOpen(), true, "前置：面板已打开");
    const outside = s.h.document.createElement("div");
    s.h.document.body.append(outside);
    s.h.firePointer(outside, "pointerdown", { x: 500, y: 500 });
    assert.equal(s.panel.isOpen(), false, "面板外普通元素按下 → 面板关闭");
  } finally {
    disposeStockPanel(s);
  }
});

test("再点胶囊：额度段按压 → 股票面板关闭", async () => {
  const s = await setupStockPanelWithQuota();
  try {
    tapStockOpen(s);
    assert.equal(s.panel.isOpen(), true, "前置：面板已打开");
    const seg = s.capsule.el.querySelector('[data-seg="quota"]');
    assert.ok(seg, "额度段在胶囊内");
    s.h.firePointer(seg, "pointerdown", { x: 60, y: 33 });
    assert.equal(s.panel.isOpen(), false, "额度段按压 → 股票面板关闭（Q15=A：额度段不豁免）");
  } finally {
    disposeStockPanel(s);
  }
});

