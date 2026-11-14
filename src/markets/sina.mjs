/**
 * 新浪财经适配器（A 股 / ETF / 指数 / 北交所快照备源）—— 零依赖，Node fetch。
 *
 * 协议知识来源：ZhuLinsen/daily_stock_analysis (MIT) 新浪直连口径（akshare_fetcher），见 NOTICE.md；
 * 2026-11-14 经 scripts/probe-markets.mjs 实测复核（§12.44，volume-cn-kline-compare / sina-cn-snapshot 组）：
 *   - 批量快照 hq.sinajs.cn/list=<codes>（GBK；必须带 Referer: https://finance.sina.com.cn/，实测缺省即拒）
 *   - 行格式：var hq_str_<code>="名称,今开,昨收,现价,最高,最低,买一价,卖一价,量(股),额(元),…,日期YYYY-MM-DD,时间HH:MM:SS,…"
 *     前缀实测为 hq_str_（非腾讯的 v_）；f8 为**股**（与腾讯 K 线手口径互证：600519 ratio 0.01、688111 ratio 1.00）；
 *     f30/f31 为横杠日期+冒号时间（非紧凑数字）。
 *   - 量纲：本适配器 volume 原样透传（股），与 K 线归一后的「股/份」口径一致（capability-matrix §精度与单位口径）。
 *   - 覆盖面实测：sh/sz/bj（920 号段）均有返回；停牌（现价 0）行剔除 → 结果缺席，调用方按链补位。
 */

const SINA_HOST = "https://hq.sinajs.cn/list=";
const BATCH_CAP = 60; // 每请求上限；超出内部分块顺序请求（本适配器为 cn 链末位，不得 cap 丢码）
const TIMEOUT_MS = 12000;
const REFERER = "https://finance.sina.com.cn/";

/** 该市场是否由本适配器服务 */
export function handles(market) {
  return market === "cn";
}

/** GBK 文本（新浪必须带 Referer，实测缺省即拒） */
async function fetchText(url) {
  const res = await fetch(url, { headers: { accept: "text/plain,*/*", referer: REFERER }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  try {
    return new TextDecoder("gbk").decode(buf);
  } catch {
    return buf.toString("utf8");
  }
}

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 解析新浪快照文本 → Map(code → quote)。
 * 行：var hq_str_sh600519="f0名称,f1今开,f2昨收,f3现价,f4高,f5低,…,f8量(股),f9额(元),…,f30日期,f31时间,…"
 * 停牌/无效行（现价 ≤ 0 或缺昨收）剔除；quoteTimeMs 按东八区（行情市场当地口径，与 tencent.quoteTimeOf 一致）。
 */
export function parseSinaSnapshot(text) {
  const out = new Map();
  if (typeof text !== "string") return out;
  for (const m of text.matchAll(/hq_str_([\w]+)="([^"]*)"/g)) {
    const code = m[1].toLowerCase();
    const f = m[2].split(",");
    const price = num(f[3]);
    const prevClose = num(f[2]);
    if (!code || price == null || price <= 0 || prevClose == null) continue;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(f[30] ?? "") ? f[30] : null;
    const t = /^\d{1,2}:\d{2}:\d{2}$/.test(f[31] ?? "") ? f[31] : null;
    let quoteTimeMs = null;
    if (d && t) {
      const [hh, mm, ss] = t.split(":");
      const ms = Date.parse(`${d}T${hh.padStart(2, "0")}:${mm}:${ss}+08:00`);
      if (Number.isFinite(ms)) quoteTimeMs = ms;
    }
    out.set(code, {
      code,
      name: String(f[0] ?? "").trim(),
      price,
      prevClose,
      open: num(f[1]),
      high: num(f[4]),
      low: num(f[5]),
      changeAmount: price - prevClose,
      changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : null,
      volume: num(f[8]), // 新浪口径 = 股，原样透传
      amount: num(f[9]),
      quoteTimeMs,
      quoteTimeText: null,
    });
  }
  return out;
}

/** 批量快照（cn 一批，>60 码内部分块顺序请求）。返回 Map(code → quote)；上游失败抛错（调用方按链处置） */
export async function fetchBatchSnapshots(codes) {
  const list = [...new Set((codes ?? []).map((c) => String(c ?? "").trim()).filter(Boolean))];
  const out = new Map();
  for (let i = 0; i < list.length; i += BATCH_CAP) {
    const chunk = list.slice(i, i + BATCH_CAP);
    const text = await fetchText(`${SINA_HOST}${chunk.join(",")}`);
    for (const [k, v] of parseSinaSnapshot(text)) out.set(k, v);
  }
  return out;
}
