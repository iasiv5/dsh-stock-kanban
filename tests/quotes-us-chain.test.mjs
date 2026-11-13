import test from "node:test";
import assert from "node:assert/strict";
import { createQuoteService } from "../src/quotes.mjs";

/* 美股链顺序（2026-11-13）：东方财富 → 腾讯美股 → Yahoo。东方财富失败时腾讯美股应先于 Yahoo 补位，
   使 Yahoo 的 429 不再成为美股的唯一兜底。 */

const SAMPLE_TENCENT = 'v_usAAPL="200~苹果~AAPL.OQ~354.88~355.36~357.81~31874978~0~0~354.78~200~0~0~0~0~0~0~0~0~354.90~40~0~0~0~0~0~0~0~0~~2026-11-12 16:00:01~-0.48~-0.14~359.37~354.41~USD~31874978~11361383723~0.22~39.52~~39.52~~1.40~51539.61588~51571.80748~Apple Inc.~8.98~359.37~242.57~160~46.01~0.30~51571.80748~31.00~3.19~GP~142.26~34.61~1.79~3.85~12.10~14532182000~14523110878~0.68~39.52~1.07~356.44~~~~~";';

test("美股：东方财富失败 → 腾讯美股补位；Yahoo 不被调用", async () => {
  const originalFetch = globalThis.fetch;
  const hosts = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    hosts.push(u.includes("eastmoney") ? "em" : u.includes("gtimg") ? "tx" : u.includes("yahoo") ? "yh" : "other");
    if (u.includes("eastmoney")) throw new Error("HTTP 502");
    if (u.includes("gtimg")) return { ok: true, arrayBuffer: async () => Buffer.from(SAMPLE_TENCENT, "utf8") };
    throw new Error("unexpected " + u);
  };
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    const rows = await svc.getQuotes([{ id: "us:AAPL", market: "us", code: "AAPL", quoteCurrency: "USD" }]);
    const row = rows.get("us:AAPL");
    assert.equal(row.status, "ok");
    assert.equal(row.quote.price, 354.88);
    assert.ok(!hosts.includes("yh"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
