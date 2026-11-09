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
		  "detail.buy-target": "\u4E70\u5165\u76EE\u6807\u4EF7\uFF08\u2264 \u89E6\u53D1 B\uFF0C{ccy}\uFF09",
		  "detail.sell-target": "\u5356\u51FA\u76EE\u6807\u4EF7\uFF08\u2265 \u89E6\u53D1 S\uFF0C{ccy}\uFF09",
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
		  "quota.merge": "\u5408\u5E76\u663E\u793A quota",
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
		  "detail.buy-target": "Buy target (\u2264 fires B, {ccy})",
		  "detail.sell-target": "Sell target (\u2265 fires S, {ccy})",
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
		  "quota.merge": "Merge quota display",
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
		
		// client/store.mjs
		var UI_KEY = "stock-kanban:ui:v1";
		var UI_PERSIST_KEYS = ["lastMarket", "holdingsOnly", "maVisible", "capsuleSymbolId", "quotaMerge"];
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
		  // 持久：合并显示 quota（默认开；仅能力在线时生效）
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
		function attachFloatDrag({ el, host, doc, win, storage, onTap, readInsets: readInsetsArg }) {
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
		function createCapsule({ doc, win, storage, shadow, store, onTogglePanel, onQuotaTap }) {
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
		    const rect = host.getBoundingClientRect();
		    return rect.width > 0 ? { width: rect.width, height: rect.height } : FALLBACK_SIZE;
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
		  const dragCtl = attachFloatDrag({ el, host, doc, win, storage, onTap: routeTap, readInsets });
		  const onKeyDown = (event) => {
		    if (event.key === "Enter" || event.key === " ") {
		      event.preventDefault();
		      toggle(stockRect());
		    }
		  };
		  const syncCompact = () => el.classList.toggle("skc-compact", viewportOf().width <= 480);
		  const onResize = () => {
		    syncCompact();
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
		  el.addEventListener("keydown", onKeyDown);
		  win.addEventListener("resize", onResize);
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
		    safeAreaProbe.remove();
		    el.remove();
		  };
		  return { el, update, dispose };
		}
		
		// client/panel.mjs
		var ZERO_INSETS3 = { left: 0, right: 0, top: 0, bottom: 0 };
		var WIDTH_FALLBACK = 400;
		var HEIGHT_FALLBACK = 160;
		var clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
		function createPanel({ doc, win, store, views }) {
		  let disposed = false;
		  let open = false;
		  let segRect = null;
		  let capsuleRect = null;
		  let safeProbe = null;
		  let snapshot = null;
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
		      return;
		    }
		    el.classList.remove("skc-panel--sheet");
		    const insets = readInsets();
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
		  const onResize = () => placePanel();
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
		  header.append(title, headerMeta);
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
		  const pickerLabel = doc.createElement("label");
		  pickerLabel.className = "skc-capsule-picker";
		  pickerLabel.append(doc.createTextNode(t("picker.label")));
		  const pickerSelect = doc.createElement("select");
		  pickerSelect.className = "skc-select";
		  pickerSelect.addEventListener("change", () => store.setCapsuleSymbol(pickerSelect.value));
		  pickerLabel.append(pickerSelect);
		  const footerActions = doc.createElement("span");
		  footerActions.className = "skc-spacer";
		  const makeFooterButton = (action, label, titleText, onClick) => {
		    const btn = doc.createElement("button");
		    btn.type = "button";
		    btn.className = "skc-icon-btn";
		    btn.dataset.action = action;
		    btn.textContent = label;
		    btn.title = titleText;
		    btn.addEventListener("click", onClick);
		    return btn;
		  };
		  const privacyBtn = makeFooterButton("privacy", "\u{1F441}", "", () => {
		    const next = !(snapshot?.business?.settings?.privacyMode === true);
		    store.setPrivacy(next);
		  });
		  const addBtn = makeFooterButton("add", "\uFF0B", t("add.title"), () => store.setShowAdd(true));
		  const settingsBtn = makeFooterButton("settings", "\u2699", t("app.settings"), () => store.setShowSettings(true));
		  const refreshBtn = makeFooterButton("refresh", "\u27F3", t("list.refresh"), () => store.pollQuotes());
		  const quotaMergeBtn = makeFooterButton("quota-merge", "\u229E", t("quota.merge"), () => {
		    const on = snapshot?.ui?.quotaMerge !== false;
		    store.setQuotaMerge(!on);
		  });
		  const closeBtn = makeFooterButton("close", "\u2715", t("app.collapse"), () => close());
		  const footerHint = doc.createElement("span");
		  footerHint.className = "skc-hint";
		  footer.append(pickerLabel, footerActions, privacyBtn, addBtn, settingsBtn, refreshBtn, closeBtn, footerHint);
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
		  settingsTitle.className = "skc-section-title";
		  settingsTitle.textContent = t("app.settings");
		  const settingsSpacer = doc.createElement("span");
		  settingsSpacer.className = "skc-spacer";
		  const settingsClose = doc.createElement("button");
		  settingsClose.className = "skc-icon-btn";
		  settingsClose.type = "button";
		  settingsClose.textContent = "\u2715";
		  settingsClose.addEventListener("click", () => store.setShowSettings(false));
		  settingsHead.append(settingsTitle, settingsSpacer, settingsClose);
		  settingsLayer.append(settingsHead, views.backup.el);
		  const toast = doc.createElement("div");
		  toast.className = "skc-toast";
		  toast.hidden = true;
		  el.append(header, body, footer, addLayer, settingsLayer, toast);
		  const render = () => {
		    if (disposed) return;
		    const ui = snapshot?.ui ?? {};
		    const business = snapshot?.business ?? { symbols: [], settings: {} };
		    const quoteMeta = snapshot?.quoteMeta ?? {};
		    el.hidden = !open;
		    el.classList.toggle("skc-panel--slide", open);
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
		      for (const s of symbols) {
		        const opt = doc.createElement("option");
		        opt.value = s.id;
		        opt.textContent = `${s.name} \xB7 ${t("market." + s.market)}`;
		        pickerSelect.append(opt);
		      }
		    }
		    pickerSelect.value = symbols.some((s) => s.id === current) ? current : "";
		    const privacy = business.settings?.privacyMode === true;
		    privacyBtn.textContent = privacy ? "\u{1F648}" : "\u{1F441}";
		    privacyBtn.title = privacy ? t("privacy.on") : t("privacy.off");
		    privacyBtn.classList.toggle("skc-privacy-on", privacy);
		    footerHint.textContent = t("app.footer", { privacy: privacy ? t("app.footer.privacy") : "" });
		    if (ui.quotaCapable === true) {
		      const quotaOn = ui.quotaMerge !== false;
		      quotaMergeBtn.textContent = quotaOn ? "\u229E" : "\u229F";
		      quotaMergeBtn.title = quotaOn ? t("quota.merge.on") : t("quota.merge.off");
		      quotaMergeBtn.setAttribute("aria-label", t("quota.merge"));
		      quotaMergeBtn.setAttribute("aria-pressed", quotaOn ? "true" : "false");
		      quotaMergeBtn.classList.toggle("skc-quota-merge-on", quotaOn);
		      if (quotaMergeBtn.parentNode !== footer) footer.insertBefore(quotaMergeBtn, closeBtn);
		    } else {
		      quotaMergeBtn.remove();
		    }
		    addLayer.hidden = !ui.showAdd;
		    settingsLayer.hidden = !ui.showSettings;
		    toast.hidden = !snapshot?.toast;
		    if (snapshot?.toast) toast.textContent = snapshot.toast.text;
		    if (open) placePanel();
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
		
		// src/identity.mjs
		var MARKETS = ["cn", "hk", "us", "crypto"];
		function checkTargetRelation(buyTarget, sellTarget) {
		  if (buyTarget != null && sellTarget != null && buyTarget >= sellTarget) {
		    return { ok: true, overlap: true };
		  }
		  return { ok: true, overlap: false };
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
		  const filterEl = document.createElement("div");
		  filterEl.className = "skc-filterbar";
		  const filterLabel = document.createElement("label");
		  filterLabel.className = "skc-filter";
		  const holdingsCheckbox = document.createElement("input");
		  holdingsCheckbox.type = "checkbox";
		  holdingsCheckbox.addEventListener("change", () => {
		    store.setHoldingsOnly(holdingsCheckbox.checked);
		  });
		  filterLabel.append(holdingsCheckbox, document.createTextNode(t("list.holdings-only")));
		  const spacer = document.createElement("span");
		  spacer.className = "skc-spacer";
		  const refreshButton = document.createElement("button");
		  refreshButton.className = "skc-btn skc-btn-ghost";
		  refreshButton.type = "button";
		  refreshButton.textContent = t("list.refresh");
		  refreshButton.addEventListener("click", () => store.pollQuotes());
		  filterEl.append(filterLabel, spacer, refreshButton);
		  const rowsEl = document.createElement("div");
		  rowsEl.className = "skc-rows";
		  el.append(tabsEl, filterEl, rowsEl);
		  const buildRow = (s, ui, quotes, privacy) => {
		    const q = quotes[s.id];
		    const price = q?.status === "ok" ? q.price : null;
		    const pct = q?.changePercent ?? null;
		    const hasPos = s.quantity != null && s.quantity > 0;
		    const m = q?.metrics;
		    const pnlUnknown = privacy ? null : m && (m.flags.zeroCost || m.flags.missingPrice) ? "masked-flag" : null;
		    const row = document.createElement("div");
		    row.className = "skc-row";
		    row.addEventListener("click", () => store.openDetail(s.id));
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
		    row.append(nameCol, priceCol, tailCol);
		    return row;
		  };
		  const update = (snapshot) => {
		    if (disposed) return;
		    const ui = snapshot?.ui ?? {};
		    const business = snapshot?.business ?? { symbols: [] };
		    const quotes = snapshot?.quotes ?? {};
		    const privacy = business.settings?.privacyMode === true;
		    const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
		    const rows = business.symbols.filter((s) => s.market === market);
		    const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;
		    for (const [m, { button, countSpan }] of tabButtons) {
		      const count = business.symbols.filter((s) => s.market === m).length;
		      button.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
		      countSpan.textContent = String(count);
		      countSpan.hidden = count === 0;
		    }
		    holdingsCheckbox.checked = ui.holdingsOnly === true;
		    if (market !== prevMarket && !ui.panelOpen) rowsEl.scrollTop = 0;
		    prevMarket = market;
		    rowsEl.replaceChildren();
		    if (shown.length === 0) {
		      const empty = document.createElement("div");
		      empty.className = "skc-empty";
		      empty.textContent = t(ui.holdingsOnly ? "list.empty.holdings" : "list.empty.watch");
		      rowsEl.append(empty);
		      return;
		    }
		    for (const s of shown) rowsEl.append(buildRow(s, ui, quotes, privacy));
		  };
		  const dispose = () => {
		    disposed = true;
		    for (const { button } of tabButtons.values()) {
		      button.replaceWith(button.cloneNode(true));
		    }
		    holdingsCheckbox.replaceWith(holdingsCheckbox.cloneNode(true));
		    refreshButton.replaceWith(refreshButton.cloneNode(true));
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
		var SVG_NS = "http://www.w3.org/2000/svg";
		var UP = "#e5484d";
		var DOWN = "#2bb596";
		var YELLOW = "#d9a514";
		var MA_COLORS = { 5: "#e8e8e8", 10: "#d9a514", 20: "#a78bfa", 60: "#4ade80" };
		function svgEl(tag, attrs, textContent) {
		  const el = document.createElementNS(SVG_NS, tag);
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
		  const axisText = dark ? "rgba(255,255,255,.45)" : "rgba(15,23,42,.5)";
		  const timeLabel = (ts) => {
		    const d = new Date(ts * 1e3);
		    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
		  };
		  const kids = [
		    svgEl("polyline", { points: pricePts, fill: "none", stroke: up ? UP : DOWN, "stroke-width": 1.5 }),
		    svgEl("polyline", { points: avgPts, fill: "none", stroke: YELLOW, "stroke-width": 1 }),
		    svgEl("text", { x: 2, y: height - 2, fill: axisText, "font-size": 9 }, timeLabel(points[0].t)),
		    svgEl("text", { x: width / 2 - 16, y: height - 2, fill: axisText, "font-size": 9 }, timeLabel(points[Math.floor(points.length / 2)].t)),
		    svgEl("text", { x: width - 30, y: height - 2, fill: axisText, "font-size": 9 }, timeLabel(points[points.length - 1].t))
		  ];
		  if (baseY != null) {
		    kids.splice(2, 0, svgEl("line", {
		      x1: pad,
		      y1: baseY,
		      x2: width - pad,
		      y2: baseY,
		      stroke: dark ? "rgba(255,255,255,.4)" : "rgba(15,23,42,.35)",
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
		  const axisText = dark ? "rgba(255,255,255,.45)" : "rgba(15,23,42,.5)";
		  const labelIdx = [0, Math.floor(candles.length / 2), candles.length - 1];
		  labelIdx.forEach((i, k) => {
		    const text = String(candles[i]?.time ?? "").slice(5);
		    kids.push(svgEl("text", { x: k === 0 ? 2 : k === 1 ? width / 2 - 14 : width - 34, y: height - 2, fill: axisText, "font-size": 9 }, text));
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
		
		// client/detail.mjs
		var PERIODS = [
		  { key: "minute", label: () => t("detail.period.minute") },
		  { key: "day", label: () => t("detail.period.day") },
		  { key: "week", label: () => t("detail.period.week") },
		  { key: "month", label: () => t("detail.period.month") }
		];
		function textSpan(className, text) {
		  const el = document.createElement("span");
		  if (className) el.className = className;
		  el.textContent = text;
		  return el;
		}
		function createDetail({ store }) {
		  let disposed = false;
		  let snapshot = null;
		  let period = "minute";
		  let chart = { key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null, prevClose: null, date: null };
		  let chartKey = "";
		  let loadedKey = "";
		  let form = null;
		  let overlapHint = false;
		  let lastDetailId;
		  const el = document.createElement("div");
		  const symbolOf = () => snapshot?.business?.symbols?.find((s) => s.id === snapshot?.ui?.detailId) ?? null;
		  const draftOf = (symbol) => form ?? {
		    quantity: symbol.quantity != null ? String(symbol.quantity) : "",
		    avgCost: symbol.avgCost != null ? String(symbol.avgCost) : "",
		    buyTarget: symbol.buyTarget != null ? String(symbol.buyTarget) : "",
		    sellTarget: symbol.sellTarget != null ? String(symbol.sellTarget) : ""
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
		  const saveHoldings = async (symbol) => {
		    const draft = draftOf(symbol);
		    const quantity = parsePositiveInput(draft.quantity);
		    const avgCost = parsePositiveInput(draft.avgCost);
		    if (quantity === void 0 || avgCost === void 0) {
		      store.setToast(t("detail.err.numbers"));
		      return;
		    }
		    const result = await store.updateSymbol(symbol.id, { quantity, avgCost });
		    if (result.ok) {
		      form = null;
		      store.setToast(t("toast.position-saved"));
		      render();
		    }
		  };
		  const clearHoldings = async (symbol) => {
		    const result = await store.updateSymbol(symbol.id, { quantity: null, avgCost: null });
		    if (result.ok) {
		      form = null;
		      store.setToast(t("toast.position-cleared"));
		      render();
		    }
		  };
		  const saveTargets = async (symbol) => {
		    const draft = draftOf(symbol);
		    const buyTarget = parsePositiveInput(draft.buyTarget);
		    const sellTarget = parsePositiveInput(draft.sellTarget);
		    if (buyTarget === void 0 || sellTarget === void 0) {
		      store.setToast(t("detail.err.targets"));
		      return;
		    }
		    const relation = checkTargetRelation(buyTarget, sellTarget);
		    if (relation.overlap && !confirmBox(t("detail.confirm.overlap"))) return;
		    overlapHint = relation.overlap;
		    const result = await store.updateSymbol(symbol.id, { buyTarget, sellTarget });
		    if (result.ok) {
		      form = null;
		      store.setToast(t("toast.targets-saved"));
		      render();
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
		  };
		  const buildChartBox = (symbol, ui) => {
		    const box = document.createElement("div");
		    box.className = "skc-chartbox";
		    const chartErrorText = chart.error ? tErr(chart.error, chart.errorDetail) || chart.error : null;
		    if (chart.loading) {
		      const loading = document.createElement("div");
		      loading.className = "skc-chart-empty";
		      loading.textContent = t("detail.chart.loading");
		      box.append(loading);
		    } else if (chartErrorText) {
		      const err = document.createElement("div");
		      err.className = "skc-chart-empty skc-chart-error";
		      err.textContent = t("detail.chart.error", { e: chartErrorText });
		      box.append(err);
		    } else if (period === "minute") {
		      box.append(buildMinuteChart(
		        { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null },
		        { dark: false }
		      ));
		    } else {
		      box.append(buildCandleChart(chart.data ?? [], { maVisible: ui.maVisible, dark: false }));
		    }
		    return box;
		  };
		  const buildFormInput = (field, value, placeholder) => {
		    const input = document.createElement("input");
		    input.className = "skc-input";
		    input.inputMode = "decimal";
		    input.placeholder = placeholder;
		    input.value = value;
		    input.dataset.field = field;
		    input.addEventListener("input", () => setDraft(field, input.value));
		    return input;
		  };
		  const render = () => {
		    if (disposed) return;
		    const symbol = symbolOf();
		    const ui = snapshot?.ui ?? {};
		    const quotes = snapshot?.quotes ?? {};
		    const privacy = snapshot?.business?.settings?.privacyMode === true;
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
		    const hasPos = symbol.quantity != null && symbol.quantity > 0;
		    const m = q?.metrics;
		    const draft = draftOf(symbol);
		    const head = document.createElement("div");
		    head.className = "skc-detail-head";
		    const back = document.createElement("button");
		    back.className = "skc-btn skc-btn-ghost";
		    back.type = "button";
		    back.textContent = t("detail.back");
		    back.addEventListener("click", () => store.backToList());
		    head.append(back, textSpan("skc-detail-title", symbol.name));
		    head.append(textSpan("skc-code", `${symbol.code} \xB7 ${t(`market.${symbol.market}`)}${symbol.kind === "etf" ? " \xB7 ETF" : ""} \xB7 ${symbol.quoteCurrency}`));
		    head.append(textSpan("skc-spacer", ""));
		    const del = document.createElement("button");
		    del.className = "skc-btn skc-btn-danger";
		    del.type = "button";
		    del.textContent = t("detail.delete");
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
		    if (period !== "minute") {
		      periodTabs.append(buildMaLegend(ui.maVisible, (p) => store.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false })));
		      if (chart.adjust) {
		        periodTabs.append(textSpan("skc-adjust", chart.adjust === "qfq" ? t("detail.adjust.fwd") : t("detail.adjust.none")));
		      }
		    }
		    const chartBox = buildChartBox(symbol, ui);
		    const holdings = document.createElement("div");
		    holdings.className = "skc-holdings";
		    const holdingsTitle = document.createElement("div");
		    holdingsTitle.className = "skc-section-title";
		    holdingsTitle.append(document.createTextNode(t("detail.holdings")));
		    if (hasPos && m) {
		      holdingsTitle.append(textSpan("skc-section-meta", privacy ? `${maskIf(true, "")}${symbol.quoteCurrency}` : t("detail.holdings.meta", {
		        v: m.marketValue != null ? fmtAmount(m.marketValue) : "\u2014",
		        ccy: symbol.quoteCurrency,
		        p: m.pnl != null ? fmtAmount(m.pnl) : m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote"),
		        pct: m.pnlPct != null ? fmtPct(m.pnlPct) : "\u2014"
		      })));
		    }
		    holdings.append(holdingsTitle);
		    const holdingsGrid = document.createElement("div");
		    holdingsGrid.className = "skc-form-grid";
		    const qtyLabel = document.createElement("label");
		    qtyLabel.append(document.createTextNode(t(symbol.market === "crypto" ? "detail.quantity.coins" : "detail.quantity.shares")));
		    qtyLabel.append(buildFormInput("quantity", draft.quantity, t("detail.blank-clears")));
		    const costLabel = document.createElement("label");
		    costLabel.append(document.createTextNode(t("detail.avg-cost", { ccy: symbol.quoteCurrency })));
		    costLabel.append(buildFormInput("avgCost", draft.avgCost, t("detail.blank-clears")));
		    const holdingsActions = document.createElement("div");
		    holdingsActions.className = "skc-form-actions";
		    const savePos = document.createElement("button");
		    savePos.className = "skc-btn skc-btn-primary";
		    savePos.type = "button";
		    savePos.textContent = t("detail.save-position");
		    savePos.addEventListener("click", () => saveHoldings(symbol));
		    const clearPos = document.createElement("button");
		    clearPos.className = "skc-btn";
		    clearPos.type = "button";
		    clearPos.textContent = t("detail.clear-position");
		    clearPos.addEventListener("click", () => clearHoldings(symbol));
		    holdingsActions.append(savePos, clearPos);
		    holdingsGrid.append(qtyLabel, costLabel, holdingsActions);
		    holdings.append(holdingsGrid);
		    const targets = document.createElement("div");
		    targets.className = "skc-targets";
		    const targetsTitle = document.createElement("div");
		    targetsTitle.className = "skc-section-title";
		    targetsTitle.append(document.createTextNode(t("detail.targets")));
		    if (overlapHint) targetsTitle.append(textSpan("skc-badge skc-badge-stale", t("detail.overlap")));
		    targets.append(targetsTitle);
		    const targetsGrid = document.createElement("div");
		    targetsGrid.className = "skc-form-grid";
		    const buyLabel = document.createElement("label");
		    buyLabel.append(document.createTextNode(t("detail.buy-target", { ccy: symbol.quoteCurrency })));
		    buyLabel.append(buildFormInput("buyTarget", draft.buyTarget, t("detail.unset")));
		    const sellLabel = document.createElement("label");
		    sellLabel.append(document.createTextNode(t("detail.sell-target", { ccy: symbol.quoteCurrency })));
		    sellLabel.append(buildFormInput("sellTarget", draft.sellTarget, t("detail.unset")));
		    const targetsActions = document.createElement("div");
		    targetsActions.className = "skc-form-actions";
		    const saveT = document.createElement("button");
		    saveT.className = "skc-btn skc-btn-primary";
		    saveT.type = "button";
		    saveT.textContent = t("detail.save-targets");
		    saveT.addEventListener("click", () => saveTargets(symbol));
		    targetsActions.append(saveT);
		    targetsGrid.append(buyLabel, sellLabel, targetsActions);
		    targets.append(targetsGrid);
		    const hint = document.createElement("div");
		    hint.className = "skc-hint";
		    hint.textContent = t("detail.targets.hint");
		    targets.append(hint);
		    el.append(head, quoteLine, periodTabs, chartBox, holdings, targets);
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
		  };
		  const update = (next) => {
		    if (disposed) return;
		    snapshot = next;
		    const ui = next?.ui ?? {};
		    const symbol = symbolOf();
		    if (ui.detailId !== lastDetailId) {
		      lastDetailId = ui.detailId;
		      form = null;
		      overlapHint = false;
		      chartKey = "";
		      chart = { key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null, prevClose: null, date: null };
		    }
		    if (symbol) {
		      const key = `${symbol.id}:${period}`;
		      if (key !== loadedKey) loadChart(symbol);
		    }
		    render();
		  };
		  const dispose = () => {
		    disposed = true;
		    el.replaceChildren();
		    el.remove();
		  };
		  return { el, update, dispose };
		}
		
		// client/add.mjs
		function createAdd({ store }) {
		  let disposed = false;
		  let snapshot = null;
		  let market = null;
		  let query = "";
		  let results = null;
		  let searching = false;
		  let searchError = null;
		  let directCode = "";
		  let busy = false;
		  let debounceTimer = null;
		  const el = document.createElement("div");
		  el.className = "skc-dialog";
		  const onClose = () => store.setShowAdd(false);
		  const doSearch = async (text, mkt) => {
		    const needle = String(text ?? "").trim();
		    if (!needle) {
		      results = null;
		      searchError = null;
		      render();
		      return;
		    }
		    searching = true;
		    render();
		    try {
		      const data = await api.search(mkt ?? market, needle);
		      if (disposed) return;
		      results = data.rows ?? [];
		      searchError = data.error ?? null;
		    } catch (e) {
		      if (disposed) return;
		      results = [];
		      searchError = String(e?.message ?? e);
		    } finally {
		      searching = false;
		      if (!disposed) render();
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
		    render();
		    if (result.ok) store.setToast(t("toast.added", { name: row.name }));
		    else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
		      store.setToast(t("toast.duplicate"));
		    }
		  };
		  const addDirect = async () => {
		    const code = directCode.trim();
		    if (!code) return;
		    busy = true;
		    render();
		    const result = await store.addSymbol(market, code, null);
		    busy = false;
		    if (disposed) return;
		    if (result.ok) {
		      store.setToast(t("toast.added", { name: code }));
		      directCode = "";
		    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
		      store.setToast(t("toast.duplicate"));
		    } else if (result.error?.status === 422) {
		      store.setToast(t("add.not-found", { e: tErr(result.error.body?.error) }));
		    }
		    render();
		  };
		  const render = () => {
		    if (disposed) return;
		    const business = snapshot?.business ?? { symbols: [] };
		    if (market === null) {
		      const last = snapshot?.ui?.lastMarket;
		      market = MARKETS.includes(last) ? last : "cn";
		    }
		    const known = new Set(business.symbols.map((s) => s.id));
		    const active = typeof document !== "undefined" && document.activeElement && el.contains(document.activeElement) ? document.activeElement : null;
		    const activeField = active?.dataset?.field ?? null;
		    const activePos = active ? { start: active.selectionStart, end: active.selectionEnd } : null;
		    el.replaceChildren();
		    const head = document.createElement("div");
		    head.className = "skc-dialog-head";
		    const title = document.createElement("span");
		    title.className = "skc-section-title";
		    title.textContent = t("add.title");
		    const spacer = document.createElement("span");
		    spacer.className = "skc-spacer";
		    const closeBtn = document.createElement("button");
		    closeBtn.className = "skc-icon-btn";
		    closeBtn.type = "button";
		    closeBtn.textContent = "\u2715";
		    closeBtn.addEventListener("click", onClose);
		    head.append(title, spacer, closeBtn);
		    const tabs = document.createElement("div");
		    tabs.className = "skc-tabs";
		    for (const m of MARKETS) {
		      const tab = document.createElement("button");
		      tab.type = "button";
		      tab.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
		      tab.textContent = t(`market.${m}`);
		      tab.addEventListener("click", () => {
		        market = m;
		        if (query.trim()) doSearch(query, m);
		        else render();
		      });
		      tabs.append(tab);
		    }
		    const queryInput = document.createElement("input");
		    queryInput.className = "skc-input";
		    queryInput.dataset.field = "query";
		    queryInput.placeholder = t(`add.search.${market}`);
		    queryInput.value = query;
		    queryInput.addEventListener("input", () => onQueryInput(queryInput.value));
		    queryInput.addEventListener("keydown", (e) => {
		      if (e.key === "Enter") doSearch(query);
		      if (e.key === "Escape") onClose();
		    });
		    el.append(head, tabs, queryInput);
		    if (searching) {
		      const hint = document.createElement("div");
		      hint.className = "skc-hint";
		      hint.textContent = t("add.searching");
		      el.append(hint);
		    }
		    if (searchError) {
		      const err = document.createElement("div");
		      err.className = "skc-error";
		      err.textContent = t("add.search-error", { e: searchError });
		      el.append(err);
		    }
		    if (results && results.length > 0) {
		      const list = document.createElement("div");
		      list.className = "skc-add-results";
		      for (const row of results) {
		        const btn = document.createElement("button");
		        btn.type = "button";
		        btn.className = "skc-add-row";
		        btn.disabled = busy || known.has(row.id);
		        btn.addEventListener("click", () => addResult(row));
		        const name = document.createElement("span");
		        name.className = "skc-add-name";
		        name.textContent = row.name;
		        const code = document.createElement("span");
		        code.className = "skc-code";
		        code.textContent = row.code + (row.kind === "etf" ? " \xB7 ETF" : "") + (row.market === "crypto" ? ` \xB7 ${row.quoteCurrency}` : "");
		        btn.append(name, code);
		        if (known.has(row.id)) {
		          const badge = document.createElement("span");
		          badge.className = "skc-badge";
		          badge.textContent = t("badge.added");
		          btn.append(badge);
		        }
		        list.append(btn);
		      }
		      el.append(list);
		    }
		    if (results && !searching && !searchError && results.length === 0) {
		      const hint = document.createElement("div");
		      hint.className = "skc-hint";
		      hint.textContent = t("add.no-match");
		      el.append(hint);
		    }
		    const direct = document.createElement("div");
		    direct.className = "skc-direct";
		    const directTitle = document.createElement("span");
		    directTitle.className = "skc-section-title";
		    directTitle.textContent = t("add.direct");
		    const directRow = document.createElement("div");
		    directRow.className = "skc-direct-row";
		    const directInput = document.createElement("input");
		    directInput.className = "skc-input";
		    directInput.dataset.field = "direct";
		    directInput.placeholder = t(`add.direct.${market}`);
		    directInput.value = directCode;
		    directInput.addEventListener("input", () => {
		      directCode = directInput.value;
		    });
		    directInput.addEventListener("keydown", (e) => {
		      if (e.key === "Enter") addDirect();
		    });
		    const validateBtn = document.createElement("button");
		    validateBtn.className = "skc-btn skc-btn-primary";
		    validateBtn.type = "button";
		    validateBtn.disabled = busy || !directCode.trim();
		    validateBtn.textContent = t("add.validate");
		    validateBtn.addEventListener("click", addDirect);
		    directRow.append(directInput, validateBtn);
		    const directHint = document.createElement("div");
		    directHint.className = "skc-hint";
		    directHint.textContent = t("add.hint");
		    direct.append(directTitle, directRow, directHint);
		    el.append(direct);
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
		  };
		  const update = (next) => {
		    if (disposed) return;
		    snapshot = next;
		    render();
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
		  return { el, update, dispose };
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
		    const title = document.createElement("div");
		    title.className = "skc-section-title";
		    title.textContent = t("backup.title");
		    const row = document.createElement("div");
		    row.className = "skc-backup-row";
		    const exportLink = document.createElement("a");
		    exportLink.className = "skc-btn skc-btn-ghost";
		    exportLink.href = api.exportUrl;
		    exportLink.setAttribute("download", "");
		    exportLink.textContent = t("backup.export");
		    const importBtn = document.createElement("button");
		    importBtn.className = "skc-btn";
		    importBtn.type = "button";
		    importBtn.textContent = t("backup.import");
		    importBtn.addEventListener("click", () => fileInput.click());
		    row.append(exportLink, importBtn, fileInput);
		    el.append(title, row);
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
		  const startEngage = () => {
		    if (engaged || !capable || !enabled || disposed || !guestEl) return;
		    engaged = true;
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
		:host { font: inherit; font-size: 12px; line-height: 1.45; color: var(--dsw-alias-label-primary,inherit); }
		:host *, :host *::before, :host *::after { box-sizing: border-box; }
		
		/* \u5408\u5E76\u80F6\u56CA stack\uFF08\u8BA1\u5212 B \u7F1D\uFF1A\u672A\u6765\u7B2C\u4E8C\u679A pill \u76F4\u63A5\u8FFD\u52A0\uFF09 */
		.skc-stack { display:flex; flex-direction:column; gap:6px; }
		
		/* \u80F6\u56CA\uFF08\u5BF9\u9F50 quota-watch \u89E3\u5256\uFF1A26px pill\u3001\u547D\u4E2D\u533A\u5916\u6269\u3001grab \u5149\u6807\u3001touch-action:none\uFF09 */
		.skc-capsule { display:inline-flex; align-items:center; gap:6px; height:26px; padding:0 10px; border-radius:999px; touch-action:none; cursor:grab; border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35)); background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)); background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 86%,transparent); -webkit-backdrop-filter:blur(10px) saturate(1.2); backdrop-filter:blur(10px) saturate(1.2); box-shadow:0 4px 14px rgba(0,0,0,.22); color:var(--dsw-alias-label-primary,inherit); font-size:11px; line-height:24px; user-select:none; white-space:nowrap; position:relative; -webkit-tap-highlight-color:transparent; -webkit-touch-callout:none; }
		.skc-capsule::before { content:""; position:absolute; inset:-9px; }
		.skc-capsule:hover{border-color:var(--dsw-alias-border-primary,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)));box-shadow:0 6px 18px rgba(0,0,0,.28)}
		.skc-capsule:active{transform:scale(.98)}
		.skc-capsule:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#5b8def);outline-offset:2px}
		.skc-capsule[hidden]{display:none}
		.skc-capsule [hidden]{display:none}
		.skc-capsule--dragging { cursor:grabbing; -webkit-backdrop-filter:none; backdrop-filter:none; background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)); box-shadow:0 8px 24px rgba(0,0,0,.35); transform:scale(1.04); transition:none; }
		.skc-capsule-name{font-weight:600;max-width:16vw;overflow:hidden;text-overflow:ellipsis}
		.skc-capsule-price{font-weight:600;font-variant-numeric:tabular-nums}
		.skc-capsule-pct{font-weight:500;font-variant-numeric:tabular-nums}
		.skc-capsule-mark{font-weight:500}
		.skc-mark-buy{color:#e5484d}
		.skc-mark-sell{color:#2bb596}
		.skc-up{color:#e5484d}
		.skc-down{color:#2bb596}
		.skc-flat{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}
		
		/* \u9762\u677F\uFF08\u951A\u5B9A\u80F6\u56CA\u5F39\u51FA\uFF1B\u2264480px \u8F6C\u5E95\u90E8 sheet\uFF1B\u5934\u4E0D\u518D\u62D6\u52A8\uFF09 */
		.skc-panel { position:fixed; z-index:2147483000; }
		.skc-panel{width:min(400px,calc(100vw - 16px));max-height:min(80vh,calc(100dvh - 16px));display:flex;flex-direction:column;border-radius:12px;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 94%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(14px) saturate(1.15);backdrop-filter:blur(14px) saturate(1.15);box-shadow:0 12px 36px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary,inherit);font:inherit;overflow:hidden}
		.skc-panel[hidden]{display:none}
		.skc-panel--sheet { left:8px; right:8px; top:auto; bottom:calc(8px + env(safe-area-inset-bottom, 0px)); width:auto; max-height:calc(100dvh - 24px); }
		.skc-header{display:flex;align-items:center;gap:8px;padding:7px 10px 6px;border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35))}
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
		.skc-tab{flex:none;padding:3px 9px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font:inherit}
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
		.skc-row{display:flex;align-items:center;gap:10px;padding:5px 7px;border-radius:7px;cursor:pointer}
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
		.skc-ma-chip{border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:transparent;border-radius:999px;font-size:10px;padding:0 6px;cursor:pointer;color:inherit}
		.skc-ma-off{opacity:.35}
		.skc-section-title{font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));margin:10px 0 4px;display:flex;align-items:center;gap:8px}
		.skc-section-meta{color:var(--dsw-alias-label-primary,inherit);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
		.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
		.skc-form-grid label{display:flex;flex-direction:column;gap:3px;font-size:11px}
		.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
		.skc-input{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:4px 8px;font:inherit;width:100%}
		.skc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#5b8def);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 22%,transparent)}
		.skc-select{background:var(--dsw-alias-bg-base,#1f1f1f);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:2px 6px;font:inherit;max-width:180px}
		.skc-btn{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:4px 11px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}
		.skc-btn:hover{border-color:var(--dsw-alias-brand-primary,#5b8def);color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-btn:active{transform:scale(.97)}
		.skc-btn-primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 16%,transparent);color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));font-weight:600}
		.skc-btn-primary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 26%,transparent)}
		.skc-btn-danger{border-color:color-mix(in srgb,#e5484d 45%,transparent);background:color-mix(in srgb,#e5484d 12%,transparent);color:#e5484d;font-weight:600}
		.skc-btn-danger:hover{background:color-mix(in srgb,#e5484d 22%,transparent);border-color:#e5484d}
		.skc-btn-ghost{border-color:transparent}
		.skc-icon-btn{background:transparent;border:none;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font-size:13px;padding:3px 7px;border-radius:7px;font-family:inherit}
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
		.skc-dialog{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 97%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(20px) saturate(1.2);backdrop-filter:blur(20px) saturate(1.2);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 40%,transparent);scrollbar-width:thin}
		.skc-dialog[hidden]{display:none}
		.skc-dialog-head{display:flex;align-items:center;gap:8px;padding-bottom:2px}
		.skc-add-results{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto;scrollbar-width:thin}
		.skc-add-row{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;color:var(--dsw-alias-label-primary,inherit);padding:5px 8px;cursor:pointer;font:inherit;text-align:left}
		.skc-add-row:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-add-row:disabled{opacity:.5;cursor:default}
		.skc-add-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
		.skc-direct{border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding-top:8px}
		.skc-direct-row{display:flex;gap:8px;margin-top:4px}
		
		/* \u80F6\u56CA\u9009\u62E9\u5668 / toast */
		.skc-capsule-picker{display:flex;align-items:center;gap:6px;font-size:11px}
		.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 96%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:8px;padding:6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none;max-width:80vw}
		.skc-toast[hidden]{display:none}
		
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
		
		/* \u52A8\u6548\u53EA\u5BF9\u5141\u8BB8\u8FD0\u52A8\u7684\u7528\u6237\u751F\u6548\uFF08chrome \u52A8\u6548\uFF1B\u6570\u636E\u884C\u4E0D\u505A\u52A8\u753B\uFF09 */
		@media (prefers-reduced-motion: no-preference) {
		  .skc-capsule { transition: border-color .12s ease-out, box-shadow .12s ease-out; }
		  .skc-panel { animation: skc-panel-in .14s ease-out; }
		  .skc-dialog { animation: skc-dialog-in .14s ease-out; }
		  .skc-toast { animation: skc-toast-in .16s ease-out; }
		  .skc-qpulse{animation:skc-qpulse 1.6s ease-in-out infinite}
		  @keyframes skc-qpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
		}
		@keyframes skc-panel-in{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}
		@keyframes skc-dialog-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
		@keyframes skc-toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%)}}
		
		@media print { :host { display:none !important } }
		
		/* \u989D\u5EA6\u5D4C\u5165\uFF08CEP v1 \u5BBF\u4E3B\u4FA7\uFF0CADR 0002\uFF09\uFF1Aquota pill \u7EE7\u627F\u80F6\u56CA\u89E3\u5256\u5E76\u8986\u5199 cursor\uFF1B\u6570\u503C\u6BB5 tabular-nums\uFF1B\u9608\u503C\u8272\u4E0E qw \u540C\u540D\u56DE\u9000\u503C\u4E00\u81F4\uFF1Bpulse \u89C1\u52A8\u6548\u5B88\u536B\u5757 */
		.skc-capsule--quota{cursor:pointer}
		.skc-qval{font-variant-numeric:tabular-nums}
		.skc-qwarn{color:var(--dsw-alias-label-warning,#d29922)}
		.skc-qdanger{color:var(--dsw-alias-label-warning,#d29922)}
		.skc-quota-merge-on{color:var(--dsw-alias-brand-primary,#5b8def)}
		.skc-qseg{display:inline-flex;align-items:center;gap:6px}
		.skc-qseg[hidden]{display:none}
		.skc-qseg-divider{display:inline-block;width:1px;height:14px;background:rgba(128,128,128,.4)}
		.skc-qdot{display:inline-block;width:6px;height:6px;border-radius:999px;background:var(--dsw-alias-label-warning,#d29922)}
		.skc-capsule [data-seg="stock"]{display:inline-flex;align-items:center;gap:6px}
		[data-seg="quota"]{cursor:pointer}
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
		    detail: createDetail({ store }),
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
		    onQuotaTap: () => quotaEmbed.onQuotaTap()
		    // 延迟绑定：quotaEmbed 在 capsule 之后创建
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
