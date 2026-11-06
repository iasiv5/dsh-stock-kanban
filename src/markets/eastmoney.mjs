/**
 * 东方财富适配器（美股）—— 零依赖，Node fetch。
 *
 * 协议知识来源：dsh-stock-view (Justin-Mai, MIT)，2026-11-06 实测复核：
 *   - 腾讯对美股不完整（分时 1 点 / 日K只有两根），EM 完整可用
 *   - secid 前缀：105=NASDAQ 106=NYSE 107=AMEX；未知 ticker 依次探测
 *   - 快照 stock/get；批量 ulist.np/get（无效 secid 会被静默丢弃）
 *   - K线 kline/get klt=101/102/103（日/周/月）fqt=1 前复权；行序 date,open,close,high,low,volume
 *   - 分时 trends2/get ndays=1，时间字符串为北京时间
 */

const EM_PUSH = "https://push2.eastmoney.com";
const EM_HIS = "https://push2his.eastmoney.com";
const HEADERS = {
  accept: "application/json, text/plain, */*",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  referer: "https://quote.eastmoney.com/",
};
const TIMEOUT_MS = 12000;
const US_EXCHANGES = ["105", "106", "107"];
const SUFFIX_TO_EXCHANGE = { OQ: "105", N: "106", AM: "107" };

export function handles(market) {
  return market === "us";
}

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

async function emJson(url, timeout = TIMEOUT_MS) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* secid 解析（进程内缓存；搜索可预置，见 search.mjs 的 seedUSSecid） */
const SECID_CACHE = new Map();

export function seedUSSecid(ticker, suffix) {
  const t = String(ticker ?? "").toUpperCase();
  const ex = SUFFIX_TO_EXCHANGE[String(suffix ?? "").toUpperCase()];
  if (t && ex) SECID_CACHE.set(t, `${ex}.${t}`);
}

export function peekUSSecid(ticker) {
  return SECID_CACHE.get(String(ticker ?? "").toUpperCase()) ?? null;
}

/** `AAPL` → secid（"105.AAPL"）；确认不存在缓存 null；探测失败返回 null */
export async function resolveUSSecid(code) {
  const ticker = String(code ?? "").replace(/^us/i, "").toUpperCase().split(".")[0];
  if (!ticker) return null;
  if (SECID_CACHE.has(ticker)) return SECID_CACHE.get(ticker);
  for (const ex of US_EXCHANGES) {
    const secid = `${ex}.${ticker}`;
    try {
      const j = await emJson(`${EM_PUSH}/api/qt/stock/get?secid=${secid}&fields=f57&invt=2&fltt=2`, 8000);
      if (j?.data?.f57) {
        SECID_CACHE.set(ticker, secid);
        return secid;
      }
    } catch {
      /* 试下一个交易所 */
    }
  }
  SECID_CACHE.set(ticker, null);
  return null;
}

/** ulist 批量行 → quote */
function ulistRowToQuote(row) {
  if (!row) return null;
  const price = num(row.f2);
  if (price == null || price <= 0) return null;
  return {
    code: String(row.f12 ?? "").toUpperCase(),
    name: typeof row.f14 === "string" ? row.f14 : "",
    price,
    changePercent: num(row.f3),
    changeAmount: num(row.f4),
    high: null,
    low: null,
    prevClose: null,
    open: null,
    volume: null,
    amount: null,
    quoteTimeText: null,
  };
}

/** 批量快照：一个 ulist 请求；未解析出 secid 的 ticker 跳过（返回 Map 可能少于入参） */
export async function fetchBatchSnapshots(codes) {
  const out = new Map();
  const list = (codes ?? []).map((c) => String(c ?? "").toUpperCase()).filter(Boolean);
  if (list.length === 0) return out;
  const secids = [];
  for (const code of list.slice(0, 60)) {
    const secid = await resolveUSSecid(code);
    if (secid) secids.push(secid);
  }
  if (secids.length === 0) return out;
  const url = `${EM_PUSH}/api/qt/ulist.np/get?secids=${secids.join(",")}&fields=f2,f3,f4,f12,f13,f14&fltt=2&invt=2`;
  const j = await emJson(url);
  const diff = j?.data?.diff;
  const rows = Array.isArray(diff) ? diff : diff && typeof diff === "object" ? Object.values(diff) : [];
  for (const row of rows) {
    const quote = ulistRowToQuote(row);
    if (quote) out.set(quote.code, quote);
  }
  return out;
}

