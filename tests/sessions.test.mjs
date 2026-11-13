import test from "node:test";
import assert from "node:assert/strict";
import { isMarketOpen, targetBadgeKind, pollIntervalMs, chartRefreshDue, POLL_MS, CHART_REFRESH_MS } from "../src/sessions.mjs";

/* 2026-11-13 开休市简化判断（§12.33）：时段表 + 行情过期状态的复合判断。
   固定真实日历：2026-11 美东为 EST（UTC-5），北京 UTC+8。 */

const CN_FRI_IN = Date.parse("2026-11-06T02:05:00Z");     // 周五 10:05 北京（盘中）
const CN_FRI_LUNCH = Date.parse("2026-11-06T04:30:00Z");  // 周五 12:30 北京（午休）
const CN_SAT = Date.parse("2026-11-07T02:18:00Z");        // 周六 10:18 北京
const HK_FRI_IN = Date.parse("2026-11-06T02:30:00Z");     // 周五 10:30 香港（盘中）
const US_FRI_IN = Date.parse("2026-11-06T15:00:00Z");     // 周五 10:00 纽约（盘中）
const US_FRI_PRE = Date.parse("2026-11-06T11:00:00Z");    // 周五 06:00 纽约（扩展时段）
const US_FRI_NIGHT = Date.parse("2026-11-07T02:00:00Z");  // 周五 21:00 纽约（扩展时段结束）

test("时段判断：A 股盘中开市；午休与周末休市", () => {
  assert.equal(isMarketOpen("cn", CN_FRI_IN), true);
  assert.equal(isMarketOpen("cn", CN_FRI_LUNCH), false);
  assert.equal(isMarketOpen("cn", CN_SAT), false);
});

test("时段判断：港股盘中开市；美股扩展时段（04:00–20:00 ET）含盘前，21:00 后休市", () => {
  assert.equal(isMarketOpen("hk", HK_FRI_IN), true);
  assert.equal(isMarketOpen("us", US_FRI_IN), true);
  assert.equal(isMarketOpen("us", US_FRI_PRE), true);
  assert.equal(isMarketOpen("us", US_FRI_NIGHT), false);
});

test("时段判断：加密货币 7×24 恒为开市", () => {
  assert.equal(isMarketOpen("crypto", CN_SAT), true);
});

test("复合标签：行情正常不显示；无行情显示「无」", () => {
  assert.equal(targetBadgeKind({ status: "ok" }, "cn", CN_FRI_IN), null);
  assert.equal(targetBadgeKind({ status: "no-targets" }, "cn", CN_FRI_IN), null);
  assert.equal(targetBadgeKind({ status: "no-data" }, "cn", CN_SAT), "no-data");
});

test("复合标签：行情过期时，时段内「旧」，时段外「休」", () => {
  assert.equal(targetBadgeKind({ status: "stale" }, "cn", CN_FRI_IN), "stale");
  assert.equal(targetBadgeKind({ status: "stale" }, "cn", CN_FRI_LUNCH), "closed");
  assert.equal(targetBadgeKind({ status: "stale" }, "us", US_FRI_NIGHT), "closed");
  assert.equal(targetBadgeKind({ status: "stale" }, "crypto", CN_SAT), "stale");
});

test("轮询节奏：任一市场开市时展开 15 秒 / 收起 30 秒；全部休市 60 秒", () => {
  assert.equal(POLL_MS.openPanel, 15000);
  assert.equal(POLL_MS.openCollapsed, 30000);
  assert.equal(POLL_MS.closed, 60000);
  assert.equal(pollIntervalMs({ panelOpen: true, markets: ["cn", "us"], now: US_FRI_PRE }), 15000);
  assert.equal(pollIntervalMs({ panelOpen: false, markets: ["cn"], now: CN_FRI_IN }), 30000);
  assert.equal(pollIntervalMs({ panelOpen: true, markets: ["cn"], now: CN_SAT }), 60000);
  assert.equal(pollIntervalMs({ panelOpen: true, markets: ["cn", "crypto"], now: CN_SAT }), 15000);
});

test("图表静默刷新：仅开市时每 60 秒一次；休市不刷新", () => {
  assert.equal(CHART_REFRESH_MS, 60000);
  assert.equal(chartRefreshDue("cn", CN_FRI_IN - 61000, CN_FRI_IN), true);
  assert.equal(chartRefreshDue("cn", CN_FRI_IN - 30000, CN_FRI_IN), false);
  assert.equal(chartRefreshDue("cn", CN_FRI_IN - 999999, CN_SAT), false);
});
