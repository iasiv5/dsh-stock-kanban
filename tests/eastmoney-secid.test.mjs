import test from "node:test";
import assert from "node:assert/strict";
import { resolveUSSecid } from "../src/markets/eastmoney.mjs";

/* 评审轮3 R3-1（2026-11-13）：探测失败不得负缓存。旧实现把三交易所全部失败也写成 null，
   之后该代码在整个进程里都判为不存在（K 线/分时报 not-found，直到宿主重启）。 */

const ok = (body) => ({ ok: true, json: async () => body });

test("resolveUSSecid：瞬时故障不负缓存——故障恢复后可解析", async () => {
  const originalFetch = globalThis.fetch;
  let down = true;
  globalThis.fetch = async (url) => {
    if (down) throw new Error("ECONNRESET");
    return String(url).includes("secid=105.ZZTESTA") ? ok({ data: { f57: "ZZTESTA" } }) : ok({ data: {} });
  };
  try {
    assert.equal(await resolveUSSecid("ZZTESTA"), null);
    down = false;
    assert.equal(await resolveUSSecid("ZZTESTA"), "105.ZZTESTA");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveUSSecid：三交易所均明确应答无此代码 → 确认不存在并负缓存（不重复探测）", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return ok({ data: {} });
  };
  try {
    assert.equal(await resolveUSSecid("ZZTESTB"), null);
    assert.equal(calls, 3);
    assert.equal(await resolveUSSecid("ZZTESTB"), null);
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveUSSecid：部分传输失败不负缓存（一交易所超时、其余无此代码）", async () => {
  const originalFetch = globalThis.fetch;
  let flaky = true;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("secid=105.ZZTESTC")) {
      if (flaky) throw new Error("timeout");
      return ok({ data: { f57: "ZZTESTC" } });
    }
    return ok({ data: {} });
  };
  try {
    assert.equal(await resolveUSSecid("ZZTESTC"), null);
    flaky = false;
    assert.equal(await resolveUSSecid("ZZTESTC"), "105.ZZTESTC");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
