import test from "node:test";
import assert from "node:assert/strict";
import { targetState, validateTargets } from "../src/targets.mjs";

const NOW = 1700000000000;

test("边界等于目标价即触发（12.1）", () => {
  const buy = targetState({ price: 10, now: NOW, buyTarget: 10, sellTarget: 20, fetchedAt: NOW });
  assert.equal(buy.status, "buy");
  const sell = targetState({ price: 20, now: NOW, buyTarget: 10, sellTarget: 20, fetchedAt: NOW });
  assert.equal(sell.status, "sell");
});

test("离开条件后标记消失（12.1）", () => {
  const t = targetState({ price: 15, now: NOW, buyTarget: 10, sellTarget: 20, fetchedAt: NOW });
  assert.equal(t.status, "wait");
  assert.equal(t.buyTriggered, false);
  assert.equal(t.sellTriggered, false);
});

test("未设置目标价：不参与判断（12.1）", () => {
  assert.equal(targetState({ price: 15, now: NOW, buyTarget: null, sellTarget: null, fetchedAt: NOW }).status, "no-targets");
});

test("阈值重叠：both 状态双标记，不静默覆盖（12.1/12.2）", () => {
  const t = targetState({ price: 15, now: NOW, buyTarget: 16, sellTarget: 14, fetchedAt: NOW });
  assert.equal(t.status, "both");
  assert.equal(t.buyTriggered, true);
  assert.equal(t.sellTriggered, true);
});

test("过期行情不得伪装成有效触价（12.1）", () => {
  const t = targetState({ price: 9, now: NOW, buyTarget: 10, fetchedAt: NOW - 31 * 60 * 1000 });
  assert.equal(t.status, "stale");
  assert.equal(t.buyTriggered, false);
  // 行情自身时间（quoteTime）优先于拉取时间
  const t2 = targetState({ price: 9, now: NOW, buyTarget: 10, quoteTime: NOW - 31 * 60 * 1000, fetchedAt: NOW });
  assert.equal(t2.status, "stale");
});

test("行情缺失：no-data，无标记", () => {
  assert.equal(targetState({ price: null, now: NOW, buyTarget: 10, fetchedAt: NOW }).status, "no-data");
  assert.equal(targetState({ price: 0, now: NOW, buyTarget: 10, fetchedAt: NOW }).status, "no-data");
  assert.equal(targetState({ price: NaN, now: NOW, buyTarget: 10, fetchedAt: NOW }).status, "no-data");
});

test("无任何时间戳：保守按过期处理", () => {
  const t = targetState({ price: 9, now: NOW, buyTarget: 10, quoteTime: null, fetchedAt: null });
  assert.equal(t.status, "stale");
});

test("自定义 maxAgeMs", () => {
  const t = targetState({ price: 9, now: NOW, buyTarget: 10, fetchedAt: NOW - 2 * 60 * 1000, maxAgeMs: 60 * 1000 });
  assert.equal(t.status, "stale");
  const t2 = targetState({ price: 9, now: NOW, buyTarget: 10, fetchedAt: NOW - 30 * 1000, maxAgeMs: 60 * 1000 });
  assert.equal(t2.status, "buy");
});

test("validateTargets：非法目标价被拒（12.1）", () => {
  assert.deepEqual(validateTargets("abc", null).errors.length, 1);
  assert.equal(validateTargets(-5, null).ok, false);
  assert.equal(validateTargets("", null).ok, true); // 空串 = 不设置
  const ok = validateTargets("10.5", 20);
  assert.equal(ok.ok, true);
  assert.equal(ok.buyTarget, 10.5);
  assert.equal(ok.overlap, false);
  assert.equal(validateTargets(25, 20).overlap, true);
});
