import test from "node:test";
import assert from "node:assert/strict";
import { fetchBatchSnapshots, usQuoteTimeOf, parseUsSnapshot } from "../src/markets/tencent-us.mjs";

/* 腾讯美股备源（2026-11-13 实测样本）：usAAPL 行字段与 A 股同序；
   时间字段 "2026-11-12 16:00:01" 为美东本地时间（EST/EDT 由实际时段决定），换算须走 America/New_York。 */

// GBK 编码的两行批量样本（AAPL + NVDA），由 iconv -f UTF-8 -t GBK 生成后 base64 固化，逐字节等价于腾讯线上响应
const GBK_BATCH_B64 = "dl91c0FBUEw9IjIwMH7Gu7n7fkFBUEwuT1F+MzU0Ljg4fjM1NS4zNn4zNTcuODF+MzE4NzQ5Nzh+MH4wfjM1NC43OH4yMDB+MH4wfjB+MH4wfjB+MH4wfjM1NC45MH40MH4wfjB+MH4wfjB+MH4wfjB+fjIwMjYtMTEtMTIgMTY6MDA6MDF+LTAuNDh+LTAuMTR+MzU5LjM3fjM1NC40MX5VU0R+MzE4NzQ5Nzh+MTEzNjEzODM3MjN+MC4yMn4zOS41Mn5+MzkuNTJ+fjEuNDB+NTE1MzkuNjE1ODh+NTE1NzEuODA3NDh+QXBwbGUgSW5jLn44Ljk4fjM1OS4zN34yNDIuNTd+MTYwfjQ2LjAxfjAuMzB+NTE1NzEuODA3NDh+MzEuMDB+My4xOX5HUH4xNDIuMjZ+MzQuNjF+MS43OX4zLjg1fjEyLjEwfjE0NTMyMTgyMDAwfjE0NTIzMTEwODc4fjAuNjh+MzkuNTJ+MS4wN34zNTYuNDR+fn5+fiI7CnZfdXNOVkRBPSIyMDB+06LOsLTvfk5WREEuT1F+MTY2LjE5fjE3My43M34xNTEuMDF+NzQ3NzA3NjQ4fjB+MH4xNjcuODF+NzAwfjB+MH4wfjB+MH4wfjB+MH4xNjcuODR+MTEwMH4wfjB+MH4wfjB+MH4wfjB+fjIwMjYtMTEtMTIgMTY6MDA6MDF+LTcuNTR+LTQuMzR+MTY3LjE0fjE0OC44MH5VU0R+NzQ3NzA3NjQ4fjEyMTIxMjEwMjk2NH4zLjEwfjIxLjAxfn4zMy45Mn5+MTAuNTZ+Mzg1MzguOTUwNDR+NDAxMjkuODk5MzB+TnZpZGlhIENvcnBvcmF0aW9ufjcuOTF+MjQzLjM3fjE0OC44MH4tNDAwfjE3LjUzfjAuMzF+NDAxMjkuODk5MzB+LTEwLjY4fi04LjQ5fkdQfjExNy4yMX44My42OH4tMjIuMjJ+LTIzLjUwfi0yMy41M34yNDE0NzAwMDAwMH4yMzE4OTY5Mjc4M34yLjE4fjE3LjEzfjAuNTJ+MTYyLjExfn5+fn4iOwo=";

const SAMPLE = 'v_usAAPL="200~苹果~AAPL.OQ~354.88~355.36~357.81~31874978~0~0~354.78~200~0~0~0~0~0~0~0~0~354.90~40~0~0~0~0~0~0~0~0~~2026-11-12 16:00:01~-0.48~-0.14~359.37~354.41~USD~31874978~11361383723~0.22~39.52~~39.52~~1.40~51539.61588~51571.80748~Apple Inc.~8.98~359.37~242.57~160~46.01~0.30~51571.80748~31.00~3.19~GP~142.26~34.61~1.79~3.85~12.10~14532182000~14523110878~0.68~39.52~1.07~356.44~~~~~";';

test("parseUsSnapshot：字段映射（价/昨收/开/高/低/涨跌/量/额/名称）", () => {
  const rows = parseUsSnapshot(SAMPLE);
  const q = rows.get("AAPL");
  assert.equal(q.price, 354.88);
  assert.equal(q.prevClose, 355.36);
  assert.equal(q.open, 357.81);
  assert.equal(q.high, 359.37);
  assert.equal(q.low, 354.41);
  assert.equal(q.changeAmount, -0.48);
  assert.equal(q.changePercent, -0.14);
  assert.equal(q.volume, 31874978);
  assert.equal(q.name, "苹果");
});

test("usQuoteTimeOf：美东本地时间 16:00:01（EST, UTC-5）→ UTC 21:00:01Z", () => {
  const ms = usQuoteTimeOf("2026-11-12 16:00:01");
  assert.equal(new Date(ms).toISOString(), "2026-11-12T21:00:01.000Z");
});

test("usQuoteTimeOf：夏令时（EDT, UTC-4）按 America/New_York 换算", () => {
  const ms = usQuoteTimeOf("2026-07-01 16:00:00");
  assert.equal(new Date(ms).toISOString(), "2026-07-01T20:00:00.000Z");
});

test("usQuoteTimeOf：非法文本返回 null", () => {
  assert.equal(usQuoteTimeOf("not-a-time"), null);
  assert.equal(usQuoteTimeOf(null), null);
});

test("fetchBatchSnapshots：一次批量请求覆盖多标的，按入参 code 回填键；无效行缺席", async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    // 真实腾讯响应为 GBK 编码字节（2026-11-13 iconv 生成的固化样本，base64 解码后即线上字节）
    return { ok: true, arrayBuffer: async () => Buffer.from(GBK_BATCH_B64, "base64") };
  };
  try {
    const rows = await fetchBatchSnapshots(["AAPL", "NVDA", "ZZZZ"]);
    assert.equal(urls.length, 1);
    assert.ok(urls[0].includes("usAAPL") && urls[0].includes("usNVDA"));
    assert.equal(rows.get("AAPL").price, 354.88);
    assert.equal(rows.get("NVDA").price, 166.19);
    assert.ok(!rows.has("ZZZZ"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchBatchSnapshots：HTTP 失败整批抛错（交由提供方退避）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 429, arrayBuffer: async () => Buffer.from("") });
  try {
    await assert.rejects(() => fetchBatchSnapshots(["AAPL"]), /HTTP 429/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
