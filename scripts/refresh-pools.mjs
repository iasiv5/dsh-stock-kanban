#!/usr/bin/env node
// 标的池刷新工具（列表与行情同源优先）。
//   列表来源：每个市场先用行情侧的列表接口（上交所 yunhq、东方财富 clist、腾讯报价号段枚举）；
//             行情侧不可达时回落到交易所官方清单（上交所 JSON、深交所报表、港交所证券表），报告中标明实际来源。
//   对账：行情列表与官方清单双向比对，差异超过 1% 判失败（能对账时才对账）。
//   校验：腾讯行情能否报价（有名称且价格大于 0），失败率超过 2% 判失败。
// 数据来源、更新节奏与责任人见 data/README.md。
//
//   node scripts/refresh-pools.mjs            dry-run（默认）：抓取、对账、校验、打印报告，不写任何文件
//   node scripts/refresh-pools.mjs --apply    全部校验通过后写入 data/*.json 与 data/manifest.json
//   --accept-shrink                           允许某文件条目数下降超过 5%（须先核对报告）
//
// 不变量：任一来源失败且无回落、对账差异超阈值或报价校验失败率超阈值，整体失败（fail-closed），不写入部分结果。

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";

export const GENERATOR_VERSION = 3;
export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
export const FILES = { a_stocks: "a_stocks.json", etf_stocks: "etf_stocks.json", hk_stocks: "hk_stocks.json" };
// 文件 → 来源映射在运行时登记（poolSources）：哪个来源真正决定了文件内容，manifest 就记哪个。
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const RETRY_DELAYS = [1000, 3000, 8000];
const TENCENT_BATCH = 60;
const EM_PAGE = 100;
const EM_HOSTS = ["push2.eastmoney.com", "push2delay.eastmoney.com"];
const EM_UT = "bd1d9ddb04089700cf9c27f6f7426281";
const EM_FS = {
  sz: "m:0+t:6,m:0+t:80",
  bj: "m:0+t:81+s:2048",
  etf: "b:MK0021,b:MK0022,b:MK0023,b:MK0024",
  hk: "m:128+t:3,m:128+t:4",
};

export const SOURCE_URLS = {
  yunhqEquity: "https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity?select=code,name",
  yunhqEtf: "https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/etf?select=code,name",
  sseStocks: "https://query.sse.com.cn/sseQuery/commonQuery.do?isPagination=false&sqlId=COMMON_SSE_CP_GPJCTPZ_GPLB_GP_L&stockType=1&_=1",
  hkexXlsx: "https://www.hkex.com.hk/eng/services/trading/securities/securitieslists/ListOfSecurities.xlsx",
};
export const szseUrl = (catalog, page) =>
  "https://www.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=" + catalog + "&TABKEY=tab1&PAGENO=" + page + "&random=0.5";
export const emUrl = (host, market, page) =>
  "https://" + host + "/api/qt/clist/get?pn=" + page + "&pz=" + EM_PAGE + "&po=1&np=1&ut=" + EM_UT +
  "&fltt=2&invt=2&fid=f3&fields=f12,f13,f14&fs=" + EM_FS[market];
export const tencentUrl = (codes) => "https://qt.gtimg.cn/q=" + codes.join(",");

// 号段过滤：行情列表里混有 B 股、老三板代码等非股票条目，按号段剔除。
export const SEG = {
  shA: /^(600|601|603|605|688|689)\d{3}$/,
  szA: /^(000|001|002|003|300|301)\d{3}$/,
  bj: /^920\d{3}$/,
  szEtf: /^(15|16|18)\d{4}$/,
  shEtf: /^(50|51|52|53|55|56|58)\d{4}$/,
  hk: /^\d{5}$/,
};

