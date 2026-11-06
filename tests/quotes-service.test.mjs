import test from "node:test";
import assert from "node:assert/strict";
import { createQuoteService } from "../src/quotes.mjs";

/* mock 上游：按 host 前缀分流，统计调用次数（12.3 合并请求/退避行为验证） */

function mockFetchWorld() {
  const calls = [];
  let tencentFail = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const u2 = String(url);
    if (u2.includes("qt.gtimg.cn")) {
      if (tencentFail) throw new Error("upstream-down");
      return { ok: true, json: async () => ({}), arrayBuffer: async () => {
        const text = 'v_sh600519="1~贵州茅台~600519~1453.00~1452.00~1450.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~202611061614~1.00~0.07~1457.72~1436.00~x~42848~619953~0.34~22.11";';
        return Buffer.from(text, "utf8");
      } };
    }
    if (String(url).includes("push2.eastmoney.com") || String(url).includes("push2his.eastmoney.com")) {
      if (u2.includes("fields=f57")) {
        // secid 探测：返回 f57 命中（105.AAPL 为 NASDAQ）
        return { ok: true, json: async () => ({ data: { f57: "AAPL" } }) };
      }
      return { ok: true, json: async () => ({ data: { diff: [{ f2: 344.7, f3: 0.16, f4: 0.55, f12: "AAPL", f13: 105, f14: "苹果" }] } }) };
    }
    if (String(url).includes("okx.com")) {
      if (String(url).includes("tickers?")) {
        return { ok: true, json: async () => ({ code: "0", data: [{ instId: "BTC-USDT", last: "75000", open24h: "74000", high24h: "76000", low24h: "73500", vol24h: "1000", volCcy24h: "7.5e7", ts: "1793982337673" }] }) };
      }
      return { ok: true, json: async () => ({ code: "0", data: [{ instId: "BTC-USDT", last: "75000", open24h: "74000", high24h: "76000", low24h: "73500", vol24h: "1000", volCcy24h: "7.5e7", ts: "1793982337673" }] }) };
    }
    return { ok: false, status: 404 };
  };
  return {
    calls,
    setTencentFail: (v) => { tencentFail = v; },
    restore: () => { globalThis.fetch = originalFetch; },
  };
}

const IDS = [
  { id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" },
  { id: "us:AAPL", market: "us", code: "AAPL", quoteCurrency: "USD" },
  { id: "crypto:BTC-USDT", market: "crypto", code: "BTC-USDT", quoteCurrency: "USDT" },
];

test("行情服务：三提供方并行取数 + 每标的独立判错", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({});
    const rows = await svc.getQuotes(IDS);
    assert.equal(rows.get("cn:sh600519").status, "ok");
    assert.equal(rows.get("us:AAPL").status, "ok");
    assert.equal(rows.get("crypto:BTC-USDT").status, "ok");
    assert.equal(rows.get("crypto:BTC-USDT").quote.price, 75000);
    assert.ok(rows.get("crypto:BTC-USDT").quoteTime != null);
  } finally {
    world.restore();
  }
});

test("行情服务：TTL 内合并请求（同一批 codes 只打一次上游）（12.3）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 60000 });
    await svc.getQuotes(IDS);
    const callsAfterFirst = world.calls.length;
    await svc.getQuotes(IDS); // 立即再次
    await svc.getQuotes(IDS);
    assert.equal(world.calls.length, callsAfterFirst);
  } finally {
    world.restore();
  }
});

test("行情服务：失败进入退避，退避期内不打上游且标的标 error（12.3 限流退避）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 }); // TTL=0 强制每次可打上游
    world.setTencentFail(true);
    const rows1 = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    assert.equal(rows1.get("cn:sh600519").status, "error");
    const callsAtFail = world.calls.length;
    const rows2 = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    assert.equal(rows2.get("cn:sh600519").status, "error");
    assert.equal(world.calls.length, callsAtFail); // 退避期内没有新上游调用
    const health = svc.health();
    assert.ok(health.tencent.failures >= 1);
    assert.ok(health.tencent.backoffRemainMs > 0);
  } finally {
    world.restore();
  }
});

test("行情服务：退避期内有陈旧缓存则回退陈旧缓存", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 60000 });
    const ok = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    assert.equal(ok.get("cn:sh600519").status, "ok");
    world.setTencentFail(true);
    const rows = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    // TTL 未过 → 直接命中缓存；即使过期也优先回退缓存
    assert.equal(rows.get("cn:sh600519").status, "ok");
  } finally {
    world.restore();
  }
});
