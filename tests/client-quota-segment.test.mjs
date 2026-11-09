// client/quota-segment.mjs 直测（合并胶囊 ADR 0003 第 3 条；方案③ S3）。
// 「显示什么」收敛为纯函数；DOM 只负责落地（S4 的 renderSegment）。
import { test } from "node:test";
import assert from "node:assert/strict";

import { quotaSegmentModel } from "../client/quota-segment.mjs";

const prov = (percent, stale = false) => ({ percent, stale });

test("额度模型：只有 GLM 有数，只出一条", () => {
  const m = quotaSegmentModel({ glm: prov(40), copilot: null, outcomePending: false });
  assert.equal(m.bars.length, 1, "只出一条");
  assert.deepEqual(m.bars[0], { key: "glm", label: "G", percent: 40, tone: "normal", stale: false });
  assert.deepEqual(m.tooltip, [{ label: "GLM", percent: 40 }], "悬停只列这一条");
  assert.equal(m.dot, false, "无待处理");
  assert.equal(m.segment, true, "有数即显示段");
  assert.equal(m.divider, true, "分隔线随段显示");
});

test("额度模型：只有 Copilot 有数，只出一条", () => {
  const m = quotaSegmentModel({ glm: null, copilot: prov(47), outcomePending: false });
  assert.equal(m.bars.length, 1, "只出一条");
  assert.deepEqual(m.bars[0], { key: "copilot", label: "C", percent: 47, tone: "normal", stale: false });
  assert.deepEqual(m.tooltip, [{ label: "Copilot", percent: 47 }], "悬停只列这一条");
  assert.equal(m.segment, true, "有数即显示段");
  assert.equal(m.divider, true, "分隔线随段显示");
});

test("额度模型：两条都有，GLM 在前且有分隔线", () => {
  const m = quotaSegmentModel({ glm: prov(60), copilot: prov(47), outcomePending: false });
  assert.deepEqual(m.bars.map((b) => b.key), ["glm", "copilot"], "GLM 在前");
  assert.deepEqual(m.tooltip, [
    { label: "GLM", percent: 60 },
    { label: "Copilot", percent: 47 },
  ]);
  assert.equal(m.segment, true, "段显示");
  assert.equal(m.divider, true, "两条有分隔线");
});

test("额度模型：两条都无且无待处理，段不显示", () => {
  const m = quotaSegmentModel({ glm: null, copilot: prov(null), outcomePending: false });
  assert.deepEqual(m.bars, [], "无条");
  assert.deepEqual(m.tooltip, [], "无提示");
  assert.equal(m.dot, false, "无琥珀点");
  assert.equal(m.segment, false, "段不显示");
  assert.equal(m.divider, false, "分隔线随段隐藏");
});

test("额度模型：两条都无但有待处理，段仅含琥珀点", () => {
  const m = quotaSegmentModel({ glm: null, copilot: null, outcomePending: true });
  assert.deepEqual(m.bars, [], "无条");
  assert.equal(m.dot, true, "琥珀点");
  assert.equal(m.segment, true, "待处理保留段");
  assert.equal(m.divider, true, "分隔线随段显示");
});

test("额度模型：有数且待处理时琥珀点与条共存", () => {
  const m = quotaSegmentModel({ glm: prov(90), copilot: null, outcomePending: true });
  assert.equal(m.bars.length, 1, "条保留");
  assert.equal(m.dot, true, "琥珀点与条共存");
  assert.equal(m.segment, true, "段显示");
});

test("额度模型：过期标记保留到条", () => {
  const m = quotaSegmentModel({ glm: prov(30, true), copilot: prov(20, false), outcomePending: false });
  assert.equal(m.bars[0].key, "glm");
  assert.equal(m.bars[0].stale, true, "GLM 过期标记保留到条");
  assert.equal(m.bars[1].key, "copilot");
  assert.equal(m.bars[1].stale, false, "Copilot 未过期");
});

test("额度模型：阈值 80/81/95/96 的语气边界", () => {
  const toneAt = (percent) =>
    quotaSegmentModel({ glm: prov(percent), copilot: null, outcomePending: false }).bars[0].tone;
  assert.equal(toneAt(80), "normal", "80 不超过 80 → 常态");
  assert.equal(toneAt(81), "warn", "81 超过 80 → 警示");
  assert.equal(toneAt(95), "warn", "95 不超过 95 → 仍为警示");
  assert.equal(toneAt(96), "danger", "96 超过 95 → 危险");
});

test("额度模型：非有限值视为无数", () => {
  for (const bad of [NaN, Infinity, -Infinity, null, undefined]) {
    const m = quotaSegmentModel({ glm: prov(bad), copilot: prov(bad), outcomePending: false });
    assert.deepEqual(m.bars, [], `percent=${String(bad)} 不出条`);
    assert.equal(m.segment, false, `percent=${String(bad)} 段不显示`);
  }
});
