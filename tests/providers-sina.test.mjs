import test from "node:test";
import assert from "node:assert/strict";
import { parseSinaSnapshot, fetchBatchSnapshots } from "../src/markets/sina.mjs";

/* 测试夹具（§12.44）：新浪 hq.sinajs.cn 快照响应结构（2026-11-14 probe 实测采样），
 * 仅用于解析测试，不进入生产行情路径。
 * 行格式：var hq_str_<code>="名称,今开,昨收,现价,最高,最低,买一价,卖一价,量(股),额(元),…,日期YYYY-MM-DD,时间HH:MM:SS,…"；
 * 前缀实测为 hq_str_（非 v_）；f8 实测为股（klineOverSina 互证）；f30/f31 为横杠日期+冒号时间（probe 实测）。 */

const tail = (date, time) => Array(20).fill("0").join(",") + `,${date},${time},00,00,00,00`;
const LINE_600519 = `var hq_str_sh600519="贵州茅台,1450.00,1452.00,1453.00,1457.72,1436.00,1453.00,1453.01,4177984,5959628192,${tail("2026-11-14", "15:00:01")}";`;
const LINE_510300 = `var hq_str_sh510300="沪深300ETF,4.050,4.051,4.056,4.060,4.045,4.055,4.056,15234567,61728390,${tail("2026-11-14", "15:00:01")}";`;
const LINE_920000 = `var hq_str_bj920000="安徽凤凰,10.85,10.88,10.90,10.95,10.80,10.90,10.91,266207,2902063,${tail("2026-11-14", "15:30:01")}";`;

test("parseSinaSnapshot：标准 A 股行字段解析（f8=股口径，quoteTimeMs 东八区）", () => {
  const rows = parseSinaSnapshot(LINE_600519);
  assert.equal(rows.size, 1);
  const q = rows.get("sh600519");
  assert.equal(q.name, "贵州茅台");
  assert.equal(q.price, 1453.0);
  assert.equal(q.prevClose, 1452.0);
  assert.equal(q.open, 1450.0);
  assert.equal(q.high, 1457.72);
  assert.equal(q.low, 1436.0);
  assert.equal(q.volume, 4177984); // 新浪口径=股（2026-11-14 probe 互证 600519 ratio 0.01、688111 ratio 1.00），原样透传
  assert.equal(q.amount, 5959628192);
  assert.ok(Math.abs(q.changePercent - (1453 - 1452) / 1452 * 100) < 1e-9);
  assert.ok(Math.abs(q.changeAmount - 1.0) < 1e-9);
  assert.equal(q.quoteTimeMs, Date.parse("2026-11-14T15:00:01+08:00"));
});

test("parseSinaSnapshot：ETF 与北交所行同格式收录（新浪实测服务 bj 920 号段）", () => {
  const rows = parseSinaSnapshot(LINE_510300 + ";\n" + LINE_920000);
  assert.equal(rows.size, 2);
  assert.equal(rows.get("sh510300").price, 4.056);
  const bj = rows.get("bj920000");
  assert.equal(bj.name, "安徽凤凰");
  assert.equal(bj.volume, 266207); // 新浪股口径；与腾讯 K线 2662手 ×100 互证（probe 2026-11-14）
  assert.equal(bj.quoteTimeMs, Date.parse("2026-11-14T15:30:01+08:00"));
});

test("parseSinaSnapshot：停牌/空行剔除 + 空文本空 Map", () => {
  const suspended = `var hq_str_sz000001="平安银行,0.00,0.00,0.00,0.00,0.00,0,0,0,0,${tail("2026-11-14", "15:00:01")}";`;
  assert.equal(parseSinaSnapshot(suspended).size, 0); // 现价 0 → 缺席，交链上后续源
  assert.equal(parseSinaSnapshot("").size, 0);
  assert.equal(parseSinaSnapshot("var x=1;").size, 0);
  assert.equal(parseSinaSnapshot(null).size, 0);
});

test("parseSinaSnapshot：f30/f31 畸形 → quoteTimeMs null，行情仍收录", () => {
  const badTime = `var hq_str_sh600036="招商银行,40.10,40.20,40.30,40.40,40.00,40.30,40.31,123456,4960000,${tail("0", "0")}";`;
  const rows = parseSinaSnapshot(badTime);
  const q = rows.get("sh600036");
  assert.equal(q.price, 40.3);
  assert.equal(q.quoteTimeMs, null);
});

test("fetchBatchSnapshots：多码请求合并解析（mock fetch，断言 list= 拼装与 GBK 解码路径）", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, opts) => {
    seen.push({ url: String(url), referer: opts?.headers?.referer });
    return { ok: true, arrayBuffer: async () => Buffer.from(LINE_600519 + ";\n" + LINE_510300, "utf8") };
  };
  try {
    const rows = await fetchBatchSnapshots(["sh600519", "sh510300"]);
    assert.equal(rows.size, 2);
    assert.equal(seen.length, 1);
    assert.ok(seen[0].url.startsWith("https://hq.sinajs.cn/list=sh600519,sh510300"));
    assert.equal(seen[0].referer, "https://finance.sina.com.cn/"); // 新浪必带 Referer
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchBatchSnapshots：>60 码内部分块顺序请求（链末位不得丢码）", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url).split("list=")[1].split(",").length);
    return { ok: true, arrayBuffer: async () => Buffer.from(LINE_600519, "utf8") };
  };
  try {
    const codes = Array.from({ length: 130 }, (_, i) => `sh60${String(1000 + i).padStart(4, "0")}`);
    await fetchBatchSnapshots(codes);
    assert.deepEqual(seen, [60, 60, 10]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
