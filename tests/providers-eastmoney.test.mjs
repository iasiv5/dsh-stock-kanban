import test from "node:test";
import assert from "node:assert/strict";
import { directSecid, fetchBatchSnapshots, fetchQuote, resolveUSSecid } from "../src/markets/eastmoney.mjs";

/* EM 多市场化（P0-1/P0-3，2026-11-13）：cn/hk 目录式 secid、美股指数预置、f124 时间戳。 */

test("directSecid：cn/hk/美股指数目录映射；美股个股 null；hkHSI undefined（不经 EM）", () => {
  assert.equal(directSecid("sh600519"), "1.600519");
  assert.equal(directSecid("sz000001"), "0.000001");
  assert.equal(directSecid("bj830799"), "0.830799");
  assert.equal(directSecid("hk00700"), "116.00700");
  assert.equal(directSecid("hkHSI"), undefined);
  assert.equal(directSecid("DJI"), "100.DJIA");
  assert.equal(directSecid("AAPL"), null);
});

test("resolveUSSecid：美股指数预置，不走交易所探测（105/106/107 探不到指数）", async () => {
  assert.equal(await resolveUSSecid("DJI"), "100.DJIA");
  assert.equal(await resolveUSSecid("INX"), "100.SPX");
});

test("fetchBatchSnapshots：多市场混合，按入参 code 回填键，f124 → quoteTimeMs", async () => {
  const diff = [
    { f2: 1453, f3: 0.07, f4: 1, f5: 42848, f6: 619953000, f12: "600519", f13: 1, f14: "贵州茅台", f15: 1457.72, f16: 1436, f17: 1450, f18: 1452, f124: 1762416840 },
    { f2: 344.7, f3: 0.16, f4: 0.55, f5: 1000, f6: 344700, f12: "AAPL", f13: 105, f14: "苹果", f15: 345, f16: 343, f17: 344, f18: 344.15, f124: 1762416840 },
  ];
  const originalFetch = globalThis.fetch;
  const seenUrls = [];
  globalThis.fetch = async (url) => {
    seenUrls.push(String(url));
    if (String(url).includes("fields=f57")) return { ok: true, json: async () => ({ data: { f57: "AAPL" } }) };
    return { ok: true, json: async () => ({ data: { diff } }) };
  };
  try {
    const rows = await fetchBatchSnapshots(["sh600519", "AAPL"]);
    assert.equal(rows.size, 2);
    const mt = rows.get("sh600519");
    assert.equal(mt.price, 1453);
    assert.equal(mt.prevClose, 1452);
    assert.equal(mt.high, 1457.72);
    assert.equal(mt.quoteTimeMs, 1762416840000);
    assert.equal(rows.get("AAPL").name, "苹果");
    assert.ok(seenUrls.some((u) => u.includes("ulist.np")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchQuote：完整快照含 f124 时间戳（cn/hk 备源与 us 主源同型）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: { f43: 1453, f44: 1457.72, f45: 1436, f46: 1450, f47: 42848, f48: 619953000, f57: "600519", f58: "贵州茅台", f60: 1452, f124: 1762416840, f169: 1, f170: 0.07 } }) });
  try {
    const q = await fetchQuote("sh600519");
    assert.equal(q.price, 1453);
    assert.equal(q.quoteTimeMs, 1762416840000);
    assert.equal(q.name, "贵州茅台");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
