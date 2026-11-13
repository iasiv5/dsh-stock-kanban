import test from "node:test";
import assert from "node:assert/strict";
import { fetchBatchSnapshots } from "../src/markets/yahoo.mjs";

/* 评审-运行时发现（2026-11-13）：Yahoo 对本机 IP 返回 429，旧实现把逐标的错误吞掉，整批返回空 Map，
   提供方永远不进入退避，轮询持续打上游。修复后：429/网络错误整批抛错，从而触发提供方级退避。 */

test("429 整批抛错（不再静默返回空 Map，否则提供方永不退避）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  try {
    await assert.rejects(() => fetchBatchSnapshots(["AAPL", "NVDA"]), /429/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("网络错误整批抛错", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("ECONNRESET"); };
  try {
    await assert.rejects(() => fetchBatchSnapshots(["AAPL"]), /ECONNRESET/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("单标的 no-chart-meta 仍独立判错（其余标的照常返回）", async () => {
  const originalFetch = globalThis.fetch;
  const META = { symbol: "AAPL", regularMarketPrice: 354.88, regularMarketChangePercent: -0.135, regularMarketTime: 1794517201 };
  globalThis.fetch = async (url) => {
    if (String(url).includes("NVDA")) return { ok: true, status: 200, json: async () => ({ chart: { result: null } }) };
    return { ok: true, status: 200, json: async () => ({ chart: { result: [{ meta: META }] } }) };
  };
  try {
    const rows = await fetchBatchSnapshots(["AAPL", "NVDA"]);
    assert.equal(rows.get("AAPL").price, 354.88);
    assert.ok(!rows.has("NVDA"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
