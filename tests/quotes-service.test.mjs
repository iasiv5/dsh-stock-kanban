import test from "node:test";
import assert from "node:assert/strict";
import { createQuoteService } from "../src/quotes.mjs";

/* mock 上游：按 host 前缀分流，统计调用次数（12.3 合并请求/退避行为验证） */

function mockFetchWorld() {
  const calls = [];
  let tencentFail = false;
  let emFail = false;
  let emSparse = false;
  let sinaFail = false;
  let tencentSparse = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const u2 = String(url);
    if (u2.includes("qt.gtimg.cn")) {
      if (tencentFail) throw new Error("upstream-down");
      return { ok: true, json: async () => ({}), arrayBuffer: async () => {
        const tencentRow = 'v_sh600519="1~贵州茅台~600519~1453.00~1452.00~1450.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~202611061614~1.00~0.07~1457.72~1436.00~x~42848~619953~0.34~22.11";';
        const szRow = 'v_sz000001="2~平安银行~000001~10.90~10.88~10.85~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~202611061614~0.02~0.18~10.95~10.80~x~2662~290206~0.34~22.11";';
        const hkRow = 'v_hk00700="100~TX~00700~419.80~430.60~431.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~202611061614~-10.80~-2.46~432.40~417.20~x~123456~519000~1.30~15.86";';
        const text = tencentSparse ? tencentRow : tencentRow + szRow + hkRow;
        return Buffer.from(text, "utf8");
      } };
    }
    if (String(url).includes("push2.eastmoney.com") || String(url).includes("push2his.eastmoney.com")) {
      if (emFail) throw new Error("upstream-down");
      if (emSparse) return { ok: true, json: async () => ({ data: { diff: [] } }) };
      if (u2.includes("fields=f57")) {
        // secid 探测：返回 f57 命中（105.AAPL 为 NASDAQ）
        return { ok: true, json: async () => ({ data: { f57: "AAPL" } }) };
      }
      return { ok: true, json: async () => ({ data: { diff: [
        { f2: 344.7, f3: 0.16, f4: 0.55, f12: "AAPL", f13: 105, f14: "苹果", f15: 345, f16: 343, f17: 344, f18: 344.15, f124: 1762416840 },
        { f2: 1453, f3: 0.07, f4: 1, f12: "600519", f13: 1, f14: "贵州茅台", f15: 1457.72, f16: 1436, f17: 1450, f18: 1452, f124: 1762416840 },
      ] } }) };
    }
    if (String(url).includes("okx.com")) {
      if (String(url).includes("tickers?")) {
        return { ok: true, json: async () => ({ code: "0", data: [{ instId: "BTC-USDT", last: "75000", open24h: "74000", high24h: "76000", low24h: "73500", vol24h: "1000", volCcy24h: "7.5e7", ts: "1793982337673" }] }) };
      }
      return { ok: true, json: async () => ({ code: "0", data: [{ instId: "BTC-USDT", last: "75000", open24h: "74000", high24h: "76000", low24h: "73500", vol24h: "1000", volCcy24h: "7.5e7", ts: "1793982337673" }] }) };
    }
    if (String(url).includes("hq.sinajs.cn")) {
      if (sinaFail) throw new Error("upstream-down");
      // 新浪夹具：ASCII 名称（GBK 解码 utf8 字节会吞并含中文的字段边界，数字字段不受影响但结构需保真）
      const sinaRows = 'var hq_str_sz000001="PA,10.85,10.88,10.90,10.95,10.80,10.90,10.91,266207,2902063,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-11-14,15:30:01,00,00";'
        + 'var hq_str_sh600519="MT,1404.00,1410.27,1435.26,1437.69,1394.00,1435.26,1435.30,4177984,5954834070,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-11-13,15:34:59,00,00";';
      return { ok: true, json: async () => ({}), arrayBuffer: async () => Buffer.from(sinaRows, "utf8") };
    }
    return { ok: false, status: 404 };
  };
  return {
    calls,
    setTencentFail: (v) => { tencentFail = v; },
    setEMFail: (v) => { emFail = v; },
    setEMSparse: (v) => { emSparse = v; },
    setSinaFail: (v) => { sinaFail = v; },
    setTencentSparse: (v) => { tencentSparse = v; },
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

test("行情服务：整链失败进入退避，退避期内不打上游且标的标 error（12.3 + P0-1 链级口径）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 }); // TTL=0 强制每次可打上游
    world.setTencentFail(true);
    world.setEMFail(true);
    world.setSinaFail(true); // cn 链三源全挂（2026-11-14 §12.44 链扩展：原「两源全挂即整链失败」语义随第三源到齐修正）
    const rows1 = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    assert.equal(rows1.get("cn:sh600519").status, "error");
    const callsAtFail = world.calls.length;
    const rows2 = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    assert.equal(rows2.get("cn:sh600519").status, "error");
    assert.equal(world.calls.length, callsAtFail); // 两源均在退避：没有新上游调用
    const health = svc.health();
    assert.ok(health.tencent.cn.failures >= 1);
    assert.ok(health.tencent.cn.backoffRemainMs > 0);
    assert.ok(health.eastmoney.cn.failures >= 1);
    assert.ok(health.eastmoney.cn.backoffRemainMs > 0);
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

/* ---------------- 多源降级链（P0-1/P0-3，2026-11-13） ---------------- */

test("行情服务：腾讯失败 → EM 备源补位（cn 链，主源退避不拖累备源）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentFail(true);
    const rows = await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    const row = rows.get("cn:sh600519");
    assert.equal(row.status, "ok"); // EM 兜住了
    assert.equal(row.quote.price, 1453);
    assert.equal(row.quoteTime, 1762416840000); // EM f124 时间戳
    const health = svc.health();
    assert.ok(health.tencent.cn.failures >= 1);
    assert.equal(health.eastmoney.cn.failures, 0);
  } finally {
    world.restore();
  }
});

