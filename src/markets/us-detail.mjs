/**
 * 美股详情图表（分时 / K 线）多源链（2026-11-13）。
 *
 *   K 线：东方财富 push2his（前复权 qfq，主源）-> 腾讯美股 fqkline（备源，未复权，标 none；指数不回落）
 *   分时：东方财富 trends2（主源）-> Yahoo chart 1 分钟（备源，昨收取 meta.chartPreviousClose；带 429 退避）
 *
 * 为什么要备源：2026-11-13 东方财富 push2/push2his 在本机整体不通（push2his 连接后空回应，push2 返回 502），
 * 详情图表此前只有这一条路径，整块报 fetch-failed。
 *
 * 实测事实（2026-11-13）：
 *   - 腾讯美股 K 线必须带交易所后缀：usNVDA.OQ 返回 180 根、升序；无后缀 usNVDA 只返回 2 根，数据不完整。
 *     因此后缀按 .OQ -> .N -> .AM 逐个探测，成功后记住。返回键为 day/week/month，且未复权：
 *     跨拆股日的周 K、月 K 会出现断点，界面据 adjust='none' 如实标注「不复权」。
 *   - 腾讯美股分时在休市时返回空数组，开盘时段是否可用未验证，故不纳入分时备源。
 *   - Yahoo 1 分钟图表 2026-11-13 实测 HTTP 200 有收盘序列；但对本机连续请求会返回 429，
 *     因此 429、5xx 或网络错误后 120 秒内不再请求 Yahoo（提供方级退避）。
 *   - 指数（DJI/IXIC/INX）不回落腾讯（腾讯美股指数代码映射未验证）。
 *
 * 缓存：成功结果 K 线 5 分钟、分时 30 秒，失败不缓存。无常驻定时器，全部惰性触发。
 */
import * as eastmoney from "./eastmoney.mjs";
import { indexOfCode } from "../identity.mjs";

const TIMEOUT_MS = 10000;
const TENCENT_KLINE = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=";
const TENCENT_SUFFIXES = [".OQ", ".N", ".AM"];
const TENCENT_COUNT = { day: 180, week: 150, month: 120 };
const TENCENT_MIN_ROWS = 5;
const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/";
const YAHOO_HEADERS = {
  accept: "application/json, text/plain, */*",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  referer: "https://finance.yahoo.com/",
};
const YAHOO_SYMBOL = { DJI: "^DJI", IXIC: "^IXIC", INX: "^GSPC" };
const YAHOO_BACKOFF_MS = 120000;
const CACHE_TTL = { kline: 5 * 60 * 1000, minute: 30 * 1000 };

const suffixByTicker = new Map();
const cache = new Map();
let yahooBackoffUntil = 0;

/** 测试用：清空后缀记忆、缓存与退避状态 */
export function resetUsDetailForTests() {
  suffixByTicker.clear();
  cache.clear();
  yahooBackoffUntil = 0;
}

function tickerOf(code) {
  return String(code ?? "").replace(/^us/i, "").toUpperCase().split(".")[0];
}

function cached(key, ttl) {
  const e = cache.get(key);
  return e && Date.now() - e.at < ttl ? e.value : null;
}

function remember(key, value) {
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** 腾讯美股 K 线：逐个后缀探测；有效行数不足 TENCENT_MIN_ROWS 视为该后缀无效 */
async function tencentKline(code, period) {
  const ticker = tickerOf(code);
  const count = TENCENT_COUNT[period] ?? 180;
  const remembered = suffixByTicker.get(ticker);
  const candidates = remembered ? [remembered] : TENCENT_SUFFIXES;
  let lastError = "no-data";
  for (const suffix of candidates) {
    const sym = "us" + ticker + suffix;
    let json;
    try {
      const res = await fetch(TENCENT_KLINE + sym + "," + period + ",,," + count + ",qfq", {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        lastError = "fetch-failed";
        continue;
      }
      json = await res.json();
    } catch {
      lastError = "fetch-failed";
      continue;
    }
    const rows = json?.data?.[sym]?.[period];
    if (!Array.isArray(rows)) {
      lastError = "no-data";
      continue;
    }
    const candles = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 6) continue;
      const time = String(row[0]).slice(0, 10);
      const open = parseFloat(row[1]);
      const close = parseFloat(row[2]);
      const high = parseFloat(row[3]);
      const low = parseFloat(row[4]);
      const volume = parseFloat(row[5]) || 0;
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(time) || ![open, close, high, low].every(Number.isFinite)) continue;
      candles.push({ time, open, high, low, close, volume });
    }
    if (candles.length < TENCENT_MIN_ROWS) {
      lastError = "no-data";
      continue;
    }
    suffixByTicker.set(ticker, suffix);
    return { candles, adjust: "none", error: null };
  }
  return { candles: [], adjust: null, error: lastError };
}

