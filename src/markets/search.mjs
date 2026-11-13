/**
 * 统一搜索与直连代码校验。
 *
 * 搜索接口不可用时：返回空结果 + error 标记（客户端明确提示，绝不展示虚构结果）。
 * 直连代码添加：必须通过行情适配器实际取到有效快照才算有效（格式对 ≠ 标的存在）。
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { INDEX_CATALOG, indexOfCode, isValidCode, makeIdentity, normalizeCode, normalizeInputCode } from "../identity.mjs";
import * as tencent from "./tencent.mjs";
import * as eastmoney from "./eastmoney.mjs";
import * as yahoo from "./yahoo.mjs";
import * as okx from "./okx.mjs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(MODULE_DIR, "..", "..", "data");
const TIMEOUT_MS = 8000;
const MAX_ROWS = 30;

/* ------------------------------------------------ 本地标的池（惰性 + 缓存） */

const pools = new Map(); // file → Promise<rows>

async function loadPool(file) {
  let p = pools.get(file);
  if (!p) {
    p = (async () => {
      try {
        const text = await readFile(join(DATA_DIR, file), "utf8");
        const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
        const parsed = JSON.parse(clean);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    pools.set(file, p);
  }
  return p;
}

/* ------------------------------------------------ 腾讯 smartbox（港股/美股/ETF） */

/** 解析 smartbox 文本 → [{code, name, market, type}]（保留 GP 正股 + ETF；过滤 KJ 等） */
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
    if (marketTag === "hk" && type === "GP") rows.push({ code: `hk${code}`, name, market: "hk", kind: "stock", source: "smartbox" });
    else if (marketTag === "us" && (type === "GP" || type === "ETF")) {
      const dot = code.indexOf(".");
      const ticker = (dot > 0 ? code.slice(0, dot) : code).toUpperCase();
      // 用交易所后缀直接预置 EM secid，省一次探测
      eastmoney.seedUSSecid(ticker, dot > 0 ? code.slice(dot + 1) : "");
      rows.push({ code: ticker, name, market: "us", kind: type === "ETF" ? "etf" : "stock", source: "smartbox" });
    } else if ((marketTag === "sh" || marketTag === "sz") && type === "ETF") {
      rows.push({ code: `${marketTag}${code}`, name, market: "cn", kind: "etf", source: "smartbox" });
    }
  }
  return rows;
}

async function fetchSmartbox(needle) {
  const res = await fetch(`https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(needle)}&t=all`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  let text;
  try {
    text = new TextDecoder("gbk").decode(buf);
  } catch {
    text = buf.toString("utf8");
  }
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
const INSTRUMENTS_TTL_MS = 30 * 60 * 1000;

async function loadInstruments() {
  if (instrumentsCache && Date.now() - instrumentsCache.at < INSTRUMENTS_TTL_MS) return instrumentsCache.list;
  const json = await okxJsonInstruments();
  const list = (json?.data ?? [])
    .filter((i) => i.state === "live" && i.quoteCcy === "USDT" && i.baseCcy && i.instId)
    .map((i) => ({ instId: i.instId, base: i.baseCcy }));
  instrumentsCache = { at: Date.now(), list };
  return list;
}

function okxJsonInstruments() {
  return fetch("https://www.okx.com/api/v5/public/instruments?instType=SPOT", {
    headers: { accept: "application/json", "user-agent": "dsh-stock-kanban/0.1" },
    signal: AbortSignal.timeout(25000),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json && typeof json.code === "string" && json.code !== "0") throw new Error(`OKX ${json.code}`);
    return json;
  });
}

async function searchCrypto(needle) {
  const q = needle.trim().toUpperCase();
  const raw = needle.trim();
  const rows = [];
  for (const [symbol, name] of COMMON_COINS) {
    if (symbol.includes(q) || name.includes(raw)) {
      rows.push({ code: `${symbol}-USDT`, name: `${name} ${symbol} · USDT 对`, market: "crypto", kind: "coin", source: "local" });
    }
  }
  try {
    const list = await loadInstruments();
    for (const i of list) {
      if (!i.base.includes(q)) continue;
      rows.push({ code: i.instId, name: `${i.base} · OKX 现货 USDT 对`, market: "crypto", kind: "coin", source: "okx" });
      if (rows.length >= MAX_ROWS) break;
    }
  } catch {
    /* 清单不可用时只用本地表 */
  }
  return rows;
}

/* ------------------------------------------------ 主入口 */

/**
 * 按市场搜索。
 * @returns Promise<{rows: Array, error: string|null}>  error 非空表示该市场搜索源不可用（rows 可能为空）
 */
export async function search(market, query) {
  const needle = String(query ?? "").trim().slice(0, 40);
  if (!needle) return { rows: [], error: null };
  const lower = needle.toLowerCase();
  const rows = [];
  let error = null;
  const seen = new Set();
  const push = (row) => {
    const identity = makeIdentity(row.market, row.code);
    if (!identity || seen.has(identity.id)) return;
    seen.add(identity.id);
    rows.push({ ...row, id: identity.id, quoteCurrency: identity.quoteCurrency });
  };

  /** 指数目录本地匹配（零网络，搜索源全挂也可用；先于标的池/上游建议） */
  const matchCatalog = () => {
    for (const e of INDEX_CATALOG) {
      if (e.market !== market) continue;
      const codeHit = e.code.toLowerCase().includes(lower);
      const nameHit = e.name.toLowerCase().includes(lower);
      const aliasHit = e.aliases.some((a) => a.includes(lower));
      if (codeHit || nameHit || aliasHit) push({ code: e.code, name: e.name, market: e.market, kind: "index", source: "catalog" });
    }
  };

  if (market === "cn") {
    matchCatalog();
    const [astocks, etfstocks] = await Promise.all([loadPool("a_stocks.json"), loadPool("etf_stocks.json")]);
    for (const s of astocks) {
      const code = normalizeInputCode("cn", s.code);
      if (code && (code.includes(lower) || String(s.name ?? "").toLowerCase().includes(lower))) push({ code, name: s.name, market: "cn", kind: "stock", source: "pool" });
      if (rows.length >= MAX_ROWS) return { rows, error };
    }
    for (const s of etfstocks) {
      const code = normalizeInputCode("cn", s.code);
      if (code && (code.includes(lower) || String(s.name ?? "").toLowerCase().includes(lower))) push({ code, name: s.name, market: "cn", kind: "etf", source: "pool" });
      if (rows.length >= MAX_ROWS) return { rows, error };
    }
  } else if (market === "hk") {
    matchCatalog();
    const hkstocks = await loadPool("hk_stocks.json");
    for (const s of hkstocks) {
      const code = normalizeCode("hk", s.code);
      if (code.includes(lower) || String(s.name ?? "").toLowerCase().includes(lower)) push({ code, name: s.name, market: "hk", kind: "stock", source: "pool" });
      if (rows.length >= MAX_ROWS) return { rows, error };
    }
    try {
      for (const row of await fetchSmartbox(needle)) push(row);
    } catch {
      error = "smartbox-unavailable";
    }
  } else if (market === "us") {
    matchCatalog();
    try {
      for (const row of await fetchSmartbox(needle)) push(row);
    } catch {
      error = "smartbox-unavailable";
    }
  } else if (market === "crypto") {
    for (const row of await searchCrypto(needle)) push(row);
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
  // cn ETF 代码段（50/51/56/58/15/16/18/159）标记 kind，仅用于展示；指数代码不落 ETF 段
  if (market === "cn" && !indexEntry && /^(sh(50|51|56|58)|sz(15|16|18))/.test(identity.code)) kind = "etf";
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
    // 主源 EM，push2 不可达网络交 Yahoo 备源（P0-1/P0-3；顺带补行情时间戳）
    try {
      quote = await eastmoney.fetchQuote(identity.code);
    } catch {
      quote = null;
    }
    if (!quote) {
      try {
        const rows = await yahoo.fetchBatchSnapshots([identity.code]);
        quote = rows.get(identity.code) ?? null;
      } catch {
        quote = null;
      }
    }
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
