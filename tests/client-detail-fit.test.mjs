/**
 * 详情图表随视口收缩 + 滚动提示（第 10 轮，2026-11-10；第 12 轮统一钳位）：
 *   - 图表高度 = clamp(视口 − 24 − 固定区高度, 140, 230)，分时/K线共用一套钳位与固定区
 *     （指标行四档周期常驻），卡片总高与周期无关——切周期零位移；
 *   - 窗口高度变化后随之重算；
 *   - 可滚区域内容未到底时底部渐隐（skc-scroll-more），滚到底即撤掉。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createDetail } from "../client/detail.mjs";
import { createPanel } from "../client/panel.mjs";
import { getLang, setLang } from "../client/i18n.mjs";

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

const SYMBOL = {
  id: "cn:sz159206",
  market: "cn",
  code: "sz159206",
  name: "卫星ETF永赢",
  quoteCurrency: "CNY",
  kind: "etf",
  quantity: 100,
  avgCost: 10,
  buyTarget: null,
  sellTarget: null,
};

const MINUTE_POINTS = Array.from({ length: 30 }, (_, i) => ({ t: 1_700_000_000_000 + i * 60_000, p: 8.4 + i * 0.01, v: 1000 + i }));
const CANDLES = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, "0")}`,
  open: 8 + i * 0.01,
  high: 8.2 + i * 0.01,
  low: 7.9 + i * 0.01,
  close: 8.1 + i * 0.01,
  volume: 1000 + i,
}));

function setupDetail({ height, lang = "zh", injectWin = false }) {
  const h = createDomHarness();
  const prevLang = getLang();
  setLang(lang);
  h.setViewport(h.window, 1100, height);
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.document = h.document;
  globalThis.window = injectWin ? undefined : h.window; // injectWin：模拟宿主运行时无全局 window，只能靠注入的 win
  globalThis.localStorage = h.localStorage;
  globalThis.fetch = async (url) => {
    const body = String(url).includes("/kline") ? { candles: CANDLES, adjust: "qfq" } : { points: MINUTE_POINTS, prevClose: 8.4 };
    return { ok: true, status: 200, json: async () => body };
  };
  const store = {
    backToList() {},
    updateSymbol: async () => ({ ok: true }),
    removeSymbol: async () => ({ ok: true }),
    setToast() {},
    setMaVisible() {},
  };
  const detail = createDetail(injectWin ? { store, win: h.window } : { store });
  h.document.body.append(detail.el);
  const snap = {
    business: { rev: 1, settings: { privacyMode: false }, symbols: [SYMBOL], driverKind: null, loaded: true },
    quotes: { [SYMBOL.id]: { status: "ok", price: 8.5, changePercent: 0.3, quoteTime: 1, fetchedAt: 1, target: { status: "fresh" } } },
    quoteMeta: { fetchedAt: 1, error: null },
    ui: {
      panelOpen: true, view: "detail", detailId: SYMBOL.id, showAdd: false, showSettings: false,
      lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true }, capsuleSymbolId: null,
    },
    toast: null,
    providers: null,
  };
  return {
    h,
    detail,
    async load() {
      detail.update(snap);
      await sleepMs(10); // 图表数据异步到达后重绘
    },
    chartH() {
      const c = detail.el.querySelector(".skc-chart");
      return c ? Number(c.getAttribute("height")) : null;
    },
    restore() {
      detail.dispose();
      setLang(prevLang);
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete globalThis[k];
        else globalThis[k] = v;
      }
      h.cleanup();
    },
  };
}

test("分时：视口 680 → 图表 162（统一钳位，与 K 线同高）", async () => {
  const s = setupDetail({ height: 680 });
  try {
    await s.load();
    assert.equal(s.chartH(), 162);
  } finally {
    s.restore();
  }
});

test("分时：视口 630 → 图表 140（下限钳位）", async () => {
  const s = setupDetail({ height: 630 });
  try {
    await s.load();
    assert.equal(s.chartH(), 140);
  } finally {
    s.restore();
  }
});

test("分时：视口 520 → 图表 140（下限，仍可内滚兜底）", async () => {
  const s = setupDetail({ height: 520 });
  try {
    await s.load();
    assert.equal(s.chartH(), 140);
  } finally {
    s.restore();
  }
});

test("日K：视口 680 → 图表 162；视口 630 → 140（下限）", async () => {
  for (const [height, expected] of [[680, 162], [630, 140]]) {
    const s = setupDetail({ height });
    try {
      await s.load();
      s.detail.el.querySelectorAll(".skc-period")[1].click(); // 日K
      await sleepMs(10);
      assert.equal(s.chartH(), expected, `视口 ${height} 的日K 图表高度`);
    } finally {
      s.restore();
    }
  }
});

test("窗口高度变化：resize 后图表高度随之重算（680 → 520：162 → 140）", async () => {
  const s = setupDetail({ height: 680 });
  try {
    await s.load();
    assert.equal(s.chartH(), 162);
    s.h.setViewport(s.h.window, 1100, 520);
    s.h.window.dispatchEvent(new s.h.window.Event("resize"));
    assert.equal(s.chartH(), 140, "resize 后图表按新视口重算");
  } finally {
    s.restore();
  }
});

const SNAP_PANEL = (view) => ({
  business: { rev: 1, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: true },
  quotes: {},
  quoteMeta: { fetchedAt: null, error: null },
  ui: {
    panelOpen: true, view, detailId: null, showAdd: false, showSettings: false,
    lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: null, quotaCapable: false, quotaMerge: true,
  },
  toast: null,
  providers: null,
});

test("滚动提示：可滚且未到底 → 底部渐隐（skc-scroll-more）；滚到底 → 撤掉", () => {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 680);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const noop = () => {};
  const stub = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
  const store = {
    closePanel: noop, setCapsuleSymbol: noop, setPrivacy: noop, setShowAdd: noop,
    setShowSettings: noop, pollQuotes: noop, setQuotaMerge: noop, setHoldingsOnly: noop,
  };
  const panel = createPanel({
    doc: h.document,
    win: h.window,
    store,
    views: { list: stub(), detail: stub(), add: stub(), backup: stub() },
  });
  try {
    shadow.append(panel.el);
    panel.openFrom({ left: 100, top: 200, width: 150, height: 26 });
    panel.update(SNAP_PANEL("detail"));
    const layer = panel.el.querySelector(".skc-layer-detail");
    let top = 0;
    Object.defineProperty(layer, "scrollHeight", { configurable: true, get: () => 600 });
    Object.defineProperty(layer, "clientHeight", { configurable: true, get: () => 400 });
    Object.defineProperty(layer, "scrollTop", { configurable: true, get: () => top, set: (v) => { top = v; } });
    layer.scrollTop = 0;
    layer.dispatchEvent(new h.window.Event("scroll"));
    assert.equal(layer.classList.contains("skc-scroll-more"), true, "未到底：底部渐隐");
    layer.scrollTop = 200; // 600 − 400 = 200：已到底
    layer.dispatchEvent(new h.window.Event("scroll"));
    assert.equal(layer.classList.contains("skc-scroll-more"), false, "到底：撤掉渐隐");
  } finally {
    panel.dispose();
    h.cleanup();
  }
});

test("英文界面：固定区高 +17px（实测文案更长），视口 630 分时图表 140 → 整卡仍落在视口内", async () => {
  const s = setupDetail({ height: 630, lang: "en" });
  try {
    await s.load();
    assert.equal(s.chartH(), 140);
  } finally {
    s.restore();
  }
});

test("切周期卡片几何恒定（第 12 轮）：分时→日K→周K 图表同高 + 指标行常驻（分时=昨收图例）", async () => {
  const s = setupDetail({ height: 680 });
  try {
    await s.load();
    const minuteH = s.chartH();
    const metaNow = () => s.detail.el.querySelector(".skc-period-meta"); // render 整段重建：每次切周期后重查
    assert.ok(metaNow() && !metaNow().hidden, "指标行四档周期常驻，分时档不隐藏");
    assert.ok(metaNow().querySelector(".skc-meta-note"), "分时档显示昨收图例（标注图内虚线参考线）");
    s.detail.el.querySelectorAll(".skc-period")[1].click(); // 日K
    const loadingBox = s.detail.el.querySelector(".skc-chartbox");
    assert.equal(loadingBox.style.height, "162px", "加载骨架占位与成图同高——切周期骨架期卡片不塌陷");
    await sleepMs(10);
    assert.equal(s.chartH(), minuteH, "日K 与分时同高——切周期零位移（弹跳根除）");
    s.detail.el.querySelectorAll(".skc-period")[2].click(); // 周K
    await sleepMs(10);
    assert.equal(s.chartH(), minuteH, "周K 与分时同高");
    const metaNow2 = s.detail.el.querySelector(".skc-period-meta");
    assert.ok(metaNow2.querySelector(".skc-ma-chip"), "K线档指标行回到 MA 图例");
  } finally {
    s.restore();
  }
});

test("图表高度用注入的 win（全局 window 缺失时仍随视口收缩，不回退 768）", async () => {
  const s = setupDetail({ height: 630, injectWin: true });
  try {
    await s.load();
    assert.equal(s.chartH(), 140, "注入的 win 视口 630 → 分时 140");
  } finally {
    s.restore();
  }
});

test("面板尺寸变化后重新定位：内容变高（如日K 多出均线行）→ 顶部上移，整卡仍在视口内", async () => {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 680);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const noop = () => {};
  const stub = () => ({ el: h.document.createElement("div"), update() {}, dispose() {} });
  const store = {
    closePanel: noop, setCapsuleSymbol: noop, setPrivacy: noop, setShowAdd: noop,
    setShowSettings: noop, pollQuotes: noop, setQuotaMerge: noop, setHoldingsOnly: noop,
  };
  const panel = createPanel({
    doc: h.document,
    win: h.window,
    store,
    views: { list: stub(), detail: stub(), add: stub(), backup: stub() },
  });
  let height = 300;
  Object.defineProperty(panel.el, "offsetHeight", { configurable: true, get: () => height });
  try {
    shadow.append(panel.el);
    panel.openFrom({ left: 100, top: 500, width: 150, height: 26 });
    panel.update(SNAP_PANEL("detail"));
    assert.equal(panel.el.style.top, "372px", "矮卡片：顶部 = 视口 680 − 300 − 8");
    height = 600; // 内容变高
    panel.el.append(h.document.createTextNode("grow")); // 子树变化：jsdom 无 ResizeObserver，走回退路径
    await sleepMs(5);
    assert.equal(panel.el.style.top, "72px", "变高后重新定位：视口 680 − 600 − 8");
    assert.equal(panel.el.style.maxHeight, "664px", "最大高度 = 视口 − 16");
  } finally {
    panel.dispose();
    h.cleanup();
  }
});