function nyDate(epochSec) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochSec * 1000));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

/** Yahoo 1 分钟图表（当日或最近交易日）。429、5xx 与网络错误进入退避。 */
async function yahooMinute(code) {
  if (Date.now() < yahooBackoffUntil) {
    return { date: null, prevClose: null, points: [], error: "fetch-failed", errorDetail: "yahoo-backoff" };
  }
  const sym = YAHOO_SYMBOL[tickerOf(code)] ?? tickerOf(code);
  let json;
  try {
    const res = await fetch(YAHOO_CHART + encodeURIComponent(sym) + "?interval=1m&range=1d&includePrePost=false", {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) yahooBackoffUntil = Date.now() + YAHOO_BACKOFF_MS;
      return { date: null, prevClose: null, points: [], error: "fetch-failed", errorDetail: "HTTP " + res.status };
    }
    json = await res.json();
  } catch (e) {
    yahooBackoffUntil = Date.now() + YAHOO_BACKOFF_MS;
    return { date: null, prevClose: null, points: [], error: "fetch-failed", errorDetail: String(e?.message ?? e).slice(0, 80) };
  }
  const r = json?.chart?.result?.[0];
  const ts = Array.isArray(r?.timestamp) ? r.timestamp : [];
  const q = r?.indicators?.quote?.[0] ?? {};
  const points = [];
  for (let i = 0; i < ts.length; i++) {
    const p = q.close?.[i];
    if (typeof ts[i] !== "number" || typeof p !== "number" || !Number.isFinite(p) || p <= 0) continue;
    const v = q.volume?.[i];
    points.push({ t: ts[i], p, v: typeof v === "number" && Number.isFinite(v) ? v : 0 });
  }
  if (points.length === 0) return { date: null, prevClose: null, points: [], error: "no-data" };
  const pc = r?.meta?.chartPreviousClose;
  return {
    date: nyDate(points[0].t),
    prevClose: typeof pc === "number" && Number.isFinite(pc) ? pc : null,
    points,
    error: null,
  };
}

/** K 线：东方财富（前复权）-> 腾讯美股（未复权）；指数只走东方财富 */
export async function fetchKline(code, period = "day") {
  const per = ["day", "week", "month"].includes(period) ? period : "day";
  const key = "kl:" + code + ":" + per;
  const hit = cached(key, CACHE_TTL.kline);
  if (hit) return hit;
  const em = await eastmoney.fetchKline(code, per);
  if (em.candles?.length) return remember(key, em);
  if (indexOfCode("us", code)) {
    return { candles: [], adjust: null, error: em.error ?? "no-data", errorDetail: em.errorDetail ?? null };
  }
  const tx = await tencentKline(code, per);
  if (tx.candles.length) return remember(key, tx);
  const error = em.error === "fetch-failed" || tx.error === "fetch-failed" ? "fetch-failed" : (tx.error ?? em.error ?? "no-data");
  return { candles: [], adjust: null, error, errorDetail: em.errorDetail ?? null };
}

/** 分时：东方财富（trends2）-> Yahoo 1 分钟（带退避） */
export async function fetchMinuteDetail(code) {
  const key = "min:" + code;
  const hit = cached(key, CACHE_TTL.minute);
  if (hit) return hit;
  const em = await eastmoney.fetchMinuteDetail(code);
  if (em.points?.length) return remember(key, em);
  const yh = await yahooMinute(code);
  if (yh.points.length) return remember(key, yh);
  const error = em.error === "fetch-failed" || yh.error === "fetch-failed" ? "fetch-failed" : (yh.error ?? em.error ?? "no-data");
  return { date: null, prevClose: null, points: [], error, errorDetail: yh.errorDetail ?? em.errorDetail ?? null };
}
