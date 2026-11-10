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
		  inject: () => inject,
		  mountKanban: () => mountKanban
		});
		module.exports = __toCommonJS(main_exports);
		
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
		  reorder: (market, orderedIds, ifRev) => postJSON("/stock-kanban/symbols/reorder", { market, orderedIds, ifRev }),
		  remove: (id, ifRev) => postJSON("/stock-kanban/symbols/remove", { id, ifRev }),
		  setSettings: (patch, ifRev) => postJSON("/stock-kanban/settings", { ...patch, ifRev }),
		  importBackup: (payload, ifRev) => postJSON("/stock-kanban/import", { payload, ifRev }),
		  exportUrl: "/stock-kanban/export"
		};
		
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
		function getLang() {
		  return currentLang;
		}
		var zh = {
		  "market.cn": "A \u80A1",
		  "market.hk": "\u6E2F\u80A1",
		  "market.us": "\u7F8E\u80A1",
		  "market.crypto": "\u52A0\u5BC6\u8D27\u5E01",
		  "app.title": "\u76EF\u76D8",
		  "app.meta": "{n} \u4E2A\u81EA\u9009 \xB7 \u8DE8\u6D4F\u89C8\u5668\u5171\u4EAB",
		  "app.meta.error": "\u884C\u60C5\u670D\u52A1\u5F02\u5E38",
		  "app.note.delay": "\u884C\u60C5\u6765\u81EA\u514D\u8D39\u6E90\uFF0C\u53EF\u80FD\u6709\u5EF6\u8FDF\u3002",
		  "app.quote-failed": "\u884C\u60C5\u62C9\u53D6\u5931\u8D25\uFF1A{e}",
		  "app.collapse": "\u6536\u8D77",
		  "app.settings": "\u8BBE\u7F6E",
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
		  "detail.back": "\u8FD4\u56DE",
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
		  "detail.prev-close": "\u6628\u6536 {v}",
		  "detail.chart.loading": "\u52A0\u8F7D\u4E2D\u2026",
		  "detail.chart.empty.minute": "\u6682\u65E0\u5206\u65F6\u6570\u636E",
		  "detail.chart.empty.candle": "\u6682\u65E0K\u7EBF\u6570\u636E",
		  "detail.chart.error": "\u52A0\u8F7D\u5931\u8D25\uFF1A{e}",
		  "detail.holdings": "\u6301\u4ED3",
		  "detail.holdings.meta": "\u5E02\u503C {v} {ccy} \xB7 \u76C8\u4E8F {p}\uFF08{pct}\uFF09",
		  "detail.cost-unset": "\u6210\u672C\u672A\u586B",
		  "detail.no-quote": "\u65E0\u884C\u60C5",
		  "detail.quantity": "\u6570\u91CF",
		  "detail.ph.qty": "\u4F8B\u5982 1000",
		  "detail.ph.qty.coins": "\u4F8B\u5982 0.5",
		  "detail.unit.shares": "\u80A1",
		  "detail.unit.coins": "\u5E01",
		  "detail.avg-cost": "\u5E73\u5747\u6210\u672C",
		  "detail.ph.cost": "\u4F8B\u5982 10.00",
		  "detail.save-position": "\u4FDD\u5B58\u6301\u4ED3",
		  "detail.clear-position": "\u6E05\u9664\u6301\u4ED3",
		  "detail.clear-targets": "\u6E05\u9664\u76EE\u6807\u4EF7",
		  "detail.holdings.empty": "\u672A\u6301\u4ED3",
		  "detail.unsaved": "\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539",
		  "detail.err.positive": "\u987B\u4E3A\u6B63\u6570",
		  "detail.cancel": "\u53D6\u6D88",
		  "detail.confirm.clear": "\u6E05\u9664\u6301\u4ED3\uFF08\u6570\u91CF\u4E0E\u5E73\u5747\u6210\u672C\uFF09\uFF1F",
		  "detail.confirm.clear-ok": "\u786E\u8BA4\u6E05\u9664",
		  "detail.confirm.clear-targets": "\u6E05\u9664\u4E70\u5165\u4E0E\u5356\u51FA\u63D0\u9192\u4EF7\uFF1F",
		  "detail.targets": "\u76EE\u6807\u4EF7",
		  "detail.alert.buy": "\u4E70\u5165\u63D0\u9192\u4EF7",
		  "detail.alert.sell": "\u5356\u51FA\u63D0\u9192\u4EF7",
		  "detail.buy-hint": "\u2264 \u6B64\u4EF7\u663E\u793A B",
		  "detail.sell-hint": "\u2265 \u6B64\u4EF7\u663E\u793A S",
		  "detail.ph.target": "\u4F8B\u5982 80.00",
		  "detail.dist": "\u8DDD\u73B0\u4EF7 {p}",
		  "detail.buy-target": "\u4E70\u5165\u76EE\u6807\u4EF7\uFF08\u2264 \u89E6\u53D1 B\uFF0C{ccy}\uFF09",
		  "detail.sell-target": "\u5356\u51FA\u76EE\u6807\u4EF7\uFF08\u2265 \u89E6\u53D1 S\uFF0C{ccy}\uFF09",
		  "detail.save-targets": "\u4FDD\u5B58\u76EE\u6807\u4EF7",
		  "detail.overlap": "\u9608\u503C\u91CD\u53E0",
		  "detail.targets.hint": "\u884C\u60C5\u8FC7\u671F\u6216\u7F3A\u5931\u65F6\u6682\u505C\u63D0\u9192\uFF0C\u6062\u590D\u540E\u81EA\u52A8\u7EED\u4E0A\u3002\u7559\u7A7A\u5373\u4E0D\u8BBE\u7F6E\u3002",
		  "detail.confirm.overlap": "\u4E70\u5165\u63D0\u9192\u4EF7\u4E0D\u4F4E\u4E8E\u5356\u51FA\u63D0\u9192\u4EF7\uFF0C\u4E24\u4E2A\u6807\u8BB0\u4F1A\u540C\u65F6\u663E\u793A\u3002",
		  "detail.confirm.overlap-ok": "\u4ECD\u8981\u4FDD\u5B58",
		  "detail.confirm.remove": "\u5220\u9664\u300C{name}\u300D\uFF1F\u6301\u4ED3\u4E0E\u76EE\u6807\u4EF7\u4E00\u5E76\u79FB\u9664\uFF08\u53EF\u7528\u5907\u4EFD\u6062\u590D\uFF09\u3002",
		  "add.title": "\u6DFB\u52A0\u6807\u7684",
		  "add.search.cn": "\u8F93\u5165\u540D\u79F0\u6216\u4EE3\u7801",
		  "add.search.hk": "\u8F93\u5165\u540D\u79F0\u6216\u4EE3\u7801",
		  "add.search.us": "\u8F93\u5165\u540D\u79F0\u6216\u4EE3\u7801",
		  "add.search.crypto": "\u8F93\u5165\u5E01\u79CD\u6216\u4EA4\u6613\u5BF9",
		  "add.direct": "\u76F4\u63A5\u8F93\u5165\u4EE3\u7801",
		  "add.direct.cn": "600519 / 000001 / sh510300",
		  "add.direct.hk": "00700",
		  "add.direct.us": "AAPL",
		  "add.direct.crypto": "BTC-USDT",
		  "add.validate": "\u6DFB\u52A0",
		  "add.hint": "\u6DFB\u52A0\u524D\u4F1A\u5148\u53D6\u4E00\u6B21\u884C\u60C5\u505A\u6821\u9A8C\uFF0C\u53D6\u5230\u6709\u6548\u4EF7\u624D\u52A0\u5165\u81EA\u9009\u3002",
		  "add.searching": "\u641C\u7D22\u4E2D\u2026",
		  "add.no-match": "\u6CA1\u6709\u627E\u5230\u300C{q}\u300D\uFF0C\u6362\u4E2A\u5173\u952E\u8BCD\u6216\u76F4\u63A5\u8F93\u5165\u4EE3\u7801\u8BD5\u8BD5\u3002",
		  "add.search-error": "\u641C\u7D22\u6682\u65F6\u4E0D\u53EF\u7528\uFF1A{e}\u3002\u53EF\u4EE5\u5148\u76F4\u63A5\u8F93\u5165\u4EE3\u7801\u6DFB\u52A0\u3002",
		  "add.not-found": "{e}\uFF0C\u8BF7\u68C0\u67E5\u4EE3\u7801\u540E\u91CD\u8BD5",
		  "add.guide.cn": "\u8F93\u5165\u540D\u79F0\u6216\u4EE3\u7801\u5F00\u59CB\u641C\u7D22\uFF0C\u4F8B\u5982\u300C\u8D35\u5DDE\u8305\u53F0\u300D\u300C600519\u300D",
		  "add.guide.hk": "\u8F93\u5165\u540D\u79F0\u6216\u4EE3\u7801\u5F00\u59CB\u641C\u7D22\uFF0C\u4F8B\u5982\u300C\u817E\u8BAF\u63A7\u80A1\u300D\u300C00700\u300D",
		  "add.guide.us": "\u8F93\u5165\u540D\u79F0\u6216\u4EE3\u7801\u5F00\u59CB\u641C\u7D22\uFF0C\u4F8B\u5982\u300CApple\u300D\u300CAAPL\u300D",
		  "add.guide.crypto": "\u8F93\u5165\u5E01\u79CD\u6216\u4EA4\u6613\u5BF9\u5F00\u59CB\u641C\u7D22\uFF0C\u4F8B\u5982\u300CBTC\u300D\u300C\u4EE5\u592A\u574A\u300D",
		  "backup.export": "\u5BFC\u51FA\u5907\u4EFD",
		  "backup.import": "\u5BFC\u5165\u5907\u4EFD",
		  "backup.import.hint": "\u5BFC\u5165\u4F1A\u8986\u76D6\u5F53\u524D\u5168\u90E8\u6570\u636E\uFF0C\u8BF7\u5148\u5BFC\u51FA\u5907\u4EFD\u3002",
		  "backup.export.hint": "\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6\uFF0C\u5185\u542B\u6301\u4ED3\u660E\u6587\uFF0C\u8BF7\u59A5\u5584\u4FDD\u7BA1\u3002",
		  "backup.importing": "\u5BFC\u5165\u4E2D\u2026",
		  "backup.confirm": "\u5907\u4EFD\u542B {n} \u4E2A\u6807\u7684\uFF0C\u5BFC\u5165\u5C06\u66FF\u6362\u5F53\u524D\u5168\u90E8\u6570\u636E\uFF08\u73B0\u6709 {m} \u4E2A\uFF09\u3002",
		  "backup.privacy-note": "\u5907\u4EFD\u542B\u6301\u4ED3\u660E\u6587\uFF08\u672A\u52A0\u5BC6\uFF09\uFF0C\u8BF7\u59A5\u5584\u4FDD\u7BA1\u3002",
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
		  "toast.targets-cleared": "\u76EE\u6807\u4EF7\u5DF2\u6E05\u9664",
		  "toast.conflict": "\u6570\u636E\u5DF2\u88AB\u5176\u4ED6\u9875\u9762\u66F4\u65B0\uFF1A\u5DF2\u5237\u65B0\uFF0C\u8BF7\u91CD\u8BD5",
		  "toast.init-failed": "\u521D\u59CB\u5316\u5931\u8D25\uFF1A{e}",
		  "toast.op-failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{e}",
		  "picker.label": "\u80F6\u56CA\u663E\u793A",
		  "picker.empty": "\u5148\u6DFB\u52A0\u6807\u7684",
		  "quota.merge.on": "quota \u5DF2\u5E76\u5165\u5408\u5E76\u80F6\u56CA\uFF08\u70B9\u51FB\u62C6\u5206\uFF09",
		  "quota.merge.off": "quota \u72EC\u7ACB\u663E\u793A\uFF08\u70B9\u51FB\u5E76\u5165\u5408\u5E76\u80F6\u56CA\uFF09",
		  "quota.outcome": "\u5F85\u5904\u7406\u5151\u6362\u7ED3\u679C",
		  "quota.stale": "\u989D\u5EA6\u6570\u636E\u5DF2\u8FC7\u671F",
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
		  "app.meta": "{n} symbols \xB7 synced",
		  "app.meta.error": "Quote service error",
		  "app.note.delay": "Quotes come from free sources and may be delayed.",
		  "app.quote-failed": "Quote fetch failed: {e}",
		  "app.collapse": "Collapse",
		  "app.settings": "Settings",
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
		  "detail.back": "Back",
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
		  "detail.prev-close": "Prev close {v}",
		  "detail.chart.loading": "Loading\u2026",
		  "detail.chart.empty.minute": "No intraday data",
		  "detail.chart.empty.candle": "No candle data",
		  "detail.chart.error": "Load failed: {e}",
		  "detail.holdings": "Position",
		  "detail.holdings.meta": "Value {v} {ccy} \xB7 PnL {p} ({pct})",
		  "detail.cost-unset": "cost unset",
		  "detail.no-quote": "no quote",
		  "detail.quantity": "Quantity",
		  "detail.ph.qty": "e.g. 1000",
		  "detail.ph.qty.coins": "e.g. 0.5",
		  "detail.unit.shares": "shares",
		  "detail.unit.coins": "units",
		  "detail.avg-cost": "Avg cost",
		  "detail.ph.cost": "e.g. 10.00",
		  "detail.save-position": "Save position",
		  "detail.clear-position": "Clear position",
		  "detail.clear-targets": "Clear targets",
		  "detail.holdings.empty": "No position",
		  "detail.unsaved": "Unsaved changes",
		  "detail.err.positive": "Must be a positive number",
		  "detail.cancel": "Cancel",
		  "detail.confirm.clear": "Clear the position (quantity and average cost)?",
		  "detail.confirm.clear-ok": "Clear it",
		  "detail.confirm.clear-targets": "Clear both alert prices?",
		  "detail.targets": "Targets",
		  "detail.alert.buy": "Buy alert",
		  "detail.alert.sell": "Sell alert",
		  "detail.buy-hint": "B shows at or below this",
		  "detail.sell-hint": "S shows at or above this",
		  "detail.ph.target": "e.g. 80.00",
		  "detail.dist": "vs price {p}",
		  "detail.buy-target": "Buy target (\u2264 fires B, {ccy})",
		  "detail.sell-target": "Sell target (\u2265 fires S, {ccy})",
		  "detail.save-targets": "Save targets",
		  "detail.overlap": "overlap",
		  "detail.targets.hint": "Alerts pause while the quote is stale or missing, then resume. Blank means unset.",
		  "detail.confirm.overlap": "Buy alert is not below sell alert, so both markers can show.",
		  "detail.confirm.overlap-ok": "Save anyway",
		  "detail.confirm.remove": "Remove \u201C{name}\u201D? Position and targets go too (recoverable via backup).",
		  "add.title": "Add symbol",
		  "add.search.cn": "Name or code",
		  "add.search.hk": "Name or code",
		  "add.search.us": "Name or code",
		  "add.search.crypto": "Coin or pair",
		  "add.direct": "Enter a code directly",
		  "add.direct.cn": "600519 / 000001 / sh510300",
		  "add.direct.hk": "00700",
		  "add.direct.us": "AAPL",
		  "add.direct.crypto": "BTC-USDT",
		  "add.validate": "Add",
		  "add.hint": "A live quote is fetched first; the symbol is added only if a valid price comes back.",
		  "add.searching": "Searching\u2026",
		  "add.no-match": "No match for \u201C{q}\u201D. Try another keyword or enter a code directly.",
		  "add.search-error": "Search unavailable: {e}. You can still enter a code directly.",
		  "add.not-found": "{e} \u2014 check the code and retry",
		  "add.guide.cn": "Type a name or code to search, e.g. 600519",
		  "add.guide.hk": "Type a name or code to search, e.g. 00700",
		  "add.guide.us": "Type a name or code to search, e.g. AAPL",
		  "add.guide.crypto": "Type a coin or pair to search, e.g. BTC",
		  "backup.export": "Export backup",
		  "backup.import": "Import backup",
		  "backup.import.hint": "Import overwrites all current data \u2014 export a backup first.",
		  "backup.export.hint": "Exports a JSON file that includes positions in plain text \u2014 keep it safe.",
		  "backup.importing": "Importing\u2026",
		  "backup.confirm": "Backup holds {n} symbols; import replaces all current data ({m} now).",
		  "backup.privacy-note": "Backups contain positions in plain text (unencrypted) \u2014 keep them safe.",
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
		  "toast.targets-cleared": "Targets cleared",
		  "toast.conflict": "Data changed in another tab: refreshed \u2014 please retry",
		  "toast.init-failed": "Init failed: {e}",
		  "toast.op-failed": "Action failed: {e}",
		  "picker.label": "Capsule shows",
		  "picker.empty": "add symbols first",
		  "quota.merge.on": "quota merged into the capsule (click to split)",
		  "quota.merge.off": "quota shown separately (click to merge into the capsule)",
		  "quota.outcome": "Pending redemption result",
		  "quota.stale": "Quota data stale",
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
		
		// src/identity.mjs
		var MARKETS = ["cn", "hk", "us", "crypto"];
		function checkTargetRelation(buyTarget, sellTarget) {
		  if (buyTarget != null && sellTarget != null && buyTarget >= sellTarget) {
		    return { ok: true, overlap: true };
		  }
		  return { ok: true, overlap: false };
		}
		
		// src/model.mjs
		function compareBySort(a, b) {
		  if (a.sort !== b.sort) return a.sort < b.sort ? -1 : 1;
		  const ta = Date.parse(a.addedAt) || 0;
		  const tb = Date.parse(b.addedAt) || 0;
		  if (ta !== tb) return ta < tb ? -1 : 1;
		  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
		}
		
		// client/store.mjs
		var UI_KEY = "stock-kanban:ui:v1";
		var UI_PERSIST_KEYS = ["lastMarket", "holdingsOnly", "maVisible", "capsuleSymbolId"];
		var DEFAULT_UI = {
		  panelOpen: false,
		  view: "list",
		  // 'list' | 'detail'（会话内状态；重开面板始终先列表）
		  detailId: null,
		  showAdd: false,
		  // 会话态：添加对话框
		  showSettings: false,
		  // 会话态：设置对话框（备份与迁移）
		  quotaCapable: false,
		  // 会话态：quota-watch 嵌入能力在线（onCapabilityChange 驱动；footer 开关门控；不落盘）
		  lastMarket: "cn",
		  holdingsOnly: false,
		  maVisible: { 5: true, 10: true, 20: true, 60: true },
		  capsuleSymbolId: null,
		  // null → 第一个标的
		  quotaMerge: true
		  // 会话态：合并显示 quota（默认开、不落盘；设置开关已隐藏，第四轮 2026-11-10；仅能力在线时生效）
		};
		function loadUi(storage) {
		  const ui = { ...DEFAULT_UI };
		  try {
		    const raw = storage.getItem(UI_KEY);
		    if (!raw) return ui;
		    const parsed = JSON.parse(raw);
		    if (!parsed || typeof parsed !== "object") return ui;
		    for (const key of UI_PERSIST_KEYS) {
		      if (key in parsed) ui[key] = parsed[key];
		    }
		    return ui;
		  } catch {
		    return ui;
		  }
		}
		function createStore(storage = window.localStorage) {
		  let state = {
		    business: { rev: 0, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: false },
		    quotes: {},
		    // id → row
		    quoteMeta: { fetchedAt: null, error: null },
		    ui: loadUi(storage),
		    toast: null,
		    providers: null
		  };
		  const listeners = /* @__PURE__ */ new Set();
		  const emit = () => {
		    for (const l of [...listeners]) {
		      try {
		        l(state);
		      } catch {
		      }
		    }
		  };
		  const persistUi = () => {
		    try {
		      const persisted = {};
		      for (const key of UI_PERSIST_KEYS) persisted[key] = state.ui[key];
		      storage.setItem(UI_KEY, JSON.stringify(persisted));
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
		    const ordered = [...data.symbols].sort(compareBySort);
		    if (ui.capsuleSymbolId && !data.symbols.some((s) => s.id === ui.capsuleSymbolId)) {
		      setUi({ capsuleSymbolId: ordered[0]?.id ?? null });
		    } else if (!ui.capsuleSymbolId && data.symbols.length > 0) {
		      setUi({ capsuleSymbolId: ordered[0].id });
		    }
		    return data;
		  }
		  async function mutate(action, { quiet = false } = {}) {
		    try {
		      const result = await action(state.business.rev);
		      await refreshState();
		      return { ok: true, result };
		    } catch (e) {
		      if (e.status === 409 && e.body?.error !== "duplicate") {
		        await refreshState();
		        setToast(t("toast.conflict"));
		        return { ok: false, conflict: true, error: e };
		      }
		      if (!quiet) setToast(t("toast.op-failed", { e: tErr(e.body?.error, String(e?.message ?? e)) }));
		      return { ok: false, error: e };
		    }
		  }
		  const addSymbol = (market, code, patch) => mutate((rev) => api.add(market, code, patch, rev), { quiet: true });
		  const updateSymbol = (id, patch) => mutate((rev) => api.update(id, patch, rev));
		  const reorderSymbols = (market, orderedIds) => mutate((rev) => api.reorder(market, orderedIds, rev));
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
		  function setQuotaMerge(v) {
		    setUi({ quotaMerge: v });
		  }
		  function setQuotaCapable(v) {
		    setUi({ quotaCapable: v });
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
		  function handleVisibility() {
		    if (!document.hidden) restartPolling();
		  }
		  function subscribe(listener) {
		    listeners.add(listener);
		    try {
		      listener(state);
		    } catch {
		    }
		    return () => listeners.delete(listener);
		  }
		  function getState() {
		    return state;
		  }
		  function dispose() {
		    if (pollTimer) {
		      clearInterval(pollTimer);
		      pollTimer = null;
		    }
		    listeners.clear();
		  }
		  return {
		    subscribe,
		    getState,
		    dispose,
		    refreshState,
		    mutate,
		    addSymbol,
		    updateSymbol,
		    reorderSymbols,
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
		    setLastMarket,
		    setHoldingsOnly,
		    setMaVisible,
		    setCapsuleSymbol,
		    setQuotaMerge,
		    setQuotaCapable,
		    setToast,
		    setShowAdd,
		    setShowSettings,
		    handleVisibility
		  };
		}
		
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
		
		// client/float-prefs.mjs
		var FLOAT_POSITION_KEY = "dsh-stock-kanban:float-position";
		var MARGIN = 8;
		var ZERO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 };
		function normalizeSize(size) {
		  if (typeof size === "number") return { width: size, height: size };
		  const width = typeof size?.width === "number" ? size.width : 0;
		  const height = typeof size?.height === "number" ? size.height : 0;
		  return { width, height };
		}
		function clampPoint(point, viewport, size = 0, insets = ZERO_INSETS) {
		  const { width, height } = normalizeSize(size);
		  const insetLeft = Number.isFinite(insets?.left) ? insets.left : 0;
		  const insetRight = Number.isFinite(insets?.right) ? insets.right : 0;
		  const insetTop = Number.isFinite(insets?.top) ? insets.top : 0;
		  const insetBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0;
		  const minX = MARGIN + insetLeft;
		  const minY = MARGIN + insetTop;
		  const maxX = Math.max(minX, viewport.width - insetRight - MARGIN - width);
		  const maxY = Math.max(minY, viewport.height - insetBottom - MARGIN - height);
		  return {
		    x: Math.min(Math.max(point.x, minX), maxX),
		    y: Math.min(Math.max(point.y, minY), maxY)
		  };
		}
		function titlebarTopInset({ titlebar = false, fullscreen = false, height } = {}) {
		  if (!titlebar || fullscreen) return 0;
		  const value = Number.parseFloat(height);
		  return Number.isFinite(value) && value > 0 ? value : 0;
		}
		function loadFloatPosition(storage) {
		  try {
		    const raw = storage.getItem(FLOAT_POSITION_KEY);
		    if (typeof raw !== "string" || raw === "") return null;
		    const parsed = JSON.parse(raw);
		    if (typeof parsed !== "object" || parsed === null || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) {
		      return null;
		    }
		    return { x: parsed.x, y: parsed.y };
		  } catch {
		    return null;
		  }
		}
		function saveFloatPosition(storage, point) {
		  if (typeof point !== "object" || point === null || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
		    throw new TypeError(`invalid float position: ${JSON.stringify(point)}`);
		  }
		  try {
		    storage.setItem(FLOAT_POSITION_KEY, JSON.stringify({ x: point.x, y: point.y }));
		  } catch {
		  }
		}
		var GUEST_POSITION_KEY = "dsh-quota-watch:float-position";
		function loadGuestFloatPosition(storage) {
		  try {
		    const raw = storage.getItem(GUEST_POSITION_KEY);
		    if (typeof raw !== "string" || raw === "") return null;
		    const parsed = JSON.parse(raw);
		    if (typeof parsed !== "object" || parsed === null || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) {
		      return null;
		    }
		    return { x: parsed.x, y: parsed.y };
		  } catch {
		    return null;
		  }
		}
		function mirrorGuestFloatPosition(storage, point) {
		  if (typeof point !== "object" || point === null || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
		    throw new TypeError(`invalid guest float position: ${JSON.stringify(point)}`);
		  }
		  try {
		    storage.setItem(GUEST_POSITION_KEY, JSON.stringify({ x: point.x, y: point.y }));
		  } catch {
		  }
		}
		
		// client/drag.mjs
		var DRAG_SLOP_MOUSE = 6;
		var DRAG_SLOP_TOUCH = 10;
		function dragSlop(pointerType) {
		  return pointerType === "touch" || pointerType === "pen" ? DRAG_SLOP_TOUCH : DRAG_SLOP_MOUSE;
		}
		function grabOffset(point, rect) {
		  return { dx: point.x - rect.left, dy: point.y - rect.top };
		}
		function pillTopLeft(point, grab) {
		  return { x: point.x - grab.dx, y: point.y - grab.dy };
		}
		function clampFrame(point, grab, size, viewport, insets) {
		  return clampPoint(pillTopLeft(point, grab), viewport, size, insets);
		}
		function parseInset(computedValue) {
		  const value = Number.parseFloat(computedValue);
		  return Number.isFinite(value) ? value : 0;
		}
		
		// client/capsule.mjs
		var FALLBACK_SIZE = { width: 38, height: 26 };
		var ZERO_INSETS2 = { left: 0, right: 0, top: 0, bottom: 0 };
		function attachFloatDrag({ el, host, doc, win, storage, onTap, readInsets: readInsetsArg, onPersisted, onDragStart }) {
		  let dragging = false;
		  let moved = false;
		  let originX = 0;
		  let originY = 0;
		  let slop = 6;
		  let grab = { dx: 0, dy: 0 };
		  let dragSize = FALLBACK_SIZE;
		  let restX = 0;
		  let restY = 0;
		  let lastPoint = null;
		  let suppressNextClick = false;
		  let disposedDrag = false;
		  let downTarget = null;
		  let dragProbe = null;
		  const readInsets = readInsetsArg ?? (() => {
		    try {
		      const root = el.getRootNode();
		      if (!dragProbe && root && typeof root.append === "function" && root !== doc) {
		        dragProbe = doc.createElement("div");
		        dragProbe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
		        root.append(dragProbe);
		      }
		      if (!dragProbe) return ZERO_INSETS2;
		      const style = win.getComputedStyle(dragProbe);
		      return {
		        top: Math.max(parseInset(style?.paddingTop), titlebarInset(win, doc)),
		        right: parseInset(style?.paddingRight),
		        bottom: parseInset(style?.paddingBottom),
		        left: parseInset(style?.paddingLeft)
		      };
		    } catch {
		      return ZERO_INSETS2;
		    }
		  });
		  const viewportOf = () => ({ width: win.innerWidth ?? 1024, height: win.innerHeight ?? 768 });
		  const scheduleFrame = (fn) => typeof win.requestAnimationFrame === "function" ? win.requestAnimationFrame.call(win, fn) : fn();
		  const bindGesture = () => {
		    doc.addEventListener("pointermove", onPointerMove);
		    doc.addEventListener("pointerup", onPointerUp);
		    doc.addEventListener("pointercancel", onPointerCancel);
		  };
		  const unbindGesture = () => {
		    doc.removeEventListener("pointermove", onPointerMove);
		    doc.removeEventListener("pointerup", onPointerUp);
		    doc.removeEventListener("pointercancel", onPointerCancel);
		  };
		  const onPointerDown = (event) => {
		    if (event.button !== 0) return;
		    downTarget = event.target;
		    dragging = true;
		    moved = false;
		    originX = event.clientX;
		    originY = event.clientY;
		    slop = dragSlop(event.pointerType);
		    restX = Number.parseFloat(host.style.left) || 0;
		    restY = Number.parseFloat(host.style.top) || 0;
		    let rect = el.getBoundingClientRect();
		    dragSize = rect.width > 0 ? { width: rect.width, height: rect.height } : FALLBACK_SIZE;
		    if (rect.width === 0) {
		      rect = { left: restX, top: restY, width: dragSize.width, height: dragSize.height };
		    }
		    grab = grabOffset({ x: event.clientX, y: event.clientY }, rect);
		    try {
		      el.setPointerCapture?.(event.pointerId);
		    } catch {
		    }
		    bindGesture();
		  };
		  const onPointerMove = (event) => {
		    if (!dragging) return;
		    if (!moved) {
		      if (Math.hypot(event.clientX - originX, event.clientY - originY) < slop) return;
		      moved = true;
		      doc.body.style.userSelect = "none";
		      el.classList.add("skc-capsule--dragging");
		      if (typeof onDragStart === "function") onDragStart();
		    }
		    lastPoint = { x: event.clientX, y: event.clientY };
		    scheduleFrame(() => {
		      if (!dragging || !lastPoint || disposedDrag) return;
		      const topLeft = clampFrame(lastPoint, grab, dragSize, viewportOf(), readInsets());
		      const dx = topLeft.x - restX;
		      const dy = topLeft.y - restY;
		      host.style.willChange = "transform";
		      host.style.transform = `translate3d(${Math.round(dx)}px, ${Math.round(dy)}px, 0)`;
		    });
		  };
		  const onPointerUp = (event) => {
		    if (!dragging) return;
		    dragging = false;
		    unbindGesture();
		    doc.body.style.userSelect = "";
		    if (!moved) {
		      onTap(downTarget);
		      return;
		    }
		    const point = clampFrame(
		      { x: event.clientX, y: event.clientY },
		      grab,
		      dragSize,
		      viewportOf(),
		      readInsets()
		    );
		    suppressNextClick = true;
		    el.classList.remove("skc-capsule--dragging");
		    host.style.willChange = "";
		    host.style.transform = "";
		    saveFloatPosition(storage, point);
		    if (typeof onPersisted === "function") onPersisted(point);
		    host.style.left = `${Math.round(point.x)}px`;
		    host.style.top = `${Math.round(point.y)}px`;
		  };
		  const onPointerCancel = () => {
		    if (!dragging) return;
		    dragging = false;
		    unbindGesture();
		    doc.body.style.userSelect = "";
		    el.classList.remove("skc-capsule--dragging");
		    host.style.willChange = "";
		    host.style.transform = "";
		  };
		  const onClick = () => {
		    if (suppressNextClick) suppressNextClick = false;
		  };
		  el.addEventListener("pointerdown", onPointerDown);
		  el.addEventListener("click", onClick);
		  return {
		    isDragging: () => dragging,
		    dispose() {
		      disposedDrag = true;
		      unbindGesture();
		      el.removeEventListener("pointerdown", onPointerDown);
		      el.removeEventListener("click", onClick);
		      dragProbe?.remove?.();
		    }
		  };
		}
		function titlebarInset(win, doc) {
		  try {
		    const html = doc.documentElement;
		    return titlebarTopInset({
		      titlebar: html.hasAttribute("data-windows-titlebar"),
		      fullscreen: html.hasAttribute("data-fullscreen"),
		      height: parseInset(win.getComputedStyle(html)?.getPropertyValue("--dsh-windows-titlebar-height"))
		    });
		  } catch {
		    return 0;
		  }
		}
		function createCapsule({ doc, win, storage, shadow, store, onTogglePanel, onQuotaTap, onPositionPersisted }) {
		  const host = shadow.host;
		  const toggle = (segRect) => typeof onTogglePanel === "function" ? onTogglePanel(segRect, el.getBoundingClientRect()) : store?.togglePanel?.();
		  const stockRect = () => (el.querySelector('[data-seg="stock"]') ?? el).getBoundingClientRect();
		  let disposed = false;
		  const el = doc.createElement("div");
		  el.className = "skc-capsule";
		  el.setAttribute("data-dsh-stock-kanban-capsule", "");
		  el.setAttribute("role", "button");
		  el.tabIndex = 0;
		  el.setAttribute("aria-haspopup", "dialog");
		  el.setAttribute("aria-expanded", "false");
		  const markBuy = doc.createElement("span");
		  markBuy.className = "skc-capsule-mark skc-mark-buy";
		  markBuy.textContent = "B";
		  const markSell = doc.createElement("span");
		  markSell.className = "skc-capsule-mark skc-mark-sell";
		  markSell.textContent = "S";
		  const nameEl = doc.createElement("span");
		  nameEl.className = "skc-capsule-name skc-stock-name";
		  const priceEl = doc.createElement("span");
		  priceEl.className = "skc-capsule-price skc-flat";
		  const pctEl = doc.createElement("span");
		  pctEl.className = "skc-capsule-pct skc-flat";
		  markBuy.hidden = true;
		  markSell.hidden = true;
		  const stockSeg = doc.createElement("div");
		  stockSeg.setAttribute("data-seg", "stock");
		  stockSeg.append(markBuy, markSell, nameEl, priceEl, pctEl);
		  el.append(stockSeg);
		  const safeAreaProbe = doc.createElement("div");
		  safeAreaProbe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
		  shadow.append(safeAreaProbe);
		  const readTitlebarInset = () => {
		    try {
		      const html = doc.documentElement;
		      return titlebarTopInset({
		        titlebar: html.hasAttribute("data-windows-titlebar"),
		        fullscreen: html.hasAttribute("data-fullscreen"),
		        height: parseInset(
		          win.getComputedStyle(html)?.getPropertyValue("--dsh-windows-titlebar-height")
		        )
		      });
		    } catch {
		      return 0;
		    }
		  };
		  const readInsets = () => {
		    try {
		      const style = win.getComputedStyle(safeAreaProbe);
		      return {
		        top: Math.max(parseInset(style?.paddingTop), readTitlebarInset()),
		        right: parseInset(style?.paddingRight),
		        bottom: parseInset(style?.paddingBottom),
		        left: parseInset(style?.paddingLeft)
		      };
		    } catch {
		      return ZERO_INSETS2;
		    }
		  };
		  const viewportOf = () => ({ width: win.innerWidth ?? 1024, height: win.innerHeight ?? 768 });
		  const measureSize = () => {
		    const rect = el.getBoundingClientRect();
		    const source = rect.width > 0 ? rect : host.getBoundingClientRect();
		    return source.width > 0 ? { width: source.width, height: source.height } : FALLBACK_SIZE;
		  };
		  const applyPosition = () => {
		    const viewport = viewportOf();
		    const size = measureSize();
		    const insets = readInsets();
		    const pos = loadFloatPosition(storage) ?? {
		      x: viewport.width - MARGIN - insets.right - size.width,
		      y: viewport.height - MARGIN - insets.bottom - size.height
		    };
		    const point = clampPoint(pos, viewport, size, insets);
		    host.style.left = `${Math.round(point.x)}px`;
		    host.style.top = `${Math.round(point.y)}px`;
		    lastAppliedSize = size;
		  };
		  let lastAppliedSize = null;
		  const repositionIfResized = () => {
		    if (dragCtl.isDragging()) return;
		    const size = measureSize();
		    if (!lastAppliedSize || Math.abs(size.width - lastAppliedSize.width) >= 0.5 || Math.abs(size.height - lastAppliedSize.height) >= 0.5) {
		      applyPosition();
		    }
		  };
		  const routeTap = (target) => {
		    if (target?.closest?.('[data-seg="quota"]')) {
		      if (typeof onQuotaTap === "function") onQuotaTap();
		      return;
		    }
		    toggle(stockRect());
		  };
		  const collapsePanel = () => {
		    if (store?.getState?.()?.ui?.panelOpen === true) store.closePanel?.();
		  };
		  const dragCtl = attachFloatDrag({ el, host, doc, win, storage, onTap: routeTap, readInsets, onPersisted: (point) => {
		    if (typeof onPositionPersisted === "function") onPositionPersisted(point);
		  }, onDragStart: collapsePanel });
		  const onKeyDown = (event) => {
		    if (event.key === "Enter" || event.key === " ") {
		      event.preventDefault();
		      toggle(stockRect());
		    }
		  };
		  const syncCompact = () => el.classList.toggle("skc-compact", viewportOf().width <= 480);
		  const clampHostToViewport = () => {
		    const viewport = viewportOf();
		    const size = measureSize();
		    const insets = readInsets();
		    const point = clampPoint(
		      { x: Number.parseFloat(host.style.left) || 0, y: Number.parseFloat(host.style.top) || 0 },
		      viewport,
		      size,
		      insets
		    );
		    host.style.left = `${Math.round(point.x)}px`;
		    host.style.top = `${Math.round(point.y)}px`;
		  };
		  const onResize = () => {
		    syncCompact();
		    clampHostToViewport();
		  };
		  el.addEventListener("keydown", onKeyDown);
		  win.addEventListener("resize", onResize);
		  let resizeObserver = null;
		  if (typeof win.ResizeObserver === "function") {
		    resizeObserver = new win.ResizeObserver(() => clampHostToViewport());
		    resizeObserver.observe(el);
		  }
		  (shadow.querySelector(".skc-stack") ?? shadow).append(el);
		  syncCompact();
		  applyPosition();
		  const update = (snapshot) => {
		    const ui = snapshot?.ui ?? {};
		    const symbols = snapshot?.business?.symbols ?? [];
		    const symbol = symbols.find((s) => s.id === ui.capsuleSymbolId) ?? null;
		    const quote = snapshot?.quotes?.[ui.capsuleSymbolId] ?? null;
		    el.setAttribute("aria-expanded", ui.panelOpen ? "true" : "false");
		    const price = quote?.status === "ok" ? quote.price : null;
		    const pct = quote?.changePercent ?? null;
		    const name = symbol ? quote?.name || symbol.name || symbol.code : t("capsule.empty");
		    const target = quote?.target;
		    const paused = target?.status === "stale" || target?.status === "no-data";
		    markBuy.hidden = target?.buyTriggered !== true;
		    markSell.hidden = target?.sellTriggered !== true;
		    nameEl.textContent = name;
		    priceEl.textContent = price != null ? fmtPrice(price) : paused && quote ? t("capsule.stale") : "\u2014";
		    priceEl.className = `skc-capsule-price ${trendClass(pct)}`;
		    pctEl.textContent = fmtPct(pct);
		    pctEl.className = `skc-capsule-pct ${trendClass(pct)}`;
		    if (paused && (symbol?.buyTarget != null || symbol?.sellTarget != null)) {
		      el.title = t("capsule.tip.stale");
		    } else {
		      el.removeAttribute("title");
		    }
		    repositionIfResized();
		  };
		  const dispose = () => {
		    disposed = true;
		    dragCtl.dispose();
		    el.removeEventListener("keydown", onKeyDown);
		    win.removeEventListener("resize", onResize);
		    if (resizeObserver) resizeObserver.disconnect();
		    safeAreaProbe.remove();
		    el.remove();
		  };
		  return { el, update, dispose };
		}
		
		// client/icons.mjs
		var SVG_NS = "http://www.w3.org/2000/svg";
		var ICONS = {
		  /* 添加 */
		  plus: [
		    { d: "M7 2.6v8.8" },
		    { d: "M2.6 7h8.8" }
		  ],
		  /* 设置：齿轮（6 齿外轮廓 + 中心孔；齿顶半径 6.0、齿根 4.3，14 单位内 stroke 1.6 下齿槽可辨；第四轮 2026-11-10 由滑杆换齿轮） */
		  settings: [
		    { d: "M5.74 2.89L6.06 1.07L7.94 1.07L8.26 2.89L9.15 3.28L9.93 3.86L11.66 3.22L12.6 4.85L11.19 6.03L11.3 7L11.19 7.97L12.6 9.15L11.66 10.78L9.93 10.14L9.15 10.72L8.26 11.11L7.94 12.93L6.06 12.93L5.74 11.11L4.85 10.72L4.07 10.14L2.34 10.78L1.4 9.15L2.81 7.97L2.7 7L2.81 6.03L1.4 4.85L2.34 3.22L4.07 3.86L4.85 3.28Z" },
		    { tag: "circle", cx: 7, cy: 7, r: 1.9 }
		  ],
		  /* 刷新：双箭头环形（lucide refresh-cw 14px 缩放） */
		  refresh: [
		    { d: "M1.8 7a5.3 5.3 0 0 1 5.3-5.3 5.7 5.7 0 0 1 3.9 1.6l1.3 1.4" },
		    { d: "M12.3 1.8v2.9h-2.9" },
		    { d: "M12.3 7a5.3 5.3 0 0 1-5.3 5.3 5.7 5.7 0 0 1-3.9-1.6L1.8 9.3" },
		    { d: "M4.7 9.3H1.8v2.9" }
		  ],
		  close: [
		    { d: "M3.6 3.6l6.8 6.8" },
		    { d: "M10.4 3.6l-6.8 6.8" }
		  ],
		  /* quota 合并开：单胶囊 + 中缝分隔 */
		  "quota-on": [
		    { tag: "rect", x: 2.2, y: 4.6, width: 9.6, height: 4.8, rx: 2.4 },
		    { d: "M7 4.6v4.8" }
		  ],
		  /* quota 合并关：两枚分离胶囊 */
		  "quota-off": [
		    { tag: "rect", x: 1.8, y: 4.6, width: 4.7, height: 4.8, rx: 2.35 },
		    { tag: "rect", x: 7.5, y: 4.6, width: 4.7, height: 4.8, rx: 2.35 }
		  ],
		  /* 返回 */
		  back: [{ d: "M8.8 3.2L5 7l3.8 3.8" }],
		  /* 持仓（公文包：只看持仓开关） */
		  wallet: [
		    { d: "M5.3 4.4V3.3a1.1 1.1 0 0 1 1.1-1.1h1.2a1.1 1.1 0 0 1 1.1 1.1v1.1" },
		    { tag: "rect", x: 2.2, y: 4.4, width: 9.6, height: 6.6, rx: 1.4 },
		    { d: "M2.2 7.3h3.6" },
		    { d: "M9.2 7.3h2.6" }
		  ],
		  /* 拖拽排序把手：双列圆点（fill 点阵，与线性描边语言并用；aria-hidden 装饰，行整体是拖拽面） */
		  grip: [
		    { tag: "circle", cx: 5.2, cy: 3.4, r: 1.15, fill: "currentColor", stroke: "none" },
		    { tag: "circle", cx: 8.8, cy: 3.4, r: 1.15, fill: "currentColor", stroke: "none" },
		    { tag: "circle", cx: 5.2, cy: 7, r: 1.15, fill: "currentColor", stroke: "none" },
		    { tag: "circle", cx: 8.8, cy: 7, r: 1.15, fill: "currentColor", stroke: "none" },
		    { tag: "circle", cx: 5.2, cy: 10.6, r: 1.15, fill: "currentColor", stroke: "none" },
		    { tag: "circle", cx: 8.8, cy: 10.6, r: 1.15, fill: "currentColor", stroke: "none" }
		  ],
		  /* 删除 */
		  trash: [
		    { d: "M2.8 4.2h8.4" },
		    { d: "M5.3 4.2V3.1a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v1.1" },
		    { d: "M4.1 4.2l.5 6.4a1.2 1.2 0 0 0 1.2 1.1h2.4a1.2 1.2 0 0 0 1.2-1.1l.5-6.4" },
		    { d: "M5.9 6.5v3.2" },
		    { d: "M8.1 6.5v3.2" }
		  ]
		};
		function iconEl(doc, name, opts = {}) {
		  const spec = ICONS[name];
		  if (!spec) throw new Error(`unknown icon: ${name}`);
		  const size = opts.size ?? 14;
		  const svg = doc.createElementNS(SVG_NS, "svg");
		  svg.setAttribute("viewBox", "0 0 14 14");
		  svg.setAttribute("width", String(size));
		  svg.setAttribute("height", String(size));
		  svg.setAttribute("fill", "none");
		  svg.setAttribute("stroke", "currentColor");
		  svg.setAttribute("stroke-width", String(opts.strokeWidth ?? 1.6));
		  svg.setAttribute("stroke-linecap", "round");
		  svg.setAttribute("stroke-linejoin", "round");
		  svg.setAttribute("aria-hidden", "true");
		  for (const part of spec) {
		    const el = doc.createElementNS(SVG_NS, part.tag ?? "path");
		    for (const [k, v] of Object.entries(part)) {
		      if (k === "tag") continue;
		      el.setAttribute(k, String(v));
		    }
		    svg.append(el);
		  }
		  return svg;
		}
		
		// client/version.mjs
		var APP_VERSION = true ? "0.2.0" : "dev";
		var VERSION_LABEL = `dsh-stock-kanban v${APP_VERSION}`;
		
		// client/panel.mjs
		var ZERO_INSETS3 = { left: 0, right: 0, top: 0, bottom: 0 };
		var WIDTH_FALLBACK = 360;
		var HEIGHT_FALLBACK = 160;
		var clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
		function createPanel({ doc, win, store, views }) {
		  let disposed = false;
		  let open = false;
		  let segRect = null;
		  let capsuleRect = null;
		  let safeProbe = null;
		  let snapshot = null;
		  let addWasShown = false;
		  const el = doc.createElement("div");
		  el.className = "skc-panel";
		  el.setAttribute("role", "dialog");
		  el.hidden = true;
		  const getSafeProbe = () => {
		    if (safeProbe) return safeProbe;
		    try {
		      const root = el.getRootNode();
		      if (root && typeof root.append === "function" && root !== doc) {
		        safeProbe = doc.createElement("div");
		        safeProbe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
		        root.append(safeProbe);
		      }
		    } catch {
		      safeProbe = null;
		    }
		    return safeProbe;
		  };
		  const readTitlebarInset = () => {
		    try {
		      const html = doc.documentElement;
		      return titlebarTopInset({
		        titlebar: html.hasAttribute("data-windows-titlebar"),
		        fullscreen: html.hasAttribute("data-fullscreen"),
		        height: parseInset(
		          win.getComputedStyle(html)?.getPropertyValue("--dsh-windows-titlebar-height")
		        )
		      });
		    } catch {
		      return 0;
		    }
		  };
		  const readInsets = () => {
		    const probe = getSafeProbe();
		    if (!probe) return ZERO_INSETS3;
		    try {
		      const style = win.getComputedStyle(probe);
		      return {
		        top: Math.max(parseInset(style?.paddingTop), readTitlebarInset()),
		        right: parseInset(style?.paddingRight),
		        bottom: parseInset(style?.paddingBottom),
		        left: parseInset(style?.paddingLeft)
		      };
		    } catch {
		      return ZERO_INSETS3;
		    }
		  };
		  const placePanel = () => {
		    if (!open) return;
		    const vw = win.innerWidth ?? 1024;
		    const vh = win.innerHeight ?? 768;
		    if (vw <= 480) {
		      el.classList.add("skc-panel--sheet");
		      el.style.left = "";
		      el.style.top = "";
		      el.style.maxHeight = "";
		      return;
		    }
		    el.classList.remove("skc-panel--sheet");
		    const insets = readInsets();
		    el.style.maxHeight = `${Math.max(160, Math.round(vh - 2 * MARGIN - insets.top - insets.bottom))}px`;
		    const width = el.offsetWidth || WIDTH_FALLBACK;
		    const height = el.offsetHeight || HEIGHT_FALLBACK;
		    const minLeft = MARGIN + insets.left;
		    const maxLeft = vw - width - MARGIN - insets.right;
		    const anchored = segRect != null;
		    const cap = capsuleRect ?? { left: vw - width - MARGIN, top: MARGIN, width: 0, height: 0 };
		    const seg = segRect ?? cap;
		    let left = null;
		    if (anchored) {
		      const rightLeft = seg.left + seg.width + 8;
		      const leftLeft = seg.left - width - 8;
		      if (rightLeft <= maxLeft) left = rightLeft;
		      else if (leftLeft >= minLeft) left = leftLeft;
		    }
		    let top;
		    if (left !== null) {
		      top = cap.top;
		    } else {
		      left = cap.left;
		      top = cap.top + cap.height + 8;
		      if (top + height > vh - MARGIN) top = cap.top - height - 8;
		    }
		    left = clamp(left, minLeft, maxLeft);
		    top = clamp(top, MARGIN + insets.top, vh - height - MARGIN);
		    el.style.left = `${Math.round(left)}px`;
		    el.style.top = `${Math.round(top)}px`;
		  };
		  const SCROLL_CUE_SEL = ".skc-rows, .skc-layer-detail, .skc-dialog-scroll";
		  const cueOf = (node) => {
		    node.classList.toggle("skc-scroll-more", node.scrollHeight - node.clientHeight - node.scrollTop > 8);
		  };
		  const refreshScrollCues = () => {
		    for (const node of el.querySelectorAll(SCROLL_CUE_SEL)) cueOf(node);
		  };
		  el.addEventListener("scroll", (event) => {
		    const node = event.target;
		    if (node?.matches?.(SCROLL_CUE_SEL)) cueOf(node);
		  }, { capture: true, passive: true });
		  const sizeObserver = typeof win.ResizeObserver === "function" ? new win.ResizeObserver(() => placePanel()) : null;
		  sizeObserver?.observe(el);
		  const cueObserver = typeof win.MutationObserver === "function" ? new win.MutationObserver(() => {
		    refreshScrollCues();
		    if (!sizeObserver) placePanel();
		  }) : null;
		  cueObserver?.observe(el, { childList: true, subtree: true, characterData: true });
		  const onResize = () => {
		    placePanel();
		    refreshScrollCues();
		  };
		  const onKeydown = (event) => {
		    if (!open || event.key !== "Escape") return;
		    const ui = snapshot?.ui ?? {};
		    if (ui.showAdd) {
		      store.setShowAdd(false);
		      return;
		    }
		    if (ui.showSettings) {
		      store.setShowSettings(false);
		      return;
		    }
		    close();
		  };
		  const onDocPointerDown = (event) => {
		    if (!open) return;
		    let path;
		    try {
		      path = event.composedPath();
		    } catch {
		      return;
		    }
		    if (path.includes(el)) return;
		    const onCapsule = path.some((n) => n?.dataset?.dshStockKanbanCapsule !== void 0);
		    const onQuotaSeg = path.some((n) => n?.dataset?.seg === "quota");
		    if (onCapsule && !onQuotaSeg) return;
		    close();
		  };
		  doc.addEventListener("keydown", onKeydown);
		  doc.addEventListener("pointerdown", onDocPointerDown);
		  win.addEventListener("resize", onResize);
		  const header = doc.createElement("div");
		  header.className = "skc-header";
		  const title = doc.createElement("span");
		  title.className = "skc-title";
		  title.textContent = t("app.title");
		  const headerMeta = doc.createElement("span");
		  headerMeta.className = "skc-header-meta";
		  const headerClose = doc.createElement("button");
		  headerClose.className = "skc-icon-btn";
		  headerClose.type = "button";
		  headerClose.dataset.action = "close";
		  headerClose.append(iconEl(doc, "close"));
		  headerClose.title = t("app.collapse");
		  headerClose.setAttribute("aria-label", t("app.collapse"));
		  headerClose.addEventListener("click", () => close());
		  const headerSpacer = doc.createElement("span");
		  headerSpacer.className = "skc-spacer";
		  header.append(title, headerMeta, headerSpacer, headerClose);
		  const body = doc.createElement("div");
		  body.className = "skc-body";
		  const listLayer = doc.createElement("div");
		  listLayer.className = "skc-layer";
		  listLayer.append(views.list.el);
		  const detailLayer = doc.createElement("div");
		  detailLayer.className = "skc-layer skc-layer-detail";
		  detailLayer.hidden = true;
		  detailLayer.append(views.detail.el);
		  body.append(listLayer, detailLayer);
		  const footer = doc.createElement("div");
		  footer.className = "skc-footer";
		  const footerMain = doc.createElement("div");
		  footerMain.className = "skc-footer-main";
		  const pickerLabel = doc.createElement("label");
		  pickerLabel.className = "skc-capsule-picker";
		  const pickerLabelText = doc.createElement("span");
		  pickerLabelText.textContent = t("picker.label");
		  pickerLabel.append(pickerLabelText);
		  const pickerSelect = doc.createElement("select");
		  pickerSelect.className = "skc-select";
		  pickerSelect.addEventListener("change", () => store.setCapsuleSymbol(pickerSelect.value));
		  pickerLabel.append(pickerSelect);
		  const makeFooterButton = (action, titleText, onClick, iconName) => {
		    const btn = doc.createElement("button");
		    btn.type = "button";
		    btn.className = "skc-icon-btn";
		    btn.dataset.action = action;
		    btn.append(iconEl(doc, iconName));
		    if (titleText) {
		      btn.title = titleText;
		      btn.setAttribute("aria-label", titleText);
		    }
		    btn.addEventListener("click", onClick);
		    return btn;
		  };
		  const holdingsBtn = makeFooterButton("holdings", t("list.holdings-only"), () => {
		    const on = snapshot?.ui?.holdingsOnly === true;
		    store.setHoldingsOnly(!on);
		  }, "wallet");
		  const addBtn = makeFooterButton("add", t("add.title"), () => store.setShowAdd(true), "plus");
		  const settingsBtn = makeFooterButton("settings", t("app.settings"), () => store.setShowSettings(true), "settings");
		  const refreshBtn = makeFooterButton("refresh", t("list.refresh"), () => store.pollQuotes(), "refresh");
		  footerMain.append(pickerLabel, holdingsBtn, addBtn, settingsBtn, refreshBtn);
		  footer.append(footerMain);
		  const addLayer = doc.createElement("div");
		  addLayer.className = "skc-dialog-layer";
		  addLayer.hidden = true;
		  addLayer.append(views.add.el);
		  const settingsLayer = doc.createElement("div");
		  settingsLayer.className = "skc-dialog skc-dialog--settings";
		  settingsLayer.hidden = true;
		  const settingsHead = doc.createElement("div");
		  settingsHead.className = "skc-dialog-head";
		  const settingsTitle = doc.createElement("span");
		  settingsTitle.className = "skc-section-title skc-dialog-title";
		  settingsTitle.textContent = t("app.settings");
		  const settingsSpacer = doc.createElement("span");
		  settingsSpacer.className = "skc-spacer";
		  const settingsClose = doc.createElement("button");
		  settingsClose.className = "skc-icon-btn";
		  settingsClose.type = "button";
		  settingsClose.append(iconEl(doc, "close"));
		  settingsClose.setAttribute("aria-label", t("app.collapse"));
		  settingsClose.addEventListener("click", () => store.setShowSettings(false));
		  settingsHead.append(settingsTitle, settingsSpacer, settingsClose);
		  const settingsBody = doc.createElement("div");
		  settingsBody.className = "skc-settings-body";
		  const notes = doc.createElement("div");
		  notes.className = "skc-setting-notes";
		  const noteLine = doc.createElement("div");
		  noteLine.className = "skc-setting-footnote skc-setting-footnote--weak";
		  const noteDelay = doc.createElement("span");
		  const noteSep = doc.createElement("span");
		  noteSep.className = "skc-setting-notesep";
		  noteSep.textContent = "\xB7";
		  const noteVersion = doc.createElement("span");
		  noteVersion.className = "skc-setting-version";
		  noteVersion.textContent = VERSION_LABEL;
		  noteLine.append(noteDelay, noteSep, noteVersion);
		  notes.append(noteLine);
		  settingsBody.append(views.backup.el, notes);
		  settingsLayer.append(settingsHead, settingsBody);
		  const toast = doc.createElement("div");
		  toast.className = "skc-toast";
		  toast.setAttribute("role", "status");
		  toast.setAttribute("aria-live", "polite");
		  toast.hidden = true;
		  el.append(header, body, footer, addLayer, settingsLayer, toast);
		  const render = () => {
		    if (disposed) return;
		    const ui = snapshot?.ui ?? {};
		    const business = snapshot?.business ?? { symbols: [], settings: {} };
		    const quoteMeta = snapshot?.quoteMeta ?? {};
		    title.textContent = t("app.title");
		    pickerLabelText.textContent = t("picker.label");
		    for (const [btn, key] of [[addBtn, "add.title"], [settingsBtn, "app.settings"], [refreshBtn, "list.refresh"], [headerClose, "app.collapse"]]) {
		      btn.title = t(key);
		      btn.setAttribute("aria-label", t(key));
		    }
		    settingsClose.setAttribute("aria-label", t("app.collapse"));
		    settingsTitle.textContent = t("app.settings");
		    noteDelay.textContent = t("app.note.delay");
		    el.hidden = !open;
		    el.dataset.surface = ui.showAdd || ui.showSettings ? "dialog" : ui.view === "detail" ? "detail" : "list";
		    el.classList.toggle("skc-panel--slide", open);
		    el.classList.toggle("skc-quote-error", Boolean(quoteMeta?.error));
		    headerMeta.textContent = quoteMeta?.error ? t("app.meta.error") : t("app.meta", { n: business.symbols.length });
		    listLayer.hidden = ui.view === "detail";
		    detailLayer.hidden = ui.view !== "detail";
		    const symbols = business.symbols ?? [];
		    const current = ui.capsuleSymbolId ?? "";
		    pickerSelect.replaceChildren();
		    if (symbols.length === 0) {
		      const opt = doc.createElement("option");
		      opt.value = "";
		      opt.textContent = t("picker.empty");
		      pickerSelect.append(opt);
		    } else {
		      for (const market of MARKETS) {
		        const group = symbols.filter((s) => s.market === market).sort(compareBySort);
		        if (group.length === 0) continue;
		        const optgroup = doc.createElement("optgroup");
		        optgroup.label = t(`market.${market}`);
		        for (const s of group) {
		          const opt = doc.createElement("option");
		          opt.value = s.id;
		          opt.textContent = s.name;
		          optgroup.append(opt);
		        }
		        pickerSelect.append(optgroup);
		      }
		    }
		    pickerSelect.value = symbols.some((s) => s.id === current) ? current : "";
		    const holdingsOnly = ui.holdingsOnly === true;
		    holdingsBtn.title = t("list.holdings-only");
		    holdingsBtn.setAttribute("aria-label", t("list.holdings-only"));
		    holdingsBtn.setAttribute("aria-pressed", holdingsOnly ? "true" : "false");
		    holdingsBtn.classList.toggle("skc-toggle-on", holdingsOnly);
		    addLayer.hidden = !ui.showAdd;
		    settingsLayer.hidden = !ui.showSettings;
		    el.classList.toggle("skc-panel--dialog", Boolean(ui.showAdd || ui.showSettings));
		    if (ui.showAdd && !addWasShown) views.add.onOpen?.();
		    addWasShown = Boolean(ui.showAdd);
		    toast.hidden = !snapshot?.toast;
		    if (snapshot?.toast) toast.textContent = snapshot.toast.text;
		    if (open) placePanel();
		    refreshScrollCues();
		  };
		  const openFrom = (seg, cap = seg) => {
		    if (disposed) return;
		    segRect = seg ?? null;
		    capsuleRect = cap ?? null;
		    open = true;
		    render();
		  };
		  const close = () => {
		    if (disposed) return;
		    open = false;
		    render();
		    store.closePanel();
		  };
		  const isOpen = () => open;
		  const update = (next) => {
		    if (disposed) return;
		    snapshot = next;
		    if (next?.ui?.panelOpen === false && open) open = false;
		    views.list.update(next);
		    views.detail.update(next);
		    if (next?.ui?.showAdd) views.add.update(next);
		    if (next?.ui?.showSettings) views.backup.update(next);
		    render();
		  };
		  const dispose = () => {
		    disposed = true;
		    doc.removeEventListener("keydown", onKeydown);
		    doc.removeEventListener("pointerdown", onDocPointerDown);
		    win.removeEventListener("resize", onResize);
		    safeProbe?.remove?.();
		    cueObserver?.disconnect?.();
		    sizeObserver?.disconnect?.();
		    el.remove();
		  };
		  return { el, update, openFrom, close, isOpen, dispose };
		}
		
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
		
		// client/reorder.mjs
		var DRAG_SLOP = 6;
		var LONG_PRESS_MS = 300;
		function liftIntent({ pointerType, movedPx, heldMs, slopPx = DRAG_SLOP, longPressMs = LONG_PRESS_MS }) {
		  const mouse = pointerType !== "touch" && pointerType !== "pen";
		  if (mouse) return movedPx >= slopPx ? "lift" : "wait";
		  if (movedPx >= slopPx) return "reject";
		  return heldMs >= longPressMs ? "lift" : "wait";
		}
		function moveId(list, id, toIndex) {
		  const from = list.indexOf(id);
		  if (from === -1) return [...list];
		  const clamped = Math.max(0, Math.min(list.length - 1, toIndex));
		  if (clamped === from) return [...list];
		  const next = list.filter((x) => x !== id);
		  next.splice(clamped, 0, id);
		  return next;
		}
		function slotIndexFromY(visualTop, listTop, rowH, count) {
		  return Math.max(0, Math.min(count - 1, Math.round((visualTop - listTop) / rowH)));
		}
		function mergeVisibleIntoFull(fullIds, visibleOrder) {
		  const shownSet = new Set(visibleOrder);
		  let vi = 0;
		  return fullIds.map((id) => shownSet.has(id) ? visibleOrder[vi++] : id);
		}
		
		// client/list.mjs
		function appendText(parent, className, text) {
		  const span = document.createElement("span");
		  if (className) span.className = className;
		  span.textContent = text;
		  parent.append(span);
		  return span;
		}
		function appendTargetBadges(container, target, market, quoteTime) {
		  if (!target || target.status === "no-targets") return;
		  if (target.buyTriggered || target.sellTriggered) {
		    if (target.buyTriggered) {
		      const b = appendText(container, "skc-badge skc-badge-buy", "B");
		      b.title = t("detail.buy-target", { ccy: "" });
		    }
		    if (target.sellTriggered) {
		      const s = appendText(container, "skc-badge skc-badge-sell", "S");
		      s.title = t("detail.sell-target", { ccy: "" });
		    }
		    return;
		  }
		  const kind = targetBadgeKind(target, market, quoteTime, Date.now());
		  if (!kind) return;
		  if (kind === "closed" || kind === "stale" || kind === "no-data") {
		    const el = appendText(container, "skc-badge skc-badge-stale", t(`badge.${kind}`));
		    el.title = t(`badge.${kind}.tip`);
		  }
		}
		function createList({ store }) {
		  let disposed = false;
		  let prevMarket = null;
		  const el = document.createElement("div");
		  el.className = "skc-listwrap";
		  const tabsEl = document.createElement("div");
		  tabsEl.className = "skc-tabs";
		  const tabButtons = /* @__PURE__ */ new Map();
		  const onTabClick = (market) => () => {
		    store.setLastMarket(market);
		    store.pollQuotes();
		  };
		  for (const m of MARKETS) {
		    const button = document.createElement("button");
		    button.className = "skc-tab";
		    button.type = "button";
		    button.textContent = t(`market.${m}`);
		    const countSpan = appendText(button, "skc-tab-count", "");
		    countSpan.hidden = true;
		    button.addEventListener("click", onTabClick(m));
		    tabsEl.append(button);
		    tabButtons.set(m, { button, countSpan });
		  }
		  const rowsEl = document.createElement("div");
		  rowsEl.className = "skc-rows";
		  el.append(tabsEl, rowsEl);
		  let dragPending = null;
		  let dragActive = false;
		  let dragPointerId = -1;
		  let dragId = null;
		  let dragIndex = -1;
		  let dragCache = null;
		  let suppressClick = false;
		  let flipTimer = null;
		  const marketState = () => {
		    const { business, ui } = store.getState();
		    const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
		    const rows = business.symbols.filter((s) => s.market === market).sort(compareBySort);
		    return { market, rows };
		  };
		  const rowById = (id) => rowsEl.querySelector(`.skc-row[data-id="${id}"]`);
		  const commitVisibleOrder = (visibleOrder) => {
		    const { market, rows } = marketState();
		    const full = rows.map((s) => s.id);
		    const merged = mergeVisibleIntoFull(full, visibleOrder);
		    if (merged.some((id, i) => id !== full[i])) store.reorderSymbols(market, merged);
		  };
		  const cancelPending = () => {
		    if (dragPending) {
		      clearTimeout(dragPending.timer);
		      dragPending = null;
		    }
		  };
		  const reducedMotion = () => document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
		  const beginDrag = (pending, y = pending.y0) => {
		    clearTimeout(pending.timer);
		    dragPending = null;
		    const rows = [...rowsEl.querySelectorAll(".skc-row")];
		    const index = rows.findIndex((r) => r.dataset.id === pending.id);
		    if (index === -1 || rows.length < 2) return;
		    const rects = rows.map((r) => r.getBoundingClientRect());
		    const rowH = index < rows.length - 1 ? Math.max(1, rects[index + 1].top - rects[index].top) : Math.max(1, rects[index].bottom - rects[index].top);
		    dragActive = true;
		    dragPointerId = pending.pointerId;
		    dragId = pending.id;
		    dragIndex = index;
		    suppressClick = true;
		    dragCache = {
		      listTop: rects[0].top,
		      rowH,
		      orderIds: rows.map((r) => r.dataset.id),
		      grabOffsetY: y - rects[index].top
		    };
		    rowById(pending.id)?.classList.add("skc-row-dragging");
		    try {
		      rowsEl.setPointerCapture(pending.pointerId);
		    } catch {
		    }
		  };
		  const endDrag = () => {
		    const row = dragId != null ? rowById(dragId) : null;
		    const cache = dragCache;
		    const wasActive = dragActive;
		    const order = cache ? [...cache.orderIds] : null;
		    if (row) {
		      if (!reducedMotion() && row.style.transform) {
		        row.classList.add("skc-row-settle");
		        row.style.transform = "";
		        clearTimeout(flipTimer);
		        flipTimer = setTimeout(() => row.classList.remove("skc-row-settle"), 200);
		      } else {
		        row.style.transform = "";
		      }
		      row.classList.remove("skc-row-dragging");
		    }
		    rowsEl.classList.remove("skc-rows-flipping");
		    dragActive = false;
		    dragId = null;
		    dragPointerId = -1;
		    dragIndex = -1;
		    dragCache = null;
		    if (wasActive && order) commitVisibleOrder(order);
		  };
		  const playFlipVirtual = (beforeTops, cache, excludeId) => {
		    if (reducedMotion()) return;
		    const moved = [];
		    for (const child of rowsEl.children) {
		      if (child.dataset.id === excludeId) continue;
		      const before = beforeTops[child.dataset.id];
		      const now = cache.listTop + cache.orderIds.indexOf(child.dataset.id) * cache.rowH;
		      const dy = before - now;
		      if (dy) {
		        child.style.transform = `translateY(${dy}px)`;
		        moved.push(child);
		      }
		    }
		    if (moved.length === 0) return;
		    rowsEl.classList.add("skc-rows-flipping");
		    void rowsEl.offsetHeight;
		    for (const node of moved) node.style.transform = "";
		    clearTimeout(flipTimer);
		    flipTimer = setTimeout(() => rowsEl.classList.remove("skc-rows-flipping"), 200);
		  };
		  const onDragMove = (y) => {
		    const cache = dragCache;
		    const dragged = dragId != null ? rowById(dragId) : null;
		    if (!cache || !dragged) return;
		    const visualTop = y - cache.grabOffsetY;
		    const target = slotIndexFromY(visualTop, cache.listTop, cache.rowH, cache.orderIds.length);
		    if (target !== dragIndex) {
		      const beforeTops = {};
		      cache.orderIds.forEach((id, i) => {
		        beforeTops[id] = cache.listTop + i * cache.rowH;
		      });
		      cache.orderIds = moveId(cache.orderIds, dragId, target);
		      dragIndex = target;
		      for (const id of cache.orderIds) rowsEl.append(rowById(id));
		      playFlipVirtual(beforeTops, cache, dragId);
		    }
		    dragged.style.transform = `translateY(${visualTop - (cache.listTop + dragIndex * cache.rowH)}px)`;
		  };
		  const moveByKeyboard = (id, delta) => {
		    const shown = [...rowsEl.querySelectorAll(".skc-row")].map((r) => r.dataset.id);
		    const from = shown.indexOf(id);
		    if (from === -1 || shown.length < 2) return;
		    const to = Math.max(0, Math.min(shown.length - 1, from + delta));
		    if (to === from) return;
		    commitVisibleOrder(moveId(shown, id, to));
		  };
		  const onRowsPointerDown = (e) => {
		    suppressClick = false;
		    if (dragActive || dragPending || e.button !== 0) return;
		    const row = e.target.closest?.(".skc-row");
		    if (!row || !rowsEl.contains(row)) return;
		    if (marketState().rows.length < 2) return;
		    const pending = {
		      id: row.dataset.id,
		      pointerId: e.pointerId,
		      type: e.pointerType ?? "mouse",
		      x0: e.clientX,
		      y0: e.clientY,
		      t0: performance.now(),
		      timer: null
		    };
		    if (pending.type === "touch" || pending.type === "pen") {
		      pending.timer = setTimeout(() => beginDrag(pending), LONG_PRESS_MS);
		    }
		    dragPending = pending;
		  };
		  const onRowsPointerMove = (e) => {
		    const pending = dragPending;
		    if (pending && e.pointerId === pending.pointerId) {
		      const intent = liftIntent({
		        pointerType: pending.type,
		        movedPx: Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0),
		        heldMs: performance.now() - pending.t0
		      });
		      if (intent === "reject") cancelPending();
		      else if (intent === "lift" && pending.type !== "touch" && pending.type !== "pen") beginDrag(pending, e.clientY);
		      return;
		    }
		    if (dragActive && e.pointerId === dragPointerId) onDragMove(e.clientY);
		  };
		  const onRowsPointerEnd = (e) => {
		    if (dragPending && e.pointerId === dragPending.pointerId) cancelPending();
		    else if (dragActive && e.pointerId === dragPointerId) endDrag();
		  };
		  rowsEl.addEventListener("pointerdown", onRowsPointerDown);
		  rowsEl.addEventListener("pointermove", onRowsPointerMove);
		  rowsEl.addEventListener("pointerup", onRowsPointerEnd);
		  rowsEl.addEventListener("pointercancel", onRowsPointerEnd);
		  rowsEl.addEventListener("touchmove", (e) => {
		    if (dragActive) e.preventDefault();
		  }, { passive: false });
		  const buildRow = (s, ui, quotes, privacy) => {
		    const q = quotes[s.id];
		    const price = q?.status === "ok" ? q.price : null;
		    const pct = q?.changePercent ?? null;
		    const hasPos = s.quantity != null && s.quantity > 0;
		    const m = q?.metrics;
		    const pnlUnknown = privacy ? null : m && (m.flags.zeroCost || m.flags.missingPrice) ? "masked-flag" : null;
		    const row = document.createElement("div");
		    row.className = "skc-row";
		    row.dataset.id = s.id;
		    row.tabIndex = 0;
		    row.setAttribute("role", "button");
		    row.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
		    row.addEventListener("click", () => {
		      if (suppressClick) {
		        suppressClick = false;
		        return;
		      }
		      store.openDetail(s.id);
		    });
		    row.addEventListener("keydown", (e) => {
		      if (e.key === "Enter" || e.key === " ") {
		        e.preventDefault();
		        store.openDetail(s.id);
		        return;
		      }
		      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
		        e.preventDefault();
		        moveByKeyboard(s.id, e.key === "ArrowUp" ? -1 : 1);
		      }
		    });
		    const nameCol = document.createElement("div");
		    nameCol.className = "skc-row-name";
		    appendText(nameCol, "skc-name-text", s.name);
		    const codeCol = document.createElement("span");
		    codeCol.className = "skc-code";
		    codeCol.textContent = s.code.replace(/^(sh|sz|bj|hk)/, "");
		    if (hasPos) {
		      const dot = appendText(codeCol, "skc-pos-dot", " \u2605");
		      dot.title = t("badge.holder");
		    }
		    nameCol.append(codeCol);
		    const priceCol = document.createElement("div");
		    priceCol.className = "skc-row-price";
		    appendText(
		      priceCol,
		      trendClass(pct),
		      price != null ? fmtPrice(price) : q ? q.status === "error" ? t("list.quote-failed") : "\u2014" : "\u2026"
		    );
		    appendText(priceCol, `skc-pct ${trendClass(pct)}`, fmtPct(pct));
		    let tailCol;
		    if (ui.holdingsOnly && hasPos) {
		      tailCol = document.createElement("div");
		      tailCol.className = "skc-row-pnl";
		      const amt = appendText(
		        tailCol,
		        `skc-pnl-amt ${trendClass(m?.pnl)}`,
		        privacy ? MASK : m?.pnl != null ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}` : "\u2014"
		      );
		      if (pnlUnknown) {
		        amt.title = m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote");
		      }
		      appendText(
		        tailCol,
		        `skc-pnl-pct ${trendClass(m?.pnl)}`,
		        privacy ? MASK : m?.pnlPct != null ? fmtPct(m.pnlPct) : "\u2014"
		      );
		    } else {
		      tailCol = document.createElement("div");
		      tailCol.className = "skc-row-target";
		      appendTargetBadges(tailCol, q?.target, s.market, q?.quoteTime);
		    }
		    const gripEl = document.createElement("span");
		    gripEl.className = "skc-row-grip";
		    gripEl.append(iconEl(document, "grip"));
		    row.append(nameCol, priceCol, tailCol, gripEl);
		    return row;
		  };
		  const update = (snapshot) => {
		    if (disposed || dragActive) return;
		    const ui = snapshot?.ui ?? {};
		    const business = snapshot?.business ?? { symbols: [] };
		    const quotes = snapshot?.quotes ?? {};
		    const privacy = business.settings?.privacyMode === true;
		    const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
		    const rows = business.symbols.filter((s) => s.market === market).sort(compareBySort);
		    const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;
		    for (const [m, { button, countSpan }] of tabButtons) {
		      const count = business.symbols.filter((s) => s.market === m).length;
		      if (button.firstChild) button.firstChild.nodeValue = t(`market.${m}`);
		      button.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
		      countSpan.textContent = String(count);
		      countSpan.hidden = count === 0;
		    }
		    if (market !== prevMarket && !ui.panelOpen) rowsEl.scrollTop = 0;
		    prevMarket = market;
		    const focusedId = rowsEl.getRootNode?.().activeElement?.dataset?.id ?? null;
		    rowsEl.replaceChildren();
		    if (shown.length === 0) {
		      const empty = document.createElement("div");
		      empty.className = "skc-empty";
		      if (!ui.holdingsOnly) {
		        const iconWrap = document.createElement("span");
		        iconWrap.className = "skc-empty-icon";
		        iconWrap.append(iconEl(document, "plus"));
		        empty.append(iconWrap);
		      }
		      const text = document.createElement("span");
		      text.textContent = t(ui.holdingsOnly ? "list.empty.holdings" : "list.empty.watch");
		      empty.append(text);
		      rowsEl.append(empty);
		      return;
		    }
		    for (const s of shown) rowsEl.append(buildRow(s, ui, quotes, privacy));
		    if (focusedId != null) {
		      [...rowsEl.children].find((node) => node.dataset?.id === focusedId)?.focus({ preventScroll: true });
		    }
		  };
		  const dispose = () => {
		    disposed = true;
		    cancelPending();
		    clearTimeout(flipTimer);
		    for (const { button } of tabButtons.values()) {
		      button.replaceWith(button.cloneNode(true));
		    }
		    rowsEl.replaceChildren();
		    el.remove();
		  };
		  return { el, update, dispose };
		}
		
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
		var SVG_NS2 = "http://www.w3.org/2000/svg";
		var UP = "#e5484d";
		var DOWN = "#2bb596";
		var YELLOW = "#d9a514";
		var MA_COLORS = { 5: "#94a3b8", 10: "#d9a514", 20: "#a78bfa", 60: "#4ade80" };
		var AXIS_TEXT_STYLE = "fill:var(--dsw-alias-label-secondary,rgba(127,127,127,.9))";
		var BASELINE_STYLE = "stroke:var(--dsw-alias-border-l4,rgba(127,127,127,.35))";
		function svgEl(tag, attrs, textContent) {
		  const el = document.createElementNS(SVG_NS2, tag);
		  for (const [k, v] of Object.entries(attrs ?? {})) el.setAttribute(k, String(v));
		  if (textContent != null) el.textContent = textContent;
		  return el;
		}
		function emptyState(key) {
		  const el = document.createElement("div");
		  el.className = "skc-chart-empty";
		  el.textContent = t(key);
		  return el;
		}
		function buildMinuteChart(svgData, opts = {}) {
		  const points = svgData?.points ?? [];
		  const prevClose = svgData?.prevClose ?? null;
		  const { width = 372, height = 190, volHeight = 34, dark = false } = opts;
		  if (!Array.isArray(points) || points.length < 2) {
		    return emptyState("detail.chart.empty.minute");
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
		  void dark;
		  const timeLabel = (ts) => {
		    const d = new Date(ts * 1e3);
		    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		  };
		  const kids = [
		    svgEl("polyline", { points: pricePts, fill: "none", stroke: up ? UP : DOWN, "stroke-width": 1.5 }),
		    svgEl("polyline", { points: avgPts, fill: "none", stroke: YELLOW, "stroke-width": 1 }),
		    svgEl("text", { x: 2, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 11 }, timeLabel(points[0].t)),
		    svgEl("text", { x: width / 2 - 16, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 11 }, timeLabel(points[Math.floor(points.length / 2)].t)),
		    svgEl("text", { x: width - 30, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 11 }, timeLabel(points[points.length - 1].t))
		  ];
		  if (baseY != null) {
		    kids.splice(2, 0, svgEl("line", {
		      x1: pad,
		      y1: baseY,
		      x2: width - pad,
		      y2: baseY,
		      style: BASELINE_STYLE,
		      "stroke-dasharray": "4 3",
		      "stroke-width": 1
		    }));
		  }
		  points.forEach((p, i) => {
		    if ((p.v ?? 0) > 0) {
		      kids.push(svgEl("rect", {
		        x: xOf(i) - 0.5,
		        y: volYOf(p.v),
		        width: 1.4,
		        height: volTop + volHeight - volYOf(p.v),
		        fill: up ? "rgba(229,72,77,.4)" : "rgba(43,181,150,.4)"
		      }));
		    }
		  });
		  const svg = svgEl("svg", { class: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` });
		  svg.append(...kids);
		  return svg;
		}
		function buildCandleChart(klineData, opts = {}) {
		  const candles = klineData ?? [];
		  const { maVisible = {}, width = 372, height = 230, volHeight = 34, dark = false } = opts;
		  if (!Array.isArray(candles) || candles.length === 0) {
		    return emptyState("detail.chart.empty.candle");
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
		    kids.push(svgEl("line", { x1: xOf(i), x2: xOf(i), y1: yOf(c.high), y2: yOf(c.low), stroke: color, "stroke-width": 1 }));
		    kids.push(svgEl("rect", {
		      x: xOf(i) - bodyW / 2,
		      y: yO,
		      width: bodyW,
		      height: Math.max(0.8, yC - yO),
		      fill: up ? "transparent" : color,
		      stroke: color,
		      "stroke-width": 0.8
		    }));
		    if ((c.volume ?? 0) > 0) {
		      const yV = volTop + volHeight - c.volume / maxVol * volHeight;
		      kids.push(svgEl("rect", {
		        x: xOf(i) - bodyW / 2,
		        y: yV,
		        width: bodyW,
		        height: volTop + volHeight - yV,
		        fill: up ? "rgba(229,72,77,.35)" : "rgba(43,181,150,.35)"
		      }));
		    }
		  });
		  for (const [period, data] of Object.entries(mas)) {
		    const pts = data.map((m) => `${xOf(m.index).toFixed(1)},${yOf(m.value).toFixed(1)}`).join(" ");
		    kids.push(svgEl("polyline", { points: pts, fill: "none", stroke: MA_COLORS[period] ?? "#888", "stroke-width": 1 }));
		  }
		  void dark;
		  const labelIdx = [0, Math.floor(candles.length / 2), candles.length - 1];
		  labelIdx.forEach((i, k) => {
		    const text = String(candles[i]?.time ?? "").slice(5);
		    kids.push(svgEl("text", { x: k === 0 ? 2 : k === 1 ? width / 2 - 14 : width - 34, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 11 }, text));
		  });
		  const svg = svgEl("svg", { class: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` });
		  svg.append(...kids);
		  return svg;
		}
		function buildMaLegend(maVisible, onToggle) {
		  const wrap = document.createElement("div");
		  wrap.className = "skc-ma-legend";
		  for (const p of [5, 10, 20, 60]) {
		    const chip = document.createElement("button");
		    chip.type = "button";
		    chip.className = `skc-ma-chip${maVisible?.[p] === false ? " skc-ma-off" : ""}`;
		    chip.textContent = `MA${p}`;
		    if (maVisible?.[p] !== false) chip.style.color = MA_COLORS[p];
		    chip.addEventListener("click", () => onToggle?.(p));
		    wrap.append(chip);
		  }
		  return wrap;
		}
		
		// src/portfolio.mjs
		var finitePositive = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
		function positionMetrics(symbol, price) {
		  const quantity = symbol?.quantity;
		  const avgCost = symbol?.avgCost;
		  const hasPosition = finitePositive(quantity);
		  if (!hasPosition) {
		    return {
		      hasPosition: false,
		      quantity: null,
		      avgCost: null,
		      price: null,
		      cost: null,
		      marketValue: null,
		      pnl: null,
		      pnlPct: null,
		      flags: { zeroCost: false, missingPrice: false }
		    };
		  }
		  const zeroCost = !finitePositive(avgCost);
		  const missingPrice = !finitePositive(price);
		  const cost = zeroCost ? null : quantity * avgCost;
		  const marketValue = missingPrice ? null : quantity * price;
		  let pnl = null;
		  let pnlPct = null;
		  if (!zeroCost && !missingPrice) {
		    pnl = marketValue - cost;
		    pnlPct = cost > 0 ? pnl / cost * 100 : null;
		  }
		  return {
		    hasPosition: true,
		    quantity,
		    avgCost: zeroCost ? null : avgCost,
		    price: missingPrice ? null : price,
		    cost,
		    marketValue,
		    pnl,
		    pnlPct,
		    flags: { zeroCost, missingPrice }
		  };
		}
		
		// client/detail.mjs
		var PERIODS = [
		  { key: "minute", label: () => t("detail.period.minute") },
		  { key: "day", label: () => t("detail.period.day") },
		  { key: "week", label: () => t("detail.period.week") },
		  { key: "month", label: () => t("detail.period.month") }
		];
		var CHART_H = { max: 230, min: 140, fixed: { zh: 494, en: 511 } };
		var chartHeight = (vh) => {
		  const fixed = CHART_H.fixed[getLang()] ?? CHART_H.fixed.zh;
		  return Math.round(Math.min(CHART_H.max, Math.max(CHART_H.min, vh - 24 - fixed)));
		};
		function textSpan(className, text) {
		  const el = document.createElement("span");
		  if (className) el.className = className;
		  el.textContent = text;
		  return el;
		}
		function createDetail({ store, win }) {
		  const winRef = () => win ?? globalThis.window ?? null;
		  const viewportHeight = () => winRef()?.innerHeight ?? 768;
		  let disposed = false;
		  let snapshot = null;
		  let period = "minute";
		  let chart = { key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null, prevClose: null, date: null };
		  let chartKey = "";
		  let loadedKey = "";
		  let form = null;
		  let overlapHint = false;
		  let lastDetailId;
		  let segment = "position";
		  let pending = null;
		  let busy = false;
		  let live = null;
		  const el = document.createElement("div");
		  const symbolOf = () => snapshot?.business?.symbols?.find((s) => s.id === snapshot?.ui?.detailId) ?? null;
		  const baseOf = (symbol) => ({
		    quantity: symbol.quantity != null ? String(symbol.quantity) : "",
		    avgCost: symbol.avgCost != null ? String(symbol.avgCost) : "",
		    buyTarget: symbol.buyTarget != null ? String(symbol.buyTarget) : "",
		    sellTarget: symbol.sellTarget != null ? String(symbol.sellTarget) : ""
		  });
		  const draftOf = (symbol) => form ?? baseOf(symbol);
		  const hasSavedPosition = (symbol) => symbol.quantity != null || symbol.avgCost != null;
		  const hasSavedTargets = (symbol) => symbol.buyTarget != null || symbol.sellTarget != null;
		  const priceOf = (symbol) => {
		    const q = snapshot?.quotes?.[symbol.id];
		    return q?.status === "ok" && Number.isFinite(q.price) && q.price > 0 ? q.price : null;
		  };
		  const privacyOf = () => snapshot?.business?.settings?.privacyMode === true;
		  const numText = (n) => n == null ? "" : String(n);
		  const stateOf = (symbol) => {
		    const d = draftOf(symbol);
		    const base = baseOf(symbol);
		    const qty = parsePositiveInput(d.quantity);
		    const cost = parsePositiveInput(d.avgCost);
		    const buy = parsePositiveInput(d.buyTarget);
		    const sell = parsePositiveInput(d.sellTarget);
		    return {
		      qty,
		      cost,
		      buy,
		      sell,
		      qtyInvalid: qty === void 0,
		      costInvalid: cost === void 0,
		      buyInvalid: buy === void 0,
		      sellInvalid: sell === void 0,
		      hValid: qty !== void 0 && cost !== void 0,
		      tValid: buy !== void 0 && sell !== void 0,
		      hDirty: form !== null && (d.quantity !== base.quantity || d.avgCost !== base.avgCost),
		      tDirty: form !== null && (d.buyTarget !== base.buyTarget || d.sellTarget !== base.sellTarget)
		    };
		  };
		  const pruneForm = () => {
		    const symbol = symbolOf();
		    if (!form || !symbol) {
		      form = null;
		      return;
		    }
		    const base = baseOf(symbol);
		    if (Object.keys(base).every((k) => form[k] === base[k])) form = null;
		  };
		  const loadChart = (symbol) => {
		    const key = `${symbol.id}:${period}`;
		    loadedKey = key;
		    chartKey = key;
		    chart = { ...chart, key, loading: true };
		    const load = period === "minute" ? api.minute(symbol.id) : api.kline(symbol.id, period);
		    load.then((data) => {
		      if (disposed || chartKey !== key) return;
		      chart = {
		        key,
		        loading: false,
		        data: period === "minute" ? data : data.candles,
		        error: data.error ?? null,
		        errorDetail: data.errorDetail ?? null,
		        adjust: data.adjust ?? null,
		        prevClose: data.prevClose ?? null,
		        date: data.date ?? null
		      };
		      render();
		    }).catch((e) => {
		      if (disposed || chartKey !== key) return;
		      chart = { key, loading: false, data: null, error: "fetch-failed", errorDetail: String(e?.message ?? e), adjust: null };
		      render();
		    });
		  };
		  const confirmBox = (message) => {
		    if (typeof window !== "undefined" && typeof window.confirm === "function") {
		      const ok = window.confirm(message);
		      return ok === true;
		    }
		    return true;
		  };
		  const confirmStrip = ({ text, ok, danger, onOk }) => {
		    const box = document.createElement("div");
		    box.className = "skc-confirm";
		    const msg = document.createElement("div");
		    msg.textContent = text;
		    const row = document.createElement("div");
		    row.className = "skc-confirm-actions";
		    const yes = document.createElement("button");
		    yes.type = "button";
		    yes.className = danger ? "skc-btn skc-btn-danger" : "skc-btn skc-btn-primary";
		    yes.textContent = ok;
		    yes.addEventListener("click", onOk);
		    const no = document.createElement("button");
		    no.type = "button";
		    no.className = "skc-btn";
		    no.textContent = t("detail.cancel");
		    no.addEventListener("click", () => {
		      pending = null;
		      render();
		    });
		    row.append(yes, no);
		    box.append(msg, row);
		    return box;
		  };
		  const saveHoldings = async (symbol) => {
		    symbol = symbolOf() ?? symbol;
		    const st = stateOf(symbol);
		    if (busy || st.qtyInvalid || st.costInvalid) {
		      paintLive();
		      return;
		    }
		    if (st.qty === null && st.cost === null && hasSavedPosition(symbol)) {
		      pending = "clear";
		      render();
		      return;
		    }
		    busy = true;
		    paintLive();
		    const result = await store.updateSymbol(symbol.id, { quantity: st.qty, avgCost: st.cost });
		    busy = false;
		    if (disposed) return;
		    if (result.ok) {
		      if (form) form = { ...form, quantity: numText(st.qty), avgCost: numText(st.cost) };
		      pending = null;
		      pruneForm();
		      store.setToast(t("toast.position-saved"));
		      render();
		    } else {
		      paintLive();
		    }
		  };
		  const clearHoldings = async (symbol) => {
		    symbol = symbolOf() ?? symbol;
		    busy = true;
		    paintLive();
		    const result = await store.updateSymbol(symbol.id, { quantity: null, avgCost: null });
		    busy = false;
		    if (disposed) return;
		    if (result.ok) {
		      if (form) form = { ...form, quantity: "", avgCost: "" };
		      pending = null;
		      pruneForm();
		      store.setToast(t("toast.position-cleared"));
		      render();
		    } else {
		      paintLive();
		    }
		  };
		  const saveTargets = async (symbol, { acknowledged = false } = {}) => {
		    symbol = symbolOf() ?? symbol;
		    const st = stateOf(symbol);
		    if (busy || st.buyInvalid || st.sellInvalid) {
		      paintLive();
		      return;
		    }
		    if (st.buy === null && st.sell === null && hasSavedTargets(symbol)) {
		      pending = "clear-targets";
		      render();
		      return;
		    }
		    const relation = checkTargetRelation(st.buy, st.sell);
		    if (relation.overlap && !acknowledged) {
		      pending = "overlap";
		      render();
		      return;
		    }
		    busy = true;
		    paintLive();
		    const result = await store.updateSymbol(symbol.id, { buyTarget: st.buy, sellTarget: st.sell });
		    busy = false;
		    if (disposed) return;
		    if (result.ok) {
		      overlapHint = relation.overlap;
		      if (form) form = { ...form, buyTarget: numText(st.buy), sellTarget: numText(st.sell) };
		      pending = null;
		      pruneForm();
		      store.setToast(t("toast.targets-saved"));
		      render();
		    } else {
		      paintLive();
		    }
		  };
		  const clearTargets = async (symbol) => {
		    symbol = symbolOf() ?? symbol;
		    busy = true;
		    paintLive();
		    const result = await store.updateSymbol(symbol.id, { buyTarget: null, sellTarget: null });
		    busy = false;
		    if (disposed) return;
		    if (result.ok) {
		      overlapHint = false;
		      if (form) form = { ...form, buyTarget: "", sellTarget: "" };
		      pending = null;
		      pruneForm();
		      store.setToast(t("toast.targets-cleared"));
		      render();
		    } else {
		      paintLive();
		    }
		  };
		  const removeSymbol = async (symbol) => {
		    if (!confirmBox(t("detail.confirm.remove", { name: symbol.name }))) return;
		    const result = await store.removeSymbol(symbol.id);
		    if (result.ok) store.backToList();
		  };
		  const setDraft = (field, value) => {
		    const symbol = symbolOf();
		    if (!symbol) return;
		    form = { ...draftOf(symbol), [field]: value };
		    if (pending) {
		      pending = null;
		      if (live?.strip) live.strip.remove();
		      if (live) live.strip = null;
		    }
		    paintLive();
		  };
		  const chartWidth = () => {
		    const inner = el.clientWidth - 14;
		    return inner > 0 ? Math.min(400, Math.max(240, inner)) : 280;
		  };
		  const buildChartBox = (symbol, ui) => {
		    const box = document.createElement("div");
		    box.className = "skc-chartbox";
		    box.style.height = `${chartHeight(viewportHeight())}px`;
		    const chartErrorText = chart.error ? tErr(chart.error, chart.errorDetail) || chart.error : null;
		    if (chart.loading) {
		      const loading = document.createElement("div");
		      loading.className = "skc-chart-loading";
		      const price = document.createElement("div");
		      price.className = "skc-skeleton skc-skeleton-price";
		      const vol = document.createElement("div");
		      vol.className = "skc-skeleton skc-skeleton-vol";
		      const caption = document.createElement("span");
		      caption.className = "skc-skeleton-caption";
		      caption.textContent = t("detail.chart.loading");
		      loading.append(price, vol, caption);
		      box.append(loading);
		    } else if (chartErrorText) {
		      const err = document.createElement("div");
		      err.className = "skc-chart-empty skc-chart-error";
		      err.textContent = t("detail.chart.error", { e: chartErrorText });
		      box.append(err);
		    } else if (period === "minute") {
		      box.append(buildMinuteChart(
		        { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null },
		        { dark: false, width: chartWidth(), height: chartHeight(viewportHeight()) }
		      ));
		    } else {
		      box.append(buildCandleChart(chart.data ?? [], { maVisible: ui.maVisible, dark: false, width: chartWidth(), height: chartHeight(viewportHeight()) }));
		    }
		    return box;
		  };
		  const buildField = ({ field, label, value, placeholder, suffix }) => {
		    const labelEl = document.createElement("label");
		    const head = document.createElement("span");
		    head.className = "skc-field-head";
		    head.append(textSpan("skc-field-name", label));
		    const meta = textSpan("skc-field-meta", "");
		    meta.hidden = true;
		    head.append(meta);
		    labelEl.append(head);
		    const wrap = document.createElement("span");
		    wrap.className = "skc-input-wrap";
		    const input = document.createElement("input");
		    input.className = "skc-input";
		    input.inputMode = "decimal";
		    input.autocomplete = "off";
		    input.placeholder = placeholder;
		    input.value = value;
		    input.dataset.field = field;
		    input.addEventListener("input", () => setDraft(field, input.value));
		    wrap.append(input);
		    if (suffix) wrap.append(textSpan("skc-input-suffix", suffix));
		    labelEl.append(wrap);
		    const helper = document.createElement("span");
		    helper.className = "skc-field-helper";
		    labelEl.append(helper);
		    return { label: labelEl, input, helper, meta };
		  };
		  const holdingsMetaText = (symbol, st, price) => {
		    if (privacyOf()) return `${maskIf(true, "")}${symbol.quoteCurrency}`;
		    if (st.qtyInvalid || st.costInvalid) return "\u2014";
		    if (st.qty === null) return t("detail.holdings.empty");
		    const pm = positionMetrics({ quantity: st.qty, avgCost: st.cost }, price);
		    return t("detail.holdings.meta", {
		      v: pm.marketValue != null ? fmtAmount(pm.marketValue) : "\u2014",
		      ccy: symbol.quoteCurrency,
		      p: pm.pnl != null ? fmtAmount(pm.pnl) : pm.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote"),
		      pct: pm.pnlPct != null ? fmtPct(pm.pnlPct) : "\u2014"
		    });
		  };
		  const paintFieldError = (f, invalid) => {
		    f.input.classList.toggle("skc-input-invalid", invalid);
		    f.input.setAttribute("aria-invalid", String(invalid));
		    f.helper.classList.toggle("skc-field-helper--error", invalid);
		    f.helper.textContent = invalid ? t("detail.err.positive") : "";
		  };
		  const paintTargetField = (f, invalid, value, hint, price) => {
		    f.input.classList.toggle("skc-input-invalid", invalid);
		    f.input.setAttribute("aria-invalid", String(invalid));
		    f.helper.classList.toggle("skc-field-helper--error", invalid);
		    if (invalid) {
		      f.helper.textContent = t("detail.err.positive");
		      f.meta.hidden = true;
		      return;
		    }
		    f.helper.textContent = hint;
		    f.meta.hidden = value == null;
		    f.meta.textContent = value == null ? "" : price == null ? t("detail.no-quote") : t("detail.dist", { p: fmtPct((value / price - 1) * 100) });
		  };
		  const paintDot = (dot, unsaved, data) => {
		    dot.hidden = !(unsaved || data);
		    dot.classList.toggle("skc-seg-dot--unsaved", unsaved);
		  };
		  const paintLive = () => {
		    if (!live || disposed) return;
		    const symbol = symbolOf();
		    if (!symbol) return;
		    const st = stateOf(symbol);
		    const price = priceOf(symbol);
		    const h = live.holdings;
		    if (h) {
		      h.meta.textContent = holdingsMetaText(symbol, st, price);
		      h.unsaved.hidden = !st.hDirty;
		      h.save.disabled = busy || !st.hDirty || !st.hValid;
		      h.clear.disabled = busy;
		      paintFieldError(h.qty, st.qtyInvalid);
		      paintFieldError(h.cost, st.costInvalid);
		    }
		    const g = live.targets;
		    if (g) {
		      g.unsaved.hidden = !st.tDirty;
		      g.save.disabled = busy || !st.tDirty || !st.tValid;
		      g.clear.disabled = busy;
		      paintTargetField(g.buy, st.buyInvalid, st.buy, t("detail.buy-hint"), price);
		      paintTargetField(g.sell, st.sellInvalid, st.sell, t("detail.sell-hint"), price);
		    }
		    paintDot(live.segs.position.dot, st.hDirty, hasSavedPosition(symbol));
		    paintDot(live.segs.targets.dot, st.tDirty, hasSavedTargets(symbol));
		  };
		  const buildHoldingsPanel = (symbol, draft) => {
		    const form2 = document.createElement("form");
		    form2.className = "skc-holdings";
		    form2.noValidate = true;
		    form2.addEventListener("submit", (e) => {
		      e.preventDefault();
		      saveHoldings(symbol);
		    });
		    const meta = textSpan("skc-holdings-meta", "");
		    const grid = document.createElement("div");
		    grid.className = "skc-form-grid";
		    const coins = symbol.market === "crypto";
		    const qty = buildField({
		      field: "quantity",
		      label: t("detail.quantity"),
		      value: draft.quantity,
		      placeholder: t(coins ? "detail.ph.qty.coins" : "detail.ph.qty"),
		      suffix: t(coins ? "detail.unit.coins" : "detail.unit.shares")
		    });
		    const cost = buildField({
		      field: "avgCost",
		      label: t("detail.avg-cost"),
		      value: draft.avgCost,
		      placeholder: t("detail.ph.cost"),
		      suffix: symbol.quoteCurrency
		    });
		    const actions = document.createElement("div");
		    actions.className = "skc-form-actions";
		    const save = document.createElement("button");
		    save.className = "skc-btn skc-btn-primary";
		    save.type = "submit";
		    save.textContent = t("detail.save-position");
		    const clear = document.createElement("button");
		    clear.className = "skc-btn skc-btn-text";
		    clear.type = "button";
		    clear.textContent = t("detail.clear-position");
		    clear.hidden = !hasSavedPosition(symbol);
		    clear.addEventListener("click", () => {
		      pending = "clear";
		      render();
		    });
		    const unsaved = textSpan("skc-unsaved", t("detail.unsaved"));
		    actions.append(save, clear, unsaved);
		    grid.append(qty.label, cost.label, actions);
		    form2.append(meta, grid);
		    let strip = null;
		    if (pending === "clear") {
		      strip = confirmStrip({
		        text: t("detail.confirm.clear"),
		        ok: t("detail.confirm.clear-ok"),
		        danger: true,
		        onOk: () => clearHoldings(symbol)
		      });
		      form2.append(strip);
		    }
		    return { form: form2, strip, live: { meta, qty, cost, save, clear, unsaved } };
		  };
		  const buildTargetsPanel = (symbol, draft) => {
		    const form2 = document.createElement("form");
		    form2.className = "skc-targets";
		    form2.noValidate = true;
		    form2.addEventListener("submit", (e) => {
		      e.preventDefault();
		      saveTargets(symbol);
		    });
		    form2.append(textSpan("skc-hint skc-targets-hint", t("detail.targets.hint")));
		    if (overlapHint) form2.append(textSpan("skc-badge skc-badge-stale", t("detail.overlap")));
		    const grid = document.createElement("div");
		    grid.className = "skc-form-grid";
		    const buy = buildField({
		      field: "buyTarget",
		      label: t("detail.alert.buy"),
		      value: draft.buyTarget,
		      placeholder: t("detail.ph.target"),
		      suffix: symbol.quoteCurrency
		    });
		    const sell = buildField({
		      field: "sellTarget",
		      label: t("detail.alert.sell"),
		      value: draft.sellTarget,
		      placeholder: t("detail.ph.target"),
		      suffix: symbol.quoteCurrency
		    });
		    const actions = document.createElement("div");
		    actions.className = "skc-form-actions";
		    const save = document.createElement("button");
		    save.className = "skc-btn skc-btn-primary";
		    save.type = "submit";
		    save.textContent = t("detail.save-targets");
		    const clear = document.createElement("button");
		    clear.className = "skc-btn skc-btn-text";
		    clear.type = "button";
		    clear.textContent = t("detail.clear-targets");
		    clear.hidden = !hasSavedTargets(symbol);
		    clear.addEventListener("click", () => {
		      pending = "clear-targets";
		      render();
		    });
		    const unsaved = textSpan("skc-unsaved", t("detail.unsaved"));
		    actions.append(save, clear, unsaved);
		    grid.append(buy.label, sell.label, actions);
		    form2.append(grid);
		    let strip = null;
		    if (pending === "clear-targets") {
		      strip = confirmStrip({
		        text: t("detail.confirm.clear-targets"),
		        ok: t("detail.confirm.clear-ok"),
		        danger: true,
		        onOk: () => clearTargets(symbol)
		      });
		      form2.append(strip);
		    } else if (pending === "overlap") {
		      strip = confirmStrip({
		        text: t("detail.confirm.overlap"),
		        ok: t("detail.confirm.overlap-ok"),
		        danger: false,
		        onOk: () => saveTargets(symbol, { acknowledged: true })
		      });
		      form2.append(strip);
		    }
		    return { form: form2, strip, live: { buy, sell, save, clear, unsaved } };
		  };
		  const render = () => {
		    if (disposed) return;
		    const symbol = symbolOf();
		    const ui = snapshot?.ui ?? {};
		    const quotes = snapshot?.quotes ?? {};
		    const active = typeof document !== "undefined" && document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
		    const activeField = active?.dataset?.field ?? null;
		    const activePos = active ? { start: active.selectionStart, end: active.selectionEnd } : null;
		    el.replaceChildren();
		    if (!symbol) {
		      const empty = document.createElement("div");
		      empty.className = "skc-empty";
		      empty.textContent = t("detail.missing");
		      el.append(empty);
		      return;
		    }
		    const q = quotes[symbol.id];
		    const price = q?.status === "ok" ? q.price : null;
		    const pct = q?.changePercent ?? null;
		    const draft = draftOf(symbol);
		    const head = document.createElement("div");
		    head.className = "skc-detail-head";
		    const back = document.createElement("button");
		    back.className = "skc-btn skc-btn-ghost skc-detail-back";
		    back.type = "button";
		    back.append(iconEl(document, "back"), document.createTextNode(t("detail.back")));
		    back.addEventListener("click", () => store.backToList());
		    const titleCol = document.createElement("div");
		    titleCol.className = "skc-detail-titlecol";
		    const title = textSpan("skc-detail-title", symbol.name);
		    title.title = symbol.name;
		    titleCol.append(title, textSpan("skc-detail-meta", `${symbol.code} \xB7 ${t(`market.${symbol.market}`)}${symbol.kind === "etf" ? " \xB7 ETF" : ""} \xB7 ${symbol.quoteCurrency}`));
		    head.append(back, titleCol);
		    const del = document.createElement("button");
		    del.className = "skc-btn skc-detail-delete";
		    del.type = "button";
		    del.append(iconEl(document, "trash", { strokeWidth: 1.4 }), document.createTextNode(t("detail.delete")));
		    del.addEventListener("click", () => removeSymbol(symbol));
		    head.append(del);
		    const quoteLine = document.createElement("div");
		    quoteLine.className = "skc-quote-line";
		    quoteLine.append(textSpan(
		      `skc-quote-price ${trendClass(pct)}`,
		      price != null ? fmtPrice(price) : q ? q.status === "error" ? t("list.quote-failed") : "\u2026" : "\u2014"
		    ));
		    quoteLine.append(textSpan(`skc-quote-pct ${trendClass(pct)}`, fmtPct(pct)));
		    const quoteMeta = document.createElement("span");
		    quoteMeta.className = "skc-quote-meta";
		    const qTime = q?.quoteTime ?? null;
		    const fTime = q?.fetchedAt ?? null;
		    const dataStale = q?.target?.status === "stale" || q?.target?.status === "no-data";
		    const quoteTimeText = q && q.status === "ok" && qTime != null ? fmtClock(qTime) : "\u2014";
		    const fetchTimeText = fTime != null ? fmtClockSec(fTime) : "\u2014";
		    quoteMeta.append(document.createTextNode(t("detail.quote-time", { t: quoteTimeText, f: fetchTimeText })));
		    if (dataStale) {
		      quoteMeta.append(textSpan("skc-badge skc-badge-stale", q?.target?.status === "stale" ? t("detail.stale") : t("detail.no-data")));
		    }
		    quoteLine.append(quoteMeta);
		    const periodTabs = document.createElement("div");
		    periodTabs.className = "skc-period-tabs";
		    for (const p of PERIODS) {
		      const btn = document.createElement("button");
		      btn.type = "button";
		      btn.className = `skc-tab skc-period${p.key === period ? " skc-tab-active" : ""}`;
		      btn.textContent = p.label();
		      btn.addEventListener("click", () => {
		        if (period === p.key) return;
		        period = p.key;
		        const s = symbolOf();
		        render();
		        if (s) loadChart(s);
		      });
		      periodTabs.append(btn);
		    }
		    const periodMeta = document.createElement("div");
		    periodMeta.className = "skc-period-meta";
		    if (period === "minute") {
		      const prevClose = chart.data?.prevClose ?? chart.prevClose ?? null;
		      periodMeta.append(textSpan("skc-meta-note", t("detail.prev-close", { v: prevClose != null ? fmtPrice(prevClose) : "\u2014" })));
		    } else {
		      periodMeta.append(buildMaLegend(ui.maVisible, (p) => store.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false })));
		      if (chart.adjust) {
		        periodMeta.append(textSpan("skc-adjust", chart.adjust === "qfq" ? t("detail.adjust.fwd") : t("detail.adjust.none")));
		      }
		    }
		    const chartBox = buildChartBox(symbol, ui);
		    const segTabs = document.createElement("div");
		    segTabs.className = "skc-seg-tabs";
		    const segs = {};
		    for (const key of ["position", "targets"]) {
		      const btn = document.createElement("button");
		      btn.type = "button";
		      btn.className = `skc-tab skc-seg${segment === key ? " skc-tab-active" : ""}`;
		      btn.setAttribute("aria-pressed", String(segment === key));
		      btn.append(document.createTextNode(t(key === "position" ? "detail.holdings" : "detail.targets")));
		      const dot = textSpan("skc-seg-dot", "");
		      dot.hidden = true;
		      btn.append(dot);
		      btn.addEventListener("click", () => {
		        if (segment === key) return;
		        segment = key;
		        pending = null;
		        render();
		      });
		      segTabs.append(btn);
		      segs[key] = { dot };
		    }
		    const holdingsPart = buildHoldingsPanel(symbol, draft);
		    const targetsPart = buildTargetsPanel(symbol, draft);
		    const stack = document.createElement("div");
		    stack.className = "skc-seg-stack";
		    for (const [part, key] of [[holdingsPart, "position"], [targetsPart, "targets"]]) {
		      const on = segment === key;
		      part.form.classList.toggle("is-off", !on);
		      part.form.toggleAttribute("inert", !on);
		      part.form.setAttribute("aria-hidden", String(!on));
		      stack.append(part.form);
		    }
		    live = {
		      segs,
		      strip: holdingsPart.strip ?? targetsPart.strip,
		      holdings: holdingsPart.live,
		      targets: targetsPart.live
		    };
		    el.append(head, quoteLine, periodTabs, periodMeta, chartBox, segTabs, stack);
		    if (activeField) {
		      const input = el.querySelector(`input[data-field="${activeField}"]`);
		      if (input) {
		        input.focus();
		        if (activePos && typeof input.setSelectionRange === "function") {
		          try {
		            input.setSelectionRange(activePos.start, activePos.end);
		          } catch {
		          }
		        }
		      }
		    }
		    paintLive();
		  };
		  const onWinResize = () => {
		    if (disposed || !snapshot?.ui?.panelOpen || snapshot?.ui?.view !== "detail" || !symbolOf()) return;
		    render();
		  };
		  winRef()?.addEventListener?.("resize", onWinResize);
		  const update = (next) => {
		    if (disposed) return;
		    snapshot = next;
		    const ui = next?.ui ?? {};
		    const symbol = symbolOf();
		    const detailChanged = ui.detailId !== lastDetailId;
		    if (detailChanged) {
		      lastDetailId = ui.detailId;
		      form = null;
		      pending = null;
		      busy = false;
		      overlapHint = false;
		      chartKey = "";
		      chart = { key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null, prevClose: null, date: null };
		    }
		    if (symbol) {
		      const key = `${symbol.id}:${period}`;
		      if (key !== loadedKey) loadChart(symbol);
		    }
		    const active = typeof document !== "undefined" ? document.activeElement : null;
		    if (!detailChanged && active && el.contains(active) && active.dataset?.field) {
		      paintLive();
		      return;
		    }
		    render();
		  };
		  const dispose = () => {
		    disposed = true;
		    winRef()?.removeEventListener?.("resize", onWinResize);
		    el.replaceChildren();
		    el.remove();
		  };
		  return { el, update, dispose };
		}
		
		// client/add.mjs
		var displayCode = (code) => String(code ?? "").replace(/^(sh|sz|bj|hk)/, "");
		var isDuplicate = (result) => result.error?.status === 409 && result.error?.body?.error === "duplicate";
		var errText = (error) => tErr(error?.body?.error) || String(error?.message ?? "") || t("err.api-error");
		var isFinePointer = () => {
		  try {
		    return typeof globalThis.window?.matchMedia === "function" && globalThis.window.matchMedia("(pointer: fine)").matches;
		  } catch {
		    return false;
		  }
		};
		function createAdd({ store }) {
		  let disposed = false;
		  let snapshot = null;
		  let market = null;
		  let query = "";
		  let results = null;
		  let searching = false;
		  let searchError = null;
		  let searchSeq = 0;
		  let directCode = "";
		  let directError = null;
		  let busy = false;
		  let debounceTimer = null;
		  const onClose = () => store.setShowAdd(false);
		  const doSearch = async (text, mkt) => {
		    const needle = String(text ?? "").trim();
		    if (!needle) {
		      searchSeq += 1;
		      results = null;
		      searchError = null;
		      searching = false;
		      render();
		      return;
		    }
		    const seq = ++searchSeq;
		    searching = true;
		    searchError = null;
		    render();
		    try {
		      const data = await api.search(mkt ?? market, needle);
		      if (disposed || seq !== searchSeq) return;
		      results = data.rows ?? [];
		      searchError = data.error ?? null;
		    } catch (e) {
		      if (disposed || seq !== searchSeq) return;
		      results = [];
		      searchError = String(e?.message ?? e);
		    } finally {
		      if (!disposed && seq === searchSeq) {
		        searching = false;
		        render();
		      }
		    }
		  };
		  const onQueryInput = (value) => {
		    query = value;
		    if (debounceTimer) clearTimeout(debounceTimer);
		    debounceTimer = setTimeout(() => {
		      debounceTimer = null;
		      doSearch(query);
		    }, 300);
		  };
		  const addResult = async (row) => {
		    busy = true;
		    render();
		    const result = await store.addSymbol(row.market, row.code, null);
		    busy = false;
		    if (disposed) return;
		    if (result.ok) store.setToast(t("toast.added", { name: row.name }));
		    else if (isDuplicate(result)) store.setToast(t("toast.duplicate"));
		    else if (!result.conflict) store.setToast(t("toast.op-failed", { e: errText(result.error) }));
		    render();
		  };
		  const addDirect = async () => {
		    const code = directCode.trim();
		    if (!code || busy) return;
		    busy = true;
		    directError = null;
		    render();
		    const result = await store.addSymbol(market, code, null);
		    busy = false;
		    if (disposed) return;
		    if (result.ok) {
		      store.setToast(t("toast.added", { name: result.result?.symbol?.name ?? code }));
		      directCode = "";
		      directInput.value = "";
		    } else if (isDuplicate(result)) {
		      directError = t("toast.duplicate");
		    } else if (result.error?.status === 422) {
		      directError = t("add.not-found", { e: tErr(result.error.body?.error) || t("err.invalid-code") });
		    } else if (!result.conflict) {
		      directError = t("toast.op-failed", { e: errText(result.error) });
		    }
		    render();
		  };
		  const el = document.createElement("div");
		  el.className = "skc-dialog skc-dialog--pinned";
		  el.setAttribute("role", "dialog");
		  const head = document.createElement("div");
		  head.className = "skc-dialog-head";
		  const title = document.createElement("span");
		  title.className = "skc-section-title skc-dialog-title";
		  title.textContent = t("add.title");
		  const spacer = document.createElement("span");
		  spacer.className = "skc-spacer";
		  const closeBtn = document.createElement("button");
		  closeBtn.className = "skc-icon-btn";
		  closeBtn.type = "button";
		  closeBtn.append(iconEl(document, "close"));
		  closeBtn.setAttribute("aria-label", t("app.collapse"));
		  closeBtn.addEventListener("click", onClose);
		  head.append(title, spacer, closeBtn);
		  const tabs = document.createElement("div");
		  tabs.className = "skc-tabs";
		  const tabButtons = /* @__PURE__ */ new Map();
		  for (const m of MARKETS) {
		    const tab = document.createElement("button");
		    tab.type = "button";
		    tab.className = "skc-tab";
		    tab.textContent = t(`market.${m}`);
		    tab.addEventListener("click", () => {
		      market = m;
		      if (query.trim()) doSearch(query, m);
		      else render();
		    });
		    tabs.append(tab);
		    tabButtons.set(m, tab);
		  }
		  const queryInput = document.createElement("input");
		  queryInput.className = "skc-input";
		  queryInput.type = "text";
		  queryInput.dataset.field = "query";
		  queryInput.autocomplete = "off";
		  queryInput.spellcheck = false;
		  queryInput.enterKeyHint = "search";
		  queryInput.addEventListener("input", () => onQueryInput(queryInput.value));
		  queryInput.addEventListener("keydown", (e) => {
		    if (e.key === "Enter") doSearch(query);
		    if (e.key === "Escape") onClose();
		  });
		  const statusEl = document.createElement("div");
		  const resultsEl = document.createElement("div");
		  resultsEl.className = "skc-add-results";
		  const scrollRegion = document.createElement("div");
		  scrollRegion.className = "skc-dialog-scroll";
		  scrollRegion.append(statusEl, resultsEl);
		  const direct = document.createElement("div");
		  direct.className = "skc-direct";
		  const directTitle = document.createElement("span");
		  directTitle.className = "skc-section-title";
		  directTitle.textContent = t("add.direct");
		  const directRow = document.createElement("div");
		  directRow.className = "skc-direct-row";
		  const directInput = document.createElement("input");
		  directInput.className = "skc-input";
		  directInput.type = "text";
		  directInput.dataset.field = "direct";
		  directInput.autocomplete = "off";
		  directInput.spellcheck = false;
		  directInput.enterKeyHint = "done";
		  directInput.addEventListener("input", () => {
		    directCode = directInput.value;
		    if (directError) directError = null;
		    paintDirect();
		  });
		  directInput.addEventListener("keydown", (e) => {
		    if (e.key === "Enter") addDirect();
		  });
		  const validateBtn = document.createElement("button");
		  validateBtn.className = "skc-btn skc-btn-primary";
		  validateBtn.type = "button";
		  validateBtn.textContent = t("add.validate");
		  validateBtn.addEventListener("click", addDirect);
		  directRow.append(directInput, validateBtn);
		  const directHint = document.createElement("div");
		  directHint.className = "skc-hint";
		  direct.append(directTitle, directRow, directHint);
		  el.append(head, tabs, queryInput, scrollRegion, direct);
		  const paintDirect = () => {
		    validateBtn.disabled = busy || !directCode.trim();
		    if (directError) {
		      directHint.className = "skc-error";
		      directHint.textContent = directError;
		    } else {
		      directHint.className = "skc-hint";
		      directHint.textContent = t("add.hint");
		    }
		  };
		  const hintEl = (text) => {
		    const node = document.createElement("div");
		    node.className = "skc-hint";
		    node.textContent = text;
		    return node;
		  };
		  const errorEl = (text) => {
		    const node = document.createElement("div");
		    node.className = "skc-error";
		    node.textContent = text;
		    return node;
		  };
		  const guideEl = (text) => {
		    const node = document.createElement("div");
		    node.className = "skc-guide";
		    node.textContent = text;
		    return node;
		  };
		  const resultRow = (row, known) => {
		    const isKnown = known.has(row.id);
		    const btn = document.createElement("button");
		    btn.type = "button";
		    btn.className = "skc-add-row";
		    btn.dataset.id = row.id;
		    btn.disabled = busy || isKnown;
		    btn.addEventListener("click", () => addResult(row));
		    const main = document.createElement("span");
		    main.className = "skc-add-main";
		    const name = document.createElement("span");
		    name.className = "skc-add-name";
		    name.textContent = row.name;
		    const code = document.createElement("span");
		    code.className = "skc-code";
		    code.textContent = displayCode(row.code) + (row.kind === "etf" ? " \xB7 ETF" : "") + (row.market === "crypto" && row.quoteCurrency ? ` \xB7 ${row.quoteCurrency}` : "");
		    main.append(name, code);
		    btn.append(main);
		    if (isKnown) {
		      const badge = document.createElement("span");
		      badge.className = "skc-badge";
		      badge.textContent = t("badge.added");
		      btn.append(badge);
		    } else {
		      const action = document.createElement("span");
		      action.className = "skc-add-action";
		      action.append(iconEl(document, "plus"));
		      btn.append(action);
		    }
		    return btn;
		  };
		  const render = () => {
		    if (disposed) return;
		    const business = snapshot?.business ?? { symbols: [] };
		    if (market === null) {
		      const last = snapshot?.ui?.lastMarket;
		      market = MARKETS.includes(last) ? last : "cn";
		    }
		    const known = new Set(business.symbols.map((s) => s.id));
		    for (const [m, tab] of tabButtons) {
		      if (tab.firstChild) tab.firstChild.nodeValue = t(`market.${m}`);
		      tab.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
		    }
		    el.setAttribute("aria-label", t("add.title"));
		    title.textContent = t("add.title");
		    closeBtn.setAttribute("aria-label", t("app.collapse"));
		    directTitle.textContent = t("add.direct");
		    validateBtn.textContent = t("add.validate");
		    const placeholder = t(`add.search.${market}`);
		    if (queryInput.placeholder !== placeholder) queryInput.placeholder = placeholder;
		    const directPlaceholder = t(`add.direct.${market}`);
		    if (directInput.placeholder !== directPlaceholder) directInput.placeholder = directPlaceholder;
		    paintDirect();
		    statusEl.replaceChildren();
		    if (searching) {
		      statusEl.append(hintEl(t("add.searching")));
		    } else if (searchError) {
		      statusEl.append(errorEl(t("add.search-error", { e: searchError })));
		    } else if (results && results.length === 0) {
		      statusEl.append(guideEl(t("add.no-match", { q: query.trim() })));
		    } else if (!results) {
		      statusEl.append(guideEl(t(`add.guide.${market}`)));
		    }
		    const focusedId = resultsEl.getRootNode?.().activeElement?.dataset?.id ?? null;
		    resultsEl.replaceChildren();
		    if (results && results.length > 0) {
		      for (const row of results) resultsEl.append(resultRow(row, known));
		    }
		    if (focusedId != null) {
		      [...resultsEl.children].find((node) => node.dataset?.id === focusedId && !node.disabled)?.focus({ preventScroll: true });
		    }
		  };
		  const update = (next) => {
		    if (disposed) return;
		    snapshot = next;
		    render();
		  };
		  const onOpen = () => {
		    if (disposed || !isFinePointer()) return;
		    queryInput.focus({ preventScroll: true });
		  };
		  const dispose = () => {
		    disposed = true;
		    if (debounceTimer) {
		      clearTimeout(debounceTimer);
		      debounceTimer = null;
		    }
		    el.replaceChildren();
		    el.remove();
		  };
		  return { el, update, dispose, onOpen };
		}
		
		// client/backup.mjs
		function createBackup({ store }) {
		  let disposed = false;
		  let snapshot = null;
		  let pending = null;
		  let importing = false;
		  let parseError = null;
		  const el = document.createElement("div");
		  el.className = "skc-backup";
		  const fileInput = document.createElement("input");
		  fileInput.type = "file";
		  fileInput.accept = ".json,application/json";
		  fileInput.hidden = true;
		  fileInput.addEventListener("change", () => onFile());
		  const onFile = async () => {
		    const file = fileInput.files?.[0];
		    fileInput.value = "";
		    if (!file) return;
		    parseError = null;
		    let text;
		    try {
		      text = await file.text();
		    } catch (err) {
		      parseError = t("backup.err.read", { e: String(err?.message ?? err) });
		      render();
		      return;
		    }
		    let payload;
		    try {
		      payload = JSON.parse(text);
		    } catch {
		      parseError = t("backup.err.json");
		      render();
		      return;
		    }
		    if (payload?.kind !== "stock-kanban-backup" || payload?.schemaVersion !== 1) {
		      parseError = t("backup.err.kind");
		      render();
		      return;
		    }
		    const count = Array.isArray(payload.symbols) ? payload.symbols.length : 0;
		    pending = { payload, count };
		    render();
		  };
		  const confirmImport = async () => {
		    if (!pending) return;
		    importing = true;
		    render();
		    const result = await store.importBackup(pending.payload);
		    importing = false;
		    if (disposed) return;
		    if (result.ok) {
		      store.setToast(t("backup.done", { n: result.result.imported }));
		      pending = null;
		    } else if (result.error?.status === 422) {
		      store.setToast(t("backup.rejected", { e: tErr(result.error.body?.error) }));
		      pending = null;
		    }
		    render();
		  };
		  const cancelImport = () => {
		    pending = null;
		    render();
		  };
		  const render = () => {
		    if (disposed) return;
		    const business = snapshot?.business ?? { symbols: [] };
		    el.replaceChildren();
		    const actionsGrid = document.createElement("div");
		    actionsGrid.className = "skc-backup-actions";
		    const exportLink = document.createElement("a");
		    exportLink.className = "skc-btn";
		    exportLink.href = api.exportUrl;
		    exportLink.setAttribute("download", "");
		    exportLink.textContent = t("backup.export");
		    const importBtn = document.createElement("button");
		    importBtn.type = "button";
		    importBtn.className = "skc-btn";
		    importBtn.disabled = importing;
		    importBtn.textContent = importing ? t("backup.importing") : t("backup.import");
		    importBtn.addEventListener("click", () => fileInput.click());
		    actionsGrid.append(exportLink, importBtn);
		    const exportHint = document.createElement("div");
		    exportHint.className = "skc-setting-sub";
		    exportHint.textContent = t("backup.export.hint");
		    const importHint = document.createElement("div");
		    importHint.className = "skc-warn-text";
		    importHint.textContent = t("backup.import.hint");
		    el.append(actionsGrid, exportHint, importHint, fileInput);
		    if (parseError) {
		      const err = document.createElement("div");
		      err.className = "skc-error";
		      err.textContent = parseError;
		      el.append(err);
		    }
		    if (pending) {
		      const confirmBox = document.createElement("div");
		      confirmBox.className = "skc-confirm";
		      const line = document.createElement("div");
		      line.textContent = t("backup.confirm", { n: pending.count, m: business.symbols.length });
		      const note = document.createElement("div");
		      note.className = "skc-hint";
		      note.textContent = t("backup.privacy-note");
		      const actions = document.createElement("div");
		      actions.className = "skc-backup-row";
		      const overwrite = document.createElement("button");
		      overwrite.className = "skc-btn skc-btn-danger";
		      overwrite.type = "button";
		      overwrite.disabled = importing;
		      overwrite.textContent = t("backup.overwrite");
		      overwrite.addEventListener("click", confirmImport);
		      const cancel = document.createElement("button");
		      cancel.className = "skc-btn";
		      cancel.type = "button";
		      cancel.disabled = importing;
		      cancel.textContent = t("backup.cancel");
		      cancel.addEventListener("click", cancelImport);
		      actions.append(overwrite, cancel);
		      confirmBox.append(line, note, actions);
		      el.append(confirmBox);
		    }
		  };
		  const update = (next) => {
		    if (disposed) return;
		    snapshot = next;
		    render();
		  };
		  const dispose = () => {
		    disposed = true;
		    el.replaceChildren();
		    el.remove();
		  };
		  return { el, update, dispose };
		}
		
		// client/quota-segment.mjs
		var PROVIDERS = [
		  { key: "glm", label: "G", name: "GLM" },
		  { key: "copilot", label: "C", name: "Copilot" }
		];
		var hasNumber = (provider) => typeof provider?.percent === "number" && Number.isFinite(provider.percent);
		function toneOf(percent) {
		  if (percent > 95) return "danger";
		  if (percent > 80) return "warn";
		  return "normal";
		}
		function quotaSegmentModel({ glm, copilot, outcomePending } = {}) {
		  const inputs = { glm, copilot };
		  const bars = [];
		  const tooltip = [];
		  for (const { key, label, name } of PROVIDERS) {
		    const provider = inputs[key];
		    if (!hasNumber(provider)) continue;
		    bars.push({
		      key,
		      label,
		      percent: provider.percent,
		      tone: toneOf(provider.percent),
		      stale: provider.stale === true
		    });
		    tooltip.push({ label: name, percent: provider.percent });
		  }
		  const dot = outcomePending === true;
		  const segment = bars.length > 0 || dot;
		  return { segment, dot, divider: segment, bars, tooltip };
		}
		
		// client/quota-embed.mjs
		var NS = "dsh-quota-watch";
		var GUEST_SELECTOR = "[data-dsh-quota-watch-float]";
		var OVERVIEW_URL = "api/dsh-quota-watch/overview";
		var REQUIRED_CAPABILITIES = ["hide-pill", "anchored-panel"];
		function glmPercent(provider) {
		  if (provider?.status === "missing" || provider?.status === "error") return void 0;
		  const five = (provider?.plan?.windows ?? []).find((w) => w?.key === "5h");
		  return typeof five?.percent === "number" && Number.isFinite(five.percent) ? five.percent : void 0;
		}
		function copilotPercent(provider) {
		  if (provider?.status === "missing" || provider?.status === "error") return void 0;
		  const quota = provider?.quota;
		  if (quota?.balanceAvailable !== true) return void 0;
		  const remaining = quota.percentRemaining;
		  if (typeof remaining !== "number" || !Number.isFinite(remaining)) return void 0;
		  return 100 - remaining;
		}
		function formatPercent(value) {
		  if (typeof value !== "number" || !Number.isFinite(value)) return "";
		  const clamped = Math.max(0, Math.min(100, value));
		  const rounded = clamped >= 10 ? Math.round(clamped) : Number(clamped.toFixed(1));
		  return `${rounded}%`;
		}
		function buildAnchorRect({ left, top, width, height }) {
		  return { left, top, width, height, right: left + width, bottom: top + height };
		}
		function renderSegment(segEl, model) {
		  const divider = segEl.querySelector(".skc-qseg-divider");
		  const sep = segEl.querySelector(".skc-qsep");
		  const dot = segEl.querySelector(".skc-qdot");
		  segEl.hidden = !model.segment;
		  divider.hidden = !model.divider;
		  dot.hidden = !model.dot;
		  const labels = { glm: "GLM", copilot: "Copilot" };
		  const spans = segEl.querySelectorAll(".skc-qval");
		  model.bars.forEach((b, i) => {
		    const span = spans[i];
		    span.hidden = false;
		    span.dataset.label = labels[b.key] ?? b.key;
		    span.classList.toggle("skc-qwarn", b.tone === "warn");
		    span.classList.toggle("skc-qdanger", b.tone === "danger");
		    span.style.opacity = b.stale ? "0.5" : "";
		    span.textContent = `${labels[b.key] ?? b.key} ${formatPercent(b.percent)}`;
		  });
		  for (let i = model.bars.length; i < spans.length; i += 1) spans[i].hidden = true;
		  sep.hidden = model.bars.length !== 2;
		  segEl.classList.toggle("skc-qpulse", model.bars.some((b) => b.tone === "danger"));
		  return model;
		}
		function createQuotaEmbed({
		  doc,
		  win,
		  storage,
		  target,
		  host,
		  fetchImpl = fetch,
		  probeTimeoutMs = 500,
		  pollMs = 3e4,
		  retryMs = 6e4,
		  heartbeatMs = 5e3,
		  onCapabilityChange,
		  enabled: initialEnabled = true
		  // 挂载期初值（main 传入 ui.quotaMerge）：防同步握手在首次 update 前抢先 engage
		}) {
		  let disposed = false;
		  let guestEl = null;
		  let capable = false;
		  let enabled = initialEnabled !== false;
		  let engaged = false;
		  let probeTimer = null;
		  let heartTimer = null;
		  let pollTimer = null;
		  const el = doc.createElement("div");
		  el.className = "skc-qseg";
		  el.setAttribute("data-seg", "quota");
		  el.setAttribute("data-dsh-stock-kanban-quota", "");
		  el.setAttribute("role", "button");
		  el.tabIndex = 0;
		  el.setAttribute("aria-haspopup", "dialog");
		  el.setAttribute("aria-expanded", "false");
		  el.hidden = true;
		  const divider = doc.createElement("span");
		  divider.className = "skc-qseg-divider";
		  const glmVal = doc.createElement("span");
		  glmVal.className = "skc-qval";
		  glmVal.hidden = true;
		  const sep = doc.createElement("span");
		  sep.className = "skc-qsep";
		  sep.textContent = "\xB7";
		  sep.hidden = true;
		  const copilotVal = doc.createElement("span");
		  copilotVal.className = "skc-qval";
		  copilotVal.hidden = true;
		  const dot = doc.createElement("span");
		  dot.className = "skc-qdot";
		  el.append(divider, glmVal, sep, copilotVal, dot);
		  const dispatch = (type, detail) => {
		    try {
		      win.dispatchEvent(new win.CustomEvent(`${NS}:${type}`, { detail, composed: true, bubbles: true }));
		    } catch {
		    }
		  };
		  const notifyCapability = (v) => {
		    if (typeof onCapabilityChange === "function") {
		      try {
		        onCapabilityChange(v);
		      } catch {
		      }
		    }
		  };
		  const paintOverview = (data) => {
		    const providers = Array.isArray(data?.providers) ? data.providers : [];
		    const glmProv = providers.find((p) => p?.key === "glm");
		    const copilotProv = providers.find((p) => p?.key === "copilot");
		    const model = renderSegment(
		      el,
		      quotaSegmentModel({
		        glm: { percent: glmPercent(glmProv), stale: glmProv?.status === "stale" },
		        copilot: { percent: copilotPercent(copilotProv), stale: copilotProv?.status === "stale" },
		        outcomePending: data?.manualOutcome !== void 0 || data?.manualOutcomeError !== void 0
		        // 待处理派生（与 qw client 同规则）
		      })
		    );
		    el.removeAttribute("title");
		    if (model.bars.some((b) => b.stale)) el.title = t("quota.stale");
		  };
		  const schedulePoll = (delay) => {
		    if (disposed || !engaged) return;
		    if (pollTimer !== null) win.clearTimeout(pollTimer);
		    pollTimer = win.setTimeout(() => {
		      pollTimer = null;
		      pull();
		    }, delay);
		  };
		  const pull = async () => {
		    if (disposed || !engaged) return;
		    try {
		      const res = await fetchImpl(OVERVIEW_URL, { headers: { accept: "application/json" } });
		      if (disposed || !engaged) return;
		      if (res.status === 404) {
		        el.hidden = true;
		        schedulePoll(retryMs);
		        return;
		      }
		      if (!res.ok) throw new Error(`HTTP ${res.status}`);
		      const data = await res.json();
		      if (disposed || !engaged) return;
		      paintOverview(data);
		      schedulePoll(pollMs);
		    } catch {
		      if (!disposed && engaged) {
		        el.title = t("quota.stale");
		        schedulePoll(pollMs);
		      }
		    }
		  };
		  const armHeartbeat = () => {
		    if (heartTimer !== null) win.clearInterval(heartTimer);
		    heartTimer = win.setInterval(() => dispatch("embed-heartbeat", { v: 1 }), heartbeatMs);
		  };
		  const adoptGuestPosition = () => {
		    const guestPos = loadGuestFloatPosition(win.localStorage);
		    if (!guestPos) return;
		    const rect = typeof target?.getBoundingClientRect === "function" ? target.getBoundingClientRect() : { width: 0, height: 0 };
		    const vw = win.innerWidth;
		    const vh = win.innerHeight;
		    const maxX = Math.max(MARGIN, vw - MARGIN - rect.width);
		    const maxY = Math.max(MARGIN, vh - MARGIN - rect.height);
		    const point = {
		      x: Math.min(Math.max(guestPos.x, MARGIN), maxX),
		      y: Math.min(Math.max(guestPos.y, MARGIN), maxY)
		    };
		    host.style.left = `${Math.round(point.x)}px`;
		    host.style.top = `${Math.round(point.y)}px`;
		    try {
		      saveFloatPosition(storage, point);
		    } catch {
		    }
		  };
		  const startEngage = () => {
		    if (engaged || !capable || !enabled || disposed || !guestEl) return;
		    engaged = true;
		    adoptGuestPosition();
		    target.append(el);
		    el.setAttribute("aria-expanded", "false");
		    dispatch("embed-engage", { v: 1 });
		    armHeartbeat();
		    pull();
		  };
		  const stopEngage = (sendDisengage) => {
		    if (heartTimer !== null) {
		      win.clearInterval(heartTimer);
		      heartTimer = null;
		    }
		    if (pollTimer !== null) {
		      win.clearTimeout(pollTimer);
		      pollTimer = null;
		    }
		    el.remove();
		    el.hidden = true;
		    if (!engaged) return;
		    engaged = false;
		    if (sendDisengage) dispatch("embed-disengage", { v: 1 });
		  };
		  const probe = () => {
		    if (disposed) return;
		    dispatch("embed-probe", { v: 1, host: "dsh-stock-kanban" });
		    if (probeTimer !== null) win.clearTimeout(probeTimer);
		    probeTimer = win.setTimeout(() => {
		      probeTimer = null;
		    }, probeTimeoutMs);
		  };
		  const onCapabilities = (ev) => {
		    if (disposed || capable) return;
		    const caps = Array.isArray(ev?.detail?.capabilities) ? ev.detail.capabilities : [];
		    if (!REQUIRED_CAPABILITIES.every((c) => caps.includes(c))) return;
		    capable = true;
		    if (probeTimer !== null) {
		      win.clearTimeout(probeTimer);
		      probeTimer = null;
		    }
		    notifyCapability(true);
		    startEngage();
		  };
		  win.addEventListener(`${NS}:embed-capabilities`, onCapabilities);
		  const syncGuest = () => {
		    const found = doc.querySelector(GUEST_SELECTOR);
		    if (found && found !== guestEl) {
		      guestEl = found;
		      probe();
		    } else if (!found && guestEl !== null) {
		      guestEl = null;
		      capable = false;
		      stopEngage(true);
		      notifyCapability(false);
		    }
		  };
		  const observer = new win.MutationObserver(syncGuest);
		  observer.observe(doc.body, { childList: true });
		  syncGuest();
		  const applyEnabled = (next) => {
		    if (next === enabled) return;
		    enabled = next;
		    if (!next) {
		      stopEngage(true);
		      return;
		    }
		    if (guestEl) {
		      capable = false;
		      probe();
		    }
		  };
		  const update = (snapshot) => {
		    if (disposed) return;
		    applyEnabled(snapshot?.ui?.quotaMerge !== false);
		  };
		  const setEnabled = (next) => {
		    if (disposed) return;
		    applyEnabled(next === true);
		  };
		  const onQuotaTap = () => {
		    if (!engaged) return;
		    let rect = el.getBoundingClientRect();
		    if (!rect || rect.width === 0 || rect.height === 0) rect = host.getBoundingClientRect();
		    const anchor = buildAnchorRect({
		      left: rect.left ?? 0,
		      top: rect.top ?? 0,
		      width: rect.width ?? 0,
		      height: rect.height ?? 0
		    });
		    dispatch("open-panel", { v: 1, anchor });
		  };
		  const dispose = () => {
		    if (disposed) return;
		    disposed = true;
		    observer.disconnect();
		    if (probeTimer !== null) win.clearTimeout(probeTimer);
		    stopEngage(true);
		    win.removeEventListener(`${NS}:embed-capabilities`, onCapabilities);
		    el.remove();
		  };
		  return { el, update, setEnabled, onQuotaTap, dispose };
		}
		
		// client/styles.mjs
		var FLOAT_STYLE_TEXT = `
		:host { position: fixed; z-index: 2147483000; }
		:host {
		  /* ---- \u5C40\u90E8\u8BBE\u8BA1\u4EE4\u724C\uFF08\u6536\u655B DSH alias\uFF0C\u4FBF\u4E8E\u7EDF\u4E00\u8C03\u6027\uFF09 ---- */
		  --skc-surface: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #1f1f1f)); /* \u5C42\u4E8C\u9762\uFF08\u80F6\u56CA/\u9762\u677F\u5730\u677F\uFF09 */
		  --skc-surface-deep: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-base, #1f1f1f)); /* \u5C42\u4E09\u9762\uFF08\u9009\u4E2D\u6BB5/\u5D4C\u5165\u9762\uFF09 */
		  --skc-base: var(--dsw-alias-bg-base, #1f1f1f);
		  --skc-hairline: var(--dsw-alias-border-l2, rgba(128,128,128,.24)); /* \u5E38\u89C4\u7EC6\u7EBF */
		  --skc-hairline-soft: var(--dsw-alias-border-l1, rgba(128,128,128,.14)); /* \u5F31\u5206\u9694\uFF08\u533A\u5757\u5206\u5272\u7EBF\uFF09 */
		  --skc-hairline-strong: var(--dsw-alias-border-l3, rgba(128,128,128,.34)); /* \u8F93\u5165\u6846/hover \u8FB9 */
		  --skc-text: var(--dsw-alias-label-primary, inherit);
		  --skc-text-2: var(--dsw-alias-label-secondary, rgba(128,128,128,.9)); /* \u8F85\u52A9\u8BF4\u660E/\u4EE3\u7801/\u5143\u4FE1\u606F\uFF08\u6B63\u6587\u7EA7\u5BF9\u6BD4\uFF09 */
		  --skc-text-3: var(--dsw-alias-label-tertiary, rgba(128,128,128,.72)); /* \u4EC5\u7528\u4E8E\u5F31\u5316\u7684\u88C5\u9970\u6027\u6B21\u8981\u4FE1\u606F */
		  --skc-cap: var(--dsw-alias-label-caption, rgba(128,128,128,.6)); /* \u88C5\u9970\u7EBF/\u5360\u4F4D\u5E95\u7EB9\u7B49\u975E\u6B63\u6587\u7528\u9014 */
		  --skc-accent: var(--dsw-alias-brand-primary, #5b8def); /* DSH \u5F3A\u8C03\uFF08\u6D45\u8272\u2248\u58A8\u9ED1\u3001\u6DF1\u8272\u2248\u8FD1\u767D\uFF09 */
		  --skc-hover: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12));
		  --skc-pressed: var(--dsw-alias-interactive-bg-active, rgba(128,128,128,.18));
		  --skc-danger: var(--dsw-alias-state-error-primary, #e5484d);
		  --skc-warn: var(--dsw-alias-state-warn-label, #d29922);
		  --skc-up: #e5484d; /* A\u80A1\u60EF\u4F8B\u7EA2\u6DA8 */
		  --skc-down: #2bb596; /* \u7EFF\u8DCC */
		  --skc-shadow-lift: 0 18px 48px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12);
		  --skc-ease: cubic-bezier(.2,.8,.2,1);
		
		  font: inherit; font-size: 13px; line-height: 1.45; color: var(--skc-text);
		}
		:host *, :host *::before, :host *::after { box-sizing: border-box; }
		/* hidden \u5C5E\u6027\u5168\u5C40\u5B88\u536B\uFF1A\u4F5C\u8005 display \u89C4\u5219\uFF08.skc-layer \u7684 flex \u7B49\uFF09\u4F1A\u51FB\u7A7F UA \u7684
		   [hidden]{display:none}\uFF0C\u5BFC\u81F4\u8BE6\u60C5/\u5217\u8868\u53CC\u5C42\u53E0\u6E32\u67D3\uFF082026-11-10 \u5B9E\u62CD\u6293\u83B7\uFF09\u3002
		   !important \u4EC5\u6B64\u4E00\u5904\uFF1A\u53EA\u4F5C\u7528\u4E8E\u5E26 hidden \u5C5E\u6027\u7684\u5143\u7D20\uFF0C\u4E0D\u78B0\u5E38\u6001\u5E03\u5C40\u3002 */
		:host [hidden]{display:none !important}
		/* \u6D4F\u89C8\u5668\u539F\u751F\u9762\u968F\u4E3B\u9898\uFF08craft-floor\uFF1Aselection/caret \u662F\u6700\u4FBF\u5B9C\u7684\u300C\u88AB\u8BBE\u8BA1\u8FC7\u300D\u4FE1\u53F7\uFF09 */
		:host ::selection{background:color-mix(in srgb,var(--skc-accent) 24%,transparent);color:var(--skc-text)}
		.skc-input{caret-color:var(--skc-accent)}
		
		/* \u5408\u5E76\u80F6\u56CA stack\uFF08\u8BA1\u5212 B \u7F1D\uFF1A\u672A\u6765\u7B2C\u4E8C\u679A pill \u76F4\u63A5\u8FFD\u52A0\uFF09 */
		.skc-stack { display:flex; flex-direction:column; gap:6px; }
		.skc-stack{align-items:flex-start} /* \u80F6\u56CA\u6309\u5185\u5BB9\u5168\u5BBD\u6E32\u67D3\uFF0C\u4E0D\u968F\u5BBF\u4E3B\u88AB\u89C6\u53E3\u5269\u4F59\u7A7A\u95F4\u538B\u7A84\uFF082026-11-10 \u6EA2\u51FA\u4FEE\u590D\uFF09 */
		
		/* \u80F6\u56CA\uFF08\u5BF9\u9F50 quota-watch \u89E3\u5256\uFF1A26px pill\u3001\u547D\u4E2D\u533A\u5916\u6269\u3001grab \u5149\u6807\u3001touch-action:none\uFF09 */
		.skc-capsule { display:inline-flex; align-items:center; gap:7px; height:26px; padding:0 10px; border-radius:999px; touch-action:none; cursor:grab; border:1px solid var(--skc-hairline); background:var(--skc-surface); background:color-mix(in srgb,var(--skc-surface) 86%,transparent); -webkit-backdrop-filter:blur(10px) saturate(1.2); backdrop-filter:blur(10px) saturate(1.2); box-shadow:0 1px 2px rgba(0,0,0,.08), 0 4px 14px rgba(0,0,0,.18); color:var(--skc-text); font-size:12px; line-height:24px; user-select:none; white-space:nowrap; position:relative; -webkit-tap-highlight-color:transparent; -webkit-touch-callout:none; }
		.skc-capsule::before { content:""; position:absolute; inset:-9px; }
		.skc-capsule:hover{border-color:var(--skc-hairline-strong);box-shadow:0 1px 2px rgba(0,0,0,.08), 0 6px 18px rgba(0,0,0,.24)}
		.skc-capsule:active{transform:scale(.98)}
		.skc-capsule:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#5b8def);outline-offset:2px}
		.skc-capsule[hidden]{display:none}
		.skc-capsule [hidden]{display:none}
		.skc-capsule--dragging { cursor:grabbing; -webkit-backdrop-filter:none; backdrop-filter:none; background:var(--skc-surface); box-shadow:0 2px 6px rgba(0,0,0,.14), 0 10px 28px rgba(0,0,0,.3); transform:scale(1.04); transition:none; }
		.skc-capsule-name{font-weight:600;max-width:16vw;overflow:hidden;text-overflow:ellipsis}
		.skc-capsule-price{font-weight:600;font-variant-numeric:tabular-nums}
		.skc-capsule-pct{font-weight:500;font-variant-numeric:tabular-nums}
		.skc-capsule-mark{font-weight:500}
		/* B/S \u89E6\u4EF7\u6807\u8BB0\uFF1A\u5B57\u6BCD + \u5FAE\u836F\u4E38\u5E95\uFF08\u547C\u5E94\u5217\u8868\u5FBD\u7AE0\uFF09 */
		.skc-mark-buy,.skc-mark-sell{display:inline-block;min-width:15px;padding:0 4px;text-align:center;border-radius:999px;font-size:11px;line-height:14px;vertical-align:middle}
		.skc-mark-buy{color:var(--skc-up);background:color-mix(in srgb,var(--skc-up) 14%,transparent)}
		.skc-mark-sell{color:var(--skc-down);background:color-mix(in srgb,var(--skc-down) 14%,transparent)}
		.skc-up{color:var(--skc-up)}
		.skc-down{color:var(--skc-down)}
		.skc-flat{color:var(--skc-text-2)}
		
		/* \u9762\u677F\uFF08\u951A\u5B9A\u80F6\u56CA\u5F39\u51FA\uFF1B\u2264480px \u8F6C\u5E95\u90E8 sheet\uFF1B\u5934\u4E0D\u518D\u62D6\u52A8\uFF09
		   \u4E00\u7EA7\u5217\u8868\u5BBD 360px\uFF08\u7B2C\u56DB\u8F6E\uFF09\uFF1B\u4E8C\u7EA7\u89C6\u56FE\uFF08\u8BE6\u60C5/\u6DFB\u52A0/\u8BBE\u7F6E\uFF09\u6309 data-surface \u5C55\u5F00\u5230 420px\uFF08\u7B2C\u4E94\u8F6E\uFF09\uFF0C\u8D85\u51FA\u89C6\u53E3\u65F6\u6536\u7A84\uFF1B\u9AD8\u5EA6\u7531\u5185\u5BB9\u51B3\u5B9A\uFF0C\u5BF9\u8BDD\u6846\u6253\u5F00\u65F6\u53EA\u663E\u793A\u5BF9\u8BDD\u6846\u3002
		   \u6BDB\u73BB\u7483\u914D\u65B9\u5BF9\u9F50 qw .dqw-panel\uFF1Abg-base 86% \u5355\u5C42 + blur(14px) saturate(1.3)\uFF0C
		   \u4E0D\u652F\u6301 backdrop-filter \u65F6\u56DE\u843D\u5B9E\u5E95\u2014\u2014\u771F\u5B9E\u534A\u900F\u660E\u6BDB\u73BB\u7483\uFF082026-11-10 \u4E3B\u4EBA\u8981\u6C42\u590D\u523B\uFF09 */
		.skc-panel { position:fixed; z-index:2147483000; }
		.skc-panel{--skc-panel-w:360px;width:min(var(--skc-panel-w),calc(100vw - 16px));max-height:calc(100dvh - 24px);display:flex;flex-direction:column;border-radius:10px;border:1px solid var(--skc-hairline);background:var(--skc-surface);background:color-mix(in srgb,var(--skc-base) 86%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 8px 24px rgba(0,0,0,.25);color:var(--skc-text);font:inherit;overflow:hidden}
		/* \u4E8C\u7EA7\u89C6\u56FE\uFF08\u8BE6\u60C5 / \u6DFB\u52A0 / \u8BBE\u7F6E\uFF09\uFF1A\u5185\u5BB9\u9700\u8981\u66F4\u5BBD\u7684\u7A7A\u95F4\uFF0C\u5BBD\u5EA6\u52A8\u6001\u5C55\u5F00\u5230 420px\uFF1B\u89C6\u53E3\u66F4\u7A84\u65F6\u4ECD\u7531 100vw-16 \u6536\u7A84\uFF08\u7B2C\u4E94\u8F6E 2026-11-10\uFF09 */
		.skc-panel[data-surface="detail"],.skc-panel[data-surface="dialog"]{--skc-panel-w:420px}
		@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		  .skc-panel{background:var(--skc-surface)}
		}
		.skc-panel[hidden]{display:none}
		.skc-panel--sheet { left:8px; right:8px; top:auto; bottom:calc(8px + env(safe-area-inset-bottom, 0px)); width:auto; max-height:calc(100dvh - 24px); }
		
		/* \u5934\u90E8\uFF1A\u6807\u9898 + \u8BA1\u6570\uFF08\u8F85\u52A9\u8272\uFF09+ \u5173\u95ED\u94AE\uFF0C\u65E0\u5206\u9694\u7EBF\u5355\u884C */
		.skc-header{display:flex;align-items:center;gap:8px;padding:12px 12px 10px}
		.skc-title{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:14px;line-height:20px;letter-spacing:0;color:var(--skc-text);white-space:nowrap}
		.skc-title::before{content:"";width:7px;height:7px;border-radius:999px;background:var(--skc-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--skc-accent) 14%,transparent);transition:background .2s var(--skc-ease), box-shadow .2s var(--skc-ease)}
		.skc-quote-error .skc-title::before{background:var(--skc-danger);box-shadow:0 0 0 3px color-mix(in srgb,var(--skc-danger) 16%,transparent)}
		.skc-header-meta{color:var(--skc-text-2);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;min-width:0}
		.skc-spacer{flex:1}
		.skc-body{position:relative;flex:1 1 auto;min-height:150px;overflow:hidden;display:flex;flex-direction:column}
		.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
		.skc-layer-hidden{display:none}
		
		/* footer\uFF1A\u80F6\u56CA\u663E\u793A\u6807\u7684\uFF08\u5DE6\uFF0C\u5F39\u6027\u5BBD\uFF09+ \u529F\u80FD\u94AE dock\uFF08\u53F3\uFF0C26px \u56FE\u6807\u94AE\uFF09\uFF1B\u5173\u95ED\u94AE\u5DF2\u8FC1 header \u53F3\u4E0A */
		.skc-footer{display:flex;flex-direction:column;gap:6px;padding:8px 12px 10px;border-top:1px solid var(--skc-hairline-soft);color:var(--skc-text-2)}
		.skc-footer-main{display:flex;align-items:center;gap:6px;min-height:28px}
		.skc-hint{color:var(--skc-text-2);font-size:12px;line-height:18px;text-wrap:balance}
		
		/* \u5206\u6BB5 Tab\uFF08DSH \u5206\u6BB5\u63A7\u4EF6\u8BED\u8A00\uFF1A\u5D4C\u5165\u5F0F\u5E95 + \u6D6E\u8D77\u9009\u4E2D\u6BB5\uFF09 */
		.skc-tabs{flex:none;display:flex;gap:2px;margin:0 12px 8px;padding:2px;border-radius:9px;background:var(--skc-hover);overflow-x:auto;scrollbar-width:none}
		.skc-tabs::-webkit-scrollbar{display:none}
		.skc-tab{display:flex;align-items:center;justify-content:center;flex:1 1 0;min-width:0;padding:5px 4px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--skc-text-2);cursor:pointer;font:inherit;font-size:12px;line-height:16px;letter-spacing:0;text-align:center;white-space:nowrap;transition:color .12s var(--skc-ease), background .12s var(--skc-ease), border-color .12s var(--skc-ease)}
		.skc-tab:hover{color:var(--skc-text)}
		.skc-tab:active{transform:scale(.97)}
		.skc-tab-active{background:var(--skc-surface-deep);border-color:var(--skc-hairline);color:var(--skc-text);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
		.skc-tab-count{margin-left:3px;font-size:11px;line-height:16px;font-weight:500;font-variant-numeric:tabular-nums}
		
		/* \u5217\u8868\uFF08\u7EC8\u7AEF\u5BC6\u5EA6\uFF1A\u7D27\u884C\u8DDD + hairline \u5206\u9694 + hover/active \u53CD\u9988\uFF1B\u884C\u5185\u5BB9\u4E0E Tab \u540C\u5217\u5BF9\u9F50\uFF09 */
		.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
		.skc-rows{overflow-y:auto;flex:1;padding:0 4px 6px;scrollbar-width:thin;scrollbar-color:var(--skc-text-3) transparent;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
		.skc-rows::-webkit-scrollbar{width:8px}
		.skc-rows::-webkit-scrollbar-thumb{background:var(--skc-hairline-strong);border-radius:999px;border:2px solid transparent;background-clip:content-box}
		.skc-rows::-webkit-scrollbar-track{background:transparent}
		.skc-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:9px;cursor:pointer;transition:background .1s var(--skc-ease);touch-action:pan-y}
		.skc-row:hover{background:var(--skc-hover)}
		.skc-row:active{background:var(--skc-pressed)}
		/* \u62D6\u62FD\u6392\u5E8F\uFF08shape \u5B9A\u7A3F 2026-11-10\uFF09\uFF1A\u628A\u624B\u60AC\u505C\u6D6E\u73B0 + \u88AB\u62D6\u884C 1:1 \u8DDF\u968F\u6307\u9488\uFF08transform \u76F4\u5199\uFF09+ \u5144\u5F1F\u884C FLIP \u8BA9\u4F4D\uFF08\u5355\u4E00\u52A8\u6548\u65F6\u523B\uFF09 */
		.skc-row-grip{display:inline-flex;flex:none;width:12px;color:var(--skc-text-2);opacity:0;transition:opacity .12s var(--skc-ease);pointer-events:none}
		.skc-row:hover .skc-row-grip,.skc-row:focus-visible .skc-row-grip{opacity:.6}
		.skc-row:active .skc-row-grip{opacity:1}
		.skc-row-dragging{position:relative;z-index:1;background:var(--skc-hover);box-shadow:0 3px 12px rgba(0,0,0,.2);cursor:grabbing;will-change:transform}
		.skc-rows-flipping .skc-row:not(.skc-row-dragging){transition:transform 150ms var(--skc-ease)}
		.skc-row-settle{transition:transform 150ms var(--skc-ease)}
		@media (prefers-reduced-motion: reduce){.skc-row-settle{transition:none}}
		.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0;gap:2px}
		.skc-name-text{font-size:13px;line-height:18px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
		.skc-code{color:var(--skc-text-2);font-size:12px;line-height:16px;letter-spacing:.02em;font-variant-numeric:tabular-nums}
		.skc-pos-dot{color:var(--skc-accent)}
		.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:68px;font-variant-numeric:tabular-nums;gap:2px}
		.skc-row-price > span:first-child{font-size:13px;line-height:18px;font-weight:600}
		.skc-pct{font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
		.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:84px;font-variant-numeric:tabular-nums;gap:2px}
		.skc-pnl-amt,.skc-pnl-pct{font-size:12px;line-height:16px}
		.skc-row-target{display:flex;gap:4px;flex:none;min-width:36px;justify-content:flex-end}
		
		/* \u5FBD\u7AE0\uFF08\u89E6\u4EF7 B/S / \u4F11\u65E7\u65E0\uFF09\uFF1A\u836F\u4E38 + \u540C\u8272 12% \u5E95 */
		.skc-badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;line-height:16px;border:1px solid var(--skc-hairline);color:var(--skc-text-2);white-space:nowrap}
		.skc-badge-buy{color:var(--skc-up);border-color:color-mix(in srgb,var(--skc-up) 38%,transparent);background:color-mix(in srgb,var(--skc-up) 10%,transparent)}
		.skc-badge-sell{color:var(--skc-down);border-color:color-mix(in srgb,var(--skc-down) 38%,transparent);background:color-mix(in srgb,var(--skc-down) 10%,transparent)}
		.skc-badge-stale{color:var(--skc-text-2);border-color:var(--skc-hairline)}
		/* \u7A7A\u6001\uFF08\u6559\u5B66\u5F0F\uFF1A\u56FE\u5F62 + \u6587\u6848\uFF0Coperate.md\u300Cempty states teach\u300D\uFF09 */
		.skc-empty{padding:28px 16px;text-align:center;color:var(--skc-text-2);font-size:12px;line-height:18px;letter-spacing:0;display:flex;flex-direction:column;align-items:center;gap:10px}
		.skc-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;border:1px dashed var(--skc-hairline-strong);color:var(--skc-text-2)}
		
		/* \u56FE\u8868\u52A0\u8F7D\u9AA8\u67B6\uFF08operate.md\uFF1Askeleton \u800C\u975E\u5185\u5BB9\u533A spinner\uFF1Bshimmer \u5728 reduced-motion \u5B88\u536B\u5185\uFF09 */
		.skc-chart-loading{width:100%;height:100%;padding:8px 2px 2px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center}
		.skc-skeleton{width:100%;border-radius:6px;background:linear-gradient(100deg,var(--skc-hover) 40%,color-mix(in srgb,var(--skc-hover) 35%,transparent) 50%,var(--skc-hover) 60%);background-size:220% 100%;background-position:120% 0}
		.skc-skeleton-price{height:86px}
		.skc-skeleton-vol{height:22px;width:58%}
		.skc-skeleton-caption{font-size:12px;line-height:16px;color:var(--skc-text-2)}
		
		/* \u8BE6\u60C5\uFF08\u8986\u76D6\u5217\u8868\u7684\u4E8C\u7EA7\u89C6\u56FE\uFF1B\u4E0E\u5217\u8868\u540C 12px \u69FD\u7EBF\uFF09 */
		.skc-layer-detail{overflow-y:auto;padding:12px 12px 14px;scrollbar-width:thin;scrollbar-color:var(--skc-text-3) transparent}
		/* \u6EDA\u52A8\u63D0\u793A\uFF08\u7B2C 10 \u8F6E\uFF0C2026-11-10\uFF09\uFF1A\u53EF\u6EDA\u533A\u57DF\u5185\u5BB9\u672A\u5230\u5E95\u65F6\uFF0C\u5E95\u90E8 28px \u6E10\u9690\uFF1B\u5230\u5E95\u6216\u65E0\u6EA2\u51FA\u5373\u64A4\u6389\uFF08class \u7531 panel \u7EF4\u62A4\uFF09 */
		.skc-scroll-more{-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent 100%);mask-image:linear-gradient(to bottom,#000 calc(100% - 28px),transparent 100%)}
		/* \u8BE6\u60C5\u5934\u90E8\uFF08\u7B2C\u4E94\u8F6E 2026-11-10\uFF09\uFF1A\u8FD4\u56DE | \u6807\u9898\u533A\uFF08\u540D\u79F0\u5355\u884C\u7701\u7565 + \u4EE3\u7801\u884C\uFF09| \u5220\u9664\uFF1B\u5355\u884C flex \u4E0D\u6362\u884C\uFF0C\u957F\u540D\u79F0\u53EA\u7701\u7565\u6807\u9898\u672C\u8EAB */
		.skc-detail-head{display:flex;align-items:stretch;gap:8px;flex-wrap:nowrap}
		/* \u5934\u90E8\u6309\u94AE\uFF08\u7B2C\u516D\u8F6E 2026-11-10\uFF09\uFF1A\u4E24\u884C\u5B57\u9AD8\u2014\u2014stretch \u6491\u6EE1\u6807\u9898\u533A\uFF08\u540D\u79F0\u884C+\u4EE3\u7801\u884C \u224838px\uFF09\uFF0C
		   \u8FD4\u56DE/\u5220\u9664\u540C\u6784 chip\uFF1A\u540C\u8FB9\u6846\u3001\u540C\u5B57\u53F7\u3001\u540C\u5185\u8DDD\u3001\u540C\u9AD8\uFF0C\u529F\u80FD\u6807\u7B7E\u5E38\u663E\u4E00\u773C\u53EF\u8FA8 */
		.skc-btn.skc-detail-back{flex:none;min-height:0;padding:0 10px;border-color:var(--skc-hairline-strong);color:var(--skc-text-2);font-size:12px;font-weight:500}
		.skc-btn.skc-detail-back:hover{color:var(--skc-text)}
		.skc-detail-titlecol{display:flex;flex-direction:column;gap:2px;flex:1 1 auto;min-width:0;text-align:center} /* \u5C45\u4E2D\uFF1A\u6807\u9898\u5361\u5728\u8FD4\u56DE/\u5220\u9664\u4E24\u94AE\u6B63\u4E2D\uFF08\u4E09\u680F\u5BF9\u79F0\u5934\u90E8\uFF0C\u7B2C 12 \u8F6E 2026-11-10\uFF09 */
		.skc-detail-title{font-weight:700;font-size:15px;line-height:20px;letter-spacing:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.skc-detail-meta{font-size:12px;line-height:16px;color:var(--skc-text-2);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}
		/* \u5220\u9664\uFF1A\u540C\u6784 chip \u4E2D\u6027\u6001\u4E0D\u62A2\u7126\u70B9\uFF1B\u60AC\u505C/\u805A\u7126\u6574\u7EC4\u8F6C\u5371\u9669\u8272\uFF08\u63CF\u8FB9\u540C\u67D3\uFF0C\u7834\u574F\u6027\u610F\u56FE\u66F4\u660E\u786E\uFF09 */
		.skc-btn.skc-detail-delete{flex:none;min-height:0;padding:0 10px;color:var(--skc-text-2);font-size:12px;font-weight:500}
		.skc-btn.skc-detail-delete:hover{color:var(--skc-danger);border-color:color-mix(in srgb,var(--skc-danger) 38%,transparent);background:color-mix(in srgb,var(--skc-danger) 9%,transparent)}
		
		.skc-quote-line{display:flex;align-items:baseline;justify-content:center;gap:10px;margin:10px 0 12px;flex-wrap:wrap} /* \u5C45\u4E2D\uFF1A\u4E0E\u5C45\u4E2D\u6807\u9898\u540C\u8F74\uFF0Chero \u884C\u60C5\u884C\u5BF9\u79F0\uFF08\u7B2C 12 \u8F6E 2026-11-10\uFF09 */
		.skc-quote-price{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:-.01em}
		.skc-quote-pct{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
		.skc-quote-meta{color:var(--skc-text-2);font-size:12px;line-height:16px;display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;font-variant-numeric:tabular-nums}
		/* \u5468\u671F\u5207\u6362\uFF1A\u5206\u6BB5\u8F68\u9053\uFF08\u4E0E\u5217\u8868 Tab \u540C\u65CF\uFF09\uFF0C\u56DB\u6BB5\u7B49\u5BBD\u72EC\u5360\u4E00\u884C\uFF1B\u6309\u94AE\u5185 flex \u5C45\u4E2D\uFF0C\u4E0D\u4F9D\u8D56\u5B57\u4F53\u884C\u9AD8\uFF08\u7B2C\u4E94\u8F6E 2026-11-10\uFF09 */
		.skc-period-tabs{display:flex;gap:2px;padding:2px;border-radius:9px;background:var(--skc-hover);margin-bottom:8px}
		.skc-period{font-size:12px}
		/* K \u7EBF\u6307\u6807\u884C\uFF08MA \u56FE\u4F8B + \u590D\u6743\u6807\u6CE8\uFF09\u53E6\u8D77\u4E00\u884C\uFF1A\u4E0D\u6324\u5360\u5468\u671F\u5206\u6BB5\u7684\u5BBD\u5EA6\uFF0C\u5206\u65F6\u6A21\u5F0F\u4E0B\u9690\u85CF */
		.skc-period-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin:0 0 8px;min-height:20px} /* min-height = MA chip \u9AD8\uFF1A\u56FE\u4F8B\u884C\u56DB\u6863\u5468\u671F\u5E38\u9A7B\u7B49\u9AD8\uFF0C\u5207\u5468\u671F\u5361\u7247\u96F6\u4F4D\u79FB\uFF08\u7B2C 12 \u8F6E 2026-11-10\uFF09 */
		.skc-adjust,.skc-meta-note{color:var(--skc-text-2);font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
		.skc-chartbox{border:1px solid var(--skc-hairline);border-radius:8px;padding:6px;min-height:140px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--skc-surface-deep) 45%,transparent)}
		.skc-chart{display:block;max-width:100%;height:auto}
		.skc-chart-empty{color:var(--skc-text-2);padding:20px;text-align:center;height:100%;display:flex;align-items:center;justify-content:center}
		.skc-chart-error{color:var(--skc-danger)}
		.skc-ma-legend{display:flex;gap:4px;flex-wrap:wrap}
		.skc-ma-chip{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--skc-hairline);background:transparent;border-radius:999px;font-size:11px;line-height:16px;padding:1px 8px;cursor:pointer;color:var(--skc-text-2);font-variant-numeric:tabular-nums}
		.skc-ma-chip:hover{border-color:var(--skc-hairline-strong)}
		.skc-ma-off{opacity:.35}
		/* \u533A\u5757\u6807\u9898\uFF08\u8BE6\u60C5\u7684\u300C\u6301\u4ED3/\u76EE\u6807\u4EF7\u300D\u4E0E\u5BF9\u8BDD\u6846\u7684\u5206\u7EC4\u6807\u9898\u5171\u7528\uFF09\uFF1A\u8F85\u52A9\u8272 + 600\uFF0C\u4E0D\u505A\u5927\u5199 */
		.skc-section-title{font-weight:600;font-size:12px;line-height:16px;letter-spacing:0;color:var(--skc-text-2);margin:14px 0 8px;display:flex;align-items:center;gap:8px}
		.skc-section-meta{color:var(--skc-text-2);font-size:12px;font-weight:500;letter-spacing:0;font-variant-numeric:tabular-nums}
		.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
		.skc-form-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;line-height:16px;color:var(--skc-text-2)}
		/* \u6807\u7B7E\u884C\uFF1A\u540D\u79F0\u5728\u5DE6\uFF0C\u76EE\u6807\u4EF7\u7684\u8DDD\u73B0\u4EF7\u7B49 meta \u5728\u53F3\uFF08\u7B2C\u4E03\u8F6E 2026-11-10\uFF0C\u84DD\u6846\u4F4D\u7F6E\uFF09 */
		.skc-field-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;min-width:0}
		.skc-field-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.skc-field-meta{flex:none;color:var(--skc-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}
		/* \u6301\u4ED3 / \u76EE\u6807\u4EF7\u4E24\u6BB5\u540C\u6302\u4E00\u4E2A\u7F51\u683C\u683C\u5B50\uFF1A\u975E\u5F53\u524D\u6BB5 visibility:hidden \u4ECD\u5360\u4F4D\uFF0C\u9875\u9AD8\u53D6\u8F83\u9AD8\u8005\uFF0C\u5207\u6362\u4E0D\u8DF3\u52A8\uFF08\u7B2C\u4E03\u8F6E\uFF09 */
		.skc-seg-stack{display:grid}
		.skc-seg-stack > form{grid-area:1 / 1;min-width:0}
		.skc-seg-stack > form.is-off{visibility:hidden}
		/* \u5168\u5C40\u515C\u5E95\uFF1Ahidden \u5C5E\u6027\u5FC5\u987B\u771F\u9690\u85CF\uFF08.skc-btn \u7B49\u7C7B\u7684 display \u4F1A\u76D6\u8FC7 UA \u7684 [hidden]\uFF1B\u7B2C\u516D\u8F6E 2026-11-10\uFF09 */
		[hidden]{display:none!important}
		.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
		.skc-unsaved{font-size:12px;line-height:16px;color:var(--skc-warn)}
		.skc-holdings-meta{font-size:12px;line-height:18px;color:var(--skc-text-2);font-variant-numeric:tabular-nums}
		.skc-input-wrap{position:relative;display:flex;align-items:center;min-width:0}
		.skc-input-wrap .skc-input{padding-right:44px}
		.skc-input-suffix{position:absolute;right:10px;color:var(--skc-text-2);font-size:12px;line-height:16px;pointer-events:none}
		.skc-field-helper{display:flex;flex-direction:column;gap:1px;min-height:16px;font-size:12px;line-height:16px;color:var(--skc-text-2)}
		.skc-field-helper--error{color:var(--skc-danger)}
		/* \u8F93\u5165\u6846\uFF0813px \u63A7\u4EF6\u5B57\u53F7\uFF1B\u9AD8 34px \u4E0E\u6309\u94AE\u9F50\u5E73\uFF09 */
		.skc-input{background:transparent;border:1px solid var(--skc-hairline-strong);border-radius:8px;color:var(--skc-text);padding:0 10px;min-height:34px;font:inherit;font-size:13px;line-height:18px;font-variant-numeric:tabular-nums;width:100%;min-width:0;transition:border-color .12s var(--skc-ease), box-shadow .12s var(--skc-ease)}
		.skc-input::placeholder{color:var(--skc-text-2)} /* \u5360\u4F4D\u7B26\u6EE1\u4E0D\u900F\u660E\u8F85\u52A9\u8272\uFF08\u22654.5:1\uFF1B0.85 \u900F\u660E\u5EA6\u4F1A\u843D\u5230 ~4.2:1\uFF09 */
		.skc-input:focus{outline:none;border-color:var(--skc-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--skc-accent) 20%,transparent)}
		.skc-input-invalid,.skc-input-invalid:focus{border-color:var(--skc-danger);box-shadow:0 0 0 1px color-mix(in srgb,var(--skc-danger) 40%,transparent)}
		.skc-select{background:var(--skc-surface-deep);border:1px solid var(--skc-hairline);border-radius:8px;color:var(--skc-text-2);padding:0 8px;height:28px;font:inherit;font-size:12px;min-width:0;max-width:100%;cursor:pointer;transition:border-color .12s var(--skc-ease)}
		.skc-select:hover{border-color:var(--skc-hairline-strong);color:var(--skc-text)}
		.skc-select:focus{outline:none;border-color:var(--skc-accent)}
		
		/* \u6309\u94AE\uFF08\u5BF9\u9F50 qw .dqw-panel-action\uFF1A\u900F\u660E\u5E95 + hairline \u8FB9 + hover \u4EA4\u4E92\u9762\uFF1Bghost / soft-primary / danger\uFF09
		   \u63A7\u4EF6\u5B57\u53F7 13px\uFF0C\u6700\u5C0F\u9AD8 32px\uFF08\u4E0E\u8F93\u5165\u6846 34px \u540C\u65CF\uFF09\uFF1Bghost \u4E0D\u518D\u9760 opacity \u964D\u4EAE\uFF0C\u6587\u5B57\u5373\u5168\u4EAE */
		.skc-btn{background:transparent;border:1px solid var(--skc-hairline-strong);border-radius:8px;color:var(--skc-text);padding:0 12px;min-height:32px;cursor:pointer;font:inherit;font-size:13px;line-height:18px;font-weight:500;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;transition:background .12s var(--skc-ease), border-color .12s var(--skc-ease), color .12s var(--skc-ease)}
		.skc-btn:hover{background:var(--skc-hover)}
		.skc-btn:active{transform:scale(.97)}
		.skc-btn:disabled{opacity:.45;cursor:default;background:transparent;transform:none}
		.skc-btn-primary:disabled{background:color-mix(in srgb,var(--skc-text) 22%,transparent);color:var(--skc-text-2)}
		.skc-btn-danger:disabled{background:color-mix(in srgb,var(--skc-danger) 9%,transparent)}
		.skc-btn-primary{border-color:transparent;background:var(--skc-text);color:var(--skc-base);font-weight:600}
		.skc-btn-primary:hover{background:color-mix(in srgb,var(--skc-text) 88%,transparent)}
		/* \u4E3B\u6309\u94AE\u6539\u4E2D\u6027\u5B9E\u8272\uFF08\u7B2C\u516D\u8F6E 2026-11-10\uFF09\uFF1A\u7EA2\u8272\u53EA\u7559\u7ED9\u6DA8\u8DCC\u4E0E\u544A\u8B66\uFF0C\u4E0D\u518D\u4E0E\u5220\u9664\u3001\u544A\u8B66\u540C\u8272 */
		.skc-btn-danger{border-color:color-mix(in srgb,var(--skc-danger) 40%,transparent);background:color-mix(in srgb,var(--skc-danger) 9%,transparent);color:var(--skc-danger);font-weight:600}
		.skc-btn-danger:hover{background:color-mix(in srgb,var(--skc-danger) 17%,transparent);border-color:var(--skc-danger)}
		.skc-btn-ghost{border-color:transparent}
		.skc-btn-ghost:hover{background:var(--skc-hover)}
		/* \u6587\u5B57\u6309\u94AE\uFF08\u6E05\u9664\u6301\u4ED3\u7B49\u6B21\u8981\u7834\u574F\u6027\u64CD\u4F5C\uFF09\uFF1A\u4E0D\u9760\u8FB9\u6846\u548C\u5E95\u8272\u62A2\u89C6\u89C9\uFF0C\u60AC\u505C\u624D\u4E0B\u5212\u7EBF */
		.skc-btn-text{background:transparent;border-color:transparent;color:var(--skc-text-2);padding:0 6px;min-height:28px;font-weight:500}
		.skc-btn-text:hover{background:transparent;color:var(--skc-text);text-decoration:underline;text-underline-offset:3px}
		.skc-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:transparent;border:none;color:var(--skc-text-2);cursor:pointer;padding:0;border-radius:6px;font-family:inherit;transition:background .12s var(--skc-ease), color .12s var(--skc-ease)}
		.skc-icon-btn:hover{color:var(--skc-text);background:var(--skc-hover)}
		.skc-icon-btn:active{transform:scale(.94)}
		.skc-icon-btn svg{display:block}
		.skc-toggle-on{color:var(--skc-accent)}
		.skc-btn:focus-visible,.skc-icon-btn:focus-visible,.skc-tab:focus-visible,.skc-ma-chip:focus-visible,.skc-add-row:focus-visible{outline:2px solid color-mix(in srgb,var(--skc-accent) 55%,transparent);outline-offset:1px}
		.skc-row:focus-visible{outline:2px solid color-mix(in srgb,var(--skc-accent) 55%,transparent);outline-offset:-1px}
		.skc-error{color:var(--skc-danger);font-size:12px;line-height:18px;margin-top:4px;text-wrap:balance}
		.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:var(--skc-danger);font-size:12px;line-height:18px;z-index:10000;background:var(--skc-base);background:rgb(from var(--skc-base) r g b / 1);border:1px solid color-mix(in srgb,var(--skc-danger) 35%,transparent);border-radius:8px;padding:3px 9px;box-shadow:0 4px 14px rgba(0,0,0,.2)}
		/* \u8BE6\u60C5\u7684\u6301\u4ED3 / \u76EE\u6807\u4EF7\uFF1A\u5206\u6BB5\u4E8C\u9009\u4E00\uFF08\u7B2C\u516D\u8F6E 2026-11-10\uFF0C\u65B9\u6848 B\uFF09\uFF1B\u6BB5\u5185\u5373\u8868\u5355\uFF0C\u4E0D\u518D\u5E26\u5206\u9694\u7EBF\u4E0E\u6807\u9898 */
		.skc-holdings,.skc-targets{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;border:0;min-width:0}
		.skc-targets-hint{margin:0}
		.skc-confirm-actions{display:flex;gap:8px;flex-wrap:wrap}
		.skc-seg-tabs{display:flex;gap:2px;padding:2px;border-radius:9px;background:var(--skc-hover);margin:10px 0 12px}
		.skc-seg-dot{display:inline-block;width:5px;height:5px;margin-left:6px;border-radius:999px;background:var(--skc-text-2);vertical-align:middle}
		.skc-seg-dot--unsaved{background:var(--skc-warn)}
		
		/* \u8BBE\u7F6E\u4F53\uFF08\u65B9\u6848 B \u884C\u5F0F\u8BBE\u7F6E\u5217\u8868\uFF0C2026-11-11 \u4E3B\u4EBA\u62CD\u677F\uFF1B\u7B2C\u4E09\u8F6E\u6536\u7D27\u95F4\u8DDD\u4E0E\u5B57\u53F7\uFF1B\u7B2C\u56DB\u8F6E 2026-11-10\uFF1A
		   \u5408\u5E76\u663E\u793A\u989D\u5EA6\u5F00\u5173\u5DF2\u9690\u85CF\uFF0C\u8BBE\u7F6E\u4EC5\u4F59\u5907\u4EFD\u4E0E\u8BF4\u660E\uFF09\uFF1A\u533A\u5757\u95F4\u7EC6\u5B9E\u7EBF\u5206\u9694 */
		.skc-settings-body{display:flex;flex-direction:column;gap:12px;min-height:0}
		.skc-settings-body > * + *{border-top:1px solid var(--skc-hairline-soft);padding-top:12px}
		.skc-setting-sub{font-size:12px;line-height:18px;color:var(--skc-text-2);margin:4px 0 0;text-wrap:balance}
		.skc-setting-notes{display:flex;flex-direction:column;gap:4px}
		.skc-setting-footnote{font-size:12px;line-height:18px;color:var(--skc-text-2);text-wrap:balance}
		/* \u5F31\u5316\u811A\u6CE8\uFF08\u7B2C 9 \u8F6E\uFF09\uFF1A11px \u8F85\u52A9\u5B57\u53F7\uFF0C\u989C\u8272\u4ECD\u7528 text-2\uFF08tertiary \u5728\u6D45\u8272\u4E3B\u9898\u7EA6 3.7:1\uFF0C\u4E0D\u7528\u4E8E\u8BF4\u660E\u6587\u5B57\uFF09 */
		.skc-setting-footnote--weak{font-size:11px;line-height:16px}
		/* \u9875\u5C3E\u811A\u6CE8\u4E00\u884C\u5236\uFF082026-11-10\uFF09\uFF1A\u884C\u60C5\u8BF4\u660E + \u7248\u672C\u53F7\u540C\u7EBF\uFF0C\xB7 \u5206\u9694\u5F31\u4E00\u6863 */
		.skc-setting-notesep{margin:0 5px;opacity:.5}
		.skc-setting-version{opacity:.65;font-variant-numeric:tabular-nums}
		.skc-backup{display:flex;flex-direction:column;gap:8px}
		.skc-backup-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
		.skc-backup-actions .skc-btn{justify-content:center;width:100%}
		.skc-backup-row{display:flex;gap:8px}
		.skc-confirm{border:1px solid color-mix(in srgb,var(--skc-danger) 36%,transparent);background:color-mix(in srgb,var(--skc-danger) 7%,transparent);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:18px}
		.skc-confirm .skc-hint{font-size:12px;line-height:18px}
		.skc-warn-text{color:var(--skc-warn);font-size:12px;line-height:18px}
		
		/* \u5BF9\u8BDD\u6846\uFF08\u6DFB\u52A0/\u8BBE\u7F6E\uFF09\uFF1A\u6D41\u5185\u5E03\u5C40\u2014\u2014\u6253\u5F00\u65F6\u9762\u677F\u53EA\u663E\u793A\u5BF9\u8BDD\u6846\uFF08\u89C1 .skc-panel--dialog\uFF09\uFF0C\u9AD8\u5EA6\u968F\u5185\u5BB9\u3002
		   \u4E0D\u900F\u660E\u5730\u677F\uFF0812.8/12.21 \u6559\u8BAD\uFF09\uFF1A\u8986\u76D6\u5C42\u76D6\u5728\u81EA\u5BB6\u5217\u8868\u6587\u5B57\u4E0A\uFF0Cqw \u73BB\u7483\u914D\u65B9\uFF0886% \u5355\u5C42\uFF09\u4F1A\u8BA9\u4E0B\u5C42
		   \u6587\u5B57\u900F\u51FA\u3002\u5730\u677F\u53D6 surface \u5168\u5B9E\u5E95\uFF08\u76F8\u5BF9\u989C\u8272\u8BED\u6CD5\u5F3A\u5236 alpha=1\uFF09\uFF0Cblur \u53EA\u505A\u6DF1\u5EA6\u4E0D\u505A\u53EF\u8BFB\u6027\u4F9D\u8D56\u3002 */
		.skc-dialog{position:relative;z-index:5;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:12px;padding:12px;overflow-y:auto;background:color-mix(in srgb,var(--skc-surface) 97%,transparent);background:linear-gradient(var(--skc-surface),var(--skc-surface)),rgb(from var(--skc-base) r g b / 1);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 8%,transparent);scrollbar-width:thin;scrollbar-color:var(--skc-hairline-strong) transparent}
		.skc-dialog[hidden]{display:none}
		.skc-dialog-layer{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
		.skc-panel--dialog > .skc-header,.skc-panel--dialog > .skc-body,.skc-panel--dialog > .skc-footer{display:none}
		.skc-dialog-head{display:flex;align-items:center;gap:8px;min-height:24px}
		.skc-dialog-title{margin:0;font-size:14px;line-height:20px;font-weight:600;color:var(--skc-text)}
		.skc-dialog--pinned{overflow:hidden}
		.skc-dialog--pinned > .skc-tabs{margin:0} /* \u5BF9\u8BDD\u6846\u5185 Tab \u4E0E\u6807\u9898/\u641C\u7D22\u6846\u540C\u7528\u5BF9\u8BDD\u6846\u7684 12px \u5757\u95F4\u8DDD */
		.skc-dialog-scroll{flex:1 1 auto;min-height:112px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin;scrollbar-color:var(--skc-text-3) transparent}
		/* \u7ED3\u679C\u533A\u6559\u5B66\u7A7A\u6001\uFF08\u672A\u641C\u7D22\u65F6\u7ED9\u793A\u4F8B\uFF0C\u6587\u6848\u5373\u5F15\u5BFC\uFF1B\u65E0\u5339\u914D/\u9519\u8BEF\u65F6\u540C\u4E00\u4F4D\u7F6E\u7ED9\u51FA\u6062\u590D\u8DEF\u5F84\uFF09 */
		.skc-guide{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:1 1 auto;padding:16px 12px;text-align:center;color:var(--skc-text-2);font-size:12px;line-height:18px;text-wrap:balance}
		.skc-guide-example{color:var(--skc-text);font-weight:500}
		.skc-add-results{display:flex;flex-direction:column;gap:4px}
		.skc-add-row{display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:1px solid var(--skc-hairline);border-radius:10px;color:var(--skc-text);padding:10px 12px;min-height:48px;cursor:pointer;font:inherit;text-align:left;transition:border-color .12s var(--skc-ease), background .12s var(--skc-ease)}
		.skc-add-row:hover:not(:disabled){border-color:color-mix(in srgb,var(--skc-accent) 45%,transparent);background:var(--skc-hover)}
		.skc-add-row:disabled{opacity:.5;cursor:default}
		.skc-add-main{display:flex;align-items:baseline;gap:8px;flex:1 1 auto;min-width:0}
		.skc-add-name{font-size:13px;line-height:18px;font-weight:600;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.skc-add-row .skc-code{flex:none;font-size:12px}
		.skc-add-action{display:inline-flex;align-items:center;flex:none;color:var(--skc-accent)}
		.skc-direct{flex:none;display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--skc-hairline-soft)}
		.skc-direct-row{display:flex;gap:8px;align-items:center}
		.skc-direct-row .skc-input{flex:1 1 auto;min-width:0}
		.skc-direct-row .skc-btn{flex:none;min-width:64px;min-height:34px}
		.skc-direct .skc-error{margin-top:0}
		.skc-direct > .skc-section-title{margin:0}
		
		/* \u80F6\u56CA\u6807\u7684 picker / toast */
		.skc-capsule-picker{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--skc-text-2);min-width:0;flex:1 1 auto;white-space:nowrap}
		.skc-capsule-picker .skc-select{flex:1 1 auto;min-width:0}
		.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:color-mix(in srgb,var(--skc-base) 90%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);border:1px solid var(--skc-hairline);border-radius:10px;padding:8px 14px;box-shadow:0 8px 24px rgba(0,0,0,.25);pointer-events:none;max-width:80vw;font-size:12px;line-height:18px;color:var(--skc-text)}
		.skc-toast[hidden]{display:none}
		
		/* \u7A84\u5C4F\uFF08\u624B\u673A\uFF09\uFF1A\u5934\u90E8\u8BA1\u6570\u8BA9\u4F4D\u7ED9\u5217\u8868\uFF1B\u8868\u5355\u4E24\u5217\u6539\u5355\u5217 */
		@media (max-width:520px){
		  .skc-header-meta{display:none}
		  .skc-form-grid{grid-template-columns:1fr}
		  .skc-capsule{max-width:none}
		  .skc-capsule-name{max-width:16vw}
		}
		
		/* \u52A8\u6548\u53EA\u5BF9\u5141\u8BB8\u8FD0\u52A8\u7684\u7528\u6237\u751F\u6548\uFF08chrome \u52A8\u6548\uFF1B\u6570\u636E\u884C\u4E0D\u505A\u52A8\u753B\uFF09 */
		@media (prefers-reduced-motion: no-preference) {
		  .skc-capsule { transition: border-color .12s var(--skc-ease), box-shadow .12s var(--skc-ease); }
		  .skc-panel { animation: skc-panel-in .15s var(--skc-ease); }
		  .skc-dialog { animation: skc-dialog-in .15s var(--skc-ease); }
		  .skc-toast { animation: skc-toast-in .16s var(--skc-ease); }
		  .skc-skeleton { animation: skc-shimmer 1.4s ease-in-out infinite; }
		  .skc-qpulse{animation:skc-qpulse 1.6s ease-in-out infinite}
		  @keyframes skc-qpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
		  @keyframes skc-shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
		}
		@keyframes skc-panel-in{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}
		@keyframes skc-dialog-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
		@keyframes skc-toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%)}}
		
		@media print { :host { display:none !important } }
		
		/* \u989D\u5EA6\u5D4C\u5165\uFF08CEP v1 \u5BBF\u4E3B\u4FA7\uFF0CADR 0002\uFF09\uFF1Aquota pill \u7EE7\u627F\u80F6\u56CA\u89E3\u5256\u5E76\u8986\u5199 cursor\uFF1B\u6570\u503C\u6BB5 tabular-nums\uFF1B\u9608\u503C\u8272\u4E0E qw \u540C\u540D\u56DE\u9000\u503C\u4E00\u81F4\uFF1Bpulse \u89C1\u52A8\u6548\u5B88\u536B\u5757 */
		.skc-capsule--quota{cursor:pointer}
		/* \u989D\u5EA6\u6BB5\u6587\u5B57\u89C4\u683C\u5BF9\u9F50 qw \u72EC\u7ACB\u80F6\u56CA\uFF08.dqw-capsule\uFF1A11px/600 + tabular-nums\uFF0C\u7B2C 12 \u8F6E 2026-11-10\u2014\u2014
		   \u539F\u7EE7\u627F sk \u80F6\u56CA 12px/\u5E38\u89C4\u5B57\u91CD\uFF0C\u5408\u5E76\u524D\u540E\u89C2\u611F\u4E0D\u4E00\u81F4\uFF1Bdanger \u7425\u73C0\u4E3A B26 \u62CD\u677F\u89C4\u683C\uFF0C\u4E0D\u968F qw \u7EA2\u8272\uFF09 */
		.skc-qval{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
		.skc-qwarn{color:var(--dsw-alias-label-warning,#d29922)}
		.skc-qdanger{color:var(--dsw-alias-label-warning,#d29922)} /* B26\uFF1A\u989D\u5EA6\u5371\u9669\u6001\u4E3A\u7425\u73C0 */
		.skc-qseg{display:inline-flex;align-items:center;gap:6px}
		.skc-qseg[hidden]{display:none}
		.skc-qsep{opacity:.5} /* \u5206\u9694\u70B9\u5BF9\u9F50 qw .dqw-capsule-sep */
		.skc-qseg-divider{display:inline-block;width:1px;height:14px;background:var(--skc-hairline-strong);border-radius:1px}
		.skc-qdot{display:inline-block;width:6px;height:6px;border-radius:999px;background:var(--skc-warn)}
		.skc-capsule [data-seg="stock"]{display:inline-flex;align-items:center;gap:6px}
		[data-seg="quota"]{cursor:pointer}
		.skc-capsule [data-seg]{flex-shrink:0} /* \u5206\u533A\u4E0D\u53C2\u4E0E flex \u538B\u7F29\uFF1A\u6587\u6848\u5BBD\u5EA6\u6052\u4E3A\u5185\u5BB9\u5BBD\uFF082026-11-10 \u6EA2\u51FA\u4FEE\u590D\uFF09 */
		.skc-capsule{width:max-content} /* \u80F6\u56CA\u6C38\u4E0D\u7A84\u4E8E\u5185\u5BB9\uFF1A\u5BBF\u4E3B shrink-to-fit \u88AB\u89C6\u53E3\u5269\u4F59\u7A7A\u95F4\u94B3\u4F4F\u65F6\uFF0C\u7531 ResizeObserver \u91CD\u94B3\u4F4D\u5DE6\u79FB\uFF082026-11-10 \u6EA2\u51FA\u4FEE\u590D\uFF09 */
		/* \u2264520 \u7684 52vw \u94B3\u5236\u4F1A\u628A\u6587\u6848\u7248\uFF08\u8F83\u5BBD\uFF09\u6324\u51FA\u80F6\u56CA\u80CC\u666F\uFF082026-11-10 \u5B9E\u5F55\uFF1A420 \u89C6\u53E3 seg \u53F3\u7F18\u8D85\u51FA\u80F6\u56CA 4px\uFF09\u2014\u2014
		   \u653E\u5F00\u4E3A\u5185\u5BB9\u5168\u5BBD\uFF0C\u9632\u51FA\u5C4F\u4EA4\u7ED9\u65E2\u6709\u4F4D\u7F6E\u94B3\u4F4D\uFF08ResizeObserver \u91CD\u94B3\u4F4D\uFF09\uFF1B\u2264480 \u53E6\u6709 compact \u9690\u85CF\u540D\u79F0\u964D\u7EA7 */
		@media (prefers-reduced-motion: no-preference) {
		@keyframes skc-panel-slide{from{transform:translateX(12px);opacity:0}to{transform:translateX(0);opacity:1}}
		.skc-panel--slide{animation:skc-panel-slide 150ms ease-out}
		}
		.skc-compact .skc-stock-name{display:none}
		[data-seg="quota"]{position:relative;align-self:stretch}
		[data-seg="quota"]::before{content:"";position:absolute;inset:-10px}
		`;
		
		// client/main.mjs
		var FLOAT_HOST_SELECTOR = "[data-dsh-stock-kanban-float]";
		function mountKanban({ doc, win, storage }) {
		  if (!doc?.body || doc.body.querySelector(FLOAT_HOST_SELECTOR)) {
		    return () => {
		    };
		  }
		  const host = doc.createElement("div");
		  host.setAttribute("data-dsh-stock-kanban-float", "");
		  const shadow = host.attachShadow({ mode: "open" });
		  const style = doc.createElement("style");
		  style.textContent = FLOAT_STYLE_TEXT;
		  shadow.append(style);
		  const stack = doc.createElement("div");
		  stack.className = "skc-stack";
		  shadow.append(stack);
		  const errorGlobal = doc.createElement("div");
		  errorGlobal.className = "skc-error-global";
		  errorGlobal.hidden = true;
		  shadow.append(errorGlobal);
		  doc.body.append(host);
		  const store = createStore(storage);
		  const views = {
		    list: createList({ store }),
		    detail: createDetail({ store, win }),
		    add: createAdd({ store }),
		    backup: createBackup({ store })
		  };
		  const panel = createPanel({ doc, win, store, views });
		  shadow.append(panel.el);
		  let lastStock = null;
		  const capsule = createCapsule({
		    doc,
		    win,
		    storage,
		    shadow,
		    store,
		    onTogglePanel: (segRect, capsuleRect) => {
		      lastStock = { segRect, capsuleRect };
		      store.togglePanel();
		    },
		    onQuotaTap: () => quotaEmbed.onQuotaTap(),
		    // 延迟绑定：quotaEmbed 在 capsule 之后创建
		    onPositionPersisted: (point) => mirrorGuestFloatPosition(storage, point)
		    // 位置继承：拖动落盘镜像写回 qw 键
		  });
		  stack.append(capsule.el);
		  const quotaEmbed = createQuotaEmbed({
		    doc,
		    win,
		    storage,
		    target: capsule.el,
		    host,
		    enabled: store.getState().ui.quotaMerge !== false,
		    onCapabilityChange: (capable) => store.setQuotaCapable(capable)
		  });
		  let wasOpen = false;
		  const renderAll = (snapshot) => {
		    capsule.update(snapshot);
		    quotaEmbed.update(snapshot);
		    panel.update(snapshot);
		    const quoteError = snapshot?.quoteMeta?.error;
		    errorGlobal.textContent = quoteError ? t("app.quote-failed", { e: quoteError }) : "";
		    errorGlobal.hidden = !quoteError;
		    const isOpenNow = snapshot?.ui?.panelOpen === true;
		    if (isOpenNow && !wasOpen) {
		      const capRect = capsule.el.getBoundingClientRect();
		      panel.openFrom(lastStock?.segRect ?? capRect, lastStock?.capsuleRect ?? capRect);
		      lastStock = null;
		    }
		    if (!isOpenNow) lastStock = null;
		    wasOpen = isOpenNow;
		  };
		  const unsubscribe = store.subscribe(renderAll);
		  store.refreshState().then(() => store.restartPolling()).catch((e) => store.setToast(t("toast.init-failed", { e: String(e?.message ?? e) })));
		  const onVisibility = () => store.handleVisibility();
		  doc.addEventListener("visibilitychange", onVisibility);
		  const onLangChange = () => {
		    setLang(resolveLang(win.navigator?.language, doc));
		    renderAll(store.getState());
		  };
		  const langObserver = new win.MutationObserver(onLangChange);
		  langObserver.observe(doc.documentElement, { attributeFilter: ["lang"] });
		  win.addEventListener("languagechange", onLangChange);
		  return () => {
		    unsubscribe();
		    store.dispose();
		    capsule.dispose();
		    quotaEmbed.dispose();
		    panel.dispose();
		    for (const view of Object.values(views)) view.dispose();
		    doc.removeEventListener("visibilitychange", onVisibility);
		    langObserver.disconnect();
		    win.removeEventListener("languagechange", onLangChange);
		    host.remove();
		  };
		}
		var inject = [];
		function apply(ctx) {
		  const doc = globalThis.document;
		  const win = globalThis.window;
		  const storage = globalThis.localStorage;
		  const mount = () => mountKanban({ doc, win, storage });
		  if (ctx && typeof ctx.effect === "function") {
		    return ctx.effect(mount, "dsh-stock-kanban: float shell");
		  }
		  return mount();
		}
		
		return module.exports;
	}
});
