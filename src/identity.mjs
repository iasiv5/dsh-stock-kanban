/**
 * 标的身份与市场常量 —— 纯函数，无 IO。
 *
 * 身份结构（不以显示名称为键）：
 *   { market, code, quoteCurrency }
 *   - market: 'cn' | 'hk' | 'us' | 'crypto'（ETF 是 kind，不是市场；归入其上市市场）
 *   - code:   提供方原生代码，cn/hk 带交易所前缀（sh600519 / hk00700），us 为大写 ticker，
 *             crypto 为交易对 instId（BTC-USDT，含报价币）
 *   - quoteCurrency: 报价币种；美元(USD)与 USDT 永不合并
 *
 * 标的 ID = market + ":" + code，作为存储表主键。
 *
 * 指数目录（2026-11-13）：固定身份白名单（kind = 'index'），不可自由输入——目录外代码
 * 不得借 kind='index' 绕过持仓/目标价校验（normalizeKind 按代码目录裁决，见 model.mjs）。
 * 腾讯通道快照/K线/分时三路实测可用（sh000001 走既有 cn 路径；hkHSI/hkHSTECH 为字母别名，
 * 时间字段为 "YYYY/MM/DD HH:mm:ss" 格式，见 markets/tencent.mjs）；美股指数 DJI/IXIC/INX
 * 在 EM 侧预置 secid（100.DJIA/100.NDX/100.SPX，交易所探测不到，必须预置）。
 * 目录形态参考 suifei/dsh-market-lens 的 INDEX_CATALOG（MIT，见 NOTICE.md），按本仓身份模型重写。
 */

export const MARKETS = ["cn", "hk", "us", "crypto"];

/** 各市场默认报价币种（crypto 以交易对实际报价币为准，见 parseCryptoCode） */
export const QUOTE_CURRENCY = { cn: "CNY", hk: "HKD", us: "USD" };

/** 指数目录（固定身份；aliases 供本地搜索匹配，统一小写） */
export const INDEX_CATALOG = [
  { market: "cn", code: "sh000001", name: "上证指数", aliases: ["szzs", "上证", "shangzheng"] },
  { market: "cn", code: "sz399001", name: "深证成指", aliases: ["szcz", "深成"] },
  { market: "cn", code: "sz399006", name: "创业板指", aliases: ["cybz", "创业板"] },
  { market: "cn", code: "sh000688", name: "科创50", aliases: ["kc50", "科创"] },
  { market: "cn", code: "sh000300", name: "沪深300", aliases: ["hs300", "沪深"] },
  { market: "hk", code: "hkHSI", name: "恒生指数", aliases: ["hsi", "恒指", "恒生"] },
  { market: "hk", code: "hkHSTECH", name: "恒生科技", aliases: ["hstech", "恒科"] },
  { market: "us", code: "DJI", name: "道琼斯", aliases: ["djia", "道指", "dow"] },
  { market: "us", code: "IXIC", name: "纳斯达克", aliases: ["ixic", "纳指", "nasdaq"] },
  { market: "us", code: "INX", name: "标普500", aliases: ["spx", "gspc", "标普"] },
];

/** indexKey(market, code 小写) → 目录项 */
const INDEX_BY_KEY = new Map(INDEX_CATALOG.map((e) => [e.market + ":" + e.code.toLowerCase(), e]));
/** code 小写 → market（guessMarket/搜索用；目录代码全局唯一） */
const INDEX_MARKET_BY_CODE = new Map(INDEX_CATALOG.map((e) => [e.code.toLowerCase(), e.market]));

function indexKey(market, code) {
  return market + ":" + String(code ?? "").trim().toLowerCase();
}

/** 目录项查找：market + 任意大小写 code → 目录项（或 null） */
export function indexOfCode(market, code) {
  return INDEX_BY_KEY.get(indexKey(market, code)) ?? null;
}

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
  if (indexOfCode(market, code)) return true; // 指数目录代码（hkHSI 等字母别名过不了格式正则，走白名单）
  const value = market === "us" || market === "crypto" ? code.toUpperCase() : code.toLowerCase();
  if (!re.test(value)) return false;
  if (market === "crypto") return parseCryptoCode(code) !== null;
  if (market === "cn") {
    // 号段白名单：沪 60/68（股）50/51/56/58（基金）；深 00/30（股）12/15/16/18（基金/债券）；北交所 43/83/87/88/92 开头
    return /^(sh(60|68|50|51|56|58)|sz(00|30|12|15|16|18)|bj(43|83|87|88|92))/.test(value);
  }
  return true;
}

