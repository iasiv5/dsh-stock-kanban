/**
 * 东方财富适配器（美股主源；A 股/港股备源）—— 零依赖，Node fetch。
 *
 * 协议知识来源：dsh-stock-view (Justin-Mai, MIT)，2026-11-06 实测复核；
 * 2026-11-13 多源降级改造（P0-1/P0-3，链形态与字段口径参考 suifei/dsh-market-lens，MIT，见 NOTICE）：
 *   - 多市场：cn（sh→1. / sz→0. / bj→0.）、hk（116.）经 ulist 批量取数，作为腾讯备源；
 *     hkHSI 等字母别名指数不经 EM（腾讯主源直连），directSecid 返回 undefined 跳过；
 *   - 美股指数 DJI/IXIC/INX 预置 secid（100.DJIA/100.NDX/100.SPX）——交易所探测
 *     （105/106/107）探不到指数，必须预置（2026-11-13 push2his 实测 K 线/分时可用）；
 *   - 快照补全字段（f15 高/f16 低/f17 开/f18 昨收/f5 量/f6 额）与更新时间戳 f124 →
 *     quoteTimeMs（美股新鲜度从此有行情时间口径，不再只按拉取时间判定）；
 *   - push2 在部分网络不可达（本机 2026-11-13 实测 https/http 均 502，push2his 正常）：
 *     GET 网络级失败/5xx 时 https→http 各重试一次（仅公开只读数据）。
 *   - 腾讯对美股不完整（分时 1 点 / 日K只有两根），EM 完整可用——故 us 主源仍是 EM。
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

/** 美股指数代码 → EM secid（预置，探测不到） */
const INDEX_SECID = { DJI: "100.DJIA", IXIC: "100.NDX", INX: "100.SPX" };

export function handles(market) {
  return market === "us" || market === "cn" || market === "hk";
}

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

async function emFetch(url, timeout) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) {
    const e = new Error("HTTP " + res.status);
    e.httpStatus = res.status;
    throw e;
  }
  return res;
}

/** GET JSON：网络级失败或 5xx 且原 URL 为 https 时，降级 http 重试一次（公开只读数据） */
async function emJson(url, timeout = TIMEOUT_MS) {
  try {
    const r = await emFetch(url, timeout);
    return await r.json();
  } catch (e) {
    const retryable = e?.httpStatus === undefined || e.httpStatus >= 500;
    if (retryable && url.startsWith("https://")) {
      const r = await emFetch("http://" + url.slice("https://".length), timeout);
      return await r.json();
    }
    throw e;
  }
}

/**
 * 目录式 secid（cn/hk/美股指数）。返回：
 *   string = 直接映射；null = 美股个股（需交易所探测）；undefined = EM 不服务（hkHSI 等字母别名）。
 */
export function directSecid(code) {
  const raw = String(code ?? "");
  if (/^sh/i.test(raw)) return "1." + raw.slice(2);
  if (/^sz/i.test(raw) || /^bj/i.test(raw)) return "0." + raw.slice(2);
  if (/^hk/i.test(raw)) {
    const tail = raw.slice(2);
    return /^\d{5}$/.test(tail) ? "116." + tail : undefined;
  }
  const t = raw.toUpperCase();
  if (INDEX_SECID[t]) return INDEX_SECID[t];
  return null;
}

/* secid 解析（进程内缓存；搜索可预置，见 search.mjs 的 seedUSSecid） */
const SECID_CACHE = new Map();

export function seedUSSecid(ticker, suffix) {
  const t = String(ticker ?? "").toUpperCase();
  const ex = SUFFIX_TO_EXCHANGE[String(suffix ?? "").toUpperCase()];
  if (t && ex) SECID_CACHE.set(t, ex + "." + t);
}

export function peekUSSecid(ticker) {
  return SECID_CACHE.get(String(ticker ?? "").toUpperCase()) ?? null;
}