test("行情服务：EM 失败 → Yahoo 备源补位 + 美股行情时间（us 链，P0-3）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    const YAHOO_META = { symbol: "AAPL", shortName: "Apple Inc.", regularMarketPrice: 354.88, chartPreviousClose: 344.17, regularMarketTime: 1794517201 };
    if (u.includes("query1.finance.yahoo.com")) {
      return { ok: true, json: async () => ({ chart: { result: [{ meta: YAHOO_META }] } }) };
    }
    if (u.includes("push2")) throw new Error("HTTP 502"); // EM push2 整体不可达（2026-11-13 本机实测形态）
    throw new Error("unexpected " + u);
  };
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    const rows = await svc.getQuotes([{ id: "us:AAPL", market: "us", code: "AAPL", quoteCurrency: "USD" }]);
    const row = rows.get("us:AAPL");
    assert.equal(row.status, "ok");
    assert.equal(row.quote.price, 354.88);
    assert.equal(row.quoteTime, 1794517201000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("行情服务：provider.fail 诊断事件随真实上游失败发出（含退避参数）", async () => {
  const world = mockFetchWorld();
  const events = [];
  try {
    const svc = createQuoteService({ ttlMs: 0, diag: (r) => events.push(r) });
    world.setTencentFail(true);
    await svc.getQuotes(IDS.filter((i) => i.market === "cn"));
    const fail = events.filter((e) => e.ev === "provider.fail" && e.provider === "tencent");
    assert.equal(fail.length, 1);
    assert.ok(fail[0].backoffMs >= 30000);
  } finally {
    world.restore();
  }
});

/* ---------------- 新浪第三源（§12.44，2026-11-14） ---------------- */

test("行情服务：腾讯+EM 全挂 → 新浪第三腿兜住（cn 链）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentFail(true);
    world.setEMFail(true);
    const rows = await svc.getQuotes([{ id: "cn:sz000001", market: "cn", code: "sz000001", quoteCurrency: "CNY" }]);
    const row = rows.get("cn:sz000001");
    assert.equal(row.status, "ok");
    assert.equal(row.quote.price, 10.9);
    assert.equal(row.quoteTime, Date.parse("2026-11-14T15:30:01+08:00"));
  } finally {
    world.restore();
  }
});

test("行情服务：cn 链三源全挂 → 标的标 error", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentFail(true);
    world.setEMFail(true);
    world.setSinaFail(true);
    const rows = await svc.getQuotes([{ id: "cn:sz000001", market: "cn", code: "sz000001", quoteCurrency: "CNY" }]);
    assert.equal(rows.get("cn:sz000001").status, "error");
  } finally {
    world.restore();
  }
});

test("行情服务：详情路径第三腿（getQuoteFull，tencent/em 无数据时 sina 供数）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentSparse(true); // 腾讯只回 sh600519 → sz000001 缺席
    const rows = await svc.getQuoteFull([{ id: "cn:sz000001", market: "cn", code: "sz000001", quoteCurrency: "CNY" }]);
    const row = rows.get("cn:sz000001");
    assert.equal(row.status, "ok");
    assert.equal(row.quote.price, 10.9);
    assert.equal(row.quoteTime, Date.parse("2026-11-14T15:30:01+08:00"));
  } finally {
    world.restore();
  }
});

/* ---------------- 退避键 (提供方, 市场) + 健康载荷嵌套（§12.45，2026-11-14） ---------------- */

test("行情服务：退避按 (提供方,市场) 记账——cn 失败不冻结 hk 同源", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentFail(true);
    const r1 = await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    assert.equal(r1.get("cn:sh600519").status, "ok"); // EM 兜住，tencent|cn 入退避
    const callsAfterCnFail = world.calls.length;
    world.setTencentFail(false);
    const r2 = await svc.getQuotes([{ id: "hk:00700", market: "hk", code: "hk00700", quoteCurrency: "HKD" }]);
    assert.equal(r2.get("hk:00700").status, "ok"); // tencent|hk 不被 tencent|cn 退避冻结（腾讯真实被打）
    assert.ok(world.calls.length > callsAfterCnFail);
    const health = svc.health();
    assert.ok(health.tencent.cn.backoffRemainMs > 0); // cn 仍在退避
    assert.equal(health.tencent.hk.failures, 0); // hk 独立记账
  } finally {
    world.restore();
  }
});