/** 规范化代码：us/crypto 转大写；指数目录代码取目录原形（hkHSI 大小写敏感，腾讯通道要求）；其余小写 */
export function normalizeCode(market, code) {
  const raw = String(code ?? "").trim();
  if (market === "us" || market === "crypto") return raw.toUpperCase();
  const hit = INDEX_BY_KEY.get(indexKey(market, raw));
  if (hit) return hit.code;
  return raw.toLowerCase();
}

/**
 * 用户输入的裸代码规范化（直连添加入口）：自动补交易所前缀。
 *   cn: 600519→sh600519、000001→sz000001、43/83/87/88/92 开头→bj；目录代码（sh000001 等）原样
 *   hk: 00700→hk00700；目录别名 hkHSI/hkHSTECH 原样
 *   us/crypto: 原样（normalizeCode 处理大小写）
 * 无法判定时返回 null（要求用户带前缀输入）。
 */
export function normalizeInputCode(market, rawCode) {
  const raw = String(rawCode ?? "").trim();
  if (!raw) return null;
  if (market === "us" || market === "crypto") return normalizeCode(market, raw);
  const lower = raw.toLowerCase();
  if (INDEX_MARKET_BY_CODE.get(lower) === market) {
    return INDEX_CATALOG.find((e) => e.code.toLowerCase() === lower).code;
  }
  if (market === "hk") {
    if (/^hk\d{4,5}$/.test(lower)) return lower;
    if (/^\d{4,5}$/.test(lower)) return "hk" + lower;
    return null;
  }
  if (market === "cn") {
    if (/^(sh|sz|bj)/.test(lower)) return lower;
    if (/^\d{4,6}$/.test(lower)) {
      if (/^(60|68|50|51|56|58)/.test(lower)) return "sh" + lower;
      if (/^(00|30|12|15|16|18)/.test(lower)) return "sz" + lower;
      if (/^(43|83|87|88|92)/.test(lower)) return "bj" + lower;
    }
    return null;
  }
  return null;
}

/** 从原始代码推导市场（自动识别前缀 / 交易对形态）；指数目录代码优先；识别不了返回 null */
export function guessMarket(code) {
  const raw = String(code ?? "").trim();
  const idxMarket = INDEX_MARKET_BY_CODE.get(raw.toLowerCase());
  if (idxMarket) return idxMarket; // hkHSI 不匹配 hk 数字正则、否则会被兜底误判成 us
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
  return { id: market + ":" + norm, market, code: norm, quoteCurrency };
}

/** 身份是否完整一致（id 与 market/code 派生结果一致） */
export function identityConsistent(symbol) {
  if (!symbol || typeof symbol !== "object") return false;
  const parsed = makeIdentity(symbol.market, symbol.code);
  return parsed !== null && parsed.id === symbol.id && parsed.quoteCurrency === symbol.quoteCurrency;
}

/**
 * kind（标的类型）：'index' 仅由指数目录代码裁决；'etf' 仅是类型标记；加密货币 kind = 'coin'。
 * 目录外代码传 kind='index' 一律降级 'stock'——防止借 kind 绕过持仓/目标价校验（2026-11-13）。
 */
export function normalizeKind(market, kind, code) {
  if (code != null && indexOfCode(market, code)) return "index";
  if (market === "crypto") return "coin";
  if (kind === "index") return "stock";
  return kind === "etf" ? "etf" : "stock";
}

/**
 * 目标价阈值关系检查（保存前校验用）。
 * 返回 { ok, overlap }：
 *   - 两价都设置且 buy >= sell → overlap（可能导致同时触发，UI 明示，不静默覆盖；
 *     文案由客户端 t("detail.confirm.overlap") 本地化，服务端不产出展示文案）
 */
export function checkTargetRelation(buyTarget, sellTarget) {
  if (buyTarget != null && sellTarget != null && buyTarget >= sellTarget) {
    return { ok: true, overlap: true };
  }
  return { ok: true, overlap: false };
}