// 数量区间：低于下限通常意味着抓取不完整（分页丢失、接口降级），判失败。
export const BOUNDS = {
  yunhqEquity: [2300, 2500],
  yunhqEtf: [880, 1000],
  sseListed: [2300, 2500],
  szseStocks: [2800, 3000],
  szseEtf: [700, 850],
  bjStocks: [150, 450],
  emSz: [2800, 3300],
  emBj: [200, 400],
  emEtf: [1500, 1800],
  emHk: [2600, 3200],
  aStocks: [5000, 6000],
  etf: [1500, 1900],
  hk: [2500, 3200],
};
export const RECONCILE_TOLERANCE = 0.01;
export const QUOTE_INVALID_TOLERANCE = 0.02;
export const SHRINK_LIMIT = 0.95;
const CODE_RE = { a_stocks: /^\d{6}$/, etf_stocks: /^(sh|sz)\d{6}$/, hk_stocks: /^hk\d{5}$/ };

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export function normalizeName(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function sortRows(rows) {
  return [...rows].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

export function canonicalJson(rows) {
  return JSON.stringify(rows, null, 2) + "\n";
}

export function buildManifest({ generatedAt, sources, files }) {
  return {
    schema: 1,
    generator: { tool: "scripts/refresh-pools.mjs", version: GENERATOR_VERSION },
    generatedAt,
    sources,
    files,
  };
}

export function rangeProblem(label, count, bound) {
  const [min, max] = bound;
  return count < min || count > max ? [label + ": 条目数 " + count + " 不在 [" + min + ", " + max + "]"] : [];
}

export function validatePool(name, rows) {
  const problems = [];
  const seen = new Set();
  for (const r of rows) {
    if (!CODE_RE[name].test(r.code)) problems.push(name + ": 代码格式异常 " + r.code);
    if (!r.name) problems.push(name + ": 名称为空 " + r.code);
    if (seen.has(r.code)) problems.push(name + ": 代码重复 " + r.code);
    seen.add(r.code);
    if (problems.length >= 50) break;
  }
  return problems;
}

export function shrinkProblems(name, oldCount, newCount, acceptShrink) {
  if (!oldCount || acceptShrink || newCount >= oldCount * SHRINK_LIMIT) return [];
  return [name + ": 条目数由 " + oldCount + " 降至 " + newCount + "，下降超过 5%，核对差异报告后用 --accept-shrink 确认"];
}

export function diffRows(oldRows, newRows) {
  const oldMap = new Map(oldRows.map((r) => [r.code, r.name]));
  const newMap = new Map(newRows.map((r) => [r.code, r.name]));
  const added = [];
  const removed = [];
  const renamed = [];
  for (const [code, name] of newMap) {
    if (!oldMap.has(code)) added.push(code + " " + name);
    else if (oldMap.get(code) !== name) renamed.push(code + " " + oldMap.get(code) + " → " + name);
  }
  for (const [code, name] of oldMap) {
    if (!newMap.has(code)) removed.push(code + " " + name);
  }
  return {
    added: added.length,
    removed: removed.length,
    renamed: renamed.length,
    samples: { added: added.slice(0, 10), removed: removed.slice(0, 10), renamed: renamed.slice(0, 10) },
  };
}

// 两个来源的代码集合对账：双向差异数量、比例与样本。
export function reconcile(quoteRows, officialRows) {
  const q = new Set(quoteRows.map((r) => r.code));
  const o = new Set(officialRows.map((r) => r.code));
  const onlyQuote = [...q].filter((c) => !o.has(c));
  const onlyOfficial = [...o].filter((c) => !q.has(c));
  const base = Math.max(q.size, o.size) || 1;
  return {
    quote: q.size,
    official: o.size,
    onlyQuote: onlyQuote.length,
    onlyOfficial: onlyOfficial.length,
    ratio: (onlyQuote.length + onlyOfficial.length) / base,
    samples: { onlyQuote: onlyQuote.slice(0, 10), onlyOfficial: onlyOfficial.slice(0, 10) },
  };
}

// ---- 解析器（纯函数；测试见 tests/refresh-pools.test.mjs） ----

export function parseJsonLoose(text) {
  const t = String(text).trim();
  if (t.startsWith("{") || t.startsWith("[")) return JSON.parse(t);
  const m = /^[\w$.]+\(([\s\S]*)\)\s*;?$/.exec(t);
  if (!m) throw new Error("jsonp: 无法识别的响应包装");
  return JSON.parse(m[1]);
}

// 上交所行情列表（yunhq）：list 为 [代码, 名称] 数组，total 必须与 list 长度一致。
export function parseYunhqList(text) {
  const json = parseJsonLoose(text);
  if (!Array.isArray(json.list) || typeof json.total !== "number") throw new Error("yunhq: 结构异常");
  if (json.list.length !== json.total) {
    throw new Error("yunhq: 条目数 " + json.list.length + " 与 total " + json.total + " 不一致");
  }
  return json.list
    .map(([code, name]) => ({ code: String(code ?? "").trim(), name: normalizeName(name) }))
    .filter((r) => /^\d{6}$/.test(r.code) && r.name);
}

// 东方财富 clist 单页：data.total 与 data.diff（f12 代码、f14 名称）。
export function parseEmPage(json) {
  const data = json && json.data;
  if (!data || typeof data.total !== "number" || !Array.isArray(data.diff)) throw new Error("eastmoney-clist: 结构异常");
  return {
    total: data.total,
    rows: data.diff.map((x) => ({ code: String(x.f12 ?? "").trim(), name: normalizeName(x.f14) })),
  };
}

export function parseSseStockList(json) {
  if (!json || !Array.isArray(json.result)) throw new Error("sse-stock-list: result 缺失");
  const out = [];
  for (const r of json.result) {
    const state = String(r.STATE_CODE ?? "");
    const delisted = String(r.DELIST_DATE ?? "-") !== "-";
    // 2 = 上市；7 = ST/*ST（仍在上市）；3 = 退市
    if ((state !== "2" && state !== "7") || delisted) continue;
    const code = String(r.A_STOCK_CODE ?? "").trim();
    const name = normalizeName(r.SEC_NAME_CN && r.SEC_NAME_CN !== "-" ? r.SEC_NAME_CN : r.COMPANY_ABBR);
    if (/^\d{6}$/.test(code) && name) out.push({ code, name });
  }
  return out;
}

export function szseFirstObject(json) {
  const obj = Array.isArray(json) ? json[0] : json;
  if (!obj || !obj.metadata || !Array.isArray(obj.data)) throw new Error("szse: 响应结构异常");
  return obj;
}

export function parseSzseStocks(rows) {
  return rows
    .map((r) => ({ code: String(r.agdm ?? "").trim(), name: normalizeName(r.agjc) }))
    .filter((r) => /^\d{6}$/.test(r.code) && r.name);
}

function firstUnderlined(html) {
  const m = /<u>([^<]*)<\/u>/.exec(String(html ?? ""));
  return m ? m[1].trim() : "";
}

export function parseSzseEtf(rows) {
  return rows
    .map((r) => ({ code: firstUnderlined(r.sys_key), name: normalizeName(firstUnderlined(r.kzjcurl)) }))
    .filter((r) => /^\d{6}$/.test(r.code) && r.name);
}

export function parseTencentNames(text) {
  const names = new Map();
  for (const m of String(text).matchAll(/v_([a-z]{2}\d{5,6})="([^"]*)"/g)) {
    const f = m[2].split("~");
    const name = normalizeName(f[1]);
    const price = Number(f[3]);
    if (name && name !== "-" && price > 0) names.set(m[1], name);
  }
  return names;
}

// ---- 最小 xlsx 读取（zip 中央目录 + 共享字符串 + 工作表；无第三方依赖） ----

function xmlUnescape(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

export function readZipEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: 找不到中央目录结束记录");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let k = 0; k < count; k += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip: 中央目录损坏");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, { method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function readZipEntry(buf, entries, name) {
  const e = entries.get(name);
  if (!e) throw new Error("zip: 缺少条目 " + name);
  if (buf.readUInt32LE(e.localOffset) !== 0x04034b50) throw new Error("zip: 本地头损坏 " + name);
  const start = e.localOffset + 30 + buf.readUInt16LE(e.localOffset + 26) + buf.readUInt16LE(e.localOffset + 28);
  const raw = buf.subarray(start, start + e.compSize);
  if (e.method === 0) return raw;
  if (e.method === 8) return inflateRawSync(raw);
  throw new Error("zip: 不支持的压缩方法 " + e.method);
}

function colIndex(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i += 1) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}

function parseSharedStrings(xml) {
  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g), (si) =>
    Array.from(si[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (t) => xmlUnescape(t[1])).join(""),
  );
}

