/**
 * 开休市判断（简化版，§12.33）：不是 sk 的核心功能，只做复合判断，不追求逐分钟严谨。
 *
 * 两个输入合并：
 *   - 时间输入：周一至周五 + 时段表（当地墙钟）。法定节假日、提前收市与长假均不建模，按工作日处理。
 *   - 行情输入：服务端 targets 给出的行情状态（ok / stale / no-data）。
 * 合并结果：行情过期时，时段内「旧」、时段外「休」；无行情「无」；行情正常不显示。
 *
 * 时段表依据交易所公开规则（来源见 docs/verification.md §12.33）：
 *   cn  Asia/Shanghai     09:30–11:30、13:00–15:00
 *   hk  Asia/Hong_Kong    09:30–12:00、13:00–16:00
 *   us  America/New_York  04:00–20:00（纳斯达克扩展时段；盘前盘后仍有成交与价格变动，故含在内）
 * 加密货币 7×24，恒视为开市。
 */

const SESSION_WINDOWS = {
  cn: { tz: "Asia/Shanghai", windows: [[570, 690], [780, 900]] },
  hk: { tz: "Asia/Hong_Kong", windows: [[570, 720], [780, 960]] },
  us: { tz: "America/New_York", windows: [[240, 1200]] },
};

/** 轮询节奏（毫秒）：任一标的市场开市 → 展开 15 秒 / 收起 30 秒；全部休市 → 60 秒 */
export const POLL_MS = { openPanel: 15000, openCollapsed: 30000, closed: 60000 };
/** 盘中图表静默刷新间隔（毫秒）；休市时不刷新 */
export const CHART_REFRESH_MS = 60000;

/** 当地墙钟分钟数（0–1439） */
function minuteOfDay(epoch, tz) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(epoch));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return (get("hour") % 24) * 60 + get("minute");
}

/** 市场是否开市（时间输入）：加密恒开市；其余为周一至周五且落在时段内 */
export function isMarketOpen(market, now) {
  if (market === "crypto") return true;
  const cfg = SESSION_WINDOWS[market];
  if (!cfg) return false;
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: cfg.tz, weekday: "short" }).format(new Date(now));
  if (weekday === "Sat" || weekday === "Sun") return false;
  const m = minuteOfDay(now, cfg.tz);
  return cfg.windows.some(([a, b]) => m >= a && m < b);
}

/**
 * 标签（复合判断）：行情过期时按时段区分「休」与「旧」；无行情为「无」；行情正常不显示。
 * @returns {null|'stale'|'closed'|'no-data'}
 */
export function targetBadgeKind(target, market, now) {
  if (!target || target.status === "no-targets") return null;
  if (target.status === "no-data") return "no-data";
  if (target.status === "stale") return isMarketOpen(market, now) ? "stale" : "closed";
  return null;
}

/** 轮询间隔（毫秒）：任一标的市场开市（或含加密）即按开市节奏；全部休市降频为 60 秒 */
export function pollIntervalMs({ panelOpen, markets, now }) {
  const anyOpen = (markets ?? []).some((m) => isMarketOpen(m, now));
  if (!anyOpen) return POLL_MS.closed;
  return panelOpen ? POLL_MS.openPanel : POLL_MS.openCollapsed;
}

/** 图表静默刷新：仅开市时、且距上次加载满 CHART_REFRESH_MS 才刷新 */
export function chartRefreshDue(market, loadedAt, now) {
  return isMarketOpen(market, now) && now - (Number(loadedAt) || 0) >= CHART_REFRESH_MS;
}
