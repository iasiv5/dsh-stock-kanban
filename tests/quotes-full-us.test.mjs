import test from "node:test";
import assert from "node:assert/strict";
import { createQuoteService } from "../src/quotes.mjs";

/* 详情路径美股链（2026-11-13，修复详情头报「获取失败 / no-data」）：
   1) 详情路径与卡片批量路径同一条美股链：东方财富失败后由腾讯美股补位，不得落到 Yahoo；
   2) 详情路径与批量路径共用提供方退避：Yahoo 429 后，退避期内详情轮询不得再打上游；
   3) 详情路径成功结果在 TTL 内短缓存，轮询不重复打上游。
   东方财富 secid 探测的传输失败由 resolveUSSecid 静默吞掉并返回 null（既有设计），详情路径无法把它计为失败，
   因此第 2、3 条只计腾讯美股 / Yahoo 的上游请求；该限制见 docs/verification.md §12.31。
   全部 mock 网络。 */

const US_ROW = 'v_usNVDA="200~NVIDIA~NVDA.OQ~166.19~173.73~151.01~747707648~0~0~167.81~700~0~0~0~0~0~0~0~0~167.84~1100~0~0~0~0~0~0~0~0~~2026-11-12 16:00:01~-7.54~-4.34~167.14~148.80~USD~747707648~121212102964~3.10~21.01~~33.92~~10.56~38538.95044~40129.89930~NVIDIA~7.91~243.37~148.80~-400~17.53~0.31~40129.89930~-10.68~-8.49~GP~117.21~83.68~-22.22~-23.50~-23.53~24147000000~23189692783~2.18~17.13~0.52~162.11~~~~~";';
const US = [{ id: "us:NVDA", market: "us", code: "NVDA", quoteCurrency: "USD" }];

function routeFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    for (const [needle, handler] of routes) {
      if (u.includes(needle)) return handler(u);
    }
    throw new Error("unexpected " + u);
  };
  return calls;
}
const ok = (text) => ({ ok: true, status: 200, arrayBuffer: async () => Buffer.from(text, "utf8"), json: async () => ({}) });
const fail = (status) => ({ ok: false, status, arrayBuffer: async () => Buffer.from(""), json: async () => ({}) });
const emDown = () => { throw new Error("HTTP 502"); };

test("详情路径：东方财富失败 → 腾讯美股补位，不落到 Yahoo", async () => {
  const orig = globalThis.fetch;
  try {
    const calls = routeFetch([["eastmoney", emDown], ["gtimg", () => ok(US_ROW)], ["yahoo", () => fail(429)]]);
    const out = await createQuoteService({ ttlMs: 0 }).getQuoteFull(US);
    const row = out.get("us:NVDA");
    assert.equal(row.status, "ok");
    assert.equal(row.quote.price, 166.19);
    assert.equal(row.quoteTime, Date.UTC(2026, 10, 12, 21, 0, 1));
    assert.ok(!calls.some((u) => u.includes("yahoo")), "腾讯美股已补位，不应打 Yahoo");
  } finally {
    globalThis.fetch = orig;
  }
});

test("详情路径退避：Yahoo 429 后，退避期内详情轮询不再打上游", async () => {
  const orig = globalThis.fetch;
  try {
    const calls = routeFetch([["eastmoney", emDown], ["gtimg", () => fail(500)], ["yahoo", () => fail(429)]]);
    const svc = createQuoteService({ ttlMs: 0 });
    const first = await svc.getQuoteFull(US);
    assert.equal(first.get("us:NVDA").status, "error");
    const upstream = () => calls.filter((u) => !u.includes("eastmoney")).length;
    const before = upstream();
    const second = await svc.getQuoteFull(US);
    assert.equal(second.get("us:NVDA").status, "error");
    assert.equal(upstream() - before, 0, "退避期内腾讯美股 / Yahoo 不得再被打");
  } finally {
    globalThis.fetch = orig;
  }
});

test("详情路径成功结果短缓存：TTL 内轮询不重复打上游", async () => {
  const orig = globalThis.fetch;
  try {
    const calls = routeFetch([["eastmoney", emDown], ["gtimg", () => ok(US_ROW)]]);
    const svc = createQuoteService({ ttlMs: 10000 });
    const a = await svc.getQuoteFull(US);
    assert.equal(a.get("us:NVDA").status, "ok");
    const gtimgCount = () => calls.filter((u) => u.includes("gtimg")).length;
    const n = gtimgCount();
    const b = await svc.getQuoteFull(US);
    assert.equal(b.get("us:NVDA").status, "ok");
    assert.equal(gtimgCount(), n, "TTL 内腾讯美股不得重复打上游");
  } finally {
    globalThis.fetch = orig;
  }
});
