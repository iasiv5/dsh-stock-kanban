import test from "node:test";
import assert from "node:assert/strict";
import { fetchKline, fetchMinuteDetail, resetUsDetailForTests } from "../src/markets/us-detail.mjs";

/* 美股详情图表多源链（2026-11-13）：东方财富 push2/push2his 本机整体不通时，
   K 线回落腾讯美股（未复权，标 none），分时回落 Yahoo 1 分钟（429 退避）。全部 mock 网络。 */

const DAY_ROWS = [
  ["2026-11-06", "191.100", "186.640", "194.900", "185.220", "180212285.000"],
  ["2026-11-09", "173.070", "178.670", "179.920", "170.240", "462719328.000"],
  ["2026-11-10", "173.970", "168.890", "174.690", "165.890", "429273205.000"],
  ["2026-11-11", "172.800", "173.730", "177.540", "170.770", "339214801.000"],
  ["2026-11-12", "151.010", "166.190", "167.140", "148.800", "747707648.000"],
];

function ok(body) { return { ok: true, status: 200, json: async () => body }; }

function installFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    for (const [needle, handler] of routes) {
      if (u.includes(needle)) return handler(u);
    }
    throw new Error("fetch failed"); // 未匹配的上游（东方财富等）模拟本机 push2/push2his 不通
  };
  return calls;
}

test("K线：东方财富不通时回落腾讯美股 usNVDA.OQ，未复权标 none", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    const calls = installFetch([
      ["param=usNVDA.OQ,day", () => ok({ code: 0, msg: "", data: { "usNVDA.OQ": { day: DAY_ROWS } } })],
    ]);
    const r = await fetchKline("NVDA", "day");
    assert.equal(r.error, null);
    assert.equal(r.adjust, "none");
    assert.equal(r.candles.length, 5);
    assert.deepEqual(r.candles[4], { time: "2026-11-12", open: 151.01, high: 167.14, low: 148.8, close: 166.19, volume: 747707648 });
    assert.ok(calls.some((u) => u.includes("usNVDA.OQ")));
  } finally {
    globalThis.fetch = orig;
  }
});

test("K线：后缀逐个探测（.OQ 行数不足则试 .N），成功后记住后缀", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    const calls = installFetch([
      ["param=usNVDA.OQ,day", () => ok({ code: 0, data: { "usNVDA.OQ": { day: DAY_ROWS.slice(0, 2) } } })],
      ["param=usNVDA.N,day", () => ok({ code: 0, data: { "usNVDA.N": { day: DAY_ROWS } } })],
    ]);
    const r = await fetchKline("NVDA", "day");
    assert.equal(r.candles.length, 5);
    const oq = calls.findIndex((u) => u.includes("usNVDA.OQ,day"));
    const n = calls.findIndex((u) => u.includes("usNVDA.N,day"));
    assert.ok(oq >= 0 && n > oq);
    await fetchKline("NVDA", "week");
    assert.ok(!calls.some((u) => u.includes("usNVDA.OQ,week")), "成功后缀应被记住，不再探测 .OQ");
  } finally {
    globalThis.fetch = orig;
  }
});

test("指数（DJI）不回落腾讯：东方财富不通时直接返回 fetch-failed", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    const calls = installFetch([]);
    const r = await fetchKline("DJI", "day");
    assert.equal(r.candles.length, 0);
    assert.equal(r.error, "fetch-failed");
    assert.ok(!calls.some((u) => u.includes("gtimg")));
  } finally {
    globalThis.fetch = orig;
  }
});

const T0 = 1794493800; // 2026-11-12 09:30 EST（14:30Z）

test("分时：东方财富不通时回落 Yahoo 1 分钟；昨收取 meta.chartPreviousClose；日期按纽约时区", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    installFetch([
      ["query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1m&range=1d", () => ok({ chart: { error: null, result: [{
        meta: { chartPreviousClose: 164.5 },
        timestamp: [T0, T0 + 60, T0 + 120],
        indicators: { quote: [{ close: [166.1, null, 166.3], volume: [1000, 0, 2000] }] },
      }] } })],
    ]);
    const r = await fetchMinuteDetail("NVDA");
    assert.equal(r.error, null);
    assert.equal(r.date, "2026-11-12");
    assert.equal(r.prevClose, 164.5);
    assert.equal(r.points.length, 2);
    assert.deepEqual(r.points[0], { t: T0, p: 166.1, v: 1000 });
  } finally {
    globalThis.fetch = orig;
  }
});

test("Yahoo 429 后进入退避：退避期内不再请求 Yahoo", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    const calls = installFetch([
      ["query1.finance.yahoo.com", () => ({ ok: false, status: 429, json: async () => ({}) })],
    ]);
    const first = await fetchMinuteDetail("NVDA");
    assert.equal(first.error, "fetch-failed");
    assert.equal(calls.filter((u) => u.includes("query1.finance.yahoo.com")).length, 1);
    const second = await fetchMinuteDetail("NVDA");
    assert.equal(second.error, "fetch-failed");
    assert.equal(calls.filter((u) => u.includes("query1.finance.yahoo.com")).length, 1, "退避期内不得再打 Yahoo");
  } finally {
    globalThis.fetch = orig;
  }
});

test("K线成功结果缓存：TTL 内同周期重复请求不再打上游", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    const calls = installFetch([
      ["param=usNVDA.OQ,day", () => ok({ code: 0, data: { "usNVDA.OQ": { day: DAY_ROWS } } })],
    ]);
    await fetchKline("NVDA", "day");
    const n1 = calls.length;
    const again = await fetchKline("NVDA", "day");
    assert.equal(again.candles.length, 5);
    assert.equal(calls.length, n1);
  } finally {
    globalThis.fetch = orig;
  }
});

test("指数（IXIC）EM 成功时 adjust 覆写 none（EM fqt=1 对指数无操作，徽标如实标不复权）", async () => {
  const orig = globalThis.fetch;
  resetUsDetailForTests();
  try {
    installFetch([
      ["push2his.eastmoney.com", () => ok({ data: { code: "NDX", klines: ["2026-11-06,1,2,3,4,5", "2026-11-13,2,3,4,5,6"] } })],
    ]);
    const r = await fetchKline("IXIC", "day");
    assert.equal(r.error, null);
    assert.equal(r.adjust, "none");
    assert.equal(r.candles.length, 2);
  } finally {
    globalThis.fetch = orig;
  }
});