/** AAPL → secid（"105.AAPL"）；美股指数走预置；确认不存在缓存 null；默认探测失败返回 null，严格模式抛出 SECID_TRANSPORT */
export async function resolveUSSecid(code, { strict = false } = {}) {
  const ticker = String(code ?? "").replace(/^us/i, "").toUpperCase().split(".")[0];
  if (!ticker) return null;
  if (INDEX_SECID[ticker]) return INDEX_SECID[ticker];
  if (SECID_CACHE.has(ticker)) return SECID_CACHE.get(ticker);
  let transportFailures = 0;
  for (const ex of US_EXCHANGES) {
    const secid = ex + "." + ticker;
    try {
      const j = await emJson(EM_PUSH + "/api/qt/stock/get?secid=" + encodeURIComponent(secid) + "&fields=f57&invt=2&fltt=2", 8000);
      if (j?.data?.f57) {
        SECID_CACHE.set(ticker, secid);
        return secid;
      }
    } catch {
      transportFailures += 1; // 传输失败不计为「确认不存在」，不得负缓存（评审轮3 R3-1）
      /* 试下一个交易所 */
    }
  }
  // push2 探测域全传输失败时，降级用 push2his kline 轻探测（2026-11-13 本机实录：push2 域 502
  // 而 push2his 数据域可达，secid 解析假死导致美股 K 线/分时整链不可用）。命中即缓存返回；
  // push2his 应答但无该代码视为该候选「明确无」；降级探测自身传输失败同样计入传输失败
  // （不得负缓存、strict 抛 SECID_TRANSPORT）
  if (transportFailures > 0) {
    for (const ex of US_EXCHANGES) {
      const secid = ex + "." + ticker;
      try {
        const j = await emJson(EM_HIS + "/api/qt/stock/kline/get?secid=" + encodeURIComponent(secid) + "&klt=101&fqt=1&lmt=2&end=20500101&fields1=f1,f2,f3&fields2=f51,f52", 8000);
        if (j?.data?.code) {
          SECID_CACHE.set(ticker, secid);
          return secid;
        }
      } catch {
        transportFailures += 1;
      }
    }
  }
  // 三交易所都明确应答且均无此代码，才确认不存在并负缓存；有任何传输失败则下次重新探测
  if (transportFailures > 0 && strict) {
    // 严格模式（详情/分时/K 线/快照路径）：传输失败不得伪装成「无此代码」，抛出供提供方级退避计数
    const err = new Error("secid-transport");
    err.code = "SECID_TRANSPORT";
    throw err;
  }
  if (transportFailures === 0) SECID_CACHE.set(ticker, null);
  return null;
}

const ULIST_FIELDS = "f2,f3,f4,f5,f6,f12,f13,f14,f15,f16,f17,f18,f124";

/** ulist 行 → 快照行（按入参 code 回填键；缺字段为 null，绝不补 0） */
function ulistRowToQuote(row, code) {
  if (!row) return null;
  const price = num(row.f2);
  if (price == null || price <= 0) return null;
  const ts = num(row.f124);
  return {
    code: String(code),
    name: typeof row.f14 === "string" ? row.f14 : "",
    price,
    changePercent: num(row.f3),
    changeAmount: num(row.f4),
    volume: num(row.f5),
    amount: num(row.f6),
    high: num(row.f15),
    low: num(row.f16),
    open: num(row.f17),
    prevClose: num(row.f18),
    quoteTimeMs: ts != null ? ts * 1000 : null,
    quoteTimeText: null,
  };
}

/**
 * 批量快照（cn/hk/美股指数直接映射 secid；美股个股先探测）：一个 ulist 请求；
 * 未解析出 secid 的代码与被 EM 静默丢弃的行缺席结果 Map（调用方按链交下一源）。
 */
export async function fetchBatchSnapshots(codes) {
  const out = new Map();
  const list = [...new Set((codes ?? []).map((c) => String(c ?? "").trim()).filter(Boolean))].slice(0, 60);
  if (list.length === 0) return out;
  const secidOf = new Map();
  for (const code of list) {
    const direct = directSecid(code);
    if (typeof direct === "string") {
      secidOf.set(code, direct);
    } else if (direct === null) {
      const secid = await resolveUSSecid(code, { strict: true });
      if (secid) secidOf.set(code, secid);
    }
    /* undefined：EM 不服务（hkHSI 等）→ 缺席，交下一源 */
  }
  if (secidOf.size === 0) return out;
  const secids = [...secidOf.values()].join(",");
  const url = EM_PUSH + "/api/qt/ulist.np/get?secids=" + encodeURIComponent(secids) + "&fields=" + ULIST_FIELDS + "&fltt=2&invt=2";
  const j = await emJson(url);
  const diff = j?.data?.diff;
  const rows = Array.isArray(diff) ? diff : diff && typeof diff === "object" ? Object.values(diff) : [];
  const bySecid = new Map();
  for (const row of rows) {
    if (row?.f12 === undefined || row?.f13 === undefined) continue;
    bySecid.set(String(row.f13) + "." + String(row.f12), row);
  }
  for (const [code, secid] of secidOf) {
    const quote = ulistRowToQuote(bySecid.get(secid), code);
    if (quote) out.set(code, quote);
  }
  return out;
}

