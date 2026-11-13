/**
 * Yahoo Finance chart 适配器（美股备源）—— 零依赖，Node fetch。
 *
 * 2026-11-13 新增（多源降级链 us: 东方财富 → Yahoo）：EM push2 在部分网络不可达
 * （本机实测 https/http 均 502，push2his 集群正常）时兜底美股批量快照；顺带补齐美股
 * 行情时间戳（meta.regularMarketTime，此前美股新鲜度只能按拉取时间判定）。
 * 只服务快照（批量/详情）；K 线与分时仍走 EM 主源（push2his 域，与 push2 不同集群）。
 * 协议知识（chart v8 无 crumb 直连 + 浏览器 UA/referer、meta 字段口径）参考
 * suifei/dsh-market-lens 的 yahoo.js（MIT，见 NOTICE.md），按本仓行形状重写。
 */

const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const HEADERS = {
  accept: "application/json, text/plain, */*",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  referer: "https://finance.yahoo.com/",
};
const TIMEOUT_MS = 8000;

/** 美股指数代码 → Yahoo 符号（普通 ticker 原样） */
const INDEX_SYMBOL = { DJI: "^DJI", IXIC: "^IXIC", INX: "^GSPC" };

export function handles(market) {
  return market === "us";
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function symbolOf(code) {
  const t = String(code ?? "").toUpperCase();
  return INDEX_SYMBOL[t] ?? t;
}

/** 单标的 chart 元数据（interval=1d&range=1mo 只为 meta，K 线一根都不必用） */
async function chartMeta(code) {
  const url = CHART_URL + "/" + encodeURIComponent(symbolOf(code)) + "?interval=1d&range=1mo&includePrePost=false";
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("no-chart-meta");
  return meta;
}

/** meta → 快照行（与 tencent/eastmoney 行同形状；缺字段为 null，绝不补 0） */
function metaToQuote(code, meta) {
  const price = num(meta.regularMarketPrice);
  if (price == null || price <= 0) return null;
  // 涨跌幅口径（2026-11-13 评审轮1修正）：meta.regularMarketChangePercent 直读（当日 vs 昨收），
  // 昨收由 price/(1+pct/100) 反推（腾讯分时 prevClose 同款推导先例）。chartPreviousClose 是
  // range 起点的前收盘、随 range 漂移（实测 range=1mo → 约一个月前收盘），不可当昨收——
  // 该坑自 dsh-market-lens lib/sources/yahoo.js 原样继承（上游同病）；pct 缺失/≤-100 时才回落。
  const pct = num(meta.regularMarketChangePercent);
  let prevClose = null;
  let changePercent = null;
  let changeAmount = null;
  if (pct != null && pct > -100) {
    changePercent = pct;
    prevClose = Math.round((price / (1 + pct / 100)) * 1e4) / 1e4;
    changeAmount = Math.round((price - prevClose) * 1e4) / 1e4;
  } else {
    prevClose = num(meta.chartPreviousClose) ?? num(meta.previousClose);
    changeAmount = prevClose != null ? Math.round((price - prevClose) * 1e4) / 1e4 : null;
    changePercent = prevClose != null && prevClose > 0 ? Math.round(((price - prevClose) / prevClose) * 1e6) / 1e4 : null;
  }
  const ts = num(meta.regularMarketTime);
  return {
    code: String(code),
    name: typeof meta.shortName === "string" && meta.shortName ? meta.shortName : (meta.longName ?? String(code)),
    price,
    prevClose,
    open: num(meta.regularMarketOpen),
    high: num(meta.regularMarketDayHigh),
    low: num(meta.regularMarketDayLow),
    changeAmount,
    changePercent,
    volume: num(meta.regularMarketVolume),
    amount: null,
    quoteTimeMs: ts != null ? ts * 1000 : null,
    quoteTimeText: null,
  };
}

/**
 * 批量快照：逐标的 chart（meta 自包含，无批量端点；美股列表分组下标的一般是个位数，
 * 且本方法只在 EM 整体失败/退避后才被调用）。逐标的独立判错：失败标的缺席结果 Map。
 */
export async function fetchBatchSnapshots(codes) {
  const out = new Map();
  const list = [...new Set((codes ?? []).map((c) => String(c ?? "").trim().toUpperCase()).filter(Boolean))].slice(0, 20);
  for (const code of list) {
    try {
      out.set(code, metaToQuote(code, await chartMeta(code)));
    } catch {
      /* 逐标的独立判错：缺席即让位（全链失败由调用方标 error） */
    }
  }
  return out;
}
