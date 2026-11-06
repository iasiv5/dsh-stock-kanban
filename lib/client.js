window.__ModuleLoader__.load({
	id: "dsh-stock-kanban",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
		
		// client/main.mjs
		var main_exports = {};
		__export(main_exports, {
		  apply: () => apply,
		  inject: () => inject
		});
		module.exports = __toCommonJS(main_exports);
		var import_react10 = require("react");
		
		// client/store.mjs
		var import_react = require("react");
		
		// client/api.mjs
		async function getJSON(path) {
		  const res = await fetch(path, { headers: { accept: "application/json" } });
		  const body = await res.json().catch(() => null);
		  if (!res.ok) {
		    const e = new Error(body?.error ?? `HTTP ${res.status}`);
		    e.status = res.status;
		    e.body = body;
		    throw e;
		  }
		  return body;
		}
		async function postJSON(path, payload) {
		  const res = await fetch(path, {
		    method: "POST",
		    headers: { "content-type": "application/json", accept: "application/json" },
		    body: JSON.stringify(payload ?? {})
		  });
		  const body = await res.json().catch(() => null);
		  if (!res.ok) {
		    const e = new Error(body?.error ?? `HTTP ${res.status}`);
		    e.status = res.status;
		    e.body = body;
		    throw e;
		  }
		  return body;
		}
		var api = {
		  state: () => getJSON("/stock-kanban/state"),
		  search: (market, q) => getJSON(`/stock-kanban/search?market=${encodeURIComponent(market)}&q=${encodeURIComponent(q)}`),
		  quotes: (ids, full = false) => getJSON(`/stock-kanban/quotes?ids=${encodeURIComponent(ids.join(","))}${full ? "&full=1" : ""}`),
		  kline: (id, period) => getJSON(`/stock-kanban/kline?id=${encodeURIComponent(id)}&period=${encodeURIComponent(period)}`),
		  minute: (id) => getJSON(`/stock-kanban/minute?id=${encodeURIComponent(id)}`),
		  add: (market, code, patch, ifRev) => postJSON("/stock-kanban/symbols/add", { market, code, patch, ifRev }),
		  update: (id, patch, ifRev) => postJSON("/stock-kanban/symbols/update", { id, patch, ifRev }),
		  remove: (id, ifRev) => postJSON("/stock-kanban/symbols/remove", { id, ifRev }),
		  setSettings: (patch, ifRev) => postJSON("/stock-kanban/settings", { ...patch, ifRev }),
		  importBackup: (payload, ifRev) => postJSON("/stock-kanban/import", { payload, ifRev }),
		  exportUrl: "/stock-kanban/export"
		};
		
		// client/fmt.mjs
		var MASK2 = "\u2022\u2022\u2022\u2022";
		function fmtPrice(p) {
		  if (p == null || !Number.isFinite(p)) return "\u2014";
		  const abs = Math.abs(p);
		  let digits;
		  if (abs >= 1e3) digits = 2;
		  else if (abs >= 1) digits = 2;
		  else if (abs >= 0.01) digits = 4;
		  else digits = 6;
		  return p.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
		}
		function fmtPct(v) {
		  if (v == null || !Number.isFinite(v)) return "\u2014";
		  const sign = v > 0 ? "+" : "";
		  return `${sign}${v.toFixed(2)}%`;
		}
		function fmtAmount(v) {
		  if (v == null || !Number.isFinite(v)) return "\u2014";
		  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}
		function trendClass(v) {
		  if (v == null || !Number.isFinite(v) || v === 0) return "sk-flat";
		  return v > 0 ? "sk-up" : "sk-down";
		}
		function fmtClock(ms) {
		  if (ms == null || !Number.isFinite(ms)) return "\u2014";
		  const d = new Date(ms);
		  const hh = String(d.getHours()).padStart(2, "0");
		  const mm = String(d.getMinutes()).padStart(2, "0");
		  return `${hh}:${mm}`;
		}
		function fmtClockSec(ms) {
		  if (ms == null || !Number.isFinite(ms)) return "\u2014";
		  const d = new Date(ms);
		  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
		}
		function parsePositiveInput(text) {
		  const raw = String(text ?? "").trim();
		  if (raw === "") return null;
		  const n = Number(raw);
		  if (!Number.isFinite(n) || n <= 0) return void 0;
		  return n;
		}
		var DRAG_THRESHOLD_PX = 6;
		var EDGE_MARGIN_PX = 8;
		function shouldDrag(dx, dy) {
		  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
		}
		function clampToViewport(x, y, w, h9, vw, vh) {
		  const maxX = Math.max(EDGE_MARGIN_PX, vw - w - EDGE_MARGIN_PX);
		  const maxY = Math.max(EDGE_MARGIN_PX, vh - h9 - EDGE_MARGIN_PX);
		  return {
		    x: Math.min(Math.max(x, EDGE_MARGIN_PX), maxX),
		    y: Math.min(Math.max(y, EDGE_MARGIN_PX), maxY)
		  };
		}
		function snapToEdge(x, y, w, h9, vw, vh) {
		  const c = clampToViewport(x, y, w, h9, vw, vh);
		  const dists = {
		    left: c.x,
		    right: vw - c.x - w,
		    top: c.y,
		    bottom: vh - c.y - h9
		  };
		  const entries = Object.entries(dists).sort((a, b) => a[1] - b[1]);
		  const edge = entries[0][0];
		  const inset = EDGE_MARGIN_PX;
		  if (edge === "left") return { x: inset, y: c.y, dock: "left" };
		  if (edge === "right") return { x: vw - w - inset, y: c.y, dock: "right" };
		  if (edge === "top") return { x: c.x, y: inset, dock: "top" };
		  return { x: c.x, y: vh - h9 - inset, dock: "bottom" };
		}
		
		// client/store.mjs
		var UI_KEY = "stock-kanban:ui:v1";
		var DEFAULT_UI = {
		  panelOpen: false,
		  view: "list",
		  // 'list' | 'detail'（会话内状态；重开面板始终先列表）
		  detailId: null,
		  showAdd: false,
		  // 会话态：添加对话框
		  pos: null,
		  // 胶囊 {x,y,dock}；null → 默认右上
		  panelPos: null,
		  // 面板 {x,y}
		  lastMarket: "cn",
		  holdingsOnly: false,
		  maVisible: { 5: true, 10: true, 20: true, 60: true },
		  capsuleSymbolId: null
		  // null → 第一个标的
		};
		function loadUi() {
		  try {
		    const raw = window.localStorage.getItem(UI_KEY);
		    if (!raw) return { ...DEFAULT_UI };
		    const parsed = JSON.parse(raw);
		    return { ...DEFAULT_UI, ...parsed && typeof parsed === "object" ? parsed : {} };
		  } catch {
		    return { ...DEFAULT_UI };
		  }
		}
		function createStore() {
		  let state = {
		    business: { rev: 0, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: false },
		    quotes: {},
		    // id → row
		    quoteMeta: { fetchedAt: null, error: null },
		    ui: loadUi(),
		    toast: null,
		    providers: null
		  };
		  const listeners = /* @__PURE__ */ new Set();
		  const emit = () => {
		    for (const l of [...listeners]) {
		      try {
		        l();
		      } catch {
		      }
		    }
		  };
		  const persistUi = () => {
		    try {
		      const { panelOpen, view, detailId, showAdd, toast, ...persisted } = state.ui;
		      window.localStorage.setItem(UI_KEY, JSON.stringify(persisted));
		    } catch {
		    }
		  };
		  const set = (partial) => {
		    state = { ...state, ...partial };
		    emit();
		  };
		  const setUi = (partial) => {
		    const ui = { ...state.ui, ...partial };
		    set({ ui });
		    persistUi();
		  };
		  async function refreshState() {
		    const data = await api.state();
		    set({ business: { ...data, loaded: true } });
		    const ui = state.ui;
		    if (ui.capsuleSymbolId && !data.symbols.some((s) => s.id === ui.capsuleSymbolId)) {
		      setUi({ capsuleSymbolId: data.symbols[0]?.id ?? null });
		    } else if (!ui.capsuleSymbolId && data.symbols.length > 0) {
		      setUi({ capsuleSymbolId: data.symbols[0].id });
		    }
		    return data;
		  }
		  async function mutate(action) {
		    try {
		      const result = await action(state.business.rev);
		      await refreshState();
		      return { ok: true, result };
		    } catch (e) {
		      if (e.status === 409) {
		        await refreshState();
		        setToast("\u6570\u636E\u5DF2\u88AB\u5176\u4ED6\u9875\u9762\u66F4\u65B0\uFF0C\u5DF2\u4E3A\u4F60\u5237\u65B0\u6700\u65B0\u6570\u636E\uFF0C\u8BF7\u91CD\u8BD5\u3002");
		        return { ok: false, conflict: true, error: e };
		      }
		      setToast(`\u64CD\u4F5C\u5931\u8D25\uFF1A${e.message ?? e}`);
		      return { ok: false, error: e };
		    }
		  }
		  const addSymbol = (market, code, patch) => mutate((rev) => api.add(market, code, patch, rev));
		  const updateSymbol = (id, patch) => mutate((rev) => api.update(id, patch, rev));
		  const removeSymbol = (id) => mutate((rev) => api.remove(id, rev));
		  const setPrivacy = (privacyMode) => mutate((rev) => api.setSettings({ privacyMode }, rev));
		  const importBackup = (payload) => mutate((rev) => api.importBackup(payload, rev));
		  let pollTimer = null;
		  function quoteIdsFor(stateNow) {
		    const { ui, business } = stateNow;
		    if (ui.panelOpen) {
		      if (ui.view === "detail" && ui.detailId) return [ui.detailId];
		      const market = ui.lastMarket;
		      const ids2 = business.symbols.filter((s) => s.market === market).map((s) => s.id);
		      return ids2.length > 0 ? ids2 : ui.capsuleSymbolId ? [ui.capsuleSymbolId] : [];
		    }
		    const ids = /* @__PURE__ */ new Set();
		    if (ui.capsuleSymbolId) ids.add(ui.capsuleSymbolId);
		    for (const s of business.symbols) {
		      if (s.buyTarget != null || s.sellTarget != null) ids.add(s.id);
		    }
		    return [...ids];
		  }
		  async function pollQuotes() {
		    const ids = quoteIdsFor(state);
		    if (ids.length === 0) return;
		    const full = state.ui.panelOpen && state.ui.view === "detail";
		    try {
		      const data = await api.quotes(ids, full);
		      const quotes = { ...state.quotes };
		      for (const [id, row] of Object.entries(data.rows ?? {})) quotes[id] = row;
		      set({ quotes, providers: data.providers, quoteMeta: { fetchedAt: Date.now(), error: null } });
		    } catch (e) {
		      set({ quoteMeta: { fetchedAt: state.quoteMeta.fetchedAt, error: String(e?.message ?? e) } });
		    }
		  }
		  function restartPolling() {
		    if (pollTimer) {
		      clearInterval(pollTimer);
		      pollTimer = null;
		    }
		    const { ui } = state;
		    if (typeof document !== "undefined" && document.hidden) return;
		    let intervalMs;
		    if (!ui.panelOpen) intervalMs = 3e4;
		    else if (ui.view === "detail") intervalMs = 15e3;
		    else intervalMs = 15e3;
		    pollTimer = setInterval(() => {
		      if (typeof document !== "undefined" && document.hidden) return;
		      pollQuotes();
		    }, intervalMs);
		    pollQuotes();
		  }
		  function openPanel() {
		    setUi({ panelOpen: true, view: "list", detailId: null, showAdd: false });
		    restartPolling();
		  }
		  function closePanel() {
		    setUi({ panelOpen: false, view: "list", detailId: null });
		    restartPolling();
		  }
		  function openDetail(id) {
		    setUi({ view: "detail", detailId: id });
		    restartPolling();
		  }
		  function backToList() {
		    setUi({ view: "list", detailId: null });
		    restartPolling();
		  }
		  function setLastMarket(market) {
		    setUi({ lastMarket: market });
		  }
		  function setHoldingsOnly(v) {
		    setUi({ holdingsOnly: v });
		  }
		  function setMaVisible(v) {
		    setUi({ maVisible: v });
		  }
		  function setCapsuleSymbol(id) {
		    setUi({ capsuleSymbolId: id });
		  }
		  function setCapsulePos(pos) {
		    setUi({ pos });
		  }
		  function setPanelPos(pos) {
		    setUi({ panelPos });
		  }
		  function setToast(text) {
		    set({ toast: text ? { text, at: Date.now() } : null });
		    if (text) {
		      setTimeout(() => {
		        if (state.toast && Date.now() - state.toast.at >= 3800) set({ toast: null });
		      }, 4e3);
		    }
		  }
		  function setShowAdd(v) {
		    setUi({ showAdd: v });
		  }
		  function handleResize(capsuleSize) {
		    const pos = state.ui.pos;
		    if (!pos || !capsuleSize) return;
		    const vw = window.innerWidth;
		    const vh = window.innerHeight;
		    const snapped = snapToEdge(pos.x, pos.y, capsuleSize.w, capsuleSize.h, vw, vh);
		    setCapsulePos(snapped);
		  }
		  function handleVisibility() {
		    if (!document.hidden) restartPolling();
		  }
		  function subscribe(listener) {
		    listeners.add(listener);
		    return () => listeners.delete(listener);
		  }
		  function getState() {
		    return state;
		  }
		  return {
		    subscribe,
		    getState,
		    refreshState,
		    mutate,
		    addSymbol,
		    updateSymbol,
		    removeSymbol,
		    setPrivacy,
		    importBackup,
		    pollQuotes,
		    restartPolling,
		    openPanel,
		    closePanel,
		    openDetail,
		    backToList,
		    setLastMarket,
		    setHoldingsOnly,
		    setMaVisible,
		    setCapsuleSymbol,
		    setCapsulePos,
		    setPanelPos,
		    setToast,
		    setShowAdd,
		    handleResize,
		    handleVisibility
		  };
		}
		function useStore(store2) {
		  const [snapshot, setSnapshot] = (0, import_react.useState)(store2.getState());
		  (0, import_react.useEffect)(() => store2.subscribe(() => setSnapshot(store2.getState())), [store2]);
		  return snapshot;
		}
		
		// client/panel.mjs
		var import_react9 = require("react");
		
		// client/list.mjs
		var import_react2 = require("react");
		
		// src/identity.mjs
		var MARKETS = ["cn", "hk", "us", "crypto"];
		var MARKET_LABELS = { cn: "A \u80A1", hk: "\u6E2F\u80A1", us: "\u7F8E\u80A1", crypto: "\u52A0\u5BC6\u8D27\u5E01" };
		function checkTargetRelation(buyTarget, sellTarget) {
		  if (buyTarget != null && sellTarget != null && buyTarget >= sellTarget) {
		    return { ok: true, overlap: true, message: "\u4E70\u5165\u76EE\u6807\u4EF7\u4E0D\u4F4E\u4E8E\u5356\u51FA\u76EE\u6807\u4EF7\uFF1A\u4EF7\u683C\u53EF\u80FD\u540C\u65F6\u6EE1\u8DB3\u4E24\u4E2A\u6761\u4EF6\uFF0C\u63D2\u4EF6\u4F1A\u540C\u65F6\u6807\u51FA\u4E24\u4E2A\u89E6\u4EF7\u6807\u8BB0\u3002" };
		  }
		  return { ok: true, overlap: false, message: null };
		}
		
		// client/list.mjs
		function TargetBadges({ target }) {
		  if (!target || target.status === "no-targets") return null;
		  if (target.status === "stale") return (0, import_react2.createElement)("span", { className: "skc-badge skc-badge-stale", title: "\u884C\u60C5\u8FC7\u671F\uFF1A\u89E6\u4EF7\u72B6\u6001\u6682\u505C\u5224\u65AD" }, "\u65E7");
		  if (target.status === "no-data") return (0, import_react2.createElement)("span", { className: "skc-badge skc-badge-stale", title: "\u884C\u60C5\u7F3A\u5931\uFF1A\u89E6\u4EF7\u72B6\u6001\u672A\u77E5" }, "\u65E0");
		  const badges = [];
		  if (target.buyTriggered) badges.push((0, import_react2.createElement)("span", { key: "b", className: "skc-badge skc-badge-buy", title: "\u8FBE\u5230\u4E70\u5165\u76EE\u6807\u4EF7" }, "\u24B7"));
		  if (target.sellTriggered) badges.push((0, import_react2.createElement)("span", { key: "s", className: "skc-badge skc-badge-sell", title: "\u8FBE\u5230\u5356\u51FA\u76EE\u6807\u4EF7" }, "\u24C8"));
		  return badges;
		}
		function MarketList({ store: store2, ui, business, quotes, privacy }) {
		  const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
		  const rows = business.symbols.filter((s) => s.market === market);
		  const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;
		  const scrollRef = (0, import_react2.useRef)(null);
		  (0, import_react2.useEffect)(() => {
		    const el = scrollRef.current;
		    if (el && !ui.panelOpen) el.scrollTop = 0;
		  }, [market]);
		  return (0, import_react2.createElement)(
		    "div",
		    { className: "skc-listwrap" },
		    (0, import_react2.createElement)(
		      "div",
		      { className: "skc-tabs" },
		      MARKETS.map((m) => (0, import_react2.createElement)("button", {
		        key: m,
		        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
		        onClick: () => {
		          store2.setLastMarket(m);
		          store2.pollQuotes();
		        }
		      }, `${MARKET_LABELS[m]}${business.symbols.filter((s) => s.market === m).length > 0 ? ` (${business.symbols.filter((s) => s.market === m).length})` : ""}`))
		    ),
		    (0, import_react2.createElement)(
		      "div",
		      { className: "skc-filterbar" },
		      (0, import_react2.createElement)(
		        "label",
		        { className: "skc-filter" },
		        (0, import_react2.createElement)("input", {
		          type: "checkbox",
		          checked: ui.holdingsOnly,
		          onChange: (e) => store2.setHoldingsOnly(e.target.checked)
		        }),
		        "\u53EA\u770B\u6301\u4ED3"
		      ),
		      (0, import_react2.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react2.createElement)("button", { className: "skc-btn skc-btn-ghost", onClick: () => store2.pollQuotes() }, "\u5237\u65B0")
		    ),
		    (0, import_react2.createElement)(
		      "div",
		      { className: "skc-rows", ref: scrollRef },
		      shown.length === 0 ? (0, import_react2.createElement)("div", { className: "skc-empty" }, ui.holdingsOnly ? "\u8BE5\u5E02\u573A\u6682\u65E0\u6301\u4ED3\u6807\u7684" : "\u8BE5\u5E02\u573A\u6682\u65E0\u81EA\u9009\u6807\u7684\uFF0C\u70B9\u4E0B\u65B9\u201C\u6DFB\u52A0\u6807\u7684\u201D") : shown.map((s) => {
		        const q = quotes[s.id];
		        const price = q?.status === "ok" ? q.price : null;
		        const pct = q?.changePercent ?? null;
		        const hasPos = s.quantity != null && s.quantity > 0;
		        const m = q?.metrics;
		        return (0, import_react2.createElement)(
		          "div",
		          {
		            key: s.id,
		            className: "skc-row",
		            onClick: () => store2.openDetail(s.id)
		          },
		          (0, import_react2.createElement)(
		            "div",
		            { className: "skc-row-name" },
		            (0, import_react2.createElement)("span", { className: "skc-name-text" }, s.name),
		            (0, import_react2.createElement)(
		              "span",
		              { className: "skc-code" },
		              s.code.replace(/^(sh|sz|bj|hk)/, ""),
		              hasPos ? (0, import_react2.createElement)("span", { className: "skc-pos-dot", title: "\u5DF2\u586B\u6301\u4ED3" }, " \u2605") : null
		            )
		          ),
		          (0, import_react2.createElement)(
		            "div",
		            { className: "skc-row-price" },
		            (0, import_react2.createElement)("span", { className: trendClass(pct) }, price != null ? fmtPrice(price) : q ? q.status === "error" ? "\u83B7\u53D6\u5931\u8D25" : "\u2014" : "\u2026"),
		            (0, import_react2.createElement)("span", { className: `skc-pct ${trendClass(pct)}` }, fmtPct(pct))
		          ),
		          ui.holdingsOnly && hasPos ? (0, import_react2.createElement)(
		            "div",
		            { className: "skc-row-pnl" },
		            (0, import_react2.createElement)(
		              "span",
		              { className: `skc-pnl-amt ${trendClass(m?.pnl)}` },
		              privacy ? MASK2 : m?.pnl != null ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}` : m && (m.flags.zeroCost || m.flags.missingPrice) ? "\u53E3\u5F84\u7F3A" : "\u2014"
		            ),
		            (0, import_react2.createElement)(
		              "span",
		              { className: `skc-pnl-pct ${trendClass(m?.pnl)}` },
		              privacy ? MASK2 : m?.pnlPct != null ? fmtPct(m.pnlPct) : m && (m.flags.zeroCost || m.flags.missingPrice) ? "\u2014" : "\u2014"
		            )
		          ) : (0, import_react2.createElement)("div", { className: "skc-row-target" }, (0, import_react2.createElement)(TargetBadges, { target: q?.target }))
		        );
		      })
		    )
		  );
		}
		
		// client/detail.mjs
		var import_react4 = require("react");
		
		// client/charts.mjs
		var import_react3 = require("react");
		
		// client/chartmath.mjs
		function computeMa(candles, period) {
		  const data = [];
		  let sum = 0;
		  for (let i = 0; i < candles.length; i++) {
		    sum += candles[i].close;
		    if (i >= period) sum -= candles[i - period].close;
		    if (i >= period - 1) data.push({ index: i, value: sum / period });
		  }
		  return data;
		}
		function niceBounds(min, max) {
		  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
		  if (min === max) return [min - 1, max + 1];
		  return [min, max];
		}
		
		// client/charts.mjs
		var UP = "#e5484d";
		var DOWN = "#2bb596";
		var YELLOW = "#d9a514";
		var MA_COLORS = { 5: "#e8e8e8", 10: "#d9a514", 20: "#a78bfa", 60: "#4ade80" };
		function MinuteChart({ points, prevClose, width = 372, height = 190, volHeight = 34, dark }) {
		  if (!Array.isArray(points) || points.length < 2) {
		    return (0, import_react3.createElement)("div", { className: "skc-chart-empty" }, "\u6682\u65E0\u5206\u65F6\u6570\u636E");
		  }
		  const pad = 6;
		  const priceH = height - volHeight - pad * 2;
		  const withBase = points.map((p) => p.p).concat(Number.isFinite(prevClose) && prevClose > 0 ? [prevClose] : []);
		  const [min, max] = niceBounds(Math.min(...withBase), Math.max(...withBase));
		  const innerW = width - pad * 2;
		  const xOf = (i) => pad + i / (points.length - 1) * innerW;
		  const yOf = (v) => pad + priceH - (v - min) / (max - min) * priceH;
		  const maxVol = Math.max(...points.map((p) => p.v ?? 0), 1);
		  const volTop = pad + priceH + pad;
		  const volYOf = (v) => volTop + volHeight - v / maxVol * volHeight;
		  const pricePts = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.p).toFixed(1)}`).join(" ");
		  let cumV = 0;
		  let cumA = 0;
		  const avgPts = points.map((p, i) => {
		    cumV += p.v ?? 0;
		    cumA += p.p * (p.v ?? 0);
		    const avg = cumV > 0 ? cumA / cumV : p.p;
		    return `${xOf(i).toFixed(1)},${yOf(avg).toFixed(1)}`;
		  }).join(" ");
		  const up = Number.isFinite(prevClose) && prevClose > 0 ? points[points.length - 1].p >= prevClose : true;
		  const baseY = Number.isFinite(prevClose) && prevClose > 0 ? yOf(prevClose) : null;
		  const axisText = dark ? "rgba(255,255,255,.45)" : "rgba(15,23,42,.5)";
		  const timeLabel = (t) => {
		    const d = new Date(t * 1e3);
		    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		  };
		  const kids = [
		    (0, import_react3.createElement)("polyline", { key: "price", points: pricePts, fill: "none", stroke: up ? UP : DOWN, strokeWidth: 1.5 }),
		    (0, import_react3.createElement)("polyline", { key: "avg", points: avgPts, fill: "none", stroke: YELLOW, strokeWidth: 1 }),
		    (0, import_react3.createElement)("text", { key: "t0", x: 2, y: height - 2, fill: axisText, fontSize: 9 }, timeLabel(points[0].t)),
		    (0, import_react3.createElement)("text", { key: "t1", x: width / 2 - 16, y: height - 2, fill: axisText, fontSize: 9 }, timeLabel(points[Math.floor(points.length / 2)].t)),
		    (0, import_react3.createElement)("text", { key: "t2", x: width - 30, y: height - 2, fill: axisText, fontSize: 9 }, timeLabel(points[points.length - 1].t))
		  ];
		  if (baseY != null) {
		    kids.splice(2, 0, (0, import_react3.createElement)("line", { key: "base", x1: pad, y1: baseY, x2: width - pad, y2: baseY, stroke: dark ? "rgba(255,255,255,.4)" : "rgba(15,23,42,.35)", strokeDasharray: "4 3", strokeWidth: 1 }));
		  }
		  points.forEach((p, i) => {
		    if ((p.v ?? 0) > 0) {
		      kids.push((0, import_react3.createElement)("rect", {
		        key: `v${i}`,
		        x: xOf(i) - 0.5,
		        y: volYOf(p.v),
		        width: 1.4,
		        height: volTop + volHeight - volYOf(p.v),
		        fill: up ? "rgba(229,72,77,.4)" : "rgba(43,181,150,.4)"
		      }));
		    }
		  });
		  return (0, import_react3.createElement)("svg", { className: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` }, kids);
		}
		function CandleChart({ candles, maVisible = {}, width = 372, height = 230, volHeight = 34, dark }) {
		  if (!Array.isArray(candles) || candles.length === 0) {
		    return (0, import_react3.createElement)("div", { className: "skc-chart-empty" }, "\u6682\u65E0K\u7EBF\u6570\u636E");
		  }
		  const pad = 6;
		  const priceH = height - volHeight - pad * 2;
		  const lows = candles.map((c) => c.low);
		  const highs = candles.map((c) => c.high);
		  const mas = {};
		  for (const period of [5, 10, 20, 60]) {
		    if (maVisible[period] !== false) mas[period] = computeMa(candles, period);
		  }
		  const maValues = Object.values(mas).flat().map((m) => m.value);
		  const [min, max] = niceBounds(Math.min(...lows, ...maValues.length ? maValues : lows), Math.max(...highs, ...maValues.length ? maValues : highs));
		  const innerW = width - pad * 2;
		  const step = innerW / candles.length;
		  const bodyW = Math.max(1.2, Math.min(6, step * 0.6));
		  const xOf = (i) => pad + i * step + step / 2;
		  const yOf = (v) => pad + priceH - (v - min) / (max - min) * priceH;
		  const maxVol = Math.max(...candles.map((c) => c.volume ?? 0), 1);
		  const volTop = pad + priceH + pad;
		  const kids = [];
		  candles.forEach((c, i) => {
		    const up = c.close >= c.open;
		    const color = up ? UP : DOWN;
		    const yO = yOf(Math.max(c.open, c.close));
		    const yC = yOf(Math.min(c.open, c.close));
		    kids.push((0, import_react3.createElement)("line", { key: `w${i}`, x1: xOf(i), x2: xOf(i), y1: yOf(c.high), y2: yOf(c.low), stroke: color, strokeWidth: 1 }));
		    kids.push((0, import_react3.createElement)("rect", {
		      key: `b${i}`,
		      x: xOf(i) - bodyW / 2,
		      y: yO,
		      width: bodyW,
		      height: Math.max(0.8, yC - yO),
		      fill: up ? "transparent" : color,
		      stroke: color,
		      strokeWidth: 0.8
		    }));
		    if ((c.volume ?? 0) > 0) {
		      const yV = volTop + volHeight - c.volume / maxVol * volHeight;
		      kids.push((0, import_react3.createElement)("rect", { key: `v${i}`, x: xOf(i) - bodyW / 2, y: yV, width: bodyW, height: volTop + volHeight - yV, fill: up ? "rgba(229,72,77,.35)" : "rgba(43,181,150,.35)" }));
		    }
		  });
		  for (const [period, data] of Object.entries(mas)) {
		    const pts = data.map((m) => `${xOf(m.index).toFixed(1)},${yOf(m.value).toFixed(1)}`).join(" ");
		    kids.push((0, import_react3.createElement)("polyline", { key: `ma${period}`, points: pts, fill: "none", stroke: MA_COLORS[period] ?? "#888", strokeWidth: 1 }));
		  }
		  const axisText = dark ? "rgba(255,255,255,.45)" : "rgba(15,23,42,.5)";
		  const labelIdx = [0, Math.floor(candles.length / 2), candles.length - 1];
		  labelIdx.forEach((i, k) => {
		    const text = String(candles[i]?.time ?? "").slice(5);
		    kids.push((0, import_react3.createElement)("text", { key: `t${k}`, x: k === 0 ? 2 : k === 1 ? width / 2 - 14 : width - 34, y: height - 2, fill: axisText, fontSize: 9 }, text));
		  });
		  return (0, import_react3.createElement)("svg", { className: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` }, kids);
		}
		function MaLegend({ maVisible, onToggle }) {
		  return (0, import_react3.createElement)(
		    "div",
		    { className: "skc-ma-legend" },
		    [5, 10, 20, 60].map((p) => (0, import_react3.createElement)("button", {
		      key: p,
		      className: `skc-ma-chip${maVisible[p] === false ? " skc-ma-off" : ""}`,
		      style: maVisible[p] === false ? void 0 : { color: MA_COLORS[p] },
		      onClick: () => onToggle(p)
		    }, `MA${p}`))
		  );
		}
		
		// client/detail.mjs
		var PERIODS = [
		  { key: "minute", label: "\u5206\u65F6" },
		  { key: "day", label: "\u65E5K" },
		  { key: "week", label: "\u5468K" },
		  { key: "month", label: "\u6708K" }
		];
		function Detail({ store: store2, ui, business, quotes, privacy }) {
		  const symbol = business.symbols.find((s) => s.id === ui.detailId);
		  const [period, setPeriod] = (0, import_react4.useState)("minute");
		  const [chart, setChart] = (0, import_react4.useState)({ key: "", loading: false, data: null, error: null, adjust: null });
		  const chartKeyRef = (0, import_react4.useRef)("");
		  const [form, setForm] = (0, import_react4.useState)(null);
		  const [overlapHint, setOverlapHint] = (0, import_react4.useState)(false);
		  (0, import_react4.useEffect)(() => {
		    setForm(null);
		    setOverlapHint(false);
		    chartKeyRef.current = "";
		    setChart({ key: "", loading: false, data: null, error: null, adjust: null });
		  }, [ui.detailId]);
		  (0, import_react4.useEffect)(() => {
		    if (!symbol) return;
		    const key = `${symbol.id}:${period}`;
		    chartKeyRef.current = key;
		    setChart((c) => ({ ...c, key, loading: true }));
		    const load = period === "minute" ? api.minute(symbol.id) : api.kline(symbol.id, period);
		    load.then((data) => {
		      if (chartKeyRef.current !== key) return;
		      setChart({
		        key,
		        loading: false,
		        data: period === "minute" ? data : data.candles,
		        error: data.error ?? null,
		        adjust: data.adjust ?? null,
		        prevClose: data.prevClose ?? null,
		        date: data.date ?? null
		      });
		    }).catch((e) => {
		      if (chartKeyRef.current !== key) return;
		      setChart({ key, loading: false, data: null, error: `\u52A0\u8F7D\u5931\u8D25\uFF1A${e.message ?? e}`, adjust: null });
		    });
		  }, [symbol?.id, period]);
		  if (!symbol) {
		    return (0, import_react4.createElement)("div", { className: "skc-detail skc-empty" }, "\u6807\u7684\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664");
		  }
		  const q = quotes[symbol.id];
		  const price = q?.status === "ok" ? q.price : null;
		  const pct = q?.changePercent ?? null;
		  const hasPos = symbol.quantity != null && symbol.quantity > 0;
		  const m = q?.metrics;
		  const draft = form ?? {
		    quantity: symbol.quantity != null ? String(symbol.quantity) : "",
		    avgCost: symbol.avgCost != null ? String(symbol.avgCost) : "",
		    buyTarget: symbol.buyTarget != null ? String(symbol.buyTarget) : "",
		    sellTarget: symbol.sellTarget != null ? String(symbol.sellTarget) : ""
		  };
		  const setDraft = (key, value) => setForm({ ...draft, [key]: value });
		  const saveHoldings = async () => {
		    const quantity = parsePositiveInput(draft.quantity);
		    const avgCost = parsePositiveInput(draft.avgCost);
		    if (quantity === void 0 || avgCost === void 0) {
		      store2.setToast("\u6570\u91CF\u4E0E\u5E73\u5747\u6210\u672C\u5FC5\u987B\u662F\u6B63\u6570\uFF08\u7559\u7A7A\u8868\u793A\u6E05\u9664\uFF09");
		      return;
		    }
		    const result = await store2.updateSymbol(symbol.id, { quantity, avgCost });
		    if (result.ok) {
		      setForm(null);
		      store2.setToast("\u6301\u4ED3\u5DF2\u4FDD\u5B58");
		    }
		  };
		  const clearHoldings = async () => {
		    const result = await store2.updateSymbol(symbol.id, { quantity: null, avgCost: null });
		    if (result.ok) {
		      setForm(null);
		      store2.setToast("\u5DF2\u6E05\u9664\u6301\u4ED3");
		    }
		  };
		  const saveTargets = async () => {
		    const buyTarget = parsePositiveInput(draft.buyTarget);
		    const sellTarget = parsePositiveInput(draft.sellTarget);
		    if (buyTarget === void 0 || sellTarget === void 0) {
		      store2.setToast("\u76EE\u6807\u4EF7\u5FC5\u987B\u662F\u6B63\u6570\uFF08\u7559\u7A7A\u8868\u793A\u4E0D\u8BBE\u7F6E\uFF09");
		      return;
		    }
		    const relation = checkTargetRelation(buyTarget, sellTarget);
		    if (relation.overlap) {
		      const confirmed = window.confirm("\u4E70\u5165\u76EE\u6807\u4EF7\u4E0D\u4F4E\u4E8E\u5356\u51FA\u76EE\u6807\u4EF7\uFF1A\u4EF7\u683C\u53EF\u80FD\u540C\u65F6\u6EE1\u8DB3\u4E24\u4E2A\u6761\u4EF6\uFF08\u4E24\u4E2A\u6807\u8BB0\u4F1A\u540C\u65F6\u663E\u793A\uFF09\u3002\u4ECD\u8981\u4FDD\u5B58\u5417\uFF1F");
		      if (!confirmed) return;
		      setOverlapHint(true);
		    } else {
		      setOverlapHint(false);
		    }
		    const result = await store2.updateSymbol(symbol.id, { buyTarget, sellTarget });
		    if (result.ok) {
		      setForm(null);
		      store2.setToast("\u76EE\u6807\u4EF7\u5DF2\u4FDD\u5B58");
		    }
		  };
		  const remove = async () => {
		    if (!window.confirm(`\u4ECE\u81EA\u9009\u4E2D\u5220\u9664\u300C${symbol.name}\u300D\uFF1F\uFF08\u6301\u4ED3\u4E0E\u76EE\u6807\u4EF7\u4E00\u5E76\u79FB\u9664\uFF0C\u53EF\u7528\u5907\u4EFD\u6062\u590D\uFF09`)) return;
		    const result = await store2.removeSymbol(symbol.id);
		    if (result.ok) store2.backToList();
		  };
		  const qTime = q?.quoteTime ?? null;
		  const fTime = q?.fetchedAt ?? null;
		  const dataStale = q?.target?.status === "stale" || q?.target?.status === "no-data";
		  return (0, import_react4.createElement)(
		    "div",
		    { className: "skc-detail" },
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-detail-head" },
		      (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-ghost", onClick: () => store2.backToList() }, "\u2190 \u8FD4\u56DE\u5217\u8868"),
		      (0, import_react4.createElement)("span", { className: "skc-detail-title" }, symbol.name),
		      (0, import_react4.createElement)("span", { className: "skc-code" }, `${symbol.code} \xB7 ${MARKET_LABELS[symbol.market]}${symbol.kind === "etf" ? " \xB7 ETF" : ""} \xB7 ${symbol.quoteCurrency}`),
		      (0, import_react4.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-danger", onClick: remove }, "\u5220\u9664")
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-quote-line" },
		      (0, import_react4.createElement)("span", { className: `skc-quote-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : q ? q.status === "error" ? "\u884C\u60C5\u5931\u8D25" : "\u2026" : "\u2014"),
		      (0, import_react4.createElement)("span", { className: `skc-quote-pct ${trendClass(pct)}` }, fmtPct(pct)),
		      (0, import_react4.createElement)(
		        "span",
		        { className: "skc-quote-meta" },
		        `\u884C\u60C5 ${q && q.status === "ok" ? qTime != null ? fmtClock(qTime) : "\u2014" : "\u2014"} \xB7 \u62C9\u53D6 ${fTime != null ? fmtClockSec(fTime) : "\u2014"}`,
		        dataStale ? (0, import_react4.createElement)("span", { className: "skc-badge skc-badge-stale" }, q?.target?.status === "stale" ? "\u884C\u60C5\u8FC7\u671F" : "\u884C\u60C5\u7F3A\u5931") : null
		      )
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-period-tabs" },
		      PERIODS.map((p) => (0, import_react4.createElement)("button", {
		        key: p.key,
		        className: `skc-tab skc-period${p.key === period ? " skc-tab-active" : ""}`,
		        onClick: () => setPeriod(p.key)
		      }, p.label)),
		      period !== "minute" ? (0, import_react4.createElement)(MaLegend, { maVisible: ui.maVisible, onToggle: (p) => store2.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false }) }) : null,
		      period !== "minute" && chart.adjust ? (0, import_react4.createElement)("span", { className: "skc-adjust" }, chart.adjust === "qfq" ? "\u524D\u590D\u6743" : "\u4E0D\u590D\u6743") : null
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-chartbox" },
		      chart.loading ? (0, import_react4.createElement)("div", { className: "skc-chart-empty" }, "\u52A0\u8F7D\u4E2D\u2026") : chart.error ? (0, import_react4.createElement)("div", { className: "skc-chart-empty skc-chart-error" }, `${chart.error}\uFF08\u4E34\u65F6\u5931\u8D25\u53EF\u70B9\u5176\u4ED6\u5468\u671F\u91CD\u8BD5\uFF1B\u6301\u7EED\u51FA\u73B0\u89C6\u4E3A\u8BE5\u5E02\u573A\u6682\u4E0D\u652F\u6301\uFF09`) : period === "minute" ? (0, import_react4.createElement)(MinuteChart, { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null, dark: false }) : (0, import_react4.createElement)(CandleChart, { candles: chart.data ?? [], maVisible: ui.maVisible, dark: false })
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-holdings" },
		      (0, import_react4.createElement)("div", { className: "skc-section-title" }, "\u6301\u4ED3", hasPos && m ? (0, import_react4.createElement)(
		        "span",
		        { className: "skc-section-meta" },
		        privacy ? `${MASK} ${MARKET_LABELS[symbol.market]}\xB7${symbol.quoteCurrency}` : `\u5E02\u503C ${m.marketValue != null ? fmtAmount(m.marketValue) : "\u2014"} ${symbol.quoteCurrency} \xB7 \u76C8\u4E8F ${m.pnl != null ? fmtAmount(m.pnl) : m.flags.zeroCost ? "\u6210\u672C\u672A\u586B" : m.flags.missingPrice ? "\u65E0\u884C\u60C5" : "\u2014"}\uFF08${m.pnlPct != null ? fmtPct(m.pnlPct) : "\u2014"}\uFF09`
		      ) : null),
		      (0, import_react4.createElement)(
		        "div",
		        { className: "skc-form-grid" },
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          "\u6570\u91CF\uFF08" + (symbol.market === "crypto" ? "\u5E01" : "\u80A1") + "\uFF09",
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.quantity, placeholder: "\u7559\u7A7A\u6E05\u9664", onChange: (e) => setDraft("quantity", e.target.value) }),
		          privacy && draft.quantity !== "" ? (0, import_react4.createElement)("span", { className: "skc-masked-hint" }, "\u9690\u79C1\u6A21\u5F0F\u4E0B\u8F93\u5165\u4ECD\u53EF\u89C1\uFF08\u4EC5\u5C55\u793A\u906E\u6321\uFF09") : null
		        ),
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          `\u5E73\u5747\u6210\u672C\uFF08${symbol.quoteCurrency}\uFF09`,
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.avgCost, placeholder: "\u7559\u7A7A\u6E05\u9664", onChange: (e) => setDraft("avgCost", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "div",
		          { className: "skc-form-actions" },
		          (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-primary", onClick: saveHoldings }, "\u4FDD\u5B58\u6301\u4ED3"),
		          (0, import_react4.createElement)("button", { className: "skc-btn", onClick: clearHoldings }, "\u6E05\u9664\u6301\u4ED3")
		        )
		      )
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-targets" },
		      (0, import_react4.createElement)(
		        "div",
		        { className: "skc-section-title" },
		        "\u76EE\u6807\u4EF7",
		        overlapHint ? (0, import_react4.createElement)("span", { className: "skc-badge skc-badge-stale" }, "\u9608\u503C\u91CD\u53E0\uFF1A\u4E24\u6807\u8BB0\u53EF\u80FD\u540C\u65F6\u663E\u793A") : null
		      ),
		      (0, import_react4.createElement)(
		        "div",
		        { className: "skc-form-grid" },
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          `\u4E70\u5165\u76EE\u6807\u4EF7\uFF08\u2264 \u89E6\u53D1 \u24B7\uFF0C${symbol.quoteCurrency}\uFF09`,
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.buyTarget, placeholder: "\u4E0D\u8BBE\u7F6E", onChange: (e) => setDraft("buyTarget", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          `\u5356\u51FA\u76EE\u6807\u4EF7\uFF08\u2265 \u89E6\u53D1 \u24C8\uFF0C${symbol.quoteCurrency}\uFF09`,
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.sellTarget, placeholder: "\u4E0D\u8BBE\u7F6E", onChange: (e) => setDraft("sellTarget", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "div",
		          { className: "skc-form-actions" },
		          (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-primary", onClick: saveTargets }, "\u4FDD\u5B58\u76EE\u6807\u4EF7")
		        )
		      ),
		      (0, import_react4.createElement)("div", { className: "skc-hint" }, "\u89E6\u4EF7\u5224\u65AD\u53EA\u57FA\u4E8E\u6709\u6548\u884C\u60C5\uFF1B\u884C\u60C5\u8FC7\u671F\u6216\u7F3A\u5931\u65F6\u6807\u8BB0\u6682\u505C\u663E\u793A\uFF0C\u6062\u590D\u540E\u81EA\u52A8\u7EE7\u7EED\u3002")
		    )
		  );
		}
		
		// client/add.mjs
		var import_react5 = require("react");
		function AddDialog({ store: store2, business, defaultMarket, onClose }) {
		  const [market, setMarket] = (0, import_react5.useState)(defaultMarket);
		  const [query, setQuery] = (0, import_react5.useState)("");
		  const [results, setResults] = (0, import_react5.useState)(null);
		  const [searching, setSearching] = (0, import_react5.useState)(false);
		  const [searchError, setSearchError] = (0, import_react5.useState)(null);
		  const [directCode, setDirectCode] = (0, import_react5.useState)("");
		  const [busy, setBusy] = (0, import_react5.useState)(false);
		  const inputRef = (0, import_react5.useRef)(null);
		  const debounceRef = (0, import_react5.useRef)(null);
		  (0, import_react5.useEffect)(() => {
		    inputRef.current?.focus?.();
		    return () => {
		      if (debounceRef.current) clearTimeout(debounceRef.current);
		    };
		  }, []);
		  const doSearch = async (text, mkt) => {
		    const needle = String(text ?? "").trim();
		    if (!needle) {
		      setResults(null);
		      setSearchError(null);
		      return;
		    }
		    setSearching(true);
		    try {
		      const data = await api.search(mkt ?? market, needle);
		      setResults(data.rows ?? []);
		      setSearchError(data.error ?? null);
		    } catch (e) {
		      setResults([]);
		      setSearchError(`\u641C\u7D22\u63A5\u53E3\u4E0D\u53EF\u7528\uFF1A${e.message ?? e}`);
		    } finally {
		      setSearching(false);
		    }
		  };
		  const onQueryChange = (text) => {
		    setQuery(text);
		    if (debounceRef.current) clearTimeout(debounceRef.current);
		    debounceRef.current = setTimeout(() => doSearch(text), 300);
		  };
		  const addResult = async (row) => {
		    setBusy(true);
		    const result = await store2.addSymbol(row.market, row.code, null);
		    setBusy(false);
		    if (result.ok) {
		      store2.setToast(`\u5DF2\u6DFB\u52A0 ${row.name}`);
		    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
		      store2.setToast("\u8BE5\u6807\u7684\u5DF2\u5728\u81EA\u9009\u4E2D");
		    }
		  };
		  const addDirect = async () => {
		    const code = directCode.trim();
		    if (!code) return;
		    setBusy(true);
		    const result = await store2.addSymbol(market, code, null);
		    setBusy(false);
		    if (result.ok) {
		      store2.setToast(`\u5DF2\u6DFB\u52A0 ${code}`);
		      setDirectCode("");
		    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
		      store2.setToast("\u8BE5\u6807\u7684\u5DF2\u5728\u81EA\u9009\u4E2D");
		    } else if (result.error?.status === 422) {
		      store2.setToast(`\u4EE3\u7801\u65E0\u6548\u6216\u884C\u60C5\u4E0D\u53EF\u7528\uFF08${result.error.body?.error ?? "invalid"}\uFF09\u2014\u2014\u76F4\u8FDE\u6DFB\u52A0\u5FC5\u987B\u901A\u8FC7\u884C\u60C5\u6821\u9A8C`);
		    }
		  };
		  const known = new Set(business.symbols.map((s) => s.id));
		  return (0, import_react5.createElement)(
		    "div",
		    { className: "skc-dialog" },
		    (0, import_react5.createElement)(
		      "div",
		      { className: "skc-dialog-head" },
		      (0, import_react5.createElement)("span", { className: "skc-section-title" }, "\u6DFB\u52A0\u6807\u7684"),
		      (0, import_react5.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react5.createElement)("button", { className: "skc-icon-btn", onClick: onClose }, "\u2715")
		    ),
		    (0, import_react5.createElement)(
		      "div",
		      { className: "skc-tabs skc-add-tabs" },
		      MARKETS.map((m) => (0, import_react5.createElement)("button", {
		        key: m,
		        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
		        onClick: () => {
		          setMarket(m);
		          if (query.trim()) doSearch(query, m);
		        }
		      }, MARKET_LABELS[m]))
		    ),
		    (0, import_react5.createElement)("input", {
		      ref: inputRef,
		      className: "skc-input",
		      placeholder: market === "crypto" ? "\u641C\u7D22\u5E01\u79CD\u6216\u4EA4\u6613\u5BF9\uFF0C\u5982 BTC / \u4EE5\u592A\u574A" : "\u641C\u7D22\u540D\u79F0\u6216\u4EE3\u7801\u2026",
		      value: query,
		      onChange: (e) => onQueryChange(e.target.value),
		      onKeyDown: (e) => {
		        if (e.key === "Enter") doSearch(query);
		        if (e.key === "Escape") onClose();
		      }
		    }),
		    searching ? (0, import_react5.createElement)("div", { className: "skc-hint" }, "\u641C\u7D22\u4E2D\u2026") : null,
		    searchError ? (0, import_react5.createElement)("div", { className: "skc-error" }, `${searchError} \u2014\u2014 \u4E0D\u5C55\u793A\u865A\u6784\u7ED3\u679C\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u6216\u76F4\u63A5\u8F93\u5165\u51C6\u786E\u4EE3\u7801\u3002`) : null,
		    results && results.length > 0 ? (0, import_react5.createElement)(
		      "div",
		      { className: "skc-add-results" },
		      results.map((row) => (0, import_react5.createElement)(
		        "button",
		        {
		          key: row.id,
		          className: `skc-add-row${known.has(row.id) ? " skc-add-known" : ""}`,
		          disabled: busy || known.has(row.id),
		          onClick: () => addResult(row)
		        },
		        (0, import_react5.createElement)("span", { className: "skc-add-name" }, row.name),
		        (0, import_react5.createElement)("span", { className: "skc-code" }, row.code + (row.kind === "etf" ? " \xB7 ETF" : "") + (row.market === "crypto" ? ` \xB7 ${row.quoteCurrency} \u5BF9` : "")),
		        known.has(row.id) ? (0, import_react5.createElement)("span", { className: "skc-badge" }, "\u5DF2\u6DFB\u52A0") : null
		      ))
		    ) : null,
		    results && !searching && !searchError && results.length === 0 ? (0, import_react5.createElement)("div", { className: "skc-hint" }, "\u65E0\u5339\u914D\u7ED3\u679C") : null,
		    (0, import_react5.createElement)(
		      "div",
		      { className: "skc-direct" },
		      (0, import_react5.createElement)("span", { className: "skc-section-title" }, "\u76F4\u63A5\u8F93\u5165\u4EE3\u7801"),
		      (0, import_react5.createElement)(
		        "div",
		        { className: "skc-direct-row" },
		        (0, import_react5.createElement)("input", {
		          className: "skc-input",
		          placeholder: market === "cn" ? "\u5982 600519 / 000001 / sh510300" : market === "hk" ? "\u5982 00700" : market === "us" ? "\u5982 AAPL" : "\u5982 BTC-USDT",
		          value: directCode,
		          onChange: (e) => setDirectCode(e.target.value),
		          onKeyDown: (e) => {
		            if (e.key === "Enter") addDirect();
		          }
		        }),
		        (0, import_react5.createElement)("button", { className: "skc-btn skc-btn-primary", disabled: busy || !directCode.trim(), onClick: addDirect }, "\u6821\u9A8C\u5E76\u6DFB\u52A0")
		      ),
		      (0, import_react5.createElement)("div", { className: "skc-hint" }, "\u76F4\u8FDE\u4EE3\u7801\u540C\u6837\u8981\u8FC7\u884C\u60C5\u6821\u9A8C\uFF08\u53D6\u5230\u6709\u6548\u4EF7\u683C\u624D\u6536\uFF09\uFF0C\u65E0\u6548\u4EE3\u7801\u4E0D\u4F1A\u88AB\u52A0\u5165\u3002")
		    )
		  );
		}
		
		// client/backup.mjs
		var import_react6 = require("react");
		function BackupSection({ store: store2, business }) {
		  const fileRef = (0, import_react6.useRef)(null);
		  const [pending, setPending] = (0, import_react6.useState)(null);
		  const [importing, setImporting] = (0, import_react6.useState)(false);
		  const [parseError, setParseError] = (0, import_react6.useState)(null);
		  const pickFile = () => fileRef.current?.click?.();
		  const onFile = async (e) => {
		    const file = e.target.files?.[0];
		    e.target.value = "";
		    if (!file) return;
		    setParseError(null);
		    let text;
		    try {
		      text = await file.text();
		    } catch (err) {
		      setParseError(`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25\uFF1A${err.message ?? err}`);
		      return;
		    }
		    let payload;
		    try {
		      payload = JSON.parse(text);
		    } catch {
		      setParseError("\u4E0D\u662F\u5408\u6CD5\u7684 JSON \u6587\u4EF6");
		      return;
		    }
		    if (payload?.kind !== "stock-kanban-backup" || payload?.schemaVersion !== 1) {
		      setParseError("\u4E0D\u662F\u672C\u63D2\u4EF6\u7684\u5907\u4EFD\u6587\u4EF6\uFF08kind/schemaVersion \u4E0D\u7B26\uFF09\uFF0C\u5DF2\u62D2\u7EDD");
		      return;
		    }
		    const count = Array.isArray(payload.symbols) ? payload.symbols.length : 0;
		    setPending({ payload, count });
		  };
		  const confirmImport = async () => {
		    if (!pending) return;
		    setImporting(true);
		    const result = await store2.importBackup(pending.payload);
		    setImporting(false);
		    if (result.ok) {
		      store2.setToast(`\u5BFC\u5165\u5B8C\u6210\uFF1A${result.result.imported} \u4E2A\u6807\u7684\uFF08\u8986\u76D6\u6A21\u5F0F\uFF09`);
		      setPending(null);
		    } else if (result.error?.status === 422) {
		      store2.setToast(`\u5907\u4EFD\u5185\u5BB9\u6821\u9A8C\u672A\u901A\u8FC7\uFF08${result.error.body?.error ?? "invalid"}\uFF09\uFF0C\u73B0\u6709\u6570\u636E\u672A\u6539\u52A8`);
		      setPending(null);
		    }
		  };
		  return (0, import_react6.createElement)(
		    "div",
		    { className: "skc-backup" },
		    (0, import_react6.createElement)("div", { className: "skc-section-title" }, "\u5907\u4EFD\u4E0E\u8FC1\u79FB"),
		    (0, import_react6.createElement)(
		      "div",
		      { className: "skc-backup-row" },
		      (0, import_react6.createElement)("a", { className: "skc-btn skc-btn-ghost", href: api.exportUrl, download: true }, "\u5BFC\u51FA\u5907\u4EFD"),
		      (0, import_react6.createElement)("button", { className: "skc-btn", onClick: pickFile }, "\u5BFC\u5165\u5907\u4EFD"),
		      (0, import_react6.createElement)("input", { ref: fileRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: onFile })
		    ),
		    parseError ? (0, import_react6.createElement)("div", { className: "skc-error" }, parseError) : null,
		    pending ? (0, import_react6.createElement)(
		      "div",
		      { className: "skc-confirm" },
		      (0, import_react6.createElement)("div", {}, `\u5907\u4EFD\u542B ${pending.count} \u4E2A\u6807\u7684\u3002\u5BFC\u5165\u4E3A\u3010\u8986\u76D6\u3011\u6A21\u5F0F\uFF1A\u5C06\u66FF\u6362\u5F53\u524D\u5168\u90E8\u81EA\u9009/\u6301\u4ED3/\u76EE\u6807\u4EF7\uFF08\u5F53\u524D ${business.symbols.length} \u4E2A\uFF09\u3002`),
		      (0, import_react6.createElement)("div", { className: "skc-hint" }, "\u5907\u4EFD\u6587\u4EF6\u5305\u542B\u4E2A\u4EBA\u6301\u4ED3\u4FE1\u606F\uFF0C\u8BF7\u59A5\u5584\u4FDD\u7BA1\uFF1B\u9690\u79C1\u5F00\u5173\u4E0D\u4F1A\u52A0\u5BC6\u5907\u4EFD\u6587\u4EF6\u3002"),
		      (0, import_react6.createElement)(
		        "div",
		        { className: "skc-backup-row" },
		        (0, import_react6.createElement)("button", { className: "skc-btn skc-btn-danger", disabled: importing, onClick: confirmImport }, "\u786E\u8BA4\u8986\u76D6\u5BFC\u5165"),
		        (0, import_react6.createElement)("button", { className: "skc-btn", disabled: importing, onClick: () => setPending(null) }, "\u53D6\u6D88")
		      )
		    ) : null
		  );
		}
		
		// client/capsule.mjs
		var import_react7 = require("react");
		var import_react8 = require("react");
		function Capsule({ store: store2, ui, symbol, quote }) {
		  const ref = (0, import_react7.useRef)(null);
		  const drag = (0, import_react7.useRef)(null);
		  const pos = ui.pos ?? { x: Math.max(8, window.innerWidth - 180), y: 14, dock: "right" };
		  const onPointerDown = (0, import_react7.useCallback)((e) => {
		    if (e.button !== 0) return;
		    const el = ref.current;
		    if (!el) return;
		    const rect = el.getBoundingClientRect();
		    drag.current = {
		      startX: e.clientX,
		      startY: e.clientY,
		      baseX: rect.left,
		      baseY: rect.top,
		      moved: false,
		      pointerId: e.pointerId
		    };
		    el.setPointerCapture?.(e.pointerId);
		  }, []);
		  const onPointerMove = (0, import_react7.useCallback)((e) => {
		    const d = drag.current;
		    const el = ref.current;
		    if (!d || !el) return;
		    const dx = e.clientX - d.startX;
		    const dy = e.clientY - d.startY;
		    if (!d.moved && shouldDrag(dx, dy)) {
		      d.moved = true;
		      el.classList.add("skc-capsule-dragging");
		    }
		    if (d.moved) {
		      el.style.left = `${d.baseX + dx}px`;
		      el.style.top = `${d.baseY + dy}px`;
		    }
		  }, []);
		  const onPointerUp = (0, import_react7.useCallback)((e) => {
		    const d = drag.current;
		    const el = ref.current;
		    drag.current = null;
		    if (!d || !el) return;
		    el.classList.remove("skc-capsule-dragging");
		    if (d.moved) {
		      const rect = el.getBoundingClientRect();
		      const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
		      el.style.left = `${snapped.x}px`;
		      el.style.top = `${snapped.y}px`;
		      store2.setCapsulePos(snapped);
		    } else {
		      store2.openPanel();
		    }
		  }, [store2]);
		  (0, import_react7.useEffect)(() => {
		    const onResize = () => {
		      const el = ref.current;
		      if (!el) return;
		      const rect = el.getBoundingClientRect();
		      const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
		      store2.setCapsulePos(snapped);
		    };
		    window.addEventListener("resize", onResize);
		    return () => window.removeEventListener("resize", onResize);
		  }, [store2]);
		  const price = quote?.status === "ok" ? quote.price : null;
		  const pct = quote?.changePercent ?? null;
		  const name = symbol ? quote?.name || symbol.name || symbol.code : "\u81EA\u9009";
		  const target = quote?.target;
		  const stale = target?.status === "stale" || target?.status === "no-data";
		  const buyHit = target?.buyTriggered === true;
		  const sellHit = target?.sellTriggered === true;
		  return (0, import_react8.createElement)(
		    "div",
		    {
		      ref,
		      className: `skc-capsule skc-dock-${pos.dock}`,
		      style: { left: pos.x, top: pos.y },
		      onPointerDown,
		      onPointerMove,
		      onPointerUp,
		      onPointerCancel: onPointerUp,
		      title: stale && (symbol?.buyTarget != null || symbol?.sellTarget != null) ? "\u884C\u60C5\u5DF2\u8FC7\u671F\u6216\u4E0D\u53EF\u7528\uFF1A\u89E6\u4EF7\u6807\u8BB0\u6682\u505C\u663E\u793A" : void 0
		    },
		    buyHit ? (0, import_react8.createElement)("span", { className: "skc-capsule-mark skc-mark-buy" }, "\u24B7") : null,
		    sellHit ? (0, import_react8.createElement)("span", { className: "skc-capsule-mark skc-mark-sell" }, "\u24C8") : null,
		    (0, import_react8.createElement)("span", { className: "skc-capsule-name" }, name),
		    (0, import_react8.createElement)("span", { className: `skc-capsule-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : stale && quote ? "\u884C\u60C5\u65E7" : "\u2014"),
		    (0, import_react8.createElement)("span", { className: `skc-capsule-pct ${trendClass(pct)}` }, fmtPct(pct))
		  );
		}
		
		// client/panel.mjs
		function CapsulePicker({ store: store2, snapshot }) {
		  const { ui, business } = snapshot;
		  return (0, import_react9.createElement)(
		    "label",
		    { className: "skc-capsule-picker" },
		    "\u80F6\u56CA\u6807\u7684",
		    (0, import_react9.createElement)(
		      "select",
		      {
		        className: "skc-select",
		        value: ui.capsuleSymbolId ?? "",
		        onChange: (e) => store2.setCapsuleSymbol(e.target.value)
		      },
		      business.symbols.length === 0 ? (0, import_react9.createElement)("option", { value: "" }, "\uFF08\u5148\u6DFB\u52A0\u6807\u7684\uFF09") : null,
		      business.symbols.map((s) => (0, import_react9.createElement)("option", { key: s.id, value: s.id }, `${s.name} \xB7 ${MARKET_LABELS[s.market]}`))
		    )
		  );
		}
		function Panel({ store: store2, snapshot }) {
		  const { ui, business, quotes, quoteMeta, toast } = snapshot;
		  const privacy = business.settings.privacyMode === true;
		  const dragRef = (0, import_react9.useRef)(null);
		  const panelRef = (0, import_react9.useRef)(null);
		  const pos = ui.panelPos ?? { x: Math.max(8, window.innerWidth - 420), y: 14 };
		  const onHeaderPointerDown = (0, import_react9.useCallback)((e) => {
		    if (e.target.closest("button, input, label")) return;
		    const el = panelRef.current;
		    if (!el) return;
		    const rect = el.getBoundingClientRect();
		    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false, id: e.pointerId };
		    el.setPointerCapture?.(e.pointerId);
		  }, []);
		  const onHeaderPointerMove = (0, import_react9.useCallback)((e) => {
		    const d = dragRef.current;
		    const el = panelRef.current;
		    if (!d || !el) return;
		    const dx = e.clientX - d.startX;
		    const dy = e.clientY - d.startY;
		    if (!d.moved && shouldDrag(dx, dy)) d.moved = true;
		    if (d.moved) {
		      const maxX = window.innerWidth - 80;
		      const maxY = window.innerHeight - 60;
		      el.style.left = `${Math.min(Math.max(d.baseX + dx, 0), maxX)}px`;
		      el.style.top = `${Math.min(Math.max(d.baseY + dy, 0), maxY)}px`;
		    }
		  }, []);
		  const onHeaderPointerUp = (0, import_react9.useCallback)(() => {
		    const d = dragRef.current;
		    const el = panelRef.current;
		    dragRef.current = null;
		    if (d?.moved && el) {
		      const rect = el.getBoundingClientRect();
		      store2.setPanelPos({ x: Math.round(rect.left), y: Math.round(rect.top) });
		    }
		  }, [store2]);
		  const currentMarketLabel = MARKET_LABELS[ui.lastMarket] ?? "";
		  return (0, import_react9.createElement)(
		    "div",
		    {
		      ref: panelRef,
		      className: "skc-panel",
		      style: { left: pos.x, top: pos.y }
		    },
		    (0, import_react9.createElement)(
		      "div",
		      { className: "skc-header", onPointerDown: onHeaderPointerDown, onPointerMove: onHeaderPointerMove, onPointerUp: onHeaderPointerUp },
		      (0, import_react9.createElement)("span", { className: "skc-title" }, "\u76EF\u76D8"),
		      (0, import_react9.createElement)("span", { className: "skc-header-meta" }, quoteMeta?.error ? "\u884C\u60C5\u670D\u52A1\u5F02\u5E38" : `${business.symbols.length} \u4E2A\u81EA\u9009 \xB7 \u5B9E\u4F8B\u5171\u4EAB`),
		      (0, import_react9.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react9.createElement)("button", {
		        className: `skc-icon-btn${privacy ? " skc-privacy-on" : ""}`,
		        title: privacy ? "\u9690\u79C1\u5F00\uFF1A\u6301\u4ED3\u91D1\u989D\u5DF2\u906E\u6321\uFF08\u70B9\u51FB\u5173\u95ED\uFF09" : "\u9690\u79C1\u5173\uFF1A\u70B9\u51FB\u9690\u85CF\u6301\u4ED3\u91D1\u989D",
		        onClick: () => store2.setPrivacy(!privacy)
		      }, privacy ? "\u{1F648}" : "\u{1F441}"),
		      (0, import_react9.createElement)("button", { className: "skc-icon-btn", title: "\u6DFB\u52A0\u6807\u7684", onClick: () => store2.setShowAdd(true) }, "\uFF0B"),
		      (0, import_react9.createElement)("button", { className: "skc-icon-btn", title: "\u6536\u8D77\uFF08\u4FDD\u6301\u8F7B\u91CF\u5237\u65B0\uFF09", onClick: () => store2.closePanel() }, "\u2014")
		    ),
		    (0, import_react9.createElement)(
		      "div",
		      { className: "skc-body" },
		      // 列表常驻挂载：详情是覆盖层 → 返回时市场/筛选/滚动全部保留（4.3）
		      (0, import_react9.createElement)(
		        "div",
		        { className: `skc-layer${ui.view === "detail" ? " skc-layer-hidden" : ""}` },
		        (0, import_react9.createElement)(MarketList, { store: store2, ui, business, quotes, privacy }),
		        (0, import_react9.createElement)(BackupSection, { store: store2, business })
		      ),
		      ui.view === "detail" ? (0, import_react9.createElement)(
		        "div",
		        { className: "skc-layer skc-layer-detail" },
		        (0, import_react9.createElement)(Detail, { store: store2, ui, business, quotes, privacy })
		      ) : null
		    ),
		    (0, import_react9.createElement)(
		      "div",
		      { className: "skc-footer" },
		      (0, import_react9.createElement)(CapsulePicker, { store: store2, snapshot }),
		      (0, import_react9.createElement)(
		        "span",
		        { className: "skc-hint" },
		        `\u514D\u8D39\u884C\u60C5\u6709\u5EF6\u8FDF${privacy ? " \xB7 \u9690\u79C1\u906E\u6321\u4E2D\uFF08\u4EC5\u5C55\u793A\u5C42\uFF0C\u6570\u636E\u672A\u52A0\u5BC6\uFF09" : ""} \xB7 \u754C\u9762\u504F\u597D\u6309\u6D4F\u89C8\u5668\u4FDD\u5B58\uFF0C\u6570\u636E\u6309 DSH \u5B9E\u4F8B\u4FDD\u5B58`
		      )
		    ),
		    ui.showAdd ? (0, import_react9.createElement)(AddDialog, { store: store2, business, defaultMarket: ui.lastMarket, onClose: () => store2.setShowAdd(false) }) : null,
		    toast ? (0, import_react9.createElement)("div", { className: "skc-toast" }, toast.text) : null
		  );
		}
		
		// client/styles.mjs
		var injected = false;
		function injectStyles() {
		  if (injected) return;
		  injected = true;
		  const style = document.createElement("style");
		  style.id = "stock-kanban-styles";
		  style.textContent = CSS_TEXT;
		  document.head.appendChild(style);
		}
		var CSS_TEXT = `
		.skc-root{position:fixed;inset:0;pointer-events:none;z-index:9998;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,'Courier New',monospace}
		.skc-root *{box-sizing:border-box}
		
		@media (prefers-color-scheme: dark){
		  .skc-root{--skc-bg:rgba(13,17,26,.96);--skc-border:rgba(255,255,255,.16);--skc-border-soft:rgba(255,255,255,.08);--skc-text:#e5e7eb;--skc-dim:#9ca3af;--skc-muted:#6b7280;--skc-hover:rgba(255,255,255,.06);--skc-accent:#22d3ee;--skc-accent-soft:rgba(34,211,238,.14);--skc-shadow:0 8px 32px rgba(0,0,0,.5)}
		}
		@media (prefers-color-scheme: light){
		  .skc-root{--skc-bg:rgba(255,255,255,.97);--skc-border:rgba(15,23,42,.16);--skc-border-soft:rgba(15,23,42,.08);--skc-text:#1f2937;--skc-dim:#4b5563;--skc-muted:#9ca3af;--skc-hover:rgba(15,23,42,.05);--skc-accent:#0891b2;--skc-accent-soft:rgba(8,145,178,.1);--skc-shadow:0 8px 32px rgba(15,23,42,.18)}
		}
		.skc-up{color:#e5484d}
		.skc-down{color:#2bb596}
		.skc-flat{color:var(--skc-dim)}
		.skc-mono{font-variant-numeric:tabular-nums}
		
		/* \u80F6\u56CA */
		.skc-capsule{position:fixed;display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:var(--skc-bg);border:1px solid var(--skc-border);color:var(--skc-text);cursor:pointer;user-select:none;touch-action:none;box-shadow:0 4px 18px rgba(0,0,0,.3);backdrop-filter:blur(8px);pointer-events:auto;z-index:9999;white-space:nowrap}
		.skc-capsule:hover{border-color:var(--skc-accent)}
		.skc-capsule-dragging{opacity:.9;box-shadow:0 10px 28px rgba(0,0,0,.4)}
		.skc-capsule-name{font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis}
		.skc-capsule-price{font-weight:700}
		.skc-capsule-pct{font-weight:600}
		.skc-capsule-mark{font-weight:700}
		.skc-mark-buy{color:#e5484d}
		.skc-mark-sell{color:#2bb596}
		
		/* \u9762\u677F */
		.skc-panel{position:fixed;width:400px;max-height:80vh;display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:var(--skc-bg);border:1px solid var(--skc-border);color:var(--skc-text);box-shadow:var(--skc-shadow);backdrop-filter:blur(10px);pointer-events:auto;z-index:9999}
		.skc-header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--skc-border-soft);cursor:move;touch-action:none}
		.skc-title{font-weight:700;color:var(--skc-accent);white-space:nowrap}
		.skc-header-meta{color:var(--skc-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
		.skc-spacer{flex:1}
		.skc-body{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;display:flex;flex-direction:column}
		.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
		.skc-layer-hidden{display:none}
		.skc-footer{padding:4px 10px;border-top:1px solid var(--skc-border-soft)}
		
		/* \u5217\u8868 */
		.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
		.skc-tabs{display:flex;gap:4px;padding:6px 8px 0;overflow-x:auto;scrollbar-width:none}
		.skc-tabs::-webkit-scrollbar{display:none}
		.skc-tab{flex:none;padding:3px 10px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--skc-muted);cursor:pointer;font:inherit}
		.skc-tab:hover{color:var(--skc-text)}
		.skc-tab-active{background:var(--skc-accent-soft);color:var(--skc-accent);border-color:var(--skc-accent)}
		.skc-filterbar{display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid var(--skc-border-soft)}
		.skc-filter{display:flex;align-items:center;gap:5px;color:var(--skc-dim);cursor:pointer}
		.skc-rows{overflow-y:auto;flex:1;padding:4px 6px 8px}
		.skc-row{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px;cursor:pointer}
		.skc-row:hover{background:var(--skc-hover)}
		.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
		.skc-name-text{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
		.skc-code{color:var(--skc-muted);font-size:11px}
		.skc-pos-dot{color:var(--skc-accent)}
		.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none}
		.skc-pct{font-size:11px}
		.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:86px}
		.skc-pnl-amt,.skc-pnl-pct{font-size:11px}
		.skc-row-target{display:flex;gap:3px;flex:none;min-width:40px;justify-content:flex-end}
		.skc-badge{display:inline-block;padding:0 5px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--skc-border)}
		.skc-badge-buy{color:#e5484d;border-color:rgba(229,72,77,.5)}
		.skc-badge-sell{color:#2bb596;border-color:rgba(43,181,150,.5)}
		.skc-badge-stale{color:var(--skc-dim);border-color:var(--skc-border)}
		.skc-empty{padding:24px 12px;text-align:center;color:var(--skc-muted)}
		
		/* \u8BE6\u60C5 */
		.skc-layer-detail{overflow-y:auto;padding:8px 10px}
		.skc-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
		.skc-detail-title{font-weight:700;font-size:14px}
		.skc-quote-line{display:flex;align-items:baseline;gap:10px;margin:8px 0;flex-wrap:wrap}
		.skc-quote-price{font-size:18px;font-weight:700}
		.skc-quote-pct{font-weight:600}
		.skc-quote-meta{color:var(--skc-muted);font-size:10px;display:inline-flex;gap:6px;align-items:center}
		.skc-period-tabs{display:flex;align-items:center;gap:4px;margin-bottom:4px}
		.skc-period{padding:2px 9px}
		.skc-adjust{color:var(--skc-muted);font-size:10px;margin-left:6px}
		.skc-chartbox{border:1px solid var(--skc-border-soft);border-radius:8px;padding:4px;min-height:140px;display:flex;align-items:center;justify-content:center}
		.skc-chart{display:block;max-width:100%}
		.skc-chart-empty{color:var(--skc-muted);padding:20px;text-align:center}
		.skc-chart-error{color:#e5484d}
		.skc-ma-legend{display:flex;gap:2px;margin-left:6px}
		.skc-ma-chip{border:1px solid var(--skc-border);background:transparent;border-radius:999px;font-size:10px;padding:0 6px;cursor:pointer;color:inherit}
		.skc-ma-off{opacity:.35}
		.skc-section-title{font-weight:700;margin:10px 0 4px;display:flex;align-items:center;gap:8px}
		.skc-section-meta{color:var(--skc-dim);font-size:11px;font-weight:400}
		.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
		.skc-form-grid label{display:flex;flex-direction:column;gap:3px;color:var(--skc-dim);font-size:11px}
		.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
		.skc-input{background:transparent;border:1px solid var(--skc-border);border-radius:6px;color:var(--skc-text);padding:4px 8px;font:inherit;width:100%}
		.skc-input:focus{outline:none;border-color:var(--skc-accent)}
		.skc-select{background:var(--skc-bg);border:1px solid var(--skc-border);border-radius:6px;color:var(--skc-text);padding:2px 6px;font:inherit;max-width:180px}
		.skc-btn{background:transparent;border:1px solid var(--skc-border);border-radius:6px;color:var(--skc-text);padding:3px 10px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}
		.skc-btn:hover{border-color:var(--skc-accent);color:var(--skc-accent)}
		.skc-btn-primary{border-color:var(--skc-accent);color:var(--skc-accent)}
		.skc-btn-danger{border-color:rgba(229,72,77,.5);color:#e5484d}
		.skc-btn-ghost{border-color:transparent}
		.skc-icon-btn{background:transparent;border:none;color:var(--skc-muted);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;font-family:inherit}
		.skc-icon-btn:hover{color:var(--skc-text);background:var(--skc-hover)}
		.skc-privacy-on{color:var(--skc-accent)}
		.skc-hint{color:var(--skc-muted);font-size:10px;margin-top:4px}
		.skc-error{color:#e5484d;font-size:11px;margin-top:4px}
		.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:#e5484d;font-size:11px;z-index:10000;background:var(--skc-bg);border:1px solid var(--skc-border);border-radius:6px;padding:2px 8px}
		.skc-masked-hint{color:var(--skc-muted);font-size:10px}
		.skc-targets,.skc-holdings{margin-top:4px}
		.skc-backup{margin-top:10px;border-top:1px solid var(--skc-border-soft);padding:6px 2px}
		.skc-backup-row{display:flex;gap:8px;margin:6px 0}
		.skc-confirm{border:1px solid rgba(229,72,77,.4);border-radius:8px;padding:8px;margin:6px 0}
		
		/* \u6DFB\u52A0\u5BF9\u8BDD\u6846 */
		.skc-dialog{position:absolute;inset:0;background:var(--skc-bg);z-index:5;display:flex;flex-direction:column;gap:8px;padding:10px;overflow-y:auto}
		.skc-dialog-head{display:flex;align-items:center;gap:8px}
		.skc-add-results{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto}
		.skc-add-row{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid var(--skc-border-soft);border-radius:8px;color:var(--skc-text);padding:5px 8px;cursor:pointer;font:inherit;text-align:left}
		.skc-add-row:hover:not(:disabled){border-color:var(--skc-accent)}
		.skc-add-row:disabled{opacity:.5;cursor:default}
		.skc-add-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.skc-direct{border-top:1px solid var(--skc-border-soft);padding-top:8px}
		.skc-direct-row{display:flex;gap:8px;margin-top:4px}
		
		/* \u80F6\u56CA\u9009\u62E9\u5668 / toast */
		.skc-capsule-picker{display:flex;align-items:center;gap:6px;color:var(--skc-dim);font-size:11px}
		.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:var(--skc-bg);border:1px solid var(--skc-border);border-radius:8px;padding:6px 14px;color:var(--skc-text);box-shadow:var(--skc-shadow);pointer-events:none;max-width:80vw}
		`;
		
		// client/main.mjs
		var store = createStore();
		function App() {
		  const snapshot = useStore(store);
		  const { ui, business, quotes, quoteMeta } = snapshot;
		  (0, import_react10.useEffect)(() => {
		    injectStyles();
		    store.refreshState().then(() => store.restartPolling()).catch((e) => store.setToast(`\u521D\u59CB\u5316\u5931\u8D25\uFF1A${e.message ?? e}`));
		    const onVis = () => store.handleVisibility();
		    document.addEventListener("visibilitychange", onVis);
		    return () => document.removeEventListener("visibilitychange", onVis);
		  }, []);
		  const capsuleId = ui.capsuleSymbolId ?? business.symbols[0]?.id ?? null;
		  const capsuleSymbol = business.symbols.find((s) => s.id === capsuleId) ?? null;
		  const capsuleQuote = capsuleId ? quotes[capsuleId] : null;
		  return (0, import_react10.createElement)(
		    "div",
		    { className: "skc-root" },
		    (0, import_react10.createElement)(Capsule, { store, ui, symbol: capsuleSymbol, quote: capsuleQuote }),
		    ui.panelOpen ? (0, import_react10.createElement)(Panel, { store, snapshot }) : null,
		    (0, import_react10.createElement)("div", { className: "skc-error-global" }, quoteMeta?.error ? `\u884C\u60C5\u62C9\u53D6\u5931\u8D25\uFF1A${quoteMeta.error}` : null)
		  );
		}
		var inject = ["slots"];
		function apply(ctx) {
		  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
		    name: "shell.overlay",
		    id: "stock-kanban"
		  }, () => (0, import_react10.createElement)(App)));
		}
		
		return module.exports;
	}
});
