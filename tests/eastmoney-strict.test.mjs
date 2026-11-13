import test from "node:test";
import assert from "node:assert/strict";
import { resolveUSSecid, fetchQuote } from "../src/markets/eastmoney.mjs";

/* 2026-11-13 遗留项修复（§12.32）：东方财富 secid 探测的传输失败不得静默变成「无此代码」。
   严格模式（strict）下传输失败抛出 SECID_TRANSPORT，供提供方级退避计数；且仍不负缓存。
   默认模式行为不变（见 eastmoney-secid.test.mjs）。 */

const ok = (body) => ({ ok: true, json: async () => body });

test("严格模式：传输失败且未解析 → 抛错 SECID_TRANSPORT，不负缓存（恢复后可解析）", async () => {
  const orig = globalThis.fetch;
  let down = true;
  globalThis.fetch = async (url) => {
    if (down) throw new Error("ECONNRESET");
    return String(url).includes("secid=105.ZZTESTD") ? ok({ data: { f57: "ZZTESTD" } }) : ok({ data: {} });
  };
  try {
    await assert.rejects(() => resolveUSSecid("ZZTESTD", { strict: true }), (e) => e.code === "SECID_TRANSPORT");
    down = false;
    assert.equal(await resolveUSSecid("ZZTESTD", { strict: true }), "105.ZZTESTD");
  } finally {
    globalThis.fetch = orig;
  }
});

test("严格模式：三交易所明确无此代码 → 返回 null 并负缓存（不重复探测）", async () => {
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return ok({ data: {} });
  };
  try {
    assert.equal(await resolveUSSecid("ZZTESTE", { strict: true }), null);
    assert.equal(calls, 3);
    assert.equal(await resolveUSSecid("ZZTESTE", { strict: true }), null);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = orig;
  }
});

test("fetchQuote：严格模式传输失败抛错；默认模式仍返回 null（搜索路径不变）", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("ECONNRESET");
  };
  try {
    await assert.rejects(() => fetchQuote("ZZTESTF", { strict: true }), (e) => e.code === "SECID_TRANSPORT");
    assert.equal(await fetchQuote("ZZTESTF"), null);
  } finally {
    globalThis.fetch = orig;
  }
});
