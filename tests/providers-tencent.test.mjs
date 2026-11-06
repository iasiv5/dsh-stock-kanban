import test from "node:test";
import assert from "node:assert/strict";
import { parseBatchSnapshot, quoteTimeOf, fetchKline, fetchMinuteDetail } from "../src/markets/tencent.mjs";
import { parseSmartbox } from "../src/markets/search.mjs";

/* 测试夹具（12.x）：以下文本模拟上游真实响应结构（2026-11-06 实测采样），仅用于解析测试，不进入生产行情路径。 */

const SNAPSHOT_TEXT = [
  'v_sh600519="1~贵州茅台~600519~1453.00~1452.00~1450.00~42848~23139~19709~1452.00~2~1451.60~1~1451.33~1~1451.01~1~1451.00~5~1453.00~2~1453.01~2~1453.06~1~1453.07~8~1453.19~1~~202611061614~1.00~0.07~1457.72~1436.00~1453.00/4284~42848~619953~0.34~22.11~~202611061614~1457.72~1436.00~2.71~6199530~~6199530~21380~~~~~1453.00~42848~0.00~0~0~~~~202611061500~1.00~0.07~1457.72~1436.00~1~~42848~6199530~~~~~~0~0~0~0~~~~~~0~0~~~0~0~22.11~1.62~1762402800~~~~~~-670.000~0.07~1453.00~202611061614/09:14:42/1453.000/42848/6199530/42848/0~~~0.34~22.11~1451.98~1457.72~1436.00~51909~38108~~1.62~0.00~0~~1.61~0.00~0~"',
  'v_hk00700="100~腾讯控股~00700~419.80~430.60~431.00~12345678~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~~202611061614~-10.80~-2.46~432.40~417.20~419.80/12345678~12345678~5190000000~1.30~15.86~~202611061614~432.40~417.20~3.11~5190000000~~5190000000~39000~~~~419.80~12345678~0.00~0~0~~~~202611061610~-10.80~-2.46~432.40~417.20~1~~12345678~5190000000~~~~~~0~0~0~0~~~"',
].join(";\n");

test("parseBatchSnapshot：批量快照字段解析", () => {
  const rows = parseBatchSnapshot(SNAPSHOT_TEXT);
  assert.equal(rows.size, 2);
  const mt = rows.get("sh600519");
  assert.equal(mt.name, "贵州茅台");
  assert.equal(mt.price, 1453);
  assert.equal(mt.prevClose, 1452);
  assert.equal(mt.changePercent, 0.07);
  assert.equal(mt.high, 1457.72);
  assert.equal(mt.low, 1436);
  assert.equal(mt.quoteTimeText, "202611061614");
  const tencentTime = quoteTimeOf(mt);
  const iso = new Date(tencentTime).toISOString();
  assert.match(iso, /^2026-11-06T08:14/); // 东八区 16:14 → UTC 08:14
});

test("parseBatchSnapshot：非法行跳过", () => {
  const rows = parseBatchSnapshot('v_bad="1~x~y~zzz~1~1~1";pv_none="";');
  assert.equal(rows.size, 0);
});

test("quoteTimeOf：非法时间返回 null", () => {
  assert.equal(quoteTimeOf({ quoteTimeText: "bad" }), null);
  assert.equal(quoteTimeOf(null), null);
  assert.equal(quoteTimeOf({ quoteTimeText: null }), null);
});

test("fetchKline：qfq 键存在 → 前复权 + 列序 date,open,close,high,low,volume", async () => {
  const fixture = {
    code: 0,
    data: {
      sh600519: {
        qfqday: [
          ["2026-11-05", "1440.00", "1452.00", "1460.00", "1430.00", "40000"],
          ["2026-11-06", "1450.00", "1453.00", "1457.72", "1436.00", "42848"],
        ],
        qt: {},
      },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => fixture });
  try {
    const result = await fetchKline("sh600519", "day");
    assert.equal(result.error, null);
    assert.equal(result.adjust, "qfq");
    assert.equal(result.candles.length, 2);
    assert.deepEqual(result.candles[1], { time: "2026-11-06", open: 1450, high: 1457.72, low: 1436, close: 1453, volume: 42848 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchKline：港股无 qfq 键 → 回落 day 键，adjust none", async () => {
  const fixture = { code: 0, data: { hk00700: { day: [["2026-11-06", "421", "419.8", "432.4", "417.2", "12345678"]] } } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => fixture });
  try {
    const result = await fetchKline("hk00700", "day");
    assert.equal(result.adjust, "none");
    assert.equal(result.candles[0].close, 419.8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchKline：上游失败 → 明确 error，不伪造数据", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("boom"); };
  try {
    const result = await fetchKline("sh600519", "day");
    assert.equal(result.candles.length, 0);
    assert.match(result.error, /行情获取失败/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchMinuteDetail：分时点解析 + prevClose 从快照推导", async () => {
  const fixture = {
    code: 0,
    data: {
      sh600519: {
        data: { date: "20261106", data: ["0930 1450.00 100", "0931 1451.50 200", "badline", "0932 abc 5"] },
        qt: { sh600519: Array.from({ length: 40 }, (_, i) => (i === 3 ? "1453.00" : i === 32 ? "0.07" : i === 1 ? "贵州茅台" : String(i))) },
      },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => fixture });
  try {
    const result = await fetchMinuteDetail("sh600519");
    assert.equal(result.error, null);
    assert.equal(result.points.length, 2); // 非法行被过滤
    assert.equal(result.points[0].p, 1450);
    assert.equal(result.prevClose, 1453 / 1.0007);
    assert.ok(Math.abs(result.prevClose - 1451.98) < 0.05);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parseSmartbox：GBK 解码后的 \\uXXXX 文本 + 类型过滤", () => {
  // 真实 API 字段分隔符为 `~`，行分隔为 `^`（探针实测）；fixture 中 \uXXXX 为字面转义（GBK 响应原文）
  const text = 'v_hint="hk~00700~\\u817e\\u8baf\\u63a7\\u80a1~txkg~GP^us~aapl.oq~\\u82f9\\u679c~pg~GP^jj~007005~\\u57fa\\u91d1C~jj~KJ^sh~510300~\\u6caa\\u6df1300ETF~hs~ETF^sz~159919~\\u6caa\\u6df1300ETF\\u5609\\u5b9e~js~ETF";';
  const rows = parseSmartbox(text);
  const codes = rows.map((r) => r.code);
  assert.ok(codes.includes("hk00700"));
  assert.ok(codes.includes("AAPL"));
  assert.ok(codes.includes("sh510300"));
  assert.ok(codes.includes("sz159919"));
  assert.ok(!codes.includes("jj007005")); // KJ 过滤
  const aapl = rows.find((r) => r.code === "AAPL");
  assert.equal(aapl.market, "us");
  assert.equal(aapl.kind, "stock");
  const etf = rows.find((r) => r.code === "sh510300");
  assert.equal(etf.kind, "etf");
  assert.equal(etf.market, "cn"); // ETF 归入上市市场
});