const SNAP_FIELDS = "f43,f44,f45,f46,f47,f48,f57,f58,f60,f124,f169,f170";

/** 单标的完整快照（cn/hk 备源与 us 主源共用；详情页高低开收全字段 + f124 时间戳） */
export async function fetchQuote(code, opts = {}) {
  const direct = directSecid(code);
  let secid = typeof direct === "string" ? direct : null;
  if (direct === null) secid = await resolveUSSecid(code, { strict: opts?.strict === true });
  if (!secid) return null;
  const j = await emJson(EM_PUSH + "/api/qt/stock/get?secid=" + encodeURIComponent(secid) + "&fields=" + SNAP_FIELDS + "&invt=2&fltt=2");
  const d = j?.data;
  const price = num(d?.f43);
  if (!d || price == null || price <= 0) return null;
  const ts = num(d.f124);
  return {
    code: String(d.f57 ?? code).toUpperCase(),
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
    quoteTimeMs: ts != null ? ts * 1000 : null,
    quoteTimeText: null,
  };
}

const KLT_OF_PERIOD = { day: "101", week: "102", month: "103" };
const LIMIT_OF_PERIOD = { day: 180, week: 150, month: 120 };

/** K线（fqt=1 前复权；美股指数经预置 secid 同路径）。行 CSV：date,open,close,high,low,volume,… */
export async function fetchKline(code, period = "day") {
  let secid;
  try {
    secid = await resolveUSSecid(code, { strict: true });
  } catch (e) {
    return { candles: [], adjust: null, error: "fetch-failed", errorDetail: String(e.message ?? e).slice(0, 80) };
  }
  if (!secid) return { candles: [], adjust: null, error: "not-found" };
  const klt = KLT_OF_PERIOD[period] ?? "101";
  const lmt = LIMIT_OF_PERIOD[period] ?? 180;
  const url = EM_HIS + "/api/qt/stock/kline/get?secid=" + encodeURIComponent(secid) + "&klt=" + klt + "&fqt=1&lmt=" + lmt + "&end=20500101"
    + "&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57";
  let j;
  try {
    j = await emJson(url);
  } catch (e) {
    return { candles: [], adjust: null, error: "fetch-failed", errorDetail: String(e.message ?? e).slice(0, 80) };
  }
  const rows = j?.data?.klines ?? [];
  if (!Array.isArray(rows) || rows.length === 0) return { candles: [], adjust: null, error: "no-data" };
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
  if (candles.length === 0) return { candles: [], adjust: null, error: "no-data" };
  return { candles, adjust: "qfq", error: null };
}

/** 分时（当日）。trends 行 "YYYY-MM-DD HH:mm",price,…（北京时间为轴） */
export async function fetchMinuteDetail(code) {
  let secid;
  try {
    secid = await resolveUSSecid(code, { strict: true });
  } catch (e) {
    return { date: null, prevClose: null, points: [], error: "fetch-failed", errorDetail: String(e.message ?? e).slice(0, 80) };
  }
  if (!secid) return { date: null, prevClose: null, points: [], error: "not-found" };
  const url = EM_HIS + "/api/qt/stock/trends2/get?secid=" + encodeURIComponent(secid)
    + "&fields1=f1,f2,f3,f4,f5,f6,f7,f8&fields2=f51,f53&iscr=0&ndays=1";
  let j;
  try {
    j = await emJson(url);
  } catch (e) {
    return { date: null, prevClose: null, points: [], error: "fetch-failed", errorDetail: String(e.message ?? e).slice(0, 80) };
  }
  const d = j?.data;
  const trends = Array.isArray(d?.trends) ? d.trends : [];
  if (trends.length === 0) return { date: null, prevClose: null, points: [], error: "no-data" };
  const points = [];
  for (const line of trends) {
    const c = String(line).split(",");
    if (c.length < 2) continue;
    const hm = c[0].trim();
    const p = num(c[1]);
    const v = num(c[4]) ?? 0;
    if (p == null || p <= 0) continue;
    const t = Math.round(Date.parse(hm.replace(" ", "T") + ":00+08:00") / 1000);
    if (!Number.isFinite(t) || t <= 0) continue;
    points.push({ t, p, v });
  }
  if (points.length === 0) return { date: null, prevClose: null, points: [], error: "no-data" };
  const preClose = num(d?.preClose);
  return {
    date: String(trends[0]).slice(0, 10),
    prevClose: preClose != null && preClose > 0 ? preClose : points[0].p,
    points,
    error: null,
  };
}
