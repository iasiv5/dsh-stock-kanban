/**
 * 腾讯美股备源（2026-11-13 新增）：美股链 东方财富 → 腾讯美股 → Yahoo。
 *
 * 2026-11-13 实测：qt.gtimg.cn/q=usAAPL,usNVDA 一次批量返回完整报价，字段与 A 股同序
 * （3 现价 4 昨收 5 今开 33 高 34 低 31 涨跌额 32 涨跌% 36 量 37 额），美股行情时间为美东本地时间
 * （字段 30，形如 "2026-11-12 16:00:01"）。换算须走 America/New_York（EST/EDT 随时段变化）。
 * 腾讯不提供美股 K 线/分时的完整数据，本适配器只服务快照；K 线与分时仍走东方财富。
 */

const BATCH_HOST = "https://qt.gtimg.cn";
const TIMEOUT_MS = 8000;

export function handles(market) {
  return market === "us";
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** 美东本地时间文本 "YYYY-MM-DD HH:mm:ss" → epoch ms；无法解析返回 null */
export function usQuoteTimeOf(text) {
  if (typeof text !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  // 以 UTC 构造同一墙钟时刻，再用 America/New_York 的实际偏移回推（处理 EST/EDT）
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  const offsetOf = (t) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(t));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return asUtc - t;
  };
  const off1 = offsetOf(wall);
  const guess = wall - off1;
  const off2 = offsetOf(guess);
  const ms = wall - off2;
  return Number.isFinite(ms) ? ms : null;
}

/** 解析批量快照文本 → Map(code → quote)。字段口径见文件头注释。 */
export function parseUsSnapshot(text) {
  const out = new Map();
  if (typeof text !== "string") return out;
  for (const chunk of text.split(";")) {
    const m = /v_us([A-Za-z0-9.]+)=\s*"([^"]*)"/.exec(chunk);
    if (!m) continue;
    const f = m[2].split("~");
    if (f.length < 35) continue;
    const price = num(f[3]);
    if (price == null || price <= 0) continue;
    const ticker = String(f[2] ?? "").split(".")[0].toUpperCase() || m[1].toUpperCase();
    out.set(ticker, {
      code: ticker,
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
      quoteTimeText: typeof f[30] === "string" && f[30] !== "" ? f[30] : null,
    });
  }
  return out;
}

/** 腾讯美股行的时间戳（epoch ms）；无则 null */
export function quoteTimeOf(quote) {
  return usQuoteTimeOf(quote?.quoteTimeText);
}

/**
 * 批量快照：一次 HTTP 请求覆盖全部美股代码。HTTP 失败或网络错误整批抛错（交由提供方级退避）；
 * 单个代码未出现在响应中的，缺席结果 Map（链内交下一源）。
 */
export async function fetchBatchSnapshots(codes) {
  const list = [...new Set((codes ?? []).map((c) => String(c ?? "").trim().toUpperCase()).filter(Boolean))].slice(0, 60);
  if (list.length === 0) return new Map();
  const url = BATCH_HOST + "/q=" + list.map((c) => "us" + c).join(",");
  const res = await fetch(url, { headers: { accept: "text/plain,*/*" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  let text;
  try {
    text = new TextDecoder("gbk").decode(buf);
  } catch {
    text = buf.toString("utf8");
  }
  return parseUsSnapshot(text);
}
