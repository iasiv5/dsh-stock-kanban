/**
 * 标的身份与市场常量 —— 纯函数，无 IO。
 *
 * 身份结构（不以显示名称为键）：
 *   { market, code, quoteCurrency }
 *   - market: 'cn' | 'hk' | 'us' | 'crypto'（ETF 是 kind，不是 market；归入其上市市场）
 *   - code:   提供方原生代码，cn/hk 带交易所前缀（sh600519 / hk00700），us 为大写 ticker，
 *             crypto 为交易对 instId（BTC-USDT，含报价币）
 *   - quoteCurrency: 报价币种；美元(USD)与 USDT 永不合并
 *
 * 标的 ID = `${market}:${code}`，作为存储表主键。
 */

export const MARKETS = ["cn", "hk", "us", "crypto"];

/** 市场显示名（UI 顺序即数组顺序） */
export const MARKET_LABELS = { cn: "A 股", hk: "港股", us: "美股", crypto: "加密货币" };

/** 各市场默认报价币种（crypto 以交易对实际报价币为准，见 parseCryptoCode） */
export const QUOTE_CURRENCY = { cn: "CNY", hk: "HKD", us: "USD" };

const CODE_RES = {
  // cn：sh/sz/bj 前缀 + 4~6 位数字（号段白名单在下方再过一遍）
  cn: /^(sh|sz|bj)\d{4,6}$/,
  hk: /^hk\d{4,5}$/,
  us: /^[A-Z0-9.]{1,10}$/,
  crypto: /^[A-Z0-9]{1,20}-[A-Z0-9]{1,20}$/,
};

/** 解析交易对 instId → { base, quote }；非法返回 null */
export function parseCryptoCode(code) {
  if (typeof code !== "string") return null;
  const m = /^([A-Z0-9]{1,20})-([A-Z0-9]{1,20})$/.exec(code.toUpperCase());
  return m ? { base: m[1], quote: m[2] } : null;
}

/** 代码字符串是否符合该市场的格式约定（格式层校验，有效性仍需行情确认） */
export function isValidCode(market, code) {
  if (typeof code !== "string") return false;
  const re = CODE_RES[market];
  if (!re) return false;
  const value = market === "us" || market === "crypto" ? code.toUpperCase() : code.toLowerCase();
  if (!re.test(value)) return false;
  if (market === "crypto") return parseCryptoCode(code) !== null;
  if (market === "cn") {
    // 号段白名单：沪 60/68（股）50/51/56/58（基金）；深 00/30（股）12/15/16/18（基金/债券）；北交所 43/83/87/88/92 开头
    return /^(sh(60|68|50|51|56|58)|sz(00|30|12|15|16|18)|bj(43|83|87|88|92))/.test(value);
  }
  return true;
}

/** 规范化代码：us/crypto 转大写；其余小写；去除空白 */
export function normalizeCode(market, code) {
  const raw = String(code ?? "").trim();
  if (market === "us" || market === "crypto") return raw.toUpperCase();
  return raw.toLowerCase();
}

/**
 * 用户输入的裸代码规范化（直连添加入口）：自动补交易所前缀。
 *   cn: 600519→sh600519、000001→sz000001、43/83/87/88/92 开头→bj
 *   hk: 00700→hk00700
 *   us/crypto: 原样（normalizeCode 处理大小写）
 * 无法判定时返回 null（要求用户带前缀输入）。
 */
export function normalizeInputCode(market, rawCode) {
  const raw = String(rawCode ?? "").trim();
  if (!raw) return null;
  if (market === "us" || market === "crypto") return normalizeCode(market, raw);
  const lower = raw.toLowerCase();
  if (market === "hk") {
    if (/^hk\d{4,5}$/.test(lower)) return lower;
    if (/^\d{4,5}$/.test(lower)) return `hk${lower}`;
    return null;
  }
  if (market === "cn") {
    if (/^(sh|sz|bj)/.test(lower)) return lower;
    if (/^\d{4,6}$/.test(lower)) {
      if (/^(60|68|50|51|56|58)/.test(lower)) return `sh${lower}`;
      if (/^(00|30|12|15|16|18)/.test(lower)) return `sz${lower}`;
      if (/^(43|83|87|88|92)/.test(lower)) return `bj${lower}`;
    }
    return null;
  }
  return null;
}

/** 从原始代码推导市场（自动识别前缀 / 交易对形态）；识别不了返回 null */
export function guessMarket(code) {
  const raw = String(code ?? "").trim();
  if (parseCryptoCode(raw) && /^[A-Z0-9]+-[A-Z0-9]+$/.test(raw.toUpperCase()) && !/^(sh|sz|bj|hk)/i.test(raw)) return "crypto";
  if (/^(sh|sz|bj)\d{4,6}$/i.test(raw)) return "cn";
  if (/^hk\d{4,5}$/i.test(raw)) return "hk";
  if (/^[A-Za-z0-9.]{1,10}$/.test(raw)) return "us";
  return null;
}

/**
 * 解析标的身份。返回 { id, market, code, quoteCurrency } 或 null。
 * @param {string} market 市场名
 * @param {string} code 提供方代码
 */
export function makeIdentity(market, code) {
  if (!MARKETS.includes(market)) return null;
  const norm = normalizeCode(market, code);
  if (!isValidCode(market, norm)) return null;
  let quoteCurrency;
  if (market === "crypto") {
    const parsed = parseCryptoCode(norm);
    if (!parsed) return null;
    quoteCurrency = parsed.quote;
  } else {
    quoteCurrency = QUOTE_CURRENCY[market];
  }
  return { id: `${market}:${norm}`, market, code: norm, quoteCurrency };
}

/** 身份是否完整一致（id 与 market/code 派生结果一致） */
export function identityConsistent(symbol) {
  if (!symbol || typeof symbol !== "object") return false;
  const parsed = makeIdentity(symbol.market, symbol.code);
  return parsed !== null && parsed.id === symbol.id && parsed.quoteCurrency === symbol.quoteCurrency;
}

/** kind（标的类型）：'etf' 仅是类型标记；加密货币 kind = 'coin' */
export function normalizeKind(market, kind) {
  if (market === "crypto") return "coin";
  return kind === "etf" ? "etf" : "stock";
}

/**
 * 目标价阈值关系检查（保存前校验用）。
 * 返回 { ok, overlap, message }：
 *   - 两价都设置且 buy >= sell → overlap（可能导致同时触发，UI 明示，不静默覆盖）
 */
export function checkTargetRelation(buyTarget, sellTarget) {
  if (buyTarget != null && sellTarget != null && buyTarget >= sellTarget) {
    return { ok: true, overlap: true, message: "买入目标价不低于卖出目标价：价格可能同时满足两个条件，插件会同时标出两个触价标记。" };
  }
  return { ok: true, overlap: false, message: null };
}
