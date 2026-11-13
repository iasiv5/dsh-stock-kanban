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

test("resolveUSSecid：push2 探测域全挂时降级 push2his kline 探测（探测域与数据域分离，2026-11-13）", async () => {
  const originalFetch = globalThis.fetch;
  const emCalls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    emCalls.push(u);
    if (u.includes("push2.eastmoney.com")) throw new Error("HTTP 502"); // 探测域（stock/get）全挂
    // push2his（数据域）活着：105.ZZTESTG 命中，其余候选明确无此代码
    const secid = new URL(u).searchParams.get("secid");
    if (secid === "105.ZZTESTG") return ok({ data: { code: "ZZTESTG", klines: ["2026-11-12,1.0"] } });
    return ok({ data: {} });
  };
  try {
    assert.equal(await resolveUSSecid("ZZTESTG"), "105.ZZTESTG");
    assert.ok(emCalls.some((u) => u.includes("push2his.eastmoney.com") && u.includes("secid=105.ZZTESTG")), "应有 push2his 降级探测");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveUSSecid：push2 与 push2his 全传输失败 → strict 抛 SECID_TRANSPORT；默认模式恢复后可解析", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("HTTP 502"); };
  try {
    await assert.rejects(() => resolveUSSecid("ZZTESTH", { strict: true }), (e) => e.code === "SECID_TRANSPORT");
    assert.equal(await resolveUSSecid("ZZTESTH"), null); // 默认模式：传输失败不判不存在、不负缓存
    globalThis.fetch = async (url) => (String(url).includes("secid=105.ZZTESTH") ? ok({ data: { f57: "ZZTESTH" } }) : ok({ data: {} }));
    assert.equal(await resolveUSSecid("ZZTESTH"), "105.ZZTESTH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
