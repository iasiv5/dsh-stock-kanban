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
		var MASK = "\u2022\u2022\u2022\u2022";
		function maskIf(privacy, value) {
		  return privacy ? MASK : value;
		}
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
		  if (v == null || !Number.isFinite(v) || v === 0) return "skc-flat";
		  return v > 0 ? "skc-up" : "skc-down";
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
		var DRAG_THRESHOLD_PX = 4;
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
		
		// client/i18n.mjs
		function resolveLang(navLang, doc) {
		  const host = typeof doc !== "undefined" && doc ? String(doc.documentElement?.lang ?? "").trim() : "";
		  if (host !== "") return host.toLowerCase().startsWith("zh") ? "zh" : "en";
		  return typeof navLang === "string" && navLang.toLowerCase().startsWith("zh") ? "zh" : "en";
		}
		var hostDoc = typeof document !== "undefined" ? document : void 0;
		var LANG = resolveLang(typeof navigator !== "undefined" ? navigator.language : void 0, hostDoc);
		var currentLang = LANG;
		function setLang(lang) {
		  if (lang === "zh" || lang === "en") currentLang = lang;
		}
		var zh = {
		  "market.cn": "A \u80A1",
		  "market.hk": "\u6E2F\u80A1",
		  "market.us": "\u7F8E\u80A1",
		  "market.crypto": "\u52A0\u5BC6\u8D27\u5E01",
		  "app.title": "\u76EF\u76D8",
		  "app.meta": "{n} \u4E2A\u81EA\u9009 \xB7 \u5B9E\u4F8B\u5171\u4EAB",
		  "app.meta.error": "\u884C\u60C5\u670D\u52A1\u5F02\u5E38",
		  "app.footer": "\u514D\u8D39\u884C\u60C5\u6709\u5EF6\u8FDF{privacy} \xB7 \u754C\u9762\u504F\u597D\u5B58\u672C\u6D4F\u89C8\u5668\uFF0C\u6570\u636E\u5B58 DSH \u5B9E\u4F8B",
		  "app.footer.privacy": " \xB7 \u9690\u79C1\u906E\u6321\u4E2D\uFF08\u5C55\u793A\u5C42\uFF0C\u975E\u52A0\u5BC6\uFF09",
		  "app.quote-failed": "\u884C\u60C5\u62C9\u53D6\u5931\u8D25\uFF1A{e}",
		  "privacy.on": "\u9690\u79C1\u5F00\uFF1A\u91D1\u989D\u5DF2\u906E\u6321",
		  "privacy.off": "\u9690\u79C1\u5173\uFF1A\u70B9\u51FB\u906E\u6321\u91D1\u989D",
		  "app.collapse": "\u6536\u8D77",
		  "app.settings": "\u8BBE\u7F6E\uFF08\u5907\u4EFD\u4E0E\u8FC1\u79FB\uFF09",
		  "app.drag": "\u6309\u4F4F\u62D6\u52A8",
		  "capsule.empty": "\u81EA\u9009",
		  "capsule.stale": "\u884C\u60C5\u65E7",
		  "capsule.tip.stale": "\u884C\u60C5\u5DF2\u8FC7\u671F\uFF1A\u89E6\u4EF7\u6807\u8BB0\u6682\u505C\u663E\u793A",
		  "badge.stale": "\u65E7",
		  "badge.closed": "\u4F11",
		  "badge.no-data": "\u65E0",
		  "badge.added": "\u5DF2\u6DFB\u52A0",
		  "badge.holder": "\u5DF2\u586B\u6301\u4ED3",
		  "badge.stale.tip": "\u884C\u60C5\u8FC7\u671F\uFF1A\u89E6\u4EF7\u72B6\u6001\u6682\u505C\u5224\u65AD",
		  "badge.closed.tip": "\u4F11\u5E02\u4E2D\uFF1A\u4EE5\u4E0B\u4E00\u4EA4\u6613\u65F6\u6BB5\u884C\u60C5\u6062\u590D\u5224\u65AD",
		  "badge.no-data.tip": "\u884C\u60C5\u7F3A\u5931\uFF1A\u89E6\u4EF7\u72B6\u6001\u672A\u77E5",
		  "list.holdings-only": "\u53EA\u770B\u6301\u4ED3",
		  "list.refresh": "\u5237\u65B0",
		  "list.empty.watch": "\u6682\u65E0\u81EA\u9009\uFF0C\u70B9\u300C\uFF0B\u300D\u6DFB\u52A0",
		  "list.empty.holdings": "\u8BE5\u5E02\u573A\u6682\u65E0\u6301\u4ED3",
		  "list.quote-failed": "\u83B7\u53D6\u5931\u8D25",
		  "detail.back": "\u2190 \u8FD4\u56DE",
		  "detail.delete": "\u5220\u9664",
		  "detail.missing": "\u6807\u7684\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5220\u9664",
		  "detail.quote-time": "\u884C\u60C5 {t} \xB7 \u62C9\u53D6 {f}",
		  "detail.stale": "\u884C\u60C5\u8FC7\u671F",
		  "detail.no-data": "\u884C\u60C5\u7F3A\u5931",
		  "detail.period.minute": "\u5206\u65F6",
		  "detail.period.day": "\u65E5K",
		  "detail.period.week": "\u5468K",
		  "detail.period.month": "\u6708K",
		  "detail.adjust.fwd": "\u524D\u590D\u6743",
		  "detail.adjust.none": "\u4E0D\u590D\u6743",
		  "detail.chart.loading": "\u52A0\u8F7D\u4E2D\u2026",
		  "detail.chart.empty.minute": "\u6682\u65E0\u5206\u65F6\u6570\u636E",
		  "detail.chart.empty.candle": "\u6682\u65E0K\u7EBF\u6570\u636E",
		  "detail.chart.error": "\u52A0\u8F7D\u5931\u8D25\uFF1A{e}",
		  "detail.holdings": "\u6301\u4ED3",
		  "detail.holdings.meta": "\u5E02\u503C {v} {ccy} \xB7 \u76C8\u4E8F {p}\uFF08{pct}\uFF09",
		  "detail.cost-unset": "\u6210\u672C\u672A\u586B",
		  "detail.no-quote": "\u65E0\u884C\u60C5",
		  "detail.quantity.shares": "\u6570\u91CF\uFF08\u80A1\uFF09",
		  "detail.quantity.coins": "\u6570\u91CF\uFF08\u5E01\uFF09",
		  "detail.avg-cost": "\u5E73\u5747\u6210\u672C\uFF08{ccy}\uFF09",
		  "detail.blank-clears": "\u7559\u7A7A\u6E05\u9664",
		  "detail.save-position": "\u5B58\u6301\u4ED3",
		  "detail.clear-position": "\u6E05\u6301\u4ED3",
		  "detail.targets": "\u76EE\u6807\u4EF7",
		  "detail.buy-target": "\u4E70\u5165\u76EE\u6807\u4EF7\uFF08\u2264 \u89E6\u53D1 \u24B7\uFF0C{ccy}\uFF09",
		  "detail.sell-target": "\u5356\u51FA\u76EE\u6807\u4EF7\uFF08\u2265 \u89E6\u53D1 \u24C8\uFF0C{ccy}\uFF09",
		  "detail.unset": "\u4E0D\u8BBE\u7F6E",
		  "detail.save-targets": "\u5B58\u76EE\u6807\u4EF7",
		  "detail.overlap": "\u9608\u503C\u91CD\u53E0",
		  "detail.targets.hint": "\u4EC5\u57FA\u4E8E\u6709\u6548\u884C\u60C5\u5224\u65AD\uFF1B\u8FC7\u671F/\u7F3A\u5931\u65F6\u6682\u505C\uFF0C\u6062\u590D\u5373\u7EED\u3002",
		  "detail.confirm.overlap": "\u4E70\u5165\u76EE\u6807\u4EF7\u4E0D\u4F4E\u4E8E\u5356\u51FA\u76EE\u6807\u4EF7\uFF0C\u4E24\u4E2A\u6807\u8BB0\u53EF\u80FD\u540C\u65F6\u663E\u793A\u3002\u4ECD\u8981\u4FDD\u5B58\uFF1F",
		  "detail.confirm.remove": "\u5220\u9664\u300C{name}\u300D\uFF1F\u6301\u4ED3\u4E0E\u76EE\u6807\u4EF7\u4E00\u5E76\u79FB\u9664\uFF08\u53EF\u7528\u5907\u4EFD\u6062\u590D\uFF09\u3002",
		  "detail.err.numbers": "\u6570\u91CF\u4E0E\u6210\u672C\u987B\u4E3A\u6B63\u6570",
		  "detail.err.targets": "\u76EE\u6807\u4EF7\u987B\u4E3A\u6B63\u6570",
		  "add.title": "\u6DFB\u52A0\u6807\u7684",
		  "add.search.cn": "\u641C\u540D\u79F0\u6216\u4EE3\u7801\u2026",
		  "add.search.hk": "\u641C\u540D\u79F0\u6216\u4EE3\u7801\u2026",
		  "add.search.us": "\u641C\u540D\u79F0\u6216\u4EE3\u7801\u2026",
		  "add.search.crypto": "\u641C\u5E01\u79CD\u6216\u4EA4\u6613\u5BF9\uFF08BTC / \u4EE5\u592A\u574A\uFF09",
		  "add.direct": "\u76F4\u63A5\u8F93\u4EE3\u7801",
		  "add.direct.cn": "600519 / 000001 / sh510300",
		  "add.direct.hk": "00700",
		  "add.direct.us": "AAPL",
		  "add.direct.crypto": "BTC-USDT",
		  "add.validate": "\u6821\u9A8C\u5E76\u6DFB\u52A0",
		  "add.hint": "\u4EE3\u7801\u987B\u8FC7\u884C\u60C5\u6821\u9A8C\uFF08\u53D6\u5230\u6709\u6548\u4EF7\u624D\u6536\uFF09\u3002",
		  "add.searching": "\u641C\u7D22\u4E2D\u2026",
		  "add.no-match": "\u65E0\u5339\u914D\u7ED3\u679C",
		  "add.search-error": "\u641C\u7D22\u6E90\u4E0D\u53EF\u7528\uFF1A{e}\uFF0C\u4E0D\u5C55\u793A\u865A\u6784\u7ED3\u679C",
		  "add.not-found": "\u4EE3\u7801\u65E0\u6548\u6216\u65E0\u884C\u60C5\uFF08{e}\uFF09",
		  "backup.title": "\u5907\u4EFD\u4E0E\u8FC1\u79FB",
		  "backup.export": "\u5BFC\u51FA\u5907\u4EFD",
		  "backup.import": "\u5BFC\u5165\u5907\u4EFD",
		  "backup.confirm": "\u5907\u4EFD\u542B {n} \u4E2A\u6807\u7684\uFF1B\u5BFC\u5165\u4E3A\u8986\u76D6\u6A21\u5F0F\uFF0C\u66FF\u6362\u5F53\u524D\u5168\u90E8\u6570\u636E\uFF08\u73B0 {m} \u4E2A\uFF09\u3002",
		  "backup.privacy-note": "\u5907\u4EFD\u542B\u6301\u4ED3\u660E\u6587\uFF0C\u8BF7\u59A5\u5584\u4FDD\u7BA1\uFF1B\u9690\u79C1\u5F00\u5173\u4E0D\u52A0\u5BC6\u5907\u4EFD\u3002",
		  "backup.overwrite": "\u786E\u8BA4\u8986\u76D6\u5BFC\u5165",
		  "backup.cancel": "\u53D6\u6D88",
		  "backup.done": "\u5DF2\u5BFC\u5165 {n} \u4E2A\u6807\u7684\uFF08\u8986\u76D6\uFF09",
		  "backup.rejected": "\u5907\u4EFD\u6821\u9A8C\u672A\u901A\u8FC7\uFF08{e}\uFF09\uFF0C\u73B0\u6709\u6570\u636E\u672A\u52A8",
		  "backup.err.read": "\u8BFB\u53D6\u5931\u8D25\uFF1A{e}",
		  "backup.err.json": "\u4E0D\u662F\u5408\u6CD5 JSON \u6587\u4EF6",
		  "backup.err.kind": "\u4E0D\u662F\u672C\u63D2\u4EF6\u7684\u5907\u4EFD\u6587\u4EF6",
		  "toast.added": "\u5DF2\u6DFB\u52A0 {name}",
		  "toast.duplicate": "\u8BE5\u6807\u7684\u5DF2\u5728\u81EA\u9009\u4E2D",
		  "toast.position-saved": "\u6301\u4ED3\u5DF2\u4FDD\u5B58",
		  "toast.position-cleared": "\u6301\u4ED3\u5DF2\u6E05\u9664",
		  "toast.targets-saved": "\u76EE\u6807\u4EF7\u5DF2\u4FDD\u5B58",
		  "toast.conflict": "\u6570\u636E\u5DF2\u88AB\u5176\u4ED6\u9875\u9762\u66F4\u65B0\uFF1A\u5DF2\u5237\u65B0\uFF0C\u8BF7\u91CD\u8BD5",
		  "toast.init-failed": "\u521D\u59CB\u5316\u5931\u8D25\uFF1A{e}",
		  "toast.op-failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{e}",
		  "picker.label": "\u80F6\u56CA\u6807\u7684",
		  "picker.empty": "\u5148\u6DFB\u52A0\u6807\u7684",
		  "err.duplicate": "\u8BE5\u6807\u7684\u5DF2\u5728\u81EA\u9009\u4E2D",
		  "err.invalid-identity": "\u4EE3\u7801\u683C\u5F0F\u65E0\u6548",
		  "err.quote-unavailable": "\u884C\u60C5\u6682\u4E0D\u53EF\u7528\uFF0C\u7A0D\u540E\u518D\u8BD5",
		  "err.symbol-not-found": "\u672A\u627E\u5230\u8BE5\u6807\u7684",
		  "err.not-found": "\u6807\u7684\u4E0D\u5B58\u5728",
		  "err.no-data": "\u65E0\u884C\u60C5\u6570\u636E",
		  "err.fetch-failed": "\u884C\u60C5\u83B7\u53D6\u5931\u8D25",
		  "err.api-error": "\u63A5\u53E3\u8FD4\u56DE\u5F02\u5E38",
		  "err.invalid-code": "\u4EE3\u7801\u65E0\u6548",
		  "err.save-failed": "\u4FDD\u5B58\u5931\u8D25",
		  "err.invalid-input": "\u8F93\u5165\u65E0\u6548",
		  "err.invalid-buy-target": "\u4E70\u5165\u76EE\u6807\u4EF7\u5FC5\u987B\u662F\u6B63\u6570",
		  "err.invalid-sell-target": "\u5356\u51FA\u76EE\u6807\u4EF7\u5FC5\u987B\u662F\u6B63\u6570",
		  "err.unsupported-schema-version": "\u5907\u4EFD\u7248\u672C\u4E0D\u652F\u6301",
		  "err.wrong-kind": "\u5907\u4EFD\u7C7B\u578B\u4E0D\u7B26",
		  "err.not-an-object": "\u5907\u4EFD\u683C\u5F0F\u9519\u8BEF",
		  "err.symbols-not-array": "\u5907\u4EFD symbols \u5B57\u6BB5\u65E0\u6548",
		  "err.rev-conflict": "\u7248\u672C\u51B2\u7A81",
		  "err.origin-rejected": "\u8DE8\u6E90\u8BF7\u6C42\u88AB\u62D2\u7EDD",
		  "err.unknown-market": "\u672A\u77E5\u5E02\u573A"
		};
		var en = {
		  "market.cn": "A-shares",
		  "market.hk": "HK",
		  "market.us": "US",
		  "market.crypto": "Crypto",
		  "app.title": "Watchlist",
		  "app.meta": "{n} symbols \xB7 shared per instance",
		  "app.meta.error": "Quote service error",
		  "app.footer": "Free quotes are delayed{privacy} \xB7 UI prefs stay in this browser; data lives on the DSH instance",
		  "app.footer.privacy": " \xB7 privacy masking on (display only, not encryption)",
		  "app.quote-failed": "Quote fetch failed: {e}",
		  "privacy.on": "Privacy on: amounts masked",
		  "privacy.off": "Privacy off: tap to mask",
		  "app.collapse": "Collapse",
		  "app.settings": "Settings (backup & migrate)",
		  "app.drag": "Drag to move",
		  "capsule.empty": "Watchlist",
		  "capsule.stale": "Stale",
		  "capsule.tip.stale": "Quote stale: trigger marks paused",
		  "badge.stale": "Stale",
		  "badge.closed": "Closed",
		  "badge.no-data": "N/A",
		  "badge.added": "Added",
		  "badge.holder": "Has position",
		  "badge.stale.tip": "Quote stale: trigger check paused",
		  "badge.closed.tip": "Market closed: resumes next session",
		  "badge.no-data.tip": "No quote: trigger state unknown",
		  "list.holdings-only": "Holdings only",
		  "list.refresh": "Refresh",
		  "list.empty.watch": "No symbols yet \u2014 tap \uFF0B",
		  "list.empty.holdings": "No holdings in this market",
		  "list.quote-failed": "Failed",
		  "detail.back": "\u2190 Back",
		  "detail.delete": "Delete",
		  "detail.missing": "Symbol missing or removed",
		  "detail.quote-time": "Quote {t} \xB7 Fetched {f}",
		  "detail.stale": "Stale",
		  "detail.no-data": "No quote",
		  "detail.period.minute": "Time",
		  "detail.period.day": "Day",
		  "detail.period.week": "Week",
		  "detail.period.month": "Month",
		  "detail.adjust.fwd": "Fwd-adjusted",
		  "detail.adjust.none": "Unadjusted",
		  "detail.chart.loading": "Loading\u2026",
		  "detail.chart.empty.minute": "No intraday data",
		  "detail.chart.empty.candle": "No candle data",
		  "detail.chart.error": "Load failed: {e}",
		  "detail.holdings": "Position",
		  "detail.holdings.meta": "Value {v} {ccy} \xB7 PnL {p} ({pct})",
		  "detail.cost-unset": "cost unset",
		  "detail.no-quote": "no quote",
		  "detail.quantity.shares": "Quantity (shares)",
		  "detail.quantity.coins": "Quantity (coins)",
		  "detail.avg-cost": "Avg cost ({ccy})",
		  "detail.blank-clears": "blank clears",
		  "detail.save-position": "Save",
		  "detail.clear-position": "Clear",
		  "detail.targets": "Targets",
		  "detail.buy-target": "Buy target (\u2264 fires \u24B7, {ccy})",
		  "detail.sell-target": "Sell target (\u2265 fires \u24C8, {ccy})",
		  "detail.unset": "unset",
		  "detail.save-targets": "Save",
		  "detail.overlap": "overlap",
		  "detail.targets.hint": "Checked against live quotes only; paused while stale, resumes automatically.",
		  "detail.confirm.overlap": "Buy target \u2265 sell target: both marks may show at once. Save anyway?",
		  "detail.confirm.remove": "Remove \u201C{name}\u201D? Position and targets go too (recoverable via backup).",
		  "detail.err.numbers": "Quantity and cost must be positive",
		  "detail.err.targets": "Targets must be positive",
		  "add.title": "Add symbol",
		  "add.search.cn": "Search name or code\u2026",
		  "add.search.hk": "Search name or code\u2026",
		  "add.search.us": "Search name or code\u2026",
		  "add.search.crypto": "Search coin or pair (BTC / Ethereum)",
		  "add.direct": "Direct code",
		  "add.direct.cn": "600519 / 000001 / sh510300",
		  "add.direct.hk": "00700",
		  "add.direct.us": "AAPL",
		  "add.direct.crypto": "BTC-USDT",
		  "add.validate": "Validate & add",
		  "add.hint": "Codes must pass a live quote check before being added.",
		  "add.searching": "Searching\u2026",
		  "add.no-match": "No matches",
		  "add.search-error": "Search unavailable: {e} \u2014 no fake results",
		  "add.not-found": "Invalid code or no quote ({e})",
		  "backup.title": "Backup & migrate",
		  "backup.export": "Export",
		  "backup.import": "Import",
		  "backup.confirm": "Backup holds {n} symbols; import OVERWRITES all current data ({m}).",
		  "backup.privacy-note": "Backups contain positions in plain text \u2014 keep them safe; privacy mode does not encrypt backups.",
		  "backup.overwrite": "Overwrite import",
		  "backup.cancel": "Cancel",
		  "backup.done": "Imported {n} symbols (overwrite)",
		  "backup.rejected": "Backup rejected ({e}); current data unchanged",
		  "backup.err.read": "Read failed: {e}",
		  "backup.err.json": "Invalid JSON file",
		  "backup.err.kind": "Not a stock-kanban backup",
		  "toast.added": "Added {name}",
		  "toast.duplicate": "Already in watchlist",
		  "toast.position-saved": "Position saved",
		  "toast.position-cleared": "Position cleared",
		  "toast.targets-saved": "Targets saved",
		  "toast.conflict": "Data changed in another tab: refreshed \u2014 please retry",
		  "toast.init-failed": "Init failed: {e}",
		  "toast.op-failed": "Action failed: {e}",
		  "picker.label": "Capsule",
		  "picker.empty": "add symbols first",
		  "err.duplicate": "Already in watchlist",
		  "err.invalid-identity": "Invalid code format",
		  "err.quote-unavailable": "Quote unavailable, retry later",
		  "err.symbol-not-found": "Symbol not found",
		  "err.not-found": "Symbol not found",
		  "err.no-data": "No quote data",
		  "err.fetch-failed": "Quote fetch failed",
		  "err.api-error": "API error",
		  "err.invalid-code": "Invalid code",
		  "err.save-failed": "Save failed",
		  "err.invalid-input": "Invalid input",
		  "err.invalid-buy-target": "Buy target must be a positive number",
		  "err.invalid-sell-target": "Sell target must be a positive number",
		  "err.unsupported-schema-version": "Backup version unsupported",
		  "err.wrong-kind": "Wrong backup kind",
		  "err.not-an-object": "Malformed backup",
		  "err.symbols-not-array": "Backup symbols field invalid",
		  "err.rev-conflict": "Version conflict",
		  "err.origin-rejected": "Cross-origin request rejected",
		  "err.unknown-market": "Unknown market"
		};
		var DICTS = { zh, en };
		function t(key, params) {
		  let s = DICTS[currentLang][key] ?? DICTS.zh[key] ?? key;
		  if (params) {
		    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
		  }
		  return s;
		}
		function tErr(code, detail) {
		  if (code == null || code === "") return "";
		  const label = String(code).split(",").map((c) => {
		    const base = t(`err.${c}`);
		    return base.startsWith("err.") ? c : base;
		  }).join(", ");
		  return detail ? `${label} (${detail})` : label;
		}
		var DICT_KEYS = { zh: Object.keys(zh).sort(), en: Object.keys(en).sort() };
		
		// client/store.mjs
		var UI_KEY = "stock-kanban:ui:v1";
		var DEFAULT_UI = {
		  panelOpen: false,
		  view: "list",
		  // 'list' | 'detail'（会话内状态；重开面板始终先列表）
		  detailId: null,
		  showAdd: false,
		  // 会话态：添加对话框
		  showSettings: false,
		  // 会话态：设置对话框（备份与迁移）
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
		  let capsuleRect = null;
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
		      const { panelOpen, view, detailId, showAdd, showSettings, panelPos, toast, ...persisted } = state.ui;
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
		        setToast(t("toast.conflict"));
		        return { ok: false, conflict: true, error: e };
		      }
		      setToast(t("toast.op-failed", { e: tErr(e.body?.error, String(e?.message ?? e)) }));
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
		    setUi({ panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false });
		    restartPolling();
		  }
		  function closePanel() {
		    setUi({ panelOpen: false, view: "list", detailId: null, showSettings: false });
		    restartPolling();
		  }
		  function togglePanel() {
		    if (state.ui.panelOpen) closePanel();
		    else openPanel();
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
		  function setCapsuleRect(rect) {
		    capsuleRect = rect;
		  }
		  function getCapsuleRect() {
		    return capsuleRect;
		  }
		  function setPanelPos(pos) {
		    setUi({ panelPos: pos });
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
		  function setShowSettings(v) {
		    setUi({ showSettings: v });
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
		    togglePanel,
		    openDetail,
		    backToList,
		    setCapsuleRect,
		    getCapsuleRect,
		    setLastMarket,
		    setHoldingsOnly,
		    setMaVisible,
		    setCapsuleSymbol,
		    setCapsulePos,
		    setPanelPos,
		    setToast,
		    setShowAdd,
		    setShowSettings,
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
		
		// src/sessions.mjs
		var MARKET_SESSIONS = {
		  cn: { tz: "Asia/Shanghai", windows: [[570, 690], [780, 900]] },
		  hk: { tz: "Asia/Hong_Kong", windows: [[570, 720], [780, 960]] },
		  us: { tz: "America/New_York", windows: [[570, 960]] }
		};
		var MIN = 60 * 1e3;
		function wallParts(epoch, tz) {
		  const dtf = new Intl.DateTimeFormat("en-GB", {
		    timeZone: tz,
		    hour12: false,
		    year: "numeric",
		    month: "2-digit",
		    day: "2-digit",
		    hour: "2-digit",
		    minute: "2-digit",
		    second: "2-digit"
		  });
		  const parts = {};
		  for (const p of dtf.formatToParts(new Date(epoch))) parts[p.type] = p.value;
		  return { y: Number(parts.year), mo: Number(parts.month), d: Number(parts.day) };
		}
		function localDow(epoch, tz) {
		  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(epoch));
		  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
		}
		function wallToEpoch(y, mo, d, minutes, tz) {
		  const guess = Date.UTC(y, mo - 1, d, 0, minutes);
		  const dtf = new Intl.DateTimeFormat("en-US", {
		    timeZone: tz,
		    hour12: false,
		    year: "numeric",
		    month: "2-digit",
		    day: "2-digit",
		    hour: "2-digit",
		    minute: "2-digit",
		    second: "2-digit"
		  });
		  const offsetFor = (ms) => {
		    const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
		    const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
		    return asUTC - ms;
		  };
		  return guess - offsetFor(guess);
		}
		function lastSessionWindow(market, now) {
		  const cfg = MARKET_SESSIONS[market];
		  if (!cfg) return null;
		  const { tz, windows } = cfg;
		  const w0 = wallParts(now, tz);
		  for (let offset = 0; offset <= 7; offset++) {
		    const epoch = now - offset * 24 * 60 * MIN;
		    const dow = localDow(epoch, tz);
		    if (dow === 0 || dow === 6) continue;
		    const parts = wallParts(epoch, tz);
		    const dayEpochs = windows.map(([a, b]) => ({ start: wallToEpoch(parts.y, parts.mo, parts.d, a, tz), end: wallToEpoch(parts.y, parts.mo, parts.d, b, tz) })).sort((x, y2) => x.start - y2.start);
		    for (const w of dayEpochs) {
		      if (now >= w.start && now <= w.end) return { inSession: true, ...w, dayOffset: offset };
		    }
		    const completed = dayEpochs.filter((w) => w.end < now);
		    if (completed.length > 0) {
		      const last = completed[completed.length - 1];
		      return { inSession: false, ...last, dayOffset: offset };
		    }
		  }
		  return null;
		}
		function staleBadgeKind(market, status, quoteTime, now) {
		  if (status !== "stale") return null;
		  if (market === "crypto" || market === "us") return "stale";
		  const w = lastSessionWindow(market, now);
		  if (!w) return "stale";
		  if (w.inSession) return "stale";
		  if (Number.isFinite(quoteTime) && quoteTime > 0 && quoteTime >= w.start) return "closed";
		  return "stale";
		}
		function targetBadgeKind(target, market, quoteTime, now) {
		  if (!target) return null;
		  if (target.status === "no-targets") return null;
		  if (target.status === "no-data") return "no-data";
		  if (target.status === "stale") return staleBadgeKind(market, "stale", quoteTime, now);
		  return null;
		}
		
		// src/identity.mjs
		var MARKETS = ["cn", "hk", "us", "crypto"];
		function checkTargetRelation(buyTarget, sellTarget) {
		  if (buyTarget != null && sellTarget != null && buyTarget >= sellTarget) {
		    return { ok: true, overlap: true };
		  }
		  return { ok: true, overlap: false };
		}
		
		// client/list.mjs
		function TargetBadges({ target, market, quoteTime, now }) {
		  if (!target || target.status === "no-targets") return null;
		  if (target.buyTriggered || target.sellTriggered) {
		    const marks = [];
		    if (target.buyTriggered) marks.push((0, import_react2.createElement)("span", { key: "b", className: "skc-badge skc-badge-buy", title: t("detail.buy-target", { ccy: "" }) }, "\u24B7"));
		    if (target.sellTriggered) marks.push((0, import_react2.createElement)("span", { key: "s", className: "skc-badge skc-badge-sell", title: t("detail.sell-target", { ccy: "" }) }, "\u24C8"));
		    return marks;
		  }
		  const kind = targetBadgeKind(target, market, quoteTime, now);
		  if (!kind) return null;
		  if (kind === "closed") return (0, import_react2.createElement)("span", { className: "skc-badge skc-badge-stale", title: t("badge.closed.tip") }, t("badge.closed"));
		  if (kind === "stale") return (0, import_react2.createElement)("span", { className: "skc-badge skc-badge-stale", title: t("badge.stale.tip") }, t("badge.stale"));
		  if (kind === "no-data") return (0, import_react2.createElement)("span", { className: "skc-badge skc-badge-stale", title: t("badge.no-data.tip") }, t("badge.no-data"));
		  return null;
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
		  const marketCount = (m) => business.symbols.filter((s) => s.market === m).length;
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
		      }, marketCount(m) > 0 ? [t(`market.${m}`), (0, import_react2.createElement)("span", { key: "c", className: "skc-tab-count" }, String(marketCount(m)))] : t(`market.${m}`)))
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
		        t("list.holdings-only")
		      ),
		      (0, import_react2.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react2.createElement)("button", { className: "skc-btn skc-btn-ghost", onClick: () => store2.pollQuotes() }, t("list.refresh"))
		    ),
		    (0, import_react2.createElement)(
		      "div",
		      { className: "skc-rows", ref: scrollRef },
		      shown.length === 0 ? (0, import_react2.createElement)("div", { className: "skc-empty" }, ui.holdingsOnly ? t("list.empty.holdings") : t("list.empty.watch")) : shown.map((s) => {
		        const q = quotes[s.id];
		        const price = q?.status === "ok" ? q.price : null;
		        const pct = q?.changePercent ?? null;
		        const hasPos = s.quantity != null && s.quantity > 0;
		        const m = q?.metrics;
		        const pnlUnknown = privacy ? null : m && (m.flags.zeroCost || m.flags.missingPrice) ? "masked-flag" : null;
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
		              hasPos ? (0, import_react2.createElement)("span", { className: "skc-pos-dot", title: t("badge.holder") }, " \u2605") : null
		            )
		          ),
		          (0, import_react2.createElement)(
		            "div",
		            { className: "skc-row-price" },
		            (0, import_react2.createElement)("span", { className: trendClass(pct) }, price != null ? fmtPrice(price) : q ? q.status === "error" ? t("list.quote-failed") : "\u2014" : "\u2026"),
		            (0, import_react2.createElement)("span", { className: `skc-pct ${trendClass(pct)}` }, fmtPct(pct))
		          ),
		          ui.holdingsOnly && hasPos ? (0, import_react2.createElement)(
		            "div",
		            { className: "skc-row-pnl" },
		            (0, import_react2.createElement)(
		              "span",
		              {
		                className: `skc-pnl-amt ${trendClass(m?.pnl)}`,
		                title: pnlUnknown ? m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote") : void 0
		              },
		              privacy ? MASK : m?.pnl != null ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}` : pnlUnknown ? "\u2014" : "\u2014"
		            ),
		            (0, import_react2.createElement)(
		              "span",
		              { className: `skc-pnl-pct ${trendClass(m?.pnl)}` },
		              privacy ? MASK : m?.pnlPct != null ? fmtPct(m.pnlPct) : "\u2014"
		            )
		          ) : (0, import_react2.createElement)(
		            "div",
		            { className: "skc-row-target" },
		            (0, import_react2.createElement)(TargetBadges, { target: q?.target, market: s.market, quoteTime: q?.quoteTime, now: Date.now() })
		          )
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
		    return (0, import_react3.createElement)("div", { className: "skc-chart-empty" }, t("detail.chart.empty.minute"));
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
		  const timeLabel = (t2) => {
		    const d = new Date(t2 * 1e3);
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
		    return (0, import_react3.createElement)("div", { className: "skc-chart-empty" }, t("detail.chart.empty.candle"));
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
		  { key: "minute", label: () => t("detail.period.minute") },
		  { key: "day", label: () => t("detail.period.day") },
		  { key: "week", label: () => t("detail.period.week") },
		  { key: "month", label: () => t("detail.period.month") }
		];
		function Detail({ store: store2, ui, business, quotes, privacy }) {
		  const symbol = business.symbols.find((s) => s.id === ui.detailId);
		  const [period, setPeriod] = (0, import_react4.useState)("minute");
		  const [chart, setChart] = (0, import_react4.useState)({ key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null });
		  const chartKeyRef = (0, import_react4.useRef)("");
		  const [form, setForm] = (0, import_react4.useState)(null);
		  const [overlapHint, setOverlapHint] = (0, import_react4.useState)(false);
		  (0, import_react4.useEffect)(() => {
		    setForm(null);
		    setOverlapHint(false);
		    chartKeyRef.current = "";
		    setChart({ key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null });
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
		        errorDetail: data.errorDetail ?? null,
		        adjust: data.adjust ?? null,
		        prevClose: data.prevClose ?? null,
		        date: data.date ?? null
		      });
		    }).catch((e) => {
		      if (chartKeyRef.current !== key) return;
		      setChart({ key, loading: false, data: null, error: "fetch-failed", errorDetail: String(e?.message ?? e), adjust: null });
		    });
		  }, [symbol?.id, period]);
		  if (!symbol) {
		    return (0, import_react4.createElement)("div", { className: "skc-empty" }, t("detail.missing"));
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
		      store2.setToast(t("detail.err.numbers"));
		      return;
		    }
		    const result = await store2.updateSymbol(symbol.id, { quantity, avgCost });
		    if (result.ok) {
		      setForm(null);
		      store2.setToast(t("toast.position-saved"));
		    }
		  };
		  const clearHoldings = async () => {
		    const result = await store2.updateSymbol(symbol.id, { quantity: null, avgCost: null });
		    if (result.ok) {
		      setForm(null);
		      store2.setToast(t("toast.position-cleared"));
		    }
		  };
		  const saveTargets = async () => {
		    const buyTarget = parsePositiveInput(draft.buyTarget);
		    const sellTarget = parsePositiveInput(draft.sellTarget);
		    if (buyTarget === void 0 || sellTarget === void 0) {
		      store2.setToast(t("detail.err.targets"));
		      return;
		    }
		    const relation = checkTargetRelation(buyTarget, sellTarget);
		    if (relation.overlap && !window.confirm(t("detail.confirm.overlap"))) return;
		    setOverlapHint(relation.overlap);
		    const result = await store2.updateSymbol(symbol.id, { buyTarget, sellTarget });
		    if (result.ok) {
		      setForm(null);
		      store2.setToast(t("toast.targets-saved"));
		    }
		  };
		  const remove = async () => {
		    if (!window.confirm(t("detail.confirm.remove", { name: symbol.name }))) return;
		    const result = await store2.removeSymbol(symbol.id);
		    if (result.ok) store2.backToList();
		  };
		  const qTime = q?.quoteTime ?? null;
		  const fTime = q?.fetchedAt ?? null;
		  const dataStale = q?.target?.status === "stale" || q?.target?.status === "no-data";
		  const quoteTimeText = q && q.status === "ok" && qTime != null ? fmtClock(qTime) : "\u2014";
		  const fetchTimeText = fTime != null ? fmtClockSec(fTime) : "\u2014";
		  const chartErrorText = chart.error ? tErr(chart.error, chart.errorDetail) || chart.error : null;
		  return (0, import_react4.createElement)(
		    "div",
		    {},
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-detail-head" },
		      (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-ghost", onClick: () => store2.backToList() }, t("detail.back")),
		      (0, import_react4.createElement)("span", { className: "skc-detail-title" }, symbol.name),
		      (0, import_react4.createElement)("span", { className: "skc-code" }, `${symbol.code} \xB7 ${t(`market.${symbol.market}`)}${symbol.kind === "etf" ? " \xB7 ETF" : ""} \xB7 ${symbol.quoteCurrency}`),
		      (0, import_react4.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-danger", onClick: remove }, t("detail.delete"))
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-quote-line" },
		      (0, import_react4.createElement)("span", { className: `skc-quote-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : q ? q.status === "error" ? t("list.quote-failed") : "\u2026" : "\u2014"),
		      (0, import_react4.createElement)("span", { className: `skc-quote-pct ${trendClass(pct)}` }, fmtPct(pct)),
		      (0, import_react4.createElement)(
		        "span",
		        { className: "skc-quote-meta" },
		        t("detail.quote-time", { t: quoteTimeText, f: fetchTimeText }),
		        dataStale ? (0, import_react4.createElement)("span", { className: "skc-badge skc-badge-stale" }, q?.target?.status === "stale" ? t("detail.stale") : t("detail.no-data")) : null
		      )
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-period-tabs" },
		      PERIODS.map((p) => (0, import_react4.createElement)("button", {
		        key: p.key,
		        className: `skc-tab skc-period${p.key === period ? " skc-tab-active" : ""}`,
		        onClick: () => setPeriod(p.key)
		      }, p.label())),
		      period !== "minute" ? (0, import_react4.createElement)(MaLegend, { maVisible: ui.maVisible, onToggle: (p) => store2.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false }) }) : null,
		      period !== "minute" && chart.adjust ? (0, import_react4.createElement)("span", { className: "skc-adjust" }, chart.adjust === "qfq" ? t("detail.adjust.fwd") : t("detail.adjust.none")) : null
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-chartbox" },
		      chart.loading ? (0, import_react4.createElement)("div", { className: "skc-chart-empty" }, t("detail.chart.loading")) : chartErrorText ? (0, import_react4.createElement)("div", { className: "skc-chart-empty skc-chart-error" }, t("detail.chart.error", { e: chartErrorText })) : period === "minute" ? (0, import_react4.createElement)(MinuteChart, { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null, dark: false }) : (0, import_react4.createElement)(CandleChart, { candles: chart.data ?? [], maVisible: ui.maVisible, dark: false })
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-holdings" },
		      (0, import_react4.createElement)("div", { className: "skc-section-title" }, t("detail.holdings"), hasPos && m ? (0, import_react4.createElement)(
		        "span",
		        { className: "skc-section-meta" },
		        privacy ? `${maskIf(true, "")}${symbol.quoteCurrency}` : t("detail.holdings.meta", {
		          v: m.marketValue != null ? fmtAmount(m.marketValue) : "\u2014",
		          ccy: symbol.quoteCurrency,
		          p: m.pnl != null ? fmtAmount(m.pnl) : m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote"),
		          pct: m.pnlPct != null ? fmtPct(m.pnlPct) : "\u2014"
		        })
		      ) : null),
		      (0, import_react4.createElement)(
		        "div",
		        { className: "skc-form-grid" },
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          t(symbol.market === "crypto" ? "detail.quantity.coins" : "detail.quantity.shares"),
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.quantity, placeholder: t("detail.blank-clears"), onChange: (e) => setDraft("quantity", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          t("detail.avg-cost", { ccy: symbol.quoteCurrency }),
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.avgCost, placeholder: t("detail.blank-clears"), onChange: (e) => setDraft("avgCost", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "div",
		          { className: "skc-form-actions" },
		          (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-primary", onClick: saveHoldings }, t("detail.save-position")),
		          (0, import_react4.createElement)("button", { className: "skc-btn", onClick: clearHoldings }, t("detail.clear-position"))
		        )
		      )
		    ),
		    (0, import_react4.createElement)(
		      "div",
		      { className: "skc-targets" },
		      (0, import_react4.createElement)(
		        "div",
		        { className: "skc-section-title" },
		        t("detail.targets"),
		        overlapHint ? (0, import_react4.createElement)("span", { className: "skc-badge skc-badge-stale" }, t("detail.overlap")) : null
		      ),
		      (0, import_react4.createElement)(
		        "div",
		        { className: "skc-form-grid" },
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          t("detail.buy-target", { ccy: symbol.quoteCurrency }),
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.buyTarget, placeholder: t("detail.unset"), onChange: (e) => setDraft("buyTarget", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "label",
		          {},
		          t("detail.sell-target", { ccy: symbol.quoteCurrency }),
		          (0, import_react4.createElement)("input", { className: "skc-input", inputMode: "decimal", value: draft.sellTarget, placeholder: t("detail.unset"), onChange: (e) => setDraft("sellTarget", e.target.value) })
		        ),
		        (0, import_react4.createElement)(
		          "div",
		          { className: "skc-form-actions" },
		          (0, import_react4.createElement)("button", { className: "skc-btn skc-btn-primary", onClick: saveTargets }, t("detail.save-targets"))
		        )
		      ),
		      (0, import_react4.createElement)("div", { className: "skc-hint" }, t("detail.targets.hint"))
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
		      setSearchError(String(e?.message ?? e));
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
		    if (result.ok) store2.setToast(t("toast.added", { name: row.name }));
		    else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") store2.setToast(t("toast.duplicate"));
		  };
		  const addDirect = async () => {
		    const code = directCode.trim();
		    if (!code) return;
		    setBusy(true);
		    const result = await store2.addSymbol(market, code, null);
		    setBusy(false);
		    if (result.ok) {
		      store2.setToast(t("toast.added", { name: code }));
		      setDirectCode("");
		    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
		      store2.setToast(t("toast.duplicate"));
		    } else if (result.error?.status === 422) {
		      store2.setToast(t("add.not-found", { e: tErr(result.error.body?.error) }));
		    }
		  };
		  const known = new Set(business.symbols.map((s) => s.id));
		  return (0, import_react5.createElement)(
		    "div",
		    { className: "skc-dialog" },
		    (0, import_react5.createElement)(
		      "div",
		      { className: "skc-dialog-head" },
		      (0, import_react5.createElement)("span", { className: "skc-section-title" }, t("add.title")),
		      (0, import_react5.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react5.createElement)("button", { className: "skc-icon-btn", onClick: onClose }, "\u2715")
		    ),
		    (0, import_react5.createElement)(
		      "div",
		      { className: "skc-tabs" },
		      MARKETS.map((m) => (0, import_react5.createElement)("button", {
		        key: m,
		        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
		        onClick: () => {
		          setMarket(m);
		          if (query.trim()) doSearch(query, m);
		        }
		      }, t(`market.${m}`)))
		    ),
		    (0, import_react5.createElement)("input", {
		      ref: inputRef,
		      className: "skc-input",
		      placeholder: t(`add.search.${market}`),
		      value: query,
		      onChange: (e) => onQueryChange(e.target.value),
		      onKeyDown: (e) => {
		        if (e.key === "Enter") doSearch(query);
		        if (e.key === "Escape") onClose();
		      }
		    }),
		    searching ? (0, import_react5.createElement)("div", { className: "skc-hint" }, t("add.searching")) : null,
		    searchError ? (0, import_react5.createElement)("div", { className: "skc-error" }, t("add.search-error", { e: searchError })) : null,
		    results && results.length > 0 ? (0, import_react5.createElement)(
		      "div",
		      { className: "skc-add-results" },
		      results.map((row) => (0, import_react5.createElement)(
		        "button",
		        {
		          key: row.id,
		          className: "skc-add-row",
		          disabled: busy || known.has(row.id),
		          onClick: () => addResult(row)
		        },
		        (0, import_react5.createElement)("span", { className: "skc-add-name" }, row.name),
		        (0, import_react5.createElement)("span", { className: "skc-code" }, row.code + (row.kind === "etf" ? " \xB7 ETF" : "") + (row.market === "crypto" ? ` \xB7 ${row.quoteCurrency}` : "")),
		        known.has(row.id) ? (0, import_react5.createElement)("span", { className: "skc-badge" }, t("badge.added")) : null
		      ))
		    ) : null,
		    results && !searching && !searchError && results.length === 0 ? (0, import_react5.createElement)("div", { className: "skc-hint" }, t("add.no-match")) : null,
		    (0, import_react5.createElement)(
		      "div",
		      { className: "skc-direct" },
		      (0, import_react5.createElement)("span", { className: "skc-section-title" }, t("add.direct")),
		      (0, import_react5.createElement)(
		        "div",
		        { className: "skc-direct-row" },
		        (0, import_react5.createElement)("input", {
		          className: "skc-input",
		          placeholder: t(`add.direct.${market}`),
		          value: directCode,
		          onChange: (e) => setDirectCode(e.target.value),
		          onKeyDown: (e) => {
		            if (e.key === "Enter") addDirect();
		          }
		        }),
		        (0, import_react5.createElement)("button", { className: "skc-btn skc-btn-primary", disabled: busy || !directCode.trim(), onClick: addDirect }, t("add.validate"))
		      ),
		      (0, import_react5.createElement)("div", { className: "skc-hint" }, t("add.hint"))
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
		      setParseError(t("backup.err.read", { e: String(err?.message ?? err) }));
		      return;
		    }
		    let payload;
		    try {
		      payload = JSON.parse(text);
		    } catch {
		      setParseError(t("backup.err.json"));
		      return;
		    }
		    if (payload?.kind !== "stock-kanban-backup" || payload?.schemaVersion !== 1) {
		      setParseError(t("backup.err.kind"));
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
		      store2.setToast(t("backup.done", { n: result.result.imported }));
		      setPending(null);
		    } else if (result.error?.status === 422) {
		      store2.setToast(t("backup.rejected", { e: tErr(result.error.body?.error) }));
		      setPending(null);
		    }
		  };
		  return (0, import_react6.createElement)(
		    "div",
		    { className: "skc-backup" },
		    (0, import_react6.createElement)("div", { className: "skc-section-title" }, t("backup.title")),
		    (0, import_react6.createElement)(
		      "div",
		      { className: "skc-backup-row" },
		      (0, import_react6.createElement)("a", { className: "skc-btn skc-btn-ghost", href: api.exportUrl, download: true }, t("backup.export")),
		      (0, import_react6.createElement)("button", { className: "skc-btn", onClick: pickFile }, t("backup.import")),
		      (0, import_react6.createElement)("input", { ref: fileRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: onFile })
		    ),
		    parseError ? (0, import_react6.createElement)("div", { className: "skc-error" }, parseError) : null,
		    pending ? (0, import_react6.createElement)(
		      "div",
		      { className: "skc-confirm" },
		      (0, import_react6.createElement)("div", {}, t("backup.confirm", { n: pending.count, m: business.symbols.length })),
		      (0, import_react6.createElement)("div", { className: "skc-hint" }, t("backup.privacy-note")),
		      (0, import_react6.createElement)(
		        "div",
		        { className: "skc-backup-row" },
		        (0, import_react6.createElement)("button", { className: "skc-btn skc-btn-danger", disabled: importing, onClick: confirmImport }, t("backup.overwrite")),
		        (0, import_react6.createElement)("button", { className: "skc-btn", disabled: importing, onClick: () => setPending(null) }, t("backup.cancel"))
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
		    try {
		      el.setPointerCapture?.(e.pointerId);
		    } catch {
		    }
		  }, []);
		  const onPointerMove = (0, import_react7.useCallback)((e) => {
		    const d = drag.current;
		    const el = ref.current;
		    if (!d || !el) return;
		    const dx = e.clientX - d.startX;
		    const dy = e.clientY - d.startY;
		    if (!d.moved && shouldDrag(dx, dy)) {
		      d.moved = true;
		      el.classList.add("skc-capsule--dragging");
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
		    el.classList.remove("skc-capsule--dragging");
		    if (d.moved) {
		      const rect = el.getBoundingClientRect();
		      const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
		      el.style.left = `${snapped.x}px`;
		      el.style.top = `${snapped.y}px`;
		      store2.setCapsulePos(snapped);
		      store2.setCapsuleRect({ left: snapped.x, top: snapped.y, width: rect.width, height: rect.height });
		    } else {
		      store2.togglePanel();
		    }
		  }, [store2]);
		  (0, import_react7.useEffect)(() => {
		    const el = ref.current;
		    if (!el) return;
		    const rect = el.getBoundingClientRect();
		    const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
		    el.style.left = `${snapped.x}px`;
		    el.style.top = `${snapped.y}px`;
		    store2.setCapsulePos(snapped);
		    store2.setCapsuleRect({ left: snapped.x, top: snapped.y, width: rect.width, height: rect.height });
		  }, []);
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
		  const name = symbol ? quote?.name || symbol.name || symbol.code : t("capsule.empty");
		  const target = quote?.target;
		  const paused = target?.status === "stale" || target?.status === "no-data";
		  const buyHit = target?.buyTriggered === true;
		  const sellHit = target?.sellTriggered === true;
		  return (0, import_react8.createElement)(
		    "div",
		    {
		      ref,
		      className: "skc-capsule",
		      style: { left: pos.x, top: pos.y },
		      onPointerDown,
		      onPointerMove,
		      onPointerUp,
		      onPointerCancel: onPointerUp,
		      title: paused && (symbol?.buyTarget != null || symbol?.sellTarget != null) ? t("capsule.tip.stale") : void 0
		    },
		    buyHit ? (0, import_react8.createElement)("span", { className: "skc-capsule-mark skc-mark-buy" }, "\u24B7") : null,
		    sellHit ? (0, import_react8.createElement)("span", { className: "skc-capsule-mark skc-mark-sell" }, "\u24C8") : null,
		    (0, import_react8.createElement)("span", { className: "skc-capsule-name" }, name),
		    (0, import_react8.createElement)("span", { className: `skc-capsule-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : paused && quote ? t("capsule.stale") : "\u2014"),
		    (0, import_react8.createElement)("span", { className: `skc-capsule-pct ${trendClass(pct)}` }, fmtPct(pct))
		  );
		}
		
		// client/panel.mjs
		function CapsulePicker({ store: store2, snapshot }) {
		  const { ui, business } = snapshot;
		  return (0, import_react9.createElement)(
		    "label",
		    { className: "skc-capsule-picker" },
		    t("picker.label"),
		    (0, import_react9.createElement)(
		      "select",
		      {
		        className: "skc-select",
		        value: ui.capsuleSymbolId ?? "",
		        onChange: (e) => store2.setCapsuleSymbol(e.target.value)
		      },
		      business.symbols.length === 0 ? (0, import_react9.createElement)("option", { value: "" }, t("picker.empty")) : null,
		      business.symbols.map((s) => (0, import_react9.createElement)("option", { key: s.id, value: s.id }, `${s.name} \xB7 ${t("market." + s.market)}`))
		    )
		  );
		}
		function SettingsDialog({ store: store2, business, onClose }) {
		  return (0, import_react9.createElement)(
		    "div",
		    { className: "skc-dialog" },
		    (0, import_react9.createElement)(
		      "div",
		      { className: "skc-dialog-head" },
		      (0, import_react9.createElement)("span", { className: "skc-section-title" }, t("app.settings")),
		      (0, import_react9.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react9.createElement)("button", { className: "skc-icon-btn", onClick: onClose }, "\u2715")
		    ),
		    (0, import_react9.createElement)(BackupSection, { store: store2, business })
		  );
		}
		function Panel({ store: store2, snapshot }) {
		  const { ui, business, quotes, quoteMeta, toast } = snapshot;
		  const privacy = business.settings.privacyMode === true;
		  const dragRef = (0, import_react9.useRef)(null);
		  const panelRef = (0, import_react9.useRef)(null);
		  (0, import_react9.useEffect)(() => {
		    const onResize = () => {
		      const el = panelRef.current;
		      if (!el) return;
		      const rect = el.getBoundingClientRect();
		      const x = Math.min(Math.max(Math.round(rect.left), 8), Math.max(8, window.innerWidth - rect.width - 8));
		      const y = Math.min(Math.max(Math.round(rect.top), 8), Math.max(8, window.innerHeight - rect.height - 8));
		      el.style.left = `${x}px`;
		      el.style.top = `${y}px`;
		      store2.setPanelPos({ x, y });
		    };
		    window.addEventListener("resize", onResize);
		    return () => window.removeEventListener("resize", onResize);
		  }, [store2]);
		  const panelWidth = Math.min(400, window.innerWidth - 16);
		  const clampPanel = (p) => ({
		    x: Math.min(Math.max(p.x, 8), Math.max(8, window.innerWidth - panelWidth - 8)),
		    y: Math.min(Math.max(p.y, 8), Math.max(8, window.innerHeight - 120))
		  });
		  const anchor = store2.getCapsuleRect?.() ?? null;
		  const pos = clampPanel(anchor ? {
		    x: anchor.left,
		    y: anchor.top + anchor.height + 8 + 220 > window.innerHeight ? Math.max(8, anchor.top - 240) : anchor.top + anchor.height + 8
		  } : { x: window.innerWidth - panelWidth - 16, y: 14 });
		  const onHeaderPointerDown = (0, import_react9.useCallback)((e) => {
		    if (e.target.closest("button, input, label")) return;
		    const el = panelRef.current;
		    if (!el) return;
		    const rect = el.getBoundingClientRect();
		    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false, id: e.pointerId };
		    try {
		      el.setPointerCapture?.(e.pointerId);
		    } catch {
		    }
		  }, []);
		  const onHeaderPointerMove = (0, import_react9.useCallback)((e) => {
		    const d = dragRef.current;
		    const el = panelRef.current;
		    if (!d || !el) return;
		    const dx = e.clientX - d.startX;
		    const dy = e.clientY - d.startY;
		    if (!d.moved && shouldDrag(dx, dy)) {
		      d.moved = true;
		      el.classList.add("skc-panel--dragging");
		    }
		    if (d.moved) {
		      const maxX = Math.max(8, window.innerWidth - el.offsetWidth - 8);
		      const maxY = Math.max(8, window.innerHeight - Math.min(el.offsetHeight, window.innerHeight - 16) - 8);
		      el.style.left = `${Math.min(Math.max(d.baseX + dx, 8), maxX)}px`;
		      el.style.top = `${Math.min(Math.max(d.baseY + dy, 8), maxY)}px`;
		    }
		  }, []);
		  const onHeaderPointerUp = (0, import_react9.useCallback)(() => {
		    const d = dragRef.current;
		    const el = panelRef.current;
		    dragRef.current = null;
		    el?.classList.remove("skc-panel--dragging");
		    if (d?.moved && el) {
		      const rect = el.getBoundingClientRect();
		      store2.setPanelPos(clampPanel({ x: Math.round(rect.left), y: Math.round(rect.top) }));
		    }
		  }, [store2]);
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
		      (0, import_react9.createElement)("span", { className: "skc-title" }, t("app.title")),
		      (0, import_react9.createElement)("span", { className: "skc-header-meta" }, quoteMeta?.error ? t("app.meta.error") : t("app.meta", { n: business.symbols.length })),
		      (0, import_react9.createElement)("span", { className: "skc-spacer" }),
		      (0, import_react9.createElement)("button", {
		        className: `skc-icon-btn${privacy ? " skc-privacy-on" : ""}`,
		        title: privacy ? t("privacy.on") : t("privacy.off"),
		        onClick: () => store2.setPrivacy(!privacy)
		      }, privacy ? "\u{1F648}" : "\u{1F441}"),
		      (0, import_react9.createElement)("button", { className: "skc-icon-btn", title: t("add.title"), onClick: () => store2.setShowAdd(true) }, "\uFF0B"),
		      (0, import_react9.createElement)("button", { className: "skc-icon-btn", title: t("app.settings"), onClick: () => store2.setShowSettings(true) }, "\u2699"),
		      (0, import_react9.createElement)("button", { className: "skc-icon-btn", title: t("app.collapse"), onClick: () => store2.closePanel() }, "\u2014")
		    ),
		    (0, import_react9.createElement)(
		      "div",
		      { className: "skc-body" },
		      // 列表常驻挂载：详情是覆盖层 → 返回时市场/筛选/滚动全部保留（4.3）
		      (0, import_react9.createElement)(
		        "div",
		        { className: `skc-layer${ui.view === "detail" ? " skc-layer-hidden" : ""}` },
		        (0, import_react9.createElement)(MarketList, { store: store2, ui, business, quotes, privacy })
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
		        t("app.footer", { privacy: privacy ? t("app.footer.privacy") : "" })
		      )
		    ),
		    ui.showAdd ? (0, import_react9.createElement)(AddDialog, { store: store2, business, defaultMarket: ui.lastMarket, onClose: () => store2.setShowAdd(false) }) : null,
		    ui.showSettings ? (0, import_react9.createElement)(SettingsDialog, { store: store2, business, onClose: () => store2.setShowSettings(false) }) : null,
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
		.skc-root{position:fixed;inset:0;pointer-events:none;z-index:9998;font:inherit;font-size:12px;line-height:1.45;color:var(--dsw-alias-label-primary,inherit)}
		.skc-root *{box-sizing:border-box}
		.skc-mono{font-variant-numeric:tabular-nums}
		.skc-up{color:#e5484d}
		.skc-down{color:#2bb596}
		.skc-flat{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}
		
		/* \u80F6\u56CA\uFF08\u5BF9\u9F50 quota-watch\uFF1A26px pill\u3001blur\u3001\u547D\u4E2D\u533A\u5916\u6269\u3001grab \u5149\u6807\uFF09 */
		.skc-capsule{position:fixed;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 86%,transparent);-webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2);box-shadow:0 4px 14px rgba(0,0,0,.22);color:var(--dsw-alias-label-primary,inherit);font-size:11px;line-height:24px;cursor:grab;pointer-events:auto;user-select:none;white-space:nowrap;position:fixed;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:9999}
		.skc-capsule::before{content:'';position:absolute;inset:-9px}
		.skc-capsule:hover{border-color:var(--dsw-alias-border-primary,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)));box-shadow:0 6px 18px rgba(0,0,0,.28)}
		.skc-capsule:active{transform:scale(.98)}
		.skc-capsule--dragging{cursor:grabbing;-webkit-backdrop-filter:none;backdrop-filter:none;background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f));box-shadow:0 8px 24px rgba(0,0,0,.35);transform:scale(1.04)}
		.skc-capsule-name{font-weight:600;max-width:16vw;overflow:hidden;text-overflow:ellipsis}
		.skc-capsule-price{font-weight:600;font-variant-numeric:tabular-nums}
		.skc-capsule-pct{font-weight:500;font-variant-numeric:tabular-nums}
		.skc-capsule-mark{font-weight:700}
		.skc-mark-buy{color:#e5484d}
		.skc-mark-sell{color:#2bb596}
		
		/* \u9762\u677F\uFF08\u8FD1\u80F6\u56CA\u5F39\u51FA\uFF1B\u5BBD\u5EA6\u81EA\u9002\u5E94\u89C6\u53E3\uFF1Boverflow \u88C1\u9F50\u5706\u89D2\uFF0C\u627F\u8F7D\u5165\u573A\u52A8\u753B\uFF09 */
		.skc-panel{position:fixed;width:min(400px,calc(100vw - 16px));max-height:min(80vh,calc(100dvh - 16px));display:flex;flex-direction:column;border-radius:12px;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 94%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(14px) saturate(1.15);backdrop-filter:blur(14px) saturate(1.15);box-shadow:0 12px 36px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary,inherit);pointer-events:auto;z-index:9999;overflow:hidden;animation:skc-panel-in .14s ease-out}
		.skc-panel--dragging{cursor:grabbing;user-select:none}
		.skc-header{display:flex;align-items:center;gap:8px;padding:7px 10px 6px;border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));cursor:grab;touch-action:none}
		.skc-header:active{cursor:grabbing}
		.skc-title{font-weight:700;font-size:13px;letter-spacing:.02em;color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));white-space:nowrap}
		.skc-header-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
		.skc-spacer{flex:1}
		.skc-body{position:relative;flex:1 1 auto;min-height:200px;overflow:hidden;display:flex;flex-direction:column}
		.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
		.skc-layer-hidden{display:none}
		.skc-footer{padding:3px 10px 4px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}
		
		/* \u5217\u8868\uFF08\u7EC8\u7AEF\u5BC6\u5EA6\uFF1A\u5206\u6BB5 Tab + \u7D27\u884C\u8DDD + hover/active \u53CD\u9988\uFF09 */
		.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
		.skc-tabs{display:flex;gap:2px;padding:6px 8px 4px;overflow-x:auto;scrollbar-width:none}
		.skc-tabs::-webkit-scrollbar{display:none}
		.skc-tab{flex:none;padding:3px 9px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font:inherit;transition:color .12s,background .12s,border-color .12s}
		.skc-tab:hover{color:var(--dsw-alias-label-primary,inherit)}
		.skc-tab:active{transform:scale(.97)}
		.skc-tab-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def)) 16%,transparent);color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 45%,transparent)}
		.skc-tab-count{opacity:.6;font-size:10px;margin-left:3px;font-weight:400;font-variant-numeric:tabular-nums}
		.skc-filterbar{display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent)}
		.skc-filter{display:flex;align-items:center;gap:5px;cursor:pointer}
		.skc-filter input{accent-color:var(--dsw-alias-brand-primary,#5b8def);margin:0}
		.skc-rows{overflow-y:auto;flex:1;padding:2px 6px 6px;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 60%,transparent) transparent}
		.skc-rows::-webkit-scrollbar{width:8px}
		.skc-rows::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 60%,transparent);border-radius:999px}
		.skc-rows::-webkit-scrollbar-track{background:transparent}
		.skc-row{display:flex;align-items:center;gap:10px;padding:5px 7px;border-radius:7px;cursor:pointer;transition:background .12s}
		.skc-row:hover{background:var(--dsw-alias-bg-hover,color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 30%,transparent))}
		.skc-row:active{background:color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 45%,transparent)}
		.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
		.skc-name-text{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
		.skc-code{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;letter-spacing:.02em}
		.skc-pos-dot{color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none;font-variant-numeric:tabular-nums}
		.skc-row-price > span:first-child{font-weight:600}
		.skc-pct{font-size:11px;font-variant-numeric:tabular-nums}
		.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:86px;font-variant-numeric:tabular-nums}
		.skc-pnl-amt,.skc-pnl-pct{font-size:11px}
		.skc-row-target{display:flex;gap:3px;flex:none;min-width:40px;justify-content:flex-end}
		.skc-badge{display:inline-block;padding:0 5px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35))}
		.skc-badge-buy{color:#e5484d;border-color:color-mix(in srgb,#e5484d 45%,transparent)}
		.skc-badge-sell{color:#2bb596;border-color:color-mix(in srgb,#2bb596 45%,transparent)}
		.skc-badge-stale{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}
		.skc-empty{padding:26px 12px;text-align:center;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px;letter-spacing:.02em}
		
		/* \u8BE6\u60C5 */
		.skc-layer-detail{overflow-y:auto;padding:8px 10px;scrollbar-width:thin}
		.skc-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
		.skc-detail-title{font-weight:700;font-size:14px}
		.skc-quote-line{display:flex;align-items:baseline;gap:10px;margin:6px 0 8px;flex-wrap:wrap}
		.skc-quote-price{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}
		.skc-quote-pct{font-weight:600}
		.skc-quote-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;display:inline-flex;gap:6px;align-items:center;font-variant-numeric:tabular-nums}
		.skc-period-tabs{display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:wrap}
		.skc-period{padding:2px 9px}
		.skc-adjust{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;margin-left:6px}
		.skc-chartbox{border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;padding:5px;min-height:140px;display:flex;align-items:center;justify-content:center}
		.skc-chart{display:block;max-width:100%}
		.skc-chart-empty{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));padding:20px;text-align:center}
		.skc-chart-error{color:#e5484d}
		.skc-ma-legend{display:flex;gap:2px;margin-left:6px}
		.skc-ma-chip{border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:transparent;border-radius:999px;font-size:10px;padding:0 6px;cursor:pointer;color:inherit;transition:opacity .12s}
		.skc-ma-off{opacity:.35}
		.skc-section-title{font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));margin:10px 0 4px;display:flex;align-items:center;gap:8px}
		.skc-section-meta{color:var(--dsw-alias-label-primary,inherit);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
		.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
		.skc-form-grid label{display:flex;flex-direction:column;gap:3px;font-size:11px}
		.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
		.skc-input{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:4px 8px;font:inherit;width:100%;transition:border-color .12s,box-shadow .12s}
		.skc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#5b8def);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 22%,transparent)}
		.skc-select{background:var(--dsw-alias-bg-base,#1f1f1f);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:2px 6px;font:inherit;max-width:180px}
		.skc-btn{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:4px 11px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block;transition:border-color .12s,color .12s,background .12s,transform .06s}
		.skc-btn:hover{border-color:var(--dsw-alias-brand-primary,#5b8def);color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-btn:active{transform:scale(.97)}
		.skc-btn-primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 16%,transparent);color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));font-weight:600}
		.skc-btn-primary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 26%,transparent)}
		.skc-btn-danger{border-color:color-mix(in srgb,#e5484d 45%,transparent);background:color-mix(in srgb,#e5484d 12%,transparent);color:#e5484d;font-weight:600}
		.skc-btn-danger:hover{background:color-mix(in srgb,#e5484d 22%,transparent);border-color:#e5484d}
		.skc-btn-ghost{border-color:transparent}
		.skc-icon-btn{background:transparent;border:none;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font-size:13px;padding:3px 7px;border-radius:7px;font-family:inherit;transition:color .12s,background .12s}
		.skc-icon-btn:hover{color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-hover,color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 30%,transparent))}
		.skc-icon-btn:active{transform:scale(.94)}
		.skc-privacy-on{color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-btn:focus-visible,.skc-icon-btn:focus-visible,.skc-tab:focus-visible,.skc-ma-chip:focus-visible,.skc-add-row:focus-visible{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 55%,transparent);outline-offset:1px}
		.skc-hint{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;margin-top:4px}
		.skc-error{color:#e5484d;font-size:11px;margin-top:4px}
		.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:#e5484d;font-size:11px;z-index:10000;background:var(--dsw-alias-bg-base,#1f1f1f);background:rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:6px;padding:2px 8px}
		.skc-targets,.skc-holdings{margin-top:4px}
		.skc-backup{margin-top:2px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding:8px 2px 2px}
		.skc-backup-row{display:flex;gap:8px;margin:6px 0}
		.skc-confirm{border:1px solid color-mix(in srgb,#e5484d 40%,transparent);background:color-mix(in srgb,#e5484d 7%,transparent);border-radius:8px;padding:8px;margin:6px 0}
		
		/* \u5BF9\u8BDD\u6846\uFF08\u8986\u76D6\u5C42 = \u4EE4\u724C\u53E0\u6D82\u5730\u677F + blur\uFF1A\u73BB\u7483\u76AE\u80A4\u4EE4\u724C\u534A\u900F\u660E\u4E5F\u4E0D\u7834\u53EF\u8BFB\u6027\uFF09 */
		.skc-dialog{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 97%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(20px) saturate(1.2);backdrop-filter:blur(20px) saturate(1.2);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 40%,transparent);animation:skc-dialog-in .14s ease-out;scrollbar-width:thin}
		.skc-dialog-head{display:flex;align-items:center;gap:8px;padding-bottom:2px}
		.skc-add-results{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto;scrollbar-width:thin}
		.skc-add-row{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;color:var(--dsw-alias-label-primary,inherit);padding:5px 8px;cursor:pointer;font:inherit;text-align:left;transition:border-color .12s}
		.skc-add-row:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-add-row:disabled{opacity:.5;cursor:default}
		.skc-add-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.skc-direct{border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding-top:8px}
		.skc-direct-row{display:flex;gap:8px;margin-top:4px}
		
		/* \u80F6\u56CA\u9009\u62E9\u5668 / toast */
		.skc-capsule-picker{display:flex;align-items:center;gap:6px;font-size:11px}
		.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 96%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:8px;padding:6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none;max-width:80vw;animation:skc-toast-in .16s ease-out}
		
		/* \u7A84\u5C4F */
		@media (max-width:520px){
		  .skc-header-meta{display:none}
		  .skc-form-grid{grid-template-columns:1fr}
		  .skc-direct-row{flex-wrap:wrap}
		  .skc-direct-row .skc-input{flex:1 1 100%}
		  .skc-direct-row .skc-btn{flex:1 1 auto}
		  .skc-capsule{max-width:52vw}
		  .skc-capsule-name{max-width:16vw}
		}
		
		@keyframes skc-panel-in{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}
		@keyframes skc-dialog-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
		@keyframes skc-toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%)}}
		`;
		
		// client/main.mjs
		injectStyles();
		var store = createStore();
		function App() {
		  const snapshot = useStore(store);
		  const { ui, business, quotes, quoteMeta } = snapshot;
		  const [, bumpLang] = (0, import_react10.useState)(0);
		  (0, import_react10.useEffect)(() => {
		    store.refreshState().then(() => store.restartPolling()).catch((e) => store.setToast(t("toast.init-failed", { e: String(e?.message ?? e) })));
		    const onVis = () => store.handleVisibility();
		    document.addEventListener("visibilitychange", onVis);
		    const onLangChange = () => {
		      setLang(resolveLang(navigator.language, document));
		      bumpLang((v) => v + 1);
		    };
		    const langObserver = new MutationObserver(onLangChange);
		    langObserver.observe(document.documentElement, { attributeFilter: ["lang"] });
		    window.addEventListener("languagechange", onLangChange);
		    return () => {
		      document.removeEventListener("visibilitychange", onVis);
		      window.removeEventListener("languagechange", onLangChange);
		      langObserver.disconnect();
		    };
		  }, []);
		  const capsuleId = ui.capsuleSymbolId ?? business.symbols[0]?.id ?? null;
		  const capsuleSymbol = business.symbols.find((s) => s.id === capsuleId) ?? null;
		  const capsuleQuote = capsuleId ? quotes[capsuleId] : null;
		  return (0, import_react10.createElement)(
		    "div",
		    { className: "skc-root" },
		    (0, import_react10.createElement)(Capsule, { store, ui, symbol: capsuleSymbol, quote: capsuleQuote }),
		    ui.panelOpen ? (0, import_react10.createElement)(Panel, { store, snapshot }) : null,
		    (0, import_react10.createElement)("div", { className: "skc-error-global" }, quoteMeta?.error ? t("app.quote-failed", { e: quoteMeta.error }) : null)
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