const SNAP_FIELDS = "f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170";

/** 单标的完整快照（详情页用：含高低开收/量额） */
export async function fetchQuote(code) {
  const secid = await resolveUSSecid(code);
  if (!secid) return null;
  const j = await emJson(`${EM_PUSH}/api/qt/stock/get?secid=${secid}&fields=${SNAP_FIELDS}&invt=2&fltt=2`);
  const d = j?.data;
  const price = num(d?.f43);
  if (!d || price == null || price <= 0) return null;
  return {
    code: String(d.f57 ?? "").toUpperCase(),
    name: typeof d.f58 === "string" ? d.f58 : "",
    price,
    high: num(d.f44),
    low: num(d.f45),
    open: num(d.f46),
    prevClose: num(d.f60),
    changeAmount: num(d.f169),
    changePercent: num(d.f170),
    volume: num(d.f47),
    amount: num(d.f48),
    quoteTimeText: null,
  };
}

const KLT_OF_PERIOD = { day: "101", week: "102", month: "103" };
const LIMIT_OF_PERIOD = { day: 180, week: 150, month: 120 };

/** K线（fqt=1 前复权）。行 CSV：date,open,close,high,low,volume,amount,… */
export async function fetchKline(code, period = "day") {
  const secid = await resolveUSSecid(code);
  if (!secid) return { candles: [], adjust: null, error: "未找到该美股代码" };
  const klt = KLT_OF_PERIOD[period] ?? "101";
  const lmt = LIMIT_OF_PERIOD[period] ?? 180;
  const url = `${EM_HIS}/api/qt/stock/kline/get?secid=${secid}&klt=${klt}&fqt=1&lmt=${lmt}&end=20500101`
    + "&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57";
  let j;
  try {
    j = await emJson(url);
  } catch (e) {
    return { candles: [], adjust: null, error: `行情获取失败(${e.message})` };
  }
  const rows = j?.data?.klines ?? [];
  if (!Array.isArray(rows) || rows.length === 0) return { candles: [], adjust: null, error: "无K线数据" };
  const candles = [];
  for (const line of rows) {
    const c = String(line).split(",");
    const open = num(c[1]);
    const close = num(c[2]);
    const high = num(c[3]);
    const low = num(c[4]);
    if (!/^\d{4}-\d{2}-\d{2}/.test(c[0] ?? "") || open == null || close == null || high == null || low == null) continue;
    candles.push({ time: String(c[0]).slice(0, 10), open, high, low, close, volume: num(c[5]) ?? 0 });
  }
  if (candles.length === 0) return { candles: [], adjust: null, error: "无K线数据" };
  return { candles, adjust: "qfq", error: null };
}

/** 分时（当日）。trends 行 "YYYY-MM-DD HH:mm",price,…（北京时间为轴） */
export async function fetchMinuteDetail(code) {
  const secid = await resolveUSSecid(code);
  if (!secid) return { date: null, prevClose: null, points: [], error: "未找到该美股代码" };
  const url = `${EM_HIS}/api/qt/stock/trends2/get?secid=${secid}`
    + "&fields1=f1,f2,f3,f4,f5,f6,f7,f8&fields2=f51,f53&iscr=0&ndays=1";
  let j;
  try {
    j = await emJson(url);
  } catch (e) {
    return { date: null, prevClose: null, points: [], error: `行情获取失败(${e.message})` };
  }
  const d = j?.data;
  const trends = Array.isArray(d?.trends) ? d.trends : [];
  if (trends.length === 0) return { date: null, prevClose: null, points: [], error: "无分时数据" };
  const points = [];
  for (const line of trends) {
    const c = String(line).split(",");
    if (c.length < 2) continue;
    const hm = c[0].trim();
    const p = num(c[1]);
    const v = num(c[4]) ?? 0;
    if (p == null || p <= 0) continue;
    const t = Math.round(Date.parse(`${hm.replace(" ", "T")}:00+08:00`) / 1000);
    if (!Number.isFinite(t) || t <= 0) continue;
    points.push({ t, p, v });
  }
  if (points.length === 0) return { date: null, prevClose: null, points: [], error: "无分时数据" };
  const preClose = num(d?.preClose);
  return {
    date: String(trends[0]).slice(0, 10),
    prevClose: preClose != null && preClose > 0 ? preClose : points[0].p,
    points,
    error: null,
  };
}
