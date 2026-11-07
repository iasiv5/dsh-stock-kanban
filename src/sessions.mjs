/**
 * 市场交易时段（纯函数，浏览器/Node 通用）。
 *
 * 精度原则（用户确认的方案）：只在**可精确确定**休市时才产出 'closed'（休）——
 * 即「现在处于时段表定义的非交易时段，且行情时间已覆盖最近一个应有交易日」。
 * 周末与时段表间隙是精确的；**法定节假日无法在无日历源时判定**，此时保守回退 'stale'（旧）。
 * 美股/加密货币不做 'closed' 判定（美股行情无行情时间戳、加密 7×24）。
 *
 * 时段表（当地墙钟，分钟数）：
 *   cn: Asia/Shanghai      09:30–11:30, 13:00–15:00（周一至周五）
 *   hk: Asia/Hong_Kong     09:30–12:00, 13:00–16:00（周一至周五）
 *   us: America/New_York   09:30–16:00（周一至周五；仅常规时段，不含盘前盘后）
 */

export const MARKET_SESSIONS = {
  cn: { tz: "Asia/Shanghai", windows: [[570, 690], [780, 900]] },
  hk: { tz: "Asia/Hong_Kong", windows: [[570, 720], [780, 960]] },
  us: { tz: "America/New_York", windows: [[570, 960]] },
};

const MIN = 60 * 1000;

/** epoch(ms) 在指定时区的当地墙钟分解 */
function wallParts(epoch, tz) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = {};
  for (const p of dtf.formatToParts(new Date(epoch))) parts[p.type] = p.value;
  return { y: Number(parts.year), mo: Number(parts.month), d: Number(parts.day) };
}

/** 指定时区的当地星期（0=周日…6=周六） */
export function localDow(epoch, tz) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(epoch));
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
}

/** 当地墙钟 → epoch（两 pass 求 offset，分钟级精度足够） */
export function wallToEpoch(y, mo, d, minutes, tz) {
  const guess = Date.UTC(y, mo - 1, d, 0, minutes);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const offsetFor = (ms) => {
    const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
    return asUTC - ms;
  };
  return guess - offsetFor(guess);
}

/**
 * 最近交易时段窗口。
 * @returns {{ inSession: boolean, start: number, end: number, dayOffset: number } | null}
 *   inSession=true 表示 now 正处于某时段内（start/end 为该时段边界）；
 *   否则返回最近一个已收市的时段窗口（按当地周末跳过；最多回看 7 天）。
 */
export function lastSessionWindow(market, now) {
  const cfg = MARKET_SESSIONS[market];
  if (!cfg) return null;
  const { tz, windows } = cfg;
  const w0 = wallParts(now, tz);
  for (let offset = 0; offset <= 7; offset++) {
    const epoch = now - offset * 24 * 60 * MIN;
    const dow = localDow(epoch, tz);
    if (dow === 0 || dow === 6) continue;
    const parts = wallParts(epoch, tz);
    const dayEpochs = windows
      .map(([a, b]) => ({ start: wallToEpoch(parts.y, parts.mo, parts.d, a, tz), end: wallToEpoch(parts.y, parts.mo, parts.d, b, tz) }))
      .sort((x, y2) => x.start - y2.start);
    // 当天含 now 的时段 → 盘中
    for (const w of dayEpochs) {
      if (now >= w.start && now <= w.end) return { inSession: true, ...w, dayOffset: offset };
    }
    // 当天已收市的最近时段
    const completed = dayEpochs.filter((w) => w.end < now);
    if (completed.length > 0) {
      const last = completed[completed.length - 1];
      return { inSession: false, ...last, dayOffset: offset };
    }
    // 当天时段尚未开始 → 继续往前一天
  }
  return null;
}

/**
 * stale 徽标细分：仅在可精确确定休市时返回 'closed'（休），否则 'stale'（旧）。
 * @param {string} market 市场名
 * @param {string|null} status targetState.status（只对 'stale' 细分）
 * @param {number|null} quoteTime 行情自身时间（epoch ms）
 * @param {number} now
 * @returns {null|'stale'|'closed'} null = 不需要徽标
 */
export function staleBadgeKind(market, status, quoteTime, now) {
  if (status !== "stale") return null;
  if (market === "crypto" || market === "us") return "stale"; // 7×24 无休市概念 / 无行情时间戳，保守按旧
  const w = lastSessionWindow(market, now);
  if (!w) return "stale";
  if (w.inSession) return "stale"; // 盘中行情滞后 → 真·旧
  // 非交易时段：行情时间覆盖最近应有交易日 → 可精确确定休市
  if (Number.isFinite(quoteTime) && quoteTime > 0 && quoteTime >= w.start) return "closed";
  return "stale"; // 行情早于最近应有交易日：可能是节假日/源异常，不冒称休市
}

/** 目标徽标统一决策（供客户端）：'buy'|'sell'|'both' 触发不在此层处理 */
export function targetBadgeKind(target, market, quoteTime, now) {
  if (!target) return null;
  if (target.status === "no-targets") return null;
  if (target.status === "no-data") return "no-data";
  if (target.status === "stale") return staleBadgeKind(market, "stale", quoteTime, now);
  return null;
}
