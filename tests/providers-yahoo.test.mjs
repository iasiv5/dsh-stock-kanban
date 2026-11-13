import test from "node:test";
import assert from "node:assert/strict";
import { fetchBatchSnapshots } from "../src/markets/yahoo.mjs";

/* Yahoo 备源（P0-1/P0-3，2026-11-13）：meta 口径、指数符号映射、逐标的独立判错。夹具按 2026-11-13 实测 meta 采样。 */

const META = {
  currency: "USD", symbol: "AAPL", regularMarketTime: 1794517201,
  regularMarketPrice: 354.88, chartPreviousClose: 344.17,
  regularMarketOpen: 346, regularMarketDayHigh: 359.368, regularMarketDayLow: 354.41,
  regularMarketVolume: 30897281, longName: "Apple Inc.", shortName: "Apple Inc.",
};

test("fetchBatchSnapshots：meta → 行；regularMarketTime → quoteTimeMs（美股行情时间）", async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return { ok: true, json: async () => ({ chart: { result: [{ meta: META }] } }) };
  };
  try {
    const rows = await fetchBatchSnapshots(["AAPL"]);
    const q = rows.get("AAPL");
    assert.equal(q.price, 354.88);
    assert.equal(q.prevClose, 344.17);
    assert.equal(q.quoteTimeMs, 1794517201000);
    assert.ok(Math.abs(q.changePercent - ((354.88 - 344.17) / 344.17) * 100) < 0.01);
    assert.ok(urls[0].includes("/v8/finance/chart/AAPL"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchBatchSnapshots：指数映射 ^DJI/^IXIC；单标的失败独立判错不整批失败", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("%5EDJI")) {
      return { ok: true, json: async () => ({ chart: { result: [{ meta: { ...META, symbol: "^DJI", regularMarketPrice: 52297.09 } }] } }) };
    }
    throw new Error("network-down");
  };
  try {
    const rows = await fetchBatchSnapshots(["DJI", "IXIC"]);
    assert.equal(rows.size, 1);
    assert.equal(rows.get("DJI").price, 52297.09);
    assert.ok(!rows.has("IXIC"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
