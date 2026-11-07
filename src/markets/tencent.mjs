/**
 * 腾讯财经适配器（A股 / ETF / 港股）—— 零依赖，Node fetch。
 *
 * 协议知识来源：dsh-stock-watch (Awu12277, MIT) / dsh-stock-view (Justin-Mai, MIT)，
 * 2026-11-06 经 scripts/probe-markets.mjs 实测复核：
 *   - 批量快照 qt.gtimg.cn/q=<codes>（GBK；一次请求覆盖整列表）
 *   - 分时+快照 minute/query（proxy.finance.qq.com 主、web.ifzq.gtimg.cn 备，2026-09-29 WAF 前科）
 *   - K线 fqkline/get（qfq 参数 = 前复权；港股实测无 qfq 键 → 不复权口径）
 *   - K线行序实测 [date, open, close, high, low, volume]
 */

const BATCH_HOST = "https://qt.gtimg.cn";
const MINUTE_HOSTS = ["https://proxy.finance.qq.com/ifzqgtimg", "https://web.ifzq.gtimg.cn"];
const MINUTE_PATH = "/appstock/app/minute/query?code={code}&r=0.1";
const KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},{period},,,{count},qfq";

const TIMEOUT_MS = 12000;

/** 该市场是否由本适配器服务 */
export function handles(market) {
  return market === "cn" || market === "hk";
}

