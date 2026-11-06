/**
 * OKX 现货适配器（加密货币）—— 零依赖，Node fetch。
 *
 * 协议知识来源：dsh-stock-view (Justin-Mai, MIT)，2026-11-06 实测复核：
 *   - Binance api.binance.com HTTP 451（地域限制）、CoinGecko simple/price 403（风控）→ 不采用
 *   - OKX 公开 REST 免 Key；业务错误是 HTTP 200 + code:"51001" 之类字符串，必须显式判错
 *   - ticker（单）/ tickers（全量 SPOT，一次请求，本机实测 1214 行）→ 批量行情
 *   - candles：返回新→旧需反转；日线按 UTC+8 切分；bar 1D/1W/1M、5m 分时
 */

const OKX = "https://www.okx.com/api/v5";
const UA = "dsh-stock-kanban/0.1 (DeepSeek Harness plugin)";
const TIMEOUT_MS = 12000;
const TZ_OFFSET_MS = 8 * 3600 * 1000;

export function handles(market) {
  return market === "crypto";
}

export function parseInstId(code) {
  const instId = String(code ?? "").trim().toUpperCase();
  const m = /^([A-Z0-9]{1,20})-([A-Z0-9]{1,20})$/.exec(instId);
  return m ? { instId, base: m[1], quote: m[2] } : null;
}

async function okxJson(path, timeout = TIMEOUT_MS) {
  const res = await fetch(`${OKX}${path}`, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && typeof json.code === "string" && json.code !== "0") {
    throw new Error(`OKX ${json.code}: ${String(json.msg ?? "").slice(0, 80)}`);
  }
  return json;
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

function tickerToQuote(t) {
  if (!t || t.last === undefined) return null;
  const price = num(t.last);
  if (price == null || price <= 0) return null;
  const open24h = num(t.open24h);
  return {
    code: String(t.instId ?? "").toUpperCase(),
    name: "",
    price,
    prevClose: open24h, // 24h 口径的基准价
    open: null,
    high: num(t.high24h),
    low: num(t.low24h),
    changeAmount: open24h != null ? price - open24h : null,
    changePercent: open24h != null && open24h > 0 ? ((price - open24h) / open24h) * 100 : null,
    volume: num(t.vol24h), // 基础币量（如 BTC）
    amount: num(t.volCcy24h), // 计价币额（如 USDT）
    quoteTimeMs: num(t.ts),
  };
}

/** 单标的快照 */
export async function fetchQuote(code) {
  const instId = parseInstId(code)?.instId;
  if (!instId) return null;
  const json = await okxJson(`/market/ticker?instId=${encodeURIComponent(instId)}`);
  return tickerToQuote(json?.data?.[0]);
}

/**
 * 批量快照：≤2 个用逐个 ticker（省流量），>2 个用一次全量 tickers 过滤。
 * 失败的 instId 缺席于结果 Map（调用方标 error），全量请求失败整体抛错（调用方退避）。
 */
export async function fetchBatchSnapshots(codes) {
  const list = [...new Set((codes ?? []).map((c) => parseInstId(c)?.instId).filter(Boolean))];
  const out = new Map();
  if (list.length === 0) return out;
  if (list.length <= 2) {
    for (const instId of list) {
      const quote = await fetchQuote(instId); // 失败上抛 → provider 级退避
      if (quote) out.set(quote.code, quote);
    }
    return out;
  }
  const json = await okxJson("/market/tickers?instType=SPOT", 20000);
  const byId = new Map((json?.data ?? []).map((t) => [String(t.instId ?? "").toUpperCase(), t]));
  for (const instId of list) {
    const quote = tickerToQuote(byId.get(instId));
    if (quote) out.set(quote.code, quote);
  }
  return out;
}

const BAR_OF_PERIOD = { day: "1D", week: "1W", month: "1M" };
const LIMIT_OF_PERIOD = { day: 180, week: 150, month: 120 };

/** K线（无复权概念，adjust 'none'） */
export async function fetchKline(code, period = "day") {
  const instId = parseInstId(code)?.instId;
  if (!instId) return { candles: [], adjust: null, error: "invalid-code" };
  const bar = BAR_OF_PERIOD[period] ?? "1D";
  const limit = LIMIT_OF_PERIOD[period] ?? 180;
  let json;
  try {
    json = await okxJson(`/market/candles?instId=${encodeURIComponent(instId)}&bar=${bar}&limit=${limit}`);
  } catch (e) {
    return { candles: [], adjust: null, error: `行情获取失败(${e.message})` };
  }
  const rows = json?.data ?? [];
  if (!Array.isArray(rows) || rows.length === 0) return { candles: [], adjust: null, error: "无K线数据" };
  const candles = rows
    .map((r) => ({
      time: new Date(num(r[0]) + TZ_OFFSET_MS).toISOString().slice(0, 10),
      open: num(r[1]),
      high: num(r[2]),
      low: num(r[3]),
      close: num(r[4]),
      volume: num(r[5]) ?? 0,
    }))
    .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.time) && c.open != null && c.close != null)
    .sort((a, b) => a.time.localeCompare(b.time));
  if (candles.length === 0) return { candles: [], adjust: null, error: "无K线数据" };
  return { candles, adjust: "none", error: null };
}

/** 分时 = 最近 24h（5m×288）；基准线取区间首根开盘价（与 24h 涨跌口径一致） */
export async function fetchMinuteDetail(code) {
  const instId = parseInstId(code)?.instId;
  if (!instId) return { date: null, prevClose: null, points: [], error: "invalid-code" };
  let json;
  try {
    json = await okxJson(`/market/candles?instId=${encodeURIComponent(instId)}&bar=5m&limit=288`);
  } catch (e) {
    return { date: null, prevClose: null, points: [], error: `行情获取失败(${e.message})` };
  }
  const rows = json?.data ?? [];
  if (!Array.isArray(rows) || rows.length === 0) return { date: null, prevClose: null, points: [], error: "无分时数据" };
  const asc = [...rows].sort((a, b) => num(a[0]) - num(b[0]));
  const points = asc
    .map((r) => ({ t: Math.round(num(r[0]) / 1000), p: num(r[4]), v: num(r[5]) ?? 0 }))
    .filter((p) => p.t > 0 && p.p != null && p.p > 0);
  if (points.length === 0) return { date: null, prevClose: null, points: [], error: "无分时数据" };
  const firstOpen = num(asc[0][1]);
  return {
    date: new Date(points[points.length - 1].t * 1000 + TZ_OFFSET_MS).toISOString().slice(0, 10),
    prevClose: firstOpen != null && firstOpen > 0 ? firstOpen : points[0].p,
    points,
    error: null,
  };
}
