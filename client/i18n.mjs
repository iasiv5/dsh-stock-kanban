/**
 * 双语文案（跟随 DSH 界面语言）：优先读 <html lang>（DSH 设置→语言会镜像到那里并实时更新），
 * 回落浏览器语言；zh = 中文，其余 en。服务端错误统一返回稳定代码，本模块负责本地化。
 */

export function resolveLang(navLang, doc) {
  const host = typeof doc !== "undefined" && doc ? String(doc.documentElement?.lang ?? "").trim() : "";
  if (host !== "") return host.toLowerCase().startsWith("zh") ? "zh" : "en";
  return typeof navLang === "string" && navLang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

const hostDoc = typeof document !== "undefined" ? document : undefined;
export const LANG = resolveLang(typeof navigator !== "undefined" ? navigator.language : undefined, hostDoc);
let currentLang = LANG;

/** 测试/调试用：显式切换语言（UI 正常路径不使用——跟随界面语言） */
export function setLang(lang) {
  if (lang === "zh" || lang === "en") currentLang = lang;
}

const zh = {  "market.cn": "A 股",
  "market.hk": "港股",
  "market.us": "美股",
  "market.crypto": "加密货币",

  "app.title": "盯盘",
  "app.meta": "{n} 个自选 · 实例共享",
  "app.meta.error": "行情服务异常",
  "app.note.delay": "行情来自免费源，有延迟。",
  "app.note.boundary": "界面偏好存本浏览器；业务数据存 DSH 实例（跨浏览器共享）。",
  "app.quote-failed": "行情拉取失败：{e}",
  "app.collapse": "收起",
  "app.settings": "设置",
  "app.drag": "按住拖动",

  "capsule.empty": "自选",
  "capsule.stale": "行情旧",
  "capsule.tip.stale": "行情已过期：触价标记暂停显示",

  "badge.stale": "旧",
  "badge.closed": "休",
  "badge.no-data": "无",
  "badge.added": "已添加",
  "badge.holder": "已填持仓",
  "badge.stale.tip": "行情过期：触价状态暂停判断",
  "badge.closed.tip": "休市中：以下一交易时段行情恢复判断",
  "badge.no-data.tip": "行情缺失：触价状态未知",

  "list.holdings-only": "只看持仓",
  "list.refresh": "刷新",
  "list.empty.watch": "暂无自选，点「＋」添加",
  "list.empty.holdings": "该市场暂无持仓",
  "list.quote-failed": "获取失败",

  "detail.back": "返回",
  "detail.delete": "删除",
  "detail.missing": "标的不存在或已被删除",
  "detail.quote-time": "行情 {t} · 拉取 {f}",
  "detail.stale": "行情过期",
  "detail.no-data": "行情缺失",
  "detail.period.minute": "分时",
  "detail.period.day": "日K",
  "detail.period.week": "周K",
  "detail.period.month": "月K",
  "detail.adjust.fwd": "前复权",
  "detail.adjust.none": "不复权",
  "detail.chart.loading": "加载中…",
  "detail.chart.empty.minute": "暂无分时数据",
  "detail.chart.empty.candle": "暂无K线数据",
  "detail.chart.error": "加载失败：{e}",
  "detail.holdings": "持仓",
  "detail.holdings.meta": "市值 {v} {ccy} · 盈亏 {p}（{pct}）",
  "detail.cost-unset": "成本未填",
  "detail.no-quote": "无行情",
  "detail.quantity.shares": "数量（股）",
  "detail.quantity.coins": "数量（币）",
  "detail.avg-cost": "平均成本（{ccy}）",
  "detail.blank-clears": "留空清除",
  "detail.save-position": "存持仓",
  "detail.clear-position": "清持仓",
  "detail.targets": "目标价",
  "detail.buy-target": "买入目标价（≤ 触发 B，{ccy}）",
  "detail.sell-target": "卖出目标价（≥ 触发 S，{ccy}）",
  "detail.unset": "不设置",
  "detail.save-targets": "存目标价",
  "detail.overlap": "阈值重叠",
  "detail.targets.hint": "仅基于有效行情判断；过期/缺失时暂停，恢复即续。",
  "detail.confirm.overlap": "买入目标价不低于卖出目标价，两个标记可能同时显示。仍要保存？",
  "detail.confirm.remove": "删除「{name}」？持仓与目标价一并移除（可用备份恢复）。",
  "detail.err.numbers": "数量与成本须为正数",
  "detail.err.targets": "目标价须为正数",

  "add.title": "添加标的",
  "add.search.cn": "搜名称或代码…",
  "add.search.hk": "搜名称或代码…",
  "add.search.us": "搜名称或代码…",
  "add.search.crypto": "搜币种或交易对（BTC / 以太坊）",
  "add.direct": "直接输代码",
  "add.direct.cn": "600519 / 000001 / sh510300",
  "add.direct.hk": "00700",
  "add.direct.us": "AAPL",
  "add.direct.crypto": "BTC-USDT",
  "add.validate": "校验并添加",
  "add.hint": "代码须过行情校验（取到有效价才收）。",
  "add.searching": "搜索中…",
  "add.no-match": "无匹配结果",
  "add.search-error": "搜索源不可用：{e}，不展示虚构结果",
  "add.not-found": "代码无效或无行情（{e}）",

  "backup.export": "导出备份",
  "backup.import": "导入备份",
  "backup.import.hint": "覆盖模式：替换当前全部数据",
  "backup.confirm": "备份含 {n} 个标的；导入为覆盖模式，替换当前全部数据（现 {m} 个）。",
  "backup.privacy-note": "备份含持仓明文（未加密），请妥善保管。",
  "backup.overwrite": "确认覆盖导入",
  "backup.cancel": "取消",
  "backup.done": "已导入 {n} 个标的（覆盖）",
  "backup.rejected": "备份校验未通过（{e}），现有数据未动",
  "backup.err.read": "读取失败：{e}",
  "backup.err.json": "不是合法 JSON 文件",
  "backup.err.kind": "不是本插件的备份文件",

  "toast.added": "已添加 {name}",
  "toast.duplicate": "该标的已在自选中",
  "toast.position-saved": "持仓已保存",
  "toast.position-cleared": "持仓已清除",
  "toast.targets-saved": "目标价已保存",
  "toast.conflict": "数据已被其他页面更新：已刷新，请重试",
  "toast.init-failed": "初始化失败：{e}",
  "toast.op-failed": "操作失败：{e}",

  "picker.label": "胶囊标的",
  "picker.empty": "先添加标的",

  "quota.merge": "合并显示 quota",
  "quota.merge.hint": "quota-watch 在线时生效；关闭后额度胶囊恢复独立显示。",
  "quota.merge.on": "quota 已并入合并胶囊（点击拆分）",
  "quota.merge.off": "quota 独立显示（点击并入合并胶囊）",
  "quota.outcome": "待处理兑换结果",
  "quota.stale": "额度数据已过期",

  "err.duplicate": "该标的已在自选中",
  "err.invalid-identity": "代码格式无效",
  "err.quote-unavailable": "行情暂不可用，稍后再试",
  "err.symbol-not-found": "未找到该标的",
  "err.not-found": "标的不存在",
  "err.no-data": "无行情数据",
  "err.fetch-failed": "行情获取失败",
  "err.api-error": "接口返回异常",
  "err.invalid-code": "代码无效",
  "err.save-failed": "保存失败",
  "err.invalid-input": "输入无效",
  "err.invalid-buy-target": "买入目标价必须是正数",
  "err.invalid-sell-target": "卖出目标价必须是正数",
  "err.unsupported-schema-version": "备份版本不支持",
  "err.wrong-kind": "备份类型不符",
  "err.not-an-object": "备份格式错误",
  "err.symbols-not-array": "备份 symbols 字段无效",
  "err.rev-conflict": "版本冲突",
  "err.origin-rejected": "跨源请求被拒绝",
  "err.unknown-market": "未知市场",
};

const en = {
  "market.cn": "A-shares",
  "market.hk": "HK",
  "market.us": "US",
  "market.crypto": "Crypto",

  "app.title": "Watchlist",
  "app.meta": "{n} symbols · shared per instance",
  "app.meta.error": "Quote service error",
  "app.note.delay": "Quotes come from free sources with delay.",
  "app.note.boundary": "UI prefs stay in this browser; business data lives on the DSH instance (shared across browsers).",
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
  "list.empty.watch": "No symbols yet — tap ＋",
  "list.empty.holdings": "No holdings in this market",
  "list.quote-failed": "Failed",

  "detail.back": "Back",
  "detail.delete": "Delete",
  "detail.missing": "Symbol missing or removed",
  "detail.quote-time": "Quote {t} · Fetched {f}",
  "detail.stale": "Stale",
  "detail.no-data": "No quote",
  "detail.period.minute": "Time",
  "detail.period.day": "Day",
  "detail.period.week": "Week",
  "detail.period.month": "Month",
  "detail.adjust.fwd": "Fwd-adjusted",
  "detail.adjust.none": "Unadjusted",
  "detail.chart.loading": "Loading…",
  "detail.chart.empty.minute": "No intraday data",
  "detail.chart.empty.candle": "No candle data",
  "detail.chart.error": "Load failed: {e}",
  "detail.holdings": "Position",
  "detail.holdings.meta": "Value {v} {ccy} · PnL {p} ({pct})",
  "detail.cost-unset": "cost unset",
  "detail.no-quote": "no quote",
  "detail.quantity.shares": "Quantity (shares)",
  "detail.quantity.coins": "Quantity (coins)",
  "detail.avg-cost": "Avg cost ({ccy})",
  "detail.blank-clears": "blank clears",
  "detail.save-position": "Save",
  "detail.clear-position": "Clear",
  "detail.targets": "Targets",
  "detail.buy-target": "Buy target (≤ fires B, {ccy})",
  "detail.sell-target": "Sell target (≥ fires S, {ccy})",
  "detail.unset": "unset",
  "detail.save-targets": "Save",
  "detail.overlap": "overlap",
  "detail.targets.hint": "Checked against live quotes only; paused while stale, resumes automatically.",
  "detail.confirm.overlap": "Buy target ≥ sell target: both marks may show at once. Save anyway?",
  "detail.confirm.remove": "Remove “{name}”? Position and targets go too (recoverable via backup).",
  "detail.err.numbers": "Quantity and cost must be positive",
  "detail.err.targets": "Targets must be positive",

  "add.title": "Add symbol",
  "add.search.cn": "Search name or code…",
  "add.search.hk": "Search name or code…",
  "add.search.us": "Search name or code…",
  "add.search.crypto": "Search coin or pair (BTC / Ethereum)",
  "add.direct": "Direct code",
  "add.direct.cn": "600519 / 000001 / sh510300",
  "add.direct.hk": "00700",
  "add.direct.us": "AAPL",
  "add.direct.crypto": "BTC-USDT",
  "add.validate": "Validate & add",
  "add.hint": "Codes must pass a live quote check before being added.",
  "add.searching": "Searching…",
  "add.no-match": "No matches",
  "add.search-error": "Search unavailable: {e} — no fake results",
  "add.not-found": "Invalid code or no quote ({e})",

  "backup.export": "Export",
  "backup.import": "Import",
  "backup.import.hint": "Overwrite mode: replaces all current data",
  "backup.confirm": "Backup holds {n} symbols; import OVERWRITES all current data ({m}).",
  "backup.privacy-note": "Backups contain positions in plain text (unencrypted) — keep them safe.",
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
  "toast.conflict": "Data changed in another tab: refreshed — please retry",
  "toast.init-failed": "Init failed: {e}",
  "toast.op-failed": "Action failed: {e}",

  "picker.label": "Capsule",
  "picker.empty": "add symbols first",

  "quota.merge": "Merge quota display",
  "quota.merge.hint": "Applies while quota-watch is online; off shows the quota capsule separately.",
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
  "err.unknown-market": "Unknown market",
};

const DICTS = { zh, en };

export function t(key, params) {
  let s = DICTS[currentLang][key] ?? DICTS.zh[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

/** 服务端错误代码 → 本地化文案（附原始 detail）；未知代码原样透出；逗号分隔多码逐段本地化 */
export function tErr(code, detail) {
  if (code == null || code === "") return "";
  const label = String(code)
    .split(",")
    .map((c) => {
      const base = t(`err.${c}`);
      return base.startsWith("err.") ? c : base;
    })
    .join(", ");
  return detail ? `${label} (${detail})` : label;
}

export const DICT_KEYS = { zh: Object.keys(zh).sort(), en: Object.keys(en).sort() };
