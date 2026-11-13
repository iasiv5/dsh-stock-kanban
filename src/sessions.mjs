/**
 * 开休市判断（简化版，§12.33）：不是 sk 的核心功能，只做复合判断，不追求逐分钟严谨。
 *
 * 两个输入合并：
 *   - 时间输入：周一至周五 + 时段表（当地墙钟）。法定节假日、提前收市与长假均不建模，按工作日处理。
 *   - 行情输入：服务端 targets 给出的行情状态（ok / stale / no-data）。
 * 合并结果：行情过期时，时段内「旧」、时段外「休」；无行情「无」；行情正常不显示。
 * 休市标注是市场事实（§12.34）：无论是否设目标价，休市时段一律标「休」，保证整列一致。
 *
 * 时段表依据交易所公开规则（来源见 docs/verification.md §12.33）：
 *   cn  Asia/Shanghai     09:30–11:30、13:00–15:00
 *   hk  Asia/Hong_Kong    09:30–12:00、13:00–16:00
 *   us  America/New_York  09:30–16:00（常规时段；显示语义按常规时段，盘前盘后一律「休」，§12.36）
 * 加密货币 7×24，恒视为开市。
 * 轮询活跃窗口另有放宽（ACTIVE_WINDOWS）：美股 04:00–20:00 扩展时段仍按开市节奏轮询（盘前后有成交）。
 */

const SESSION_WINDOWS = {
  cn: { tz: "Asia/Shanghai", windows: [[570, 690], [780, 900]] },
  hk: { tz: "Asia/Hong_Kong", windows: [[570, 720], [780, 960]] },
  us: { tz: "America/New_York", windows: [[570, 960]] },
};

/** 轮询活跃窗口（§12.36）：显示按常规时段，轮询对美股放宽到纳斯达克扩展时段 04:00–20:00（盘前盘后仍有成交）；未列出的市场跟随常规时段 */
const ACTIVE_WINDOWS = {
  us: { tz: "America/New_York", windows: [[240, 1200]] },
};

/** 分时图 x 轴锚定的常规时段窗（分钟；§12.34，仅图表轴使用，与轮询窗口无关）：美股取常规 09:30–16:00，扩展时段数据由轴自适应外扩 */
export const CHART_WINDOWS = {
  cn: { tz: "Asia/Shanghai", windows: [[570, 690], [780, 900]] },
  hk: { tz: "Asia/Hong_Kong", windows: [[570, 720], [780, 960]] },
  us: { tz: "America/New_York", windows: [[570, 960]] },
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

/** 周一至周五且落在时段内（当地墙钟） */
function inWindows(cfg, now) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: cfg.tz, weekday: "short" }).format(new Date(now));
  if (weekday === "Sat" || weekday === "Sun") return false;
  const m = minuteOfDay(now, cfg.tz);
  return cfg.windows.some(([a, b]) => m >= a && m < b);
}

/** 市场是否开市（显示语义，常规时段 §12.36）：加密恒开市；美股盘前盘后不算开市 */
export function isMarketOpen(market, now) {
  if (market === "crypto") return true;
  const cfg = SESSION_WINDOWS[market];
  return cfg ? inWindows(cfg, now) : false;
}

/** 市场是否处于轮询活跃窗口（§12.36）：美股含盘前盘后扩展时段，其余跟随常规时段 */
export function isMarketActive(market, now) {
  if (market === "crypto") return true;
  const cfg = ACTIVE_WINDOWS[market] ?? SESSION_WINDOWS[market];
  return cfg ? inWindows(cfg, now) : false;
}

/**
 * 标签（复合判断）：行情过期时按时段区分「休」与「旧」；无行情为「无」；行情正常不显示。
 * @returns {null|'stale'|'closed'|'no-data'}
 */
export function targetBadgeKind(target, market, now) {
  if (target?.status === "no-data") return "no-data";
  // 休市是市场事实，与是否设目标价无关（§12.34）：休市一律标「休」（整列一致）；开市时不产生噪声
  const closed = !isMarketOpen(market, now);
  if (!target || target.status === "no-targets") return closed ? "closed" : null;
  if (target.status === "stale") return closed ? "closed" : "stale";
  return closed ? "closed" : null;
}

/** 轮询间隔（毫秒）：任一标的市场处于活跃窗口（含美股盘前盘后，或加密）→ 开市节奏；全部休市降频为 60 秒 */
export function pollIntervalMs({ panelOpen, markets, now }) {
  const anyOpen = (markets ?? []).some((m) => isMarketActive(m, now));
  if (!anyOpen) return POLL_MS.closed;
  return panelOpen ? POLL_MS.openPanel : POLL_MS.openCollapsed;
}

/** 图表静默刷新：仅开市时、且距上次加载满 CHART_REFRESH_MS 才刷新 */
export function chartRefreshDue(market, loadedAt, now) {
  return isMarketOpen(market, now) && now - (Number(loadedAt) || 0) >= CHART_REFRESH_MS;
}