function parseSheet(xml, shared) {
  const rows = [];
  for (const row of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const body = row[2] ?? "";
    const cells = [];
    for (const c of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(c[1]);
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(c[1])?.[1] ?? "n";
      const inner = c[2] ?? "";
      let value = "";
      if (type === "s") {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        value = v ? shared[Number(v[1])] ?? "" : "";
      } else if (type === "inlineStr") {
        value = Array.from(inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (t) => xmlUnescape(t[1])).join("");
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
        value = v ? xmlUnescape(v[1]) : "";
      }
      cells[colIndex(ref[1])] = value;
    }
    rows.push(Array.from(cells, (v) => v ?? ""));
  }
  return rows;
}

// Excel 导出的 xlsx 可能使用命名空间前缀（如 <x:row>），解析前去掉标签前缀，统一为无前缀标签。
export function stripXmlPrefixes(xml) {
  return xml.replace(/<(\/?)[A-Za-z][\w.-]*:(?=[A-Za-z])/g, "<$1");
}

export function readXlsxRows(buf, sheetPath = "xl/worksheets/sheet1.xml") {
  const entries = readZipEntries(buf);
  const shared = entries.has("xl/sharedStrings.xml")
    ? parseSharedStrings(stripXmlPrefixes(readZipEntry(buf, entries, "xl/sharedStrings.xml").toString("utf8")))
    : [];
  return parseSheet(stripXmlPrefixes(readZipEntry(buf, entries, sheetPath).toString("utf8")), shared);
}