/** GBK 文本 */
async function fetchText(url) {
  const res = await fetch(url, { headers: { accept: "text/plain,*/*" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  try {
    return new TextDecoder("gbk").decode(buf);
  } catch {
    return buf.toString("utf8");
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 解析批量快照文本 → Map(code → quote)。
 * 字段（实测 2026-11-06）：1名称 3现价 4昨收 5今开 6量(手/A股；港股为股) 30时间 31涨跌额 32涨跌% 33高 34低 36量 37额(万)
 */
export function parseBatchSnapshot(text) {
  const out = new Map();
  if (typeof text !== "string") return out;
  for (const chunk of text.split(";")) {
    const m = /v_([a-z]+\d+)=\s*"([^"]*)"/.exec(chunk);
    if (!m) continue;
    const code = m[1];
    const f = m[2].split("~");
    if (f.length < 35) continue;
    const price = num(f[3]);
    if (price == null || price <= 0) continue;
    out.set(code, {
      code,
      name: String(f[1] ?? "").trim(),
      price,
      prevClose: num(f[4]),
      open: num(f[5]),
      high: num(f[33]),
      low: num(f[34]),
      changeAmount: num(f[31]),
      changePercent: num(f[32]),
      volume: num(f[36]),
      amount: num(f[37]) != null ? num(f[37]) * 10000 : null,
      // f[30] 形如 202611061614（交易当地时间）；无则空
      quoteTimeText: /^\d{12,14}$/.test(f[30] ?? "") ? f[30] : null,
    });
  }
  return out;
}

/** 行情本地时间文本 → epoch ms（按东八区，即行情市场当地口径）；无法解析返回 null */
export function quoteTimeOf(quote) {
  const text = quote?.quoteTimeText;
  if (!text) return null;
  const iso = text.length === 12 ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:00+08:00`
    : text.length === 14 ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}+08:00` : null;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** 批量快照（cn/hk/etf 一批）。返回 Map(code → quote)；空列表直接返回空 Map */
export async function fetchBatchSnapshots(codes) {
  const list = (codes ?? []).filter((c) => typeof c === "string" && c.length > 0);
  if (list.length === 0) return new Map();
  const uniq = [...new Set(list)].slice(0, 60); // 单请求上限防御
  const text = await fetchText(`${BATCH_HOST}/q=${uniq.join(",")}`);
  return parseBatchSnapshot(text);
}

/**
 * 分时（单标的）：{date, prevClose, points:[{t,p,v}], error}
 * points.t 为 epoch 秒（东八区口径），p 价格，v 成交量。
 */
export async function fetchMinuteDetail(code) {
  const apiCode = String(code ?? "").toLowerCase();
  let lastError = null;
  for (const host of MINUTE_HOSTS) {
    try {
      const json = await fetchJson(host + MINUTE_PATH.replace("{code}", apiCode));
      const sd = json?.data?.[apiCode];
      if (!sd?.data) return { date: null, prevClose: null, points: [], error: "no-data" };
      const dateText = typeof sd.data.date === "string" ? sd.data.date : "";
      const isoDate = dateText.length === 8 ? `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}` : null;
      const points = [];
      const raw = sd.data.data;
      if (Array.isArray(raw)) {
        for (const line of raw) {
          const parts = String(line).split(" ");
          if (parts.length < 2) continue;
          const hm = parts[0];
          const p = parseFloat(parts[1]);
          const v = parseFloat(parts[2]) || 0;
          if (!/^\d{4}$/.test(hm) || !Number.isFinite(p) || p <= 0) continue;
          let t = 0;
          if (isoDate) {
            const ms = Date.parse(`${isoDate}T${hm.slice(0, 2)}:${hm.slice(2, 4)}:00+08:00`);
            if (Number.isFinite(ms)) t = Math.round(ms / 1000);
          }
          if (t <= 0) continue;
          points.push({ t, p, v });
        }
      }
      const qt = sd.qt?.[apiCode];
      let prevClose = null;
      if (Array.isArray(qt) && qt.length >= 35) {
        const price = num(qt[3]);
        const chg = num(qt[32]);
        if (price != null && price > 0 && chg != null) prevClose = price / (1 + chg / 100);
      }
      if (points.length === 0) return { date: dateText || null, prevClose, points: [], error: "no-data" };
      return { date: dateText || null, prevClose, points, error: null };
    } catch (e) {
      lastError = e;
    }
  }
  return { date: null, prevClose: null, points: [], error: "fetch-failed", errorDetail: lastError ? String(lastError.message ?? lastError).slice(0, 80) : null };
}

const KLINE_COUNT = { day: 180, week: 150, month: 120 };

/**
 * K线：{candles:[{time,open,high,low,close,volume}], adjust:'qfq'|'none', error}
 * 实测列序 [date, open, close, high, low, volume]；qfq 键缺失（港股）时回落 day 键 → adjust 'none'。
 */
export async function fetchKline(code, period = "day") {
  const apiCode = String(code ?? "").toLowerCase();
  const per = ["day", "week", "month"].includes(period) ? period : "day";
  const url = KLINE_URL.replace("{code}", apiCode).replace("{period}", per).replace("{count}", String(KLINE_COUNT[per]));
  let json;
  try {
    json = await fetchJson(url);
  } catch (e) {
    return { candles: [], adjust: null, error: "fetch-failed", errorDetail: String(e.message ?? e).slice(0, 80) };
  }
  if (!json || json.code !== 0) return { candles: [], adjust: null, error: "api-error" };
  const sd = json?.data?.[apiCode];
  if (!sd) return { candles: [], adjust: null, error: "no-data" };
  const keys = per === "day" ? ["qfqday", "day"] : per === "week" ? ["qfqweek", "week"] : ["qfqmonth", "month"];
  let rows = null;
  let adjust = null;
  for (const k of keys) {
    if (Array.isArray(sd[k])) {
      rows = sd[k];
      adjust = k.startsWith("qfq") ? "qfq" : "none";
      break;
    }
  }
  if (!rows) return { candles: [], adjust: null, error: "no-data" };
  const candles = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const time = String(row[0]);
    const open = parseFloat(row[1]);
    const close = parseFloat(row[2]);
    const high = parseFloat(row[3]);
    const low = parseFloat(row[4]);
    const volume = parseFloat(row[5]) || 0;
    if (!/^\d{4}-\d{2}-\d{2}/.test(time) || !Number.isFinite(open) || !Number.isFinite(close) || !Number.isFinite(high) || !Number.isFinite(low)) continue;
    candles.push({ time: time.slice(0, 10), open, high, low, close, volume });
  }
  if (candles.length === 0) return { candles: [], adjust: null, error: "no-data" };
  return { candles, adjust, error: null };
}
