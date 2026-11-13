/**
 * 统一搜索与直连代码校验。
 *
 * 搜索接口不可用时：返回空结果 + error 标记（客户端明确提示，绝不展示虚构结果）。
 * 直连代码添加：必须通过行情适配器实际取到有效快照才算有效（格式对 ≠ 标的存在）。
 *
 * 2026-11-13 搜索梳理定案（每条均有实测或数据依据）：
 *   - 市场门禁：每行只属于请求的市场（smartbox 为全市场混排，任何分支不得串台）；
 *   - 名称匹配先 NFKC + 去空白 + 小写（池内名如「万 科Ａ」须能被「万科」命中）；
 *   - 本地池按相关度排序后再截断（精确代码/名称 > 前缀 > 包含）；精确命中优先，其余股票与 ETF
 *     交错合并，不再因一类先凑满上限而饿死另一类；
 *   - 美股点号类别股（BRK.A/BRK.B）暂不展示：报价链（腾讯美股 key、EM resolveUSSecid、K 线 us-detail）
 *     按点号切分，展示只会得到错误标的（BRK 伯克希尔）或无法报价的行；
 *   - 港股人民币柜台（代码 8xxxx，如 80700 腾讯控股-R）暂不展示：腾讯报价币种为 CNY，身份模型只支持
 *     HKD，展示即按错误币种估值；
 *   - 上游异常显式标记：smartbox 响应格式异常、OKX 清单不可用、本地池加载失败均带 error；
 *   - OKX 清单失败进入 60 秒冷却，并发请求合并为一次上游调用，不再每次等满超时。
 *   - cn 混合搜索（ADR-0006）：池优先凑满 30 条不打上游；smartbox 补充 GP-A 正股（拼音缩写、刷新间隙的新上市）。
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INDEX_CATALOG, indexOfCode, isValidCode, makeIdentity, normalizeCode, normalizeInputCode } from "../identity.mjs";
import * as tencent from "./tencent.mjs";
import * as eastmoney from "./eastmoney.mjs";
import * as tencentUs from "./tencent-us.mjs";
import * as yahoo from "./yahoo.mjs";
import * as okx from "./okx.mjs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(MODULE_DIR, "..", "..", "data");
const TIMEOUT_MS = 8000;
const MAX_ROWS = 30;
const OKX_COOLDOWN_MS = 60 * 1000;
const INSTRUMENTS_TTL_MS = 30 * 60 * 1000;

/** 匹配口径：NFKC（全角转半角，「Ａ」→「A」）+ 去空白 + 小写 */
function matchKey(s) {
  return String(s ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

/** 港股人民币柜台（代码 8xxxx，如 80700 腾讯控股-R）：报价 CNY，身份模型仅支持 HKD，搜索不展示 */
function isHkRmbCounter(code) {
  return /^(hk)?8\d{4}$/i.test(String(code ?? ""));
}

/** 美股 smartbox 代码形如 aapl.oq / babaf.ps：只剥末尾交易所后缀（oq/n/am/ps）；剩余仍含点号的类别股（brk.b.n → brk.b）返回 null */
function parseUsCode(code) {
  const m = /^(.+)\.(oq|n|am|ps)$/i.exec(code);
  const base = m ? m[1] : code;
  if (base.includes(".")) return null;
  return { ticker: base.toUpperCase(), suffix: m ? m[2] : "" };
}

/** 合并两路本地命中：精确命中（分数 3）优先；其余按来源交错取，各路内部保持相关度顺序，避免一类饿死另一类 */
function mergeHits(a, b) {
  const out = [];
  for (const x of a) if (x.score === 3) out.push(x.row);
  for (const y of b) if (y.score === 3) out.push(y.row);
  const restA = a.filter((x) => x.score < 3);
  const restB = b.filter((y) => y.score < 3);
  for (let i = 0; i < Math.max(restA.length, restB.length); i += 1) {
    if (i < restA.length) out.push(restA[i].row);
    if (i < restB.length) out.push(restB[i].row);
  }
  return out;
}

/* ------------------------------------------------ 本地标的池（惰性 + 失败不缓存） */

const pools = new Map(); // file → Promise<{rows, ok}>

async function loadPool(file) {
  let p = pools.get(file);
  if (!p) {
    p = (async () => {
      try {
        const text = await readFile(join(DATA_DIR, file), "utf8");
        const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
        const parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) throw new Error("pool-not-array");
        return { rows: parsed, ok: true };
      } catch {
        pools.delete(file); // 失败不缓存：下一次搜索重试，而不是永久当作空池
        return { rows: [], ok: false };
      }
    })();
    pools.set(file, p);
  }
  return p;
}

/* ------------------------------------------------ 腾讯 smartbox（港股/美股/ETF） */

/** 解析 smartbox 文本 → [{code, name, market, kind}]：保留 GP 正股与 ETF，过滤 KJ/ZS/QZ 等；人民币柜台与点号美股暂不展示 */
export function parseSmartbox(text) {
  const rows = [];
  if (typeof text !== "string") return rows;
  const unescaped = text.replace(/\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  const m = unescaped.match(/v_hint="([^"]*)"/);
  if (!m) return rows;
  for (const part of m[1].split("^")) {
    const f = part.split("~");
    if (f.length < 5) continue;
    const marketTag = f[0].toLowerCase();
    const code = f[1];
    const name = f[2];
    const type = f[4].toUpperCase();
    if (!code || !name) continue;
    if (marketTag === "hk" && type === "GP") {
      if (isHkRmbCounter(code)) continue;
      rows.push({ code: "hk" + code, name, market: "hk", kind: "stock", source: "smartbox" });
    } else if (marketTag === "us" && (type === "GP" || type === "ETF")) {
      const us = parseUsCode(code.toLowerCase());
      if (!us) continue;
      // 用交易所后缀直接预置 EM secid，省一次探测
      eastmoney.seedUSSecid(us.ticker, us.suffix);
      rows.push({ code: us.ticker, name, market: "us", kind: type === "ETF" ? "etf" : "stock", source: "smartbox" });
    } else if ((marketTag === "sh" || marketTag === "sz" || marketTag === "bj") && type.startsWith("GP")) {
      // GP / GP-A：A股正股（2026-11-14 实测 smartbox 返回 GP-A 且带拼音缩写；bj 暂无返回，放行备用）
      rows.push({ code: marketTag + code, name, market: "cn", kind: "stock", source: "smartbox" });
    } else if ((marketTag === "sh" || marketTag === "sz") && type === "ETF") {
      rows.push({ code: marketTag + code, name, market: "cn", kind: "etf", source: "smartbox" });
    }
  }
  return rows;
}

async function fetchSmartbox(needle) {
  const res = await fetch("https://smartbox.gtimg.cn/s3/?v=2&q=" + encodeURIComponent(needle) + "&t=all", {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  let text;
  try {
    text = new TextDecoder("gbk").decode(buf);
  } catch {
    text = buf.toString("utf8");
  }
  // 响应缺少结果标记（网关错误页、接口改版）时明确失败，不得静默当作「没有匹配」
  if (!/v_hint=/.test(text)) throw new Error("smartbox-format");
  return parseSmartbox(text);
}

/* ------------------------------------------------ OKX 币种搜索 */

const COMMON_COINS = [
  ["BTC", "比特币"], ["ETH", "以太坊"], ["USDT", "泰达币"], ["BNB", "币安币"], ["SOL", "Solana"],
  ["XRP", "瑞波币"], ["DOGE", "狗狗币"], ["ADA", "艾达币"], ["TRX", "波场"], ["AVAX", "雪崩"],
  ["LINK", "Chainlink"], ["DOT", "波卡"], ["LTC", "莱特币"], ["BCH", "比特币现金"], ["ETC", "以太经典"],
  ["UNI", "Uniswap"], ["TON", "Toncoin"], ["SHIB", "柴犬币"], ["PEPE", "Pepe"], ["SUI", "Sui"],
  ["APT", "Aptos"], ["ARB", "Arbitrum"], ["OP", "Optimism"], ["FIL", "Filecoin"], ["NEAR", "Near"],
];

let instrumentsCache = null;
let instrumentsInflight = null;
let instrumentsCooldownUntil = 0;

/** 清单带 TTL 缓存；失败进入冷却；并发请求合并为一次上游调用 */
async function loadInstruments() {
  if (instrumentsCache && Date.now() - instrumentsCache.at < INSTRUMENTS_TTL_MS) return instrumentsCache.list;
  if (Date.now() < instrumentsCooldownUntil) throw new Error("okx-cooldown");
  if (!instrumentsInflight) {
    instrumentsInflight = (async () => {
      try {
        const json = await okxJsonInstruments();
        const list = (json?.data ?? [])
          .filter((i) => i.state === "live" && i.quoteCcy === "USDT" && i.baseCcy && i.instId)
          .map((i) => ({ instId: i.instId, base: i.baseCcy }));
        instrumentsCache = { at: Date.now(), list };
        return list;
      } catch (e) {
        instrumentsCooldownUntil = Date.now() + OKX_COOLDOWN_MS;
        throw e;
      } finally {
        instrumentsInflight = null;
      }
    })();
  }
  return instrumentsInflight;
}

function okxJsonInstruments() {
  return fetch("https://www.okx.com/api/v5/public/instruments?instType=SPOT", {
    headers: { accept: "application/json", "user-agent": "dsh-stock-kanban/0.1" },
    signal: AbortSignal.timeout(25000),
  }).then(async (res) => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (json && typeof json.code === "string" && json.code !== "0") throw new Error("OKX " + json.code);
    return json;
  });
}

/** 返回 {rows, error}：清单不可用时只用本地表，并显式标记 okx-unavailable（部分覆盖不静默） */
async function searchCrypto(needle) {
  const q = needle.trim().toUpperCase();
  const raw = needle.trim();
  const rows = [];
  for (const [symbol, name] of COMMON_COINS) {
    if (symbol.includes(q) || name.includes(raw)) {
      rows.push({ code: symbol + "-USDT", name: name + " " + symbol + " · USDT 对", market: "crypto", kind: "coin", source: "local" });
    }
  }
  let error = null;
  try {
    const list = await loadInstruments();
    for (const i of list) {
      if (!i.base.includes(q)) continue;
      rows.push({ code: i.instId, name: i.base + " · OKX 现货 USDT 对", market: "crypto", kind: "coin", source: "okx" });
      if (rows.length >= MAX_ROWS) break;
    }
  } catch {
    error = "okx-unavailable";
  }
  return { rows, error };
}

/* ------------------------------------------------ 主入口 */

/**
 * 按市场搜索。
 * @returns Promise<{rows: Array, error: string|null}>  error 非空表示该市场某个搜索源不可用（rows 可能仍有本地结果）
 */
export async function search(market, query) {
  const needle = String(query ?? "").trim().slice(0, 40);
  if (!needle) return { rows: [], error: null };
  const lower = needle.toLowerCase();
  const key = matchKey(needle);
  if (!key) return { rows: [], error: null };
  // 纯数字查询（可带 sh/sz/bj/hk 前缀）：代码的精确/前缀相关度用
  const bare = /^(sh|sz|bj|hk)?\d+$/.test(lower) ? lower.replace(/^(sh|sz|bj|hk)/, "") : "";
  const rows = [];
  let error = null;
  const seen = new Set();
  const push = (row) => {
    // 市场门禁：smartbox 按关键字返回全市场混排，不在此过滤会把他市场标的串进当前 Tab
    if (row.market !== market) return;
    if (row.market === "hk" && isHkRmbCounter(row.code)) return;
    const identity = makeIdentity(row.market, row.code);
    if (!identity || seen.has(identity.id)) return;
    seen.add(identity.id);
    rows.push({ ...row, id: identity.id, quoteCurrency: identity.quoteCurrency });
  };

  /** 相关度：精确代码/名称 3 > 代码前缀/名称前缀 2 > 包含 1 */
  const relevance = (code, nameKey) => {
    const codeBare = code.replace(/^(sh|sz|bj|hk)/, "");
    if (bare && codeBare === bare) return 3;
    if (nameKey === key) return 3;
    if (bare && codeBare.startsWith(bare)) return 2;
    if (nameKey.startsWith(key)) return 2;
    return 1;
  };

  /** 本地池命中，按相关度降序（同分保持池内顺序） */
  const poolHits = (list, normalize, kind) => {
    const hits = [];
    for (const s of list) {
      const code = normalize(s.code);
      if (!code) continue;
      const nameKey = matchKey(s.name);
      if (!(code.includes(lower) || nameKey.includes(key))) continue;
      hits.push({ score: relevance(code, nameKey), row: { code, name: s.name, market, kind, source: "pool" } });
    }
    return hits.sort((x, y) => y.score - x.score);
  };

  /** 指数目录本地匹配（零网络，搜索源全挂也可用；先于标的池与上游） */
  const matchCatalog = () => {
    for (const e of INDEX_CATALOG) {
      if (e.market !== market) continue;
      const codeHit = e.code.toLowerCase().includes(lower);
      const nameHit = matchKey(e.name).includes(key);
      const aliasHit = e.aliases.some((a) => matchKey(a).includes(key));
      if (codeHit || nameHit || aliasHit) push({ code: e.code, name: e.name, market: e.market, kind: "index", source: "catalog" });
    }
  };

  if (market === "cn") {
    matchCatalog();
    const [stocks, etfs] = await Promise.all([loadPool("a_stocks.json"), loadPool("etf_stocks.json")]);
    if (!stocks.ok || !etfs.ok) error = "pool-unavailable";
    const merged = mergeHits(
      poolHits(stocks.rows, (c) => normalizeInputCode("cn", c), "stock"),
      poolHits(etfs.rows, (c) => normalizeInputCode("cn", c), "etf"),
    );
    for (const row of merged) push(row);
    // 池子已凑满上限则不打上游（与 hk 同口径）；smartbox 补充拼音缩写与刷新间隙的新上市标的（ADR-0006）
    if (rows.length < MAX_ROWS) {
      try {
        for (const row of await fetchSmartbox(needle)) push(row);
      } catch {
        error = "smartbox-unavailable";
      }
    }
  } else if (market === "hk") {
    matchCatalog();
    const pool = await loadPool("hk_stocks.json");
    if (!pool.ok) error = "pool-unavailable";
    for (const hit of poolHits(pool.rows, (c) => normalizeCode("hk", c), "stock")) push(hit.row);
    // 本地池已凑满上限则不再打上游（延迟与负载的取舍，见文件头）
    if (rows.length < MAX_ROWS) {
      try {
        for (const row of await fetchSmartbox(needle)) push(row);
      } catch {
        error = "smartbox-unavailable";
      }
    }
  } else if (market === "us") {
    matchCatalog();
    try {
      for (const row of await fetchSmartbox(needle)) push(row);
    } catch {
      error = "smartbox-unavailable";
    }
  } else if (market === "crypto") {
    const coins = await searchCrypto(needle);
    for (const row of coins.rows) push(row);
    if (coins.error) error = coins.error;
  } else {
    return { rows: [], error: "unknown-market" };
  }
  return { rows: rows.slice(0, MAX_ROWS), error };
}

/**
 * 直连代码有效性校验：格式 → 行情实测（取到有效价格才通过）。
 * @returns Promise<{ok: true, identity, name, kind} | {ok: false, error}>
 */
export async function resolveDirect(market, code) {
  const normalized = normalizeInputCode(market, code);
  if (!normalized) return { ok: false, error: "invalid-format" };
  const identity = makeIdentity(market, normalized);
  if (!identity) return { ok: false, error: "invalid-format" };
  const indexEntry = indexOfCode(market, normalized);
  let quote = null;
  let kind = indexEntry ? "index" : market === "crypto" ? "coin" : "stock";
  // cn ETF 代码段（50/51/52/53/55/56/58/15/16/18）标记 kind，仅用于展示；指数代码不落 ETF 段
  if (market === "cn" && !indexEntry && /^(sh(50|51|52|53|55|56|58)|sz(15|16|18))/.test(identity.code)) kind = "etf";
  if (market === "cn" || market === "hk") {
    // 主源腾讯，失败/漏行交 EM 备源（P0-1；腾讯 WAF 前科见 docs/capability-matrix.md）
    try {
      const snapshots = await tencent.fetchBatchSnapshots([identity.code]);
      quote = snapshots.get(identity.code) ?? null;
    } catch {
      quote = null;
    }
    if (!quote) {
      try {
        quote = await eastmoney.fetchQuote(identity.code);
      } catch {
        quote = null;
      }
    }
  } else if (market === "us") {
    // 主源 EM，push2 不可达网络交腾讯美股/Yahoo 备源（P0-1/P0-3；顺带补行情时间戳）
    // 链序与 quotes.mjs CHAINS.us 一致：东方财富 → 腾讯美股 → Yahoo。2026-11-13 补腾讯美股腿——
    // EM push2 502 + Yahoo 429 期间，美股/美股指数直连添加全线误报 symbol-not-found（搜索来自
    // 零网络目录可见，点加号取价校验两级全灭），而列表刷新链已有腾讯美股可用
    let transportFailed = false;
    try {
      quote = await eastmoney.fetchQuote(identity.code);
    } catch {
      transportFailed = true;
      quote = null;
    }
    if (!quote) {
      try {
        const rows = await tencentUs.fetchBatchSnapshots([identity.code]);
        quote = rows.get(identity.code) ?? null;
      } catch {
        transportFailed = true;
        quote = null;
      }
    }
    if (!quote) {
      try {
        const rows = await yahoo.fetchBatchSnapshots([identity.code]);
        quote = rows.get(identity.code) ?? null;
      } catch {
        transportFailed = true;
        quote = null;
      }
    }
    // 提供方传输故障 ≠ 代码不存在：全链传输失败时明确报 quote-unavailable（客户端映射
    // 「行情暂不可用，稍后再试」），不得落进 symbol-not-found（「未找到该标的」误导排查）
    if (!quote && transportFailed) return { ok: false, error: "quote-unavailable" };
  } else if (market === "crypto") {
    try {
      quote = await okx.fetchQuote(identity.code);
    } catch {
      return { ok: false, error: "quote-unavailable" };
    }
  }
  if (!quote || !(quote.price > 0)) return { ok: false, error: "symbol-not-found" };
  return { ok: true, identity, name: quote.name || identity.code, kind };
}