// 港交所证券表：只保留港币计价的股票（Equity）与交易所买卖产品（ETP）；窝轮、债券与人民币柜台在此剔除。
export function parseHkexSecurities(rows) {
  const headerIndex = rows.findIndex((r) => r[0] === "Stock Code");
  if (headerIndex < 0) throw new Error("hkex: 找不到表头 Stock Code");
  const header = rows[headerIndex];
  const col = (label) => {
    const i = header.findIndex((h) => String(h).trim() === label);
    if (i < 0) throw new Error("hkex: 缺少列 " + label);
    return i;
  };
  const cCode = col("Stock Code");
  const cName = col("Name of Securities");
  const cCategory = col("Category");
  const cSub = col("Sub-Category");
  const cCurrency = col("Trading Currency");
  const out = [];
  for (const r of rows.slice(headerIndex + 1)) {
    const code = String(r[cCode] ?? "").trim();
    if (!/^\d{5}$/.test(code)) continue;
    if (String(r[cCurrency] ?? "").trim() !== "HKD") continue;
    const category = String(r[cCategory] ?? "").trim();
    if (category !== "Equity" && category !== "Exchange Traded Products") continue;
    out.push({ code: "hk" + code, nameEn: normalizeName(r[cName]), subCategory: String(r[cSub] ?? "").trim() });
  }
  return out;
}

// ---- 抓取（带重试；失败抛错，由调用方决定回落或整体失败） ----