test("行情服务：健康载荷记录 lastOkAt/lastErrorAt/lastError", async () => {
  const world = mockFetchWorld();
  try {
    let clock = Date.now();
    const svc = createQuoteService({ ttlMs: 0, now: () => clock });
    world.setTencentFail(true);
    await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    let h = svc.health();
    assert.equal(h.tencent.cn.lastError, "upstream-down");
    assert.ok(h.tencent.cn.lastErrorAt > 0);
    assert.equal(h.tencent.cn.lastOkAt, null);
    world.setTencentFail(false);
    clock += 31 * 1000; // 拨过退避期（31s > 30s 首档），否则恢复的源被快速失败跳过、成功路径不可达
    await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    h = svc.health();
    assert.ok(h.tencent.cn.lastOkAt > 0);
    assert.equal(h.tencent.cn.failures, 0); // 成功清零，lastError 保留历史
  } finally {
    world.restore();
  }
});

test("行情服务：源有响应但无该标的 ≠ 失败（inconclusive 不触发 provider.fail）", async () => {
  const world = mockFetchWorld();
  const events = [];
  try {
    const svc = createQuoteService({ ttlMs: 0, diag: (r) => events.push(r) });
    world.setTencentFail(true);
    world.setEMSparse(true); // EM 返回成功但空 diff
    world.setSinaFail(true); // 封新浪（夹具含 sh600519 行，不封则全链不再是「无该标的」——§12.46 夹具扩展修正）
    const rows = await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    assert.equal(rows.get("cn:sh600519").status, "error"); // 全链无该标的
    assert.equal(events.filter((e) => e.ev === "provider.fail" && e.provider === "eastmoney").length, 0); // 有响应≠失败
    assert.equal(svc.health().eastmoney.cn.failures, 0);
    assert.equal(events.filter((e) => e.ev === "provider.fail" && e.provider === "tencent").length, 1); // 真实失败照发
  } finally {
    world.restore();
  }
});

/* ---------------- 行情行来源标注（§12.46，2026-11-14） ---------------- */

test("行情服务：链首直接供数 → source=链首、fallbackFrom=null", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    const rows = await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    const row = rows.get("cn:sh600519");
    assert.equal(row.source, "tencent");
    assert.equal(row.fallbackFrom, null);
  } finally {
    world.restore();
  }
});

test("行情服务：整源失败降级 → source=实际供数方、fallbackFrom=首个失败源", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentFail(true);
    const rows = await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    const row = rows.get("cn:sh600519");
    assert.equal(row.source, "eastmoney");
    assert.equal(row.fallbackFrom, "tencent");
  } finally {
    world.restore();
  }
});

test("行情服务：稀疏丢码 → fallbackFrom 记首个失败源（腾讯丢码而非顺位 EM）", async () => {
  const world = mockFetchWorld();
  try {
    const svc = createQuoteService({ ttlMs: 0 });
    world.setTencentSparse(true);
    const rows = await svc.getQuotes([{ id: "cn:sz000001", market: "cn", code: "sz000001", quoteCurrency: "CNY" }]);
    const row = rows.get("cn:sz000001");
    assert.equal(row.status, "ok");
    assert.equal(row.source, "sina");
    assert.equal(row.fallbackFrom, "tencent"); // 腾讯先丢码；EM 后丢不覆盖首个
  } finally {
    world.restore();
  }
});

test("行情服务：error 行 source/fallbackFrom 均 null；详情路径行携带 source/fallbackFrom", async () => {
  const world = mockFetchWorld();
  try {
    let clock = Date.now();
    const svc = createQuoteService({ ttlMs: 0, now: () => clock });
    world.setTencentFail(true);
    world.setEMFail(true);
    world.setSinaFail(true);
    const rows = await svc.getQuotes([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    const row = rows.get("cn:sh600519");
    assert.equal(row.status, "error");
    assert.equal(row.source, null);
    assert.equal(row.fallbackFrom, null);
    // 详情路径：腾讯挂、EM 空响应、新浪供数（先拨过三源退避期，否则全被快速失败跳过）
    world.setEMFail(false);
    world.setSinaFail(false);
    world.setEMSparse(true);
    clock += 31 * 1000;
    const full = await svc.getQuoteFull([{ id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" }]);
    const frow = full.get("cn:sh600519");
    assert.equal(frow.status, "ok");
    assert.equal(frow.source, "sina");
    assert.equal(frow.fallbackFrom, "tencent");
  } finally {
    world.restore();
  }
});
