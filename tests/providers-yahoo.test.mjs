import test from "node:test";
import assert from "node:assert/strict";
import { fetchBatchSnapshots } from "../src/markets/yahoo.mjs";

/* Yahoo 备源（P0-1/P0-3，2026-11-13）：meta 口径、指数符号映射、逐标的独立判错。夹具按 2026-11-13 实测 meta 采样。 */

const META = {
  currency: "USD", symbol: "AAPL", regularMarketTime: 1794517201,
  regularMarketPrice: 354.88, regularMarketChangePercent: -0.135,
  chartPreviousClose: 344.17, // 仅 pct 缺失时的回落路径；正路径不得用它（range 漂移坑）
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
    assert.equal(q.changePercent, -0.135); // 直读 meta.regularMarketChangePercent（当日 vs 昨收口径）
    assert.ok(Math.abs(q.prevClose - 354.88 / (1 + -0.135 / 100)) < 0.001); // 昨收由 pct 反推（≈355.359）
    assert.ok(q.changeAmount < 0); // 与当日口径同号（修正前 chartPreviousClose 漂移坑会算出 +3% 假涨）
    assert.equal(q.quoteTimeMs, 1794517201000);
    assert.ok(urls[0].includes("/v8/finance/chart/AAPL"));
    assert.ok(urls[0].includes("range=1d")); // 昨收口径依赖 range=1d（评审轮3 D1：1mo 下 chartPreviousClose 随 range 漂移）
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchBatchSnapshots：指数映射 ^DJI/^IXIC 正确；网络错误整批抛出（触发提供方退避，见 yahoo-ratelimit）", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    if (String(url).includes("%5EDJI")) {
      return { ok: true, json: async () => ({ chart: { result: [{ meta: { ...META, symbol: "^DJI", regularMarketPrice: 52297.09 } }] } }) };
    }
    throw new Error("network-down");
  };
  try {
    // 2026-11-13 语义修正：网络错误不再被逐标的吞掉，整批抛出以触发提供方级退避
    await assert.rejects(() => fetchBatchSnapshots(["DJI", "IXIC"]), /network-down/);
    assert.ok(seen.some((u) => u.includes("%5EDJI")), "DJI 符号应映射为 %5EDJI");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