export function createFetcher({ fetchImpl = globalThis.fetch, delays = RETRY_DELAYS, pauseMs = 150 } = {}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  return async function get(url, headers = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      try {
        const res = await fetchImpl(url, { headers: { "user-agent": UA, accept: "*/*", ...headers } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const body = Buffer.from(await res.arrayBuffer());
        if (pauseMs) await sleep(pauseMs);
        return body;
      } catch (error) {
        lastError = error;
        if (attempt < delays.length && delays[attempt]) await sleep(delays[attempt]);
      }
    }
    throw new Error(url + " 抓取失败：" + (lastError?.message ?? lastError));
  };
}

async function fetchSzsePaged(get, catalog) {
  const referer = "https://www.szse.cn/";
  const first = await get(szseUrl(catalog, 1), { referer });
  const firstObj = szseFirstObject(JSON.parse(first.toString("utf8")));
  const { pagecount, recordcount } = firstObj.metadata;
  const buffers = [first];
  const rows = [...firstObj.data];
  for (let page = 2; page <= pagecount; page += 1) {
    const buf = await get(szseUrl(catalog, page), { referer });
    buffers.push(buf);
    rows.push(...szseFirstObject(JSON.parse(buf.toString("utf8"))).data);
  }
  if (rows.length !== recordcount) {
    throw new Error("szse " + catalog + ": 行数 " + rows.length + " 与 recordcount " + recordcount + " 不一致");
  }
  return { rows, buffers };
}

// 东方财富 clist：逐页取全（单页上限 100），域名按顺序回退；行数必须与 total 一致。
async function fetchEm(get, market) {
  let lastError = null;
  for (const host of EM_HOSTS) {
    try {
      const referer = "https://quote.eastmoney.com/";
      const first = await get(emUrl(host, market, 1), { referer });
      const page1 = parseEmPage(JSON.parse(first.toString("utf8")));
      const buffers = [first];
      const rows = [...page1.rows];
      const pages = Math.ceil(page1.total / EM_PAGE);
      for (let p = 2; p <= pages; p += 1) {
        const buf = await get(emUrl(host, market, p), { referer });
        buffers.push(buf);
        rows.push(...parseEmPage(JSON.parse(buf.toString("utf8"))).rows);
      }
      if (rows.length !== page1.total) throw new Error("行数 " + rows.length + " 与 total " + page1.total + " 不一致");
      return { rows, buffers, total: page1.total, host };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("东方财富 clist " + market + " 所有域名均失败：" + (lastError?.message ?? lastError));
}

// 腾讯报价批量查询：返回 key（如 sh600000）→ 名称，只包含取到有效名称与价格的代码。
async function quoteBatch(get, keys) {
  const buffers = [];
  const names = new Map();
  for (let i = 0; i < keys.length; i += TENCENT_BATCH) {
    const buf = await get(tencentUrl(keys.slice(i, i + TENCENT_BATCH)));
    buffers.push(buf);
    for (const [key, name] of parseTencentNames(new TextDecoder("gbk").decode(buf))) names.set(key, name);
  }
  return { names, buffers };
}

function mergeUnique(rows, label, problems) {
  const map = new Map();
  for (const r of rows) {
    if (map.has(r.code)) {
      problems.push(label + ": 跨来源代码冲突 " + r.code);
      continue;
    }
    map.set(r.code, r);
  }
  return [...map.values()];
}

function countBy(rows, keyOf) {
  const out = {};
  for (const r of rows) {
    const k = keyOf(r.code);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function collectPools({
  get = createFetcher(),
  getFast = createFetcher({ delays: [500], pauseMs: 150 }),
  bounds = BOUNDS,
  now = () => new Date(),
} = {}) {
  const retrievedAt = now().toISOString();
  const sources = [];
  const problems = [];
  const stats = { listSources: {}, crossChecks: {} };
  const poolSources = { a_stocks: [], etf_stocks: [], hk_stocks: [] };
  const addSource = (id, url, buffers, records) => {
    sources.push({ id, url, retrievedAt, rawSha256: sha256(Buffer.concat(buffers)), records });
  };
  const check = (label, count, bound) => problems.push(...rangeProblem(label, count, bound));
  const recon = (label, quoteRows, officialRows) => {
    const r = reconcile(quoteRows, officialRows);
    stats.crossChecks[label] = r;
    if (r.ratio > RECONCILE_TOLERANCE) {
      problems.push(label + ": 行情列表与官方清单差异 " + (r.ratio * 100).toFixed(2) + "%，超过 1%");
    }
    return r;
  };
  const fallbackNote = (label, error) => {
    stats.listSources[label] = "fallback: " + (error?.message ?? error);
  };

  // ---- 上交所股票：行情列表 yunhq 为主；官方 JSON 始终抓取，行情不可达时回落 ----
  const sseBuf = await get(SOURCE_URLS.sseStocks, { referer: "https://www.sse.com.cn/" });
  const sseOfficial = parseSseStockList(JSON.parse(sseBuf.toString("utf8")));
  addSource("sse-stock-list", SOURCE_URLS.sseStocks, [sseBuf], sseOfficial.length);
  check("sse-stock-list", sseOfficial.length, bounds.sseListed);
  let shQuote;
  try {
    const yq = await getFast(SOURCE_URLS.yunhqEquity, { referer: "https://www.sse.com.cn/" });
    shQuote = parseYunhqList(yq.toString("utf8")).filter((r) => SEG.shA.test(r.code));
    addSource("yunhq-equity", SOURCE_URLS.yunhqEquity, [yq], shQuote.length);
    check("yunhq-equity", shQuote.length, bounds.yunhqEquity);
    stats.listSources["sh-stocks"] = "quote-primary (yunhq-equity)";
    poolSources.a_stocks.push("yunhq-equity");
    recon("sh-stocks", shQuote, sseOfficial);
  } catch (error) {
    fallbackNote("sh-stocks", error);
    shQuote = sseOfficial;
    poolSources.a_stocks.push("sse-stock-list");
  }

  // ---- 深交所股票：东方财富 clist 为主；深交所报表始终抓取，clist 不可达时回落 ----
  const szseA = await fetchSzsePaged(get, 1110);
  const szOfficial = parseSzseStocks(szseA.rows);
  addSource("szse-a-list", szseUrl(1110, 1), szseA.buffers, szOfficial.length);
  check("szse-a-list", szOfficial.length, bounds.szseStocks);
  let szQuote;
  try {
    const em = await fetchEm(getFast, "sz");
    addSource("em-clist-sz", "eastmoney clist fs=" + EM_FS.sz + " host=" + em.host, em.buffers, em.rows.length);
    szQuote = em.rows.filter((r) => SEG.szA.test(r.code));
    check("em-clist-sz", szQuote.length, bounds.emSz);
    stats.listSources["sz-stocks"] = "quote-primary (em-clist-sz)";
    poolSources.a_stocks.push("em-clist-sz");
    recon("sz-stocks", szQuote, szOfficial);
  } catch (error) {
    fallbackNote("sz-stocks", error);
    szQuote = szOfficial;
    poolSources.a_stocks.push("szse-a-list");
  }

  // ---- 北交所：行情侧号段枚举（腾讯报价 920 号段）为主；东方财富 clist 仅作对账 ----
  const bj = await quoteBatch(get, range(920000, 920999).map((n) => "bj" + n));
  addSource("bj-tencent-enum", "https://qt.gtimg.cn/q=bj920000..bj920999", bj.buffers, bj.names.size);
  const bjQuote = [...bj.names].map(([key, name]) => ({ code: key.slice(2), name }));
  check("bj-tencent-enum", bjQuote.length, bounds.bjStocks);
  stats.listSources["bj-stocks"] = "quote-primary (bj-tencent-enum)";
  poolSources.a_stocks.push("bj-tencent-enum");
  try {
    const emBj = await fetchEm(getFast, "bj");
    addSource("em-clist-bj", "eastmoney clist fs=" + EM_FS.bj + " host=" + emBj.host, emBj.buffers, emBj.rows.length);
    recon("bj-stocks", emBj.rows.filter((r) => SEG.bj.test(r.code)), bjQuote);
  } catch (error) {
    stats.crossChecks["bj-stocks"] = "em-clist unavailable: " + (error?.message ?? error);
  }

  // ---- 上交所 ETF：行情列表 yunhq ----
  const yqEtf = await get(SOURCE_URLS.yunhqEtf, { referer: "https://www.sse.com.cn/" });
  const shEtfQuote = parseYunhqList(yqEtf.toString("utf8")).filter((r) => SEG.shEtf.test(r.code));
  addSource("yunhq-etf", SOURCE_URLS.yunhqEtf, [yqEtf], shEtfQuote.length);
  check("yunhq-etf", shEtfQuote.length, bounds.yunhqEtf);
  stats.listSources["sh-etf"] = "quote-primary (yunhq-etf)";
  poolSources.etf_stocks.push("yunhq-etf");

  // ---- 深交所 ETF：东方财富 clist（ETF 板块）为主；深交所报表始终抓取，clist 不可达时回落 ----
  const szseE = await fetchSzsePaged(get, 1945);
  const szEtfOfficial = parseSzseEtf(szseE.rows);
  addSource("szse-etf-list", szseUrl(1945, 1), szseE.buffers, szEtfOfficial.length);
  check("szse-etf-list", szEtfOfficial.length, bounds.szseEtf);
  let szEtfQuote;
  try {
    const emEtf = await fetchEm(getFast, "etf");
    addSource("em-clist-etf", "eastmoney clist fs=" + EM_FS.etf + " host=" + emEtf.host, emEtf.buffers, emEtf.rows.length);
    check("em-clist-etf", emEtf.rows.length, bounds.emEtf);
    szEtfQuote = emEtf.rows.filter((r) => SEG.szEtf.test(r.code));
    stats.listSources["sz-etf"] = "quote-primary (em-clist-etf)";
    poolSources.etf_stocks.push("em-clist-etf");
    recon("sz-etf", szEtfQuote, szEtfOfficial);
    recon("sh-etf(em-vs-yunhq)", emEtf.rows.filter((r) => SEG.shEtf.test(r.code)), shEtfQuote);
  } catch (error) {
    fallbackNote("sz-etf", error);
    szEtfQuote = szEtfOfficial;
    poolSources.etf_stocks.push("szse-etf-list");
  }

  // ---- 港股：东方财富 clist 为主，币种与类别以港交所证券表为口径；港交所证券表始终抓取 ----
  const hkexBuf = await get(SOURCE_URLS.hkexXlsx);
  const hkexRows = parseHkexSecurities(readXlsxRows(hkexBuf));
  addSource("hkex-securities", SOURCE_URLS.hkexXlsx, [hkexBuf], hkexRows.length);
  const hkOfficialSet = new Set(hkexRows.map((r) => r.code));
  let hkCandidates;
  try {
    const emHk = await fetchEm(getFast, "hk");
    addSource("em-clist-hk", "eastmoney clist fs=" + EM_FS.hk + " host=" + emHk.host, emHk.buffers, emHk.rows.length);
    check("em-clist-hk", emHk.rows.length, bounds.emHk);
    const quoteSet = new Set(emHk.rows.filter((r) => SEG.hk.test(r.code)).map((r) => "hk" + r.code));
    hkCandidates = emHk.rows
      .filter((r) => SEG.hk.test(r.code) && hkOfficialSet.has("hk" + r.code))
      .map((r) => ({ key: "hk" + r.code, code: "hk" + r.code, name: r.name }));
    const onlyOfficial = [...hkOfficialSet].filter((c) => !quoteSet.has(c));
    stats.crossChecks["hk-stocks"] = {
      quote: quoteSet.size,
      official: hkOfficialSet.size,
      candidates: hkCandidates.length,
      onlyQuote: quoteSet.size - hkCandidates.length,
      onlyOfficial: onlyOfficial.length,
    };
    if (onlyOfficial.length > hkOfficialSet.size * RECONCILE_TOLERANCE) {
      problems.push("hk-stocks: 港交所有而行情列表缺失 " + onlyOfficial.length + " 只，超过 1%");
    }
    stats.listSources["hk-stocks"] = "quote-primary (em-clist-hk)";
    poolSources.hk_stocks.push("em-clist-hk", "hkex-securities");
  } catch (error) {
    fallbackNote("hk-stocks", error);
    hkCandidates = hkexRows.map((r) => ({ key: r.code, code: r.code, name: "" }));
    poolSources.hk_stocks.push("hkex-securities");
  }

  // ---- 报价校验：腾讯行情能否报价（有名称且价格大于 0）；名称缺失时用腾讯名称 ----
  const cand = {
    a: [
      ...shQuote.map((r) => ({ key: "sh" + r.code, code: r.code, name: r.name })),
      ...szQuote.map((r) => ({ key: "sz" + r.code, code: r.code, name: r.name })),
      ...bjQuote.map((r) => ({ key: "bj" + r.code, code: r.code, name: r.name })),
    ],
    etf: [
      ...shEtfQuote.map((r) => ({ key: "sh" + r.code, code: r.code, name: r.name })),
      ...szEtfQuote.map((r) => ({ key: "sz" + r.code, code: r.code, name: r.name })),
    ],
    hk: hkCandidates,
  };
  const check2 = await quoteBatch(get, [...cand.a, ...cand.etf, ...cand.hk].map((c) => c.key));
  addSource("tencent-quote-check", "https://qt.gtimg.cn/q=（批量报价校验）", check2.buffers, check2.names.size);
  const validate = (label, list) => {
    const ok = list.filter((c) => check2.names.has(c.key));
    const bad = list.length - ok.length;
    stats.crossChecks[label + " 报价校验"] = { candidates: list.length, valid: ok.length, invalid: bad, invalidKeys: list.filter((c) => !check2.names.has(c.key)).map((c) => c.key).slice(0, 12) };
    if (list.length && bad / list.length > QUOTE_INVALID_TOLERANCE) {
      problems.push(label + ": 报价校验失败 " + bad + "/" + list.length + "，超过 2%");
    }
    return ok.map((c) => ({ ...c, name: c.name || check2.names.get(c.key) || "" }));
  };
  const aOk = validate("a_stocks", cand.a);
  const etfOk = validate("etf_stocks", cand.etf);
  const hkOk = validate("hk_stocks", cand.hk);
  poolSources.a_stocks.push("tencent-quote-check");
  poolSources.etf_stocks.push("tencent-quote-check");
  poolSources.hk_stocks.push("tencent-quote-check");

  const pools = {
    a_stocks: sortRows(mergeUnique(aOk.map((c) => ({ code: c.code, name: c.name })), "a_stocks", problems)),
    etf_stocks: sortRows(mergeUnique(etfOk.map((c) => ({ code: c.key, name: c.name })), "etf_stocks", problems)),
    hk_stocks: sortRows(mergeUnique(hkOk.map((c) => ({ code: c.key, name: c.name })), "hk_stocks", problems)),
  };
  check("a_stocks", pools.a_stocks.length, bounds.aStocks);
  check("etf_stocks", pools.etf_stocks.length, bounds.etf);
  check("hk_stocks", pools.hk_stocks.length, bounds.hk);
  for (const name of Object.keys(FILES)) problems.push(...validatePool(name, pools[name]));

  return {
    retrievedAt,
    sources,
    pools,
    problems,
    poolSources,
    stats: {
      ...stats,
      aByExchange: countBy(pools.a_stocks, (c) => (c.startsWith("6") ? "sh" : c.startsWith("9") ? "bj" : "sz")),
      etfByExchange: countBy(pools.etf_stocks, (c) => c.slice(0, 2)),
    },
  };
}

// ---- 读写与报告 ----

export async function loadCurrent(dir = DATA_DIR) {
  const out = {};
  for (const [name, file] of Object.entries(FILES)) {
    try {
      out[name] = JSON.parse((await readFile(join(dir, file), "utf8")).replace(/^\uFEFF/, ""));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      out[name] = [];
    }
  }
  return out;
}

export async function writeOutputs(result, dir = DATA_DIR) {
  const files = {};
  for (const [name, file] of Object.entries(FILES)) {
    const text = canonicalJson(result.pools[name]);
    await writeFile(join(dir, file), text, "utf8");
    files[file] = { records: result.pools[name].length, sha256: sha256(Buffer.from(text, "utf8")), sources: result.poolSources?.[name] ?? [] };
  }
  const manifest = buildManifest({ generatedAt: result.retrievedAt, sources: result.sources, files });
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

export function buildReport(mode, result, current, acceptShrink) {
  const diff = {};
  const counts = {};
  const shrink = [];
  for (const name of Object.keys(FILES)) {
    const before = current[name] ?? [];
    const after = result.pools[name];
    diff[name] = diffRows(before, after);
    counts[name] = { current: before.length, next: after.length };
    shrink.push(...shrinkProblems(name, before.length, after.length, acceptShrink));
  }
  return {
    mode,
    retrievedAt: result.retrievedAt,
    sources: result.sources.map((s) => ({ id: s.id, records: s.records, rawSha256: s.rawSha256.slice(0, 16) })),
    counts,
    stats: result.stats,
    diff,
    problems: [...result.problems, ...shrink],
  };
}

export async function main(argv = process.argv.slice(2)) {
  const apply = argv.includes("--apply");
  const acceptShrink = argv.includes("--accept-shrink");
  const current = await loadCurrent();
  const result = await collectPools();
  const report = buildReport(apply ? "apply" : "dry-run", result, current, acceptShrink);
  if (report.problems.length > 0) {
    report.written = [];
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return report;
  }
  report.written = [];
  if (apply) {
    await writeOutputs(result);
    report.written = [...Object.values(FILES), "manifest.json"];
  }
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("refresh-pools: " + error.message);
    process.exitCode = 1;
  });
}
