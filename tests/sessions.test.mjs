import test from "node:test";
import assert from "node:assert/strict";
import { staleBadgeKind, lastSessionWindow, localDow } from "../src/sessions.mjs";

// 固定时刻（真实日历）：2026-11-06 周五、11-07 周六、11-10 周二、2026-10-05 周一
const FRI_QT = Date.parse("2026-11-06T08:14:58Z");     // 周五 16:14:58 CST（茅台收盘快照实测值）
const SAT_NOW = Date.parse("2026-11-07T02:18:00Z");    // 周六 10:18 CST
const FRI_IN_SESSION = Date.parse("2026-11-06T02:05:00Z"); // 周五 10:05 CST（盘中）
const FRI_LUNCH = Date.parse("2026-11-06T04:30:00Z");  // 周五 12:30 CST（午间休市）
const THU_QT = Date.parse("2026-11-05T08:00:00Z");     // 周四 16:00 CST
const TUE_EVE = Date.parse("2026-11-10T12:00:00Z");    // 周二 20:00 CST
const TUE_QT = Date.parse("2026-11-10T07:10:00Z");     // 周二 15:10 CST
const MON_HOL_NOW = Date.parse("2026-10-05T02:00:00Z"); // 周一 10:00 CST（2026-10-05）
const MON_HOL_QT = Date.parse("2026-10-02T08:00:00Z");  // 前周五 16:00 CST

test("周六 + 行情为周五收盘快照 → 精确判定「休」", () => {
  assert.equal(staleBadgeKind("cn", "stale", FRI_QT, SAT_NOW), "closed");
  assert.equal(staleBadgeKind("hk", "stale", FRI_QT, SAT_NOW), "closed");
});

test("周六 + 行情早于最近应有交易日 → 保守「旧」（可能是节假日或源异常）", () => {
  assert.equal(staleBadgeKind("cn", "stale", THU_QT, SAT_NOW), "stale");
});

test("盘中行情滞后 → 「旧」不冒称休市", () => {
  assert.equal(staleBadgeKind("cn", "stale", FRI_QT, FRI_IN_SESSION), "stale");
});

test("午间休市 + 行情为上午盘 → 「休」", () => {
  assert.equal(staleBadgeKind("cn", "stale", FRI_QT, FRI_LUNCH), "closed");
});

test("工作日晚间（盘后）+ 当日行情 → 「休」", () => {
  assert.equal(staleBadgeKind("cn", "stale", TUE_QT, TUE_EVE), "closed");
});

test("疑似节假日（工作日盘中，行情为多日前）→ 保守「旧」", () => {
  assert.equal(staleBadgeKind("cn", "stale", MON_HOL_QT, MON_HOL_NOW), "stale");
});

test("美股/加密不做休市判定：stale → 旧", () => {
  assert.equal(staleBadgeKind("us", "stale", FRI_QT, SAT_NOW), "stale");
  assert.equal(staleBadgeKind("crypto", "stale", FRI_QT, SAT_NOW), "stale");
});

test("非 stale 状态不产生徽标", () => {
  assert.equal(staleBadgeKind("cn", "wait", FRI_QT, SAT_NOW), null);
  assert.equal(staleBadgeKind("cn", "buy", FRI_QT, SAT_NOW), null);
  assert.equal(staleBadgeKind("cn", "no-targets", FRI_QT, SAT_NOW), null);
});

test("lastSessionWindow：周六返回最近交易日（周五）已收市窗口", () => {
  const w = lastSessionWindow("cn", SAT_NOW);
  assert.equal(w.inSession, false);
  assert.equal(w.dayOffset, 1);
  // 窗口应为周五某时段，起点为当地 09:30 或 13:00
  const startWall = new Date(w.start);
  assert.ok([9, 13].includes(startWall.getUTCHours() + 8) || [1, 5].includes(startWall.getUTCHours()));
});

test("lastSessionWindow：盘中返回 inSession=true", () => {
  const w = lastSessionWindow("cn", FRI_IN_SESSION);
  assert.equal(w.inSession, true);
});

test("localDow 基准", () => {
  assert.equal(localDow(FRI_QT, "Asia/Shanghai"), 5);
  assert.equal(localDow(SAT_NOW, "Asia/Shanghai"), 6);
});
