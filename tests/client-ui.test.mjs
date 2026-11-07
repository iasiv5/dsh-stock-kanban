import test from "node:test";
import assert from "node:assert/strict";
import { maskIf, fmtPrice, fmtPct, fmtAmount, fmtQty, parsePositiveInput, shouldDrag, clampToViewport, snapToEdge, DRAG_THRESHOLD_PX, EDGE_MARGIN_PX } from "../client/fmt.mjs";
import { computeMa, niceBounds } from "../client/chartmath.mjs";

test("隐私遮挡：maskIf 只影响展示值（4.6）", () => {
  assert.equal(maskIf(true, 1234.56), "••••");
  assert.equal(maskIf(false, 1234.56), 1234.56);
  assert.equal(maskIf(true, "文本"), "••••");
});

test("价格格式化：量级自适应", () => {
  assert.equal(fmtPrice(1453), "1,453.00");
  assert.equal(fmtPrice(4.124), "4.12");
  assert.equal(fmtPrice(0.5), "0.5000");
  assert.equal(fmtPrice(0.00001234), "0.00001234".slice(0, 8)); // <0.01 → 6 位小数
  assert.equal(fmtPrice(null), "—");
  assert.equal(fmtPrice(NaN), "—");
});

test("百分比/金额/数量格式化", () => {
  assert.equal(fmtPct(3.5), "+3.50%");
  assert.equal(fmtPct(-2), "-2.00%");
  assert.equal(fmtPct(null), "—");
  assert.equal(fmtAmount(1500000), "1,500,000.00");
  assert.equal(fmtAmount(null), "—");
  assert.equal(fmtQty(0.5), "0.5");
  assert.equal(fmtQty(0.12345678), "0.12345678");
  assert.equal(fmtQty(100), "100");
});

test("数值输入解析：空=null 清除 / 非法=undefined / 合法=数", () => {
  assert.equal(parsePositiveInput(""), null);
  assert.equal(parsePositiveInput("  "), null);
  assert.equal(parsePositiveInput("abc"), undefined);
  assert.equal(parsePositiveInput("-5"), undefined);
  assert.equal(parsePositiveInput("0"), undefined);
  assert.equal(parsePositiveInput("12.5"), 12.5);
});

test("拖动阈值：位移小于阈值不算拖动（防误触点击）（12.2）", () => {
  assert.equal(shouldDrag(2, 3), false); // 距离 3.6 < 4
  assert.equal(shouldDrag(3, 4), true); // 距离 5 ≥ 4
  assert.equal(shouldDrag(0, DRAG_THRESHOLD_PX), true);
});

test("视口钳位：窗口缩小后胶囊仍在可视区（12.2）", () => {
  const c = clampToViewport(5000, 5000, 160, 36, 800, 600);
  assert.ok(c.x <= 800 - 160 - EDGE_MARGIN_PX);
  assert.ok(c.y <= 600 - 36 - EDGE_MARGIN_PX);
  const c2 = clampToViewport(-50, -50, 160, 36, 800, 600);
  assert.equal(c2.x, EDGE_MARGIN_PX);
  assert.equal(c2.y, EDGE_MARGIN_PX);
});

test("边缘吸附：最近边缘（12.2）", () => {
  // 靠近右缘
  const r = snapToEdge(760, 300, 160, 36, 800, 600);
  assert.equal(r.dock, "right");
  assert.equal(r.x, 800 - 160 - EDGE_MARGIN_PX);
  // 靠近左缘
  const l = snapToEdge(20, 300, 160, 36, 800, 600);
  assert.equal(l.dock, "left");
  assert.equal(l.x, EDGE_MARGIN_PX);
  // 居中偏上 → top
  const t = snapToEdge(400, 30, 160, 36, 800, 600);
  assert.equal(t.dock, "top");
  // 超界坐标先钳位再吸附
  const far = snapToEdge(2000, 2000, 160, 36, 800, 600);
  assert.ok(["right", "bottom"].includes(far.dock));
  assert.ok(far.x <= 800 - 160 && far.y <= 600 - 36);
});

test("均线计算：MA5 语义（12.2 常用均线）", () => {
  const candles = [1, 2, 3, 4, 5, 6].map((close, i) => ({ time: `2026-01-0${i + 1}`, close }));
  const ma = computeMa(candles, 5);
  assert.equal(ma.length, 2);
  assert.equal(ma[0].value, 3); // (1+2+3+4+5)/5
  assert.equal(ma[1].value, 4);
  assert.equal(ma[0].index, 4);
  assert.equal(computeMa(candles, 10).length, 0);
});

test("niceBounds 退化保护", () => {
  assert.deepEqual(niceBounds(2, 2), [1, 3]);
  assert.deepEqual(niceBounds(NaN, 5), [0, 1]);
  assert.deepEqual(niceBounds(0, 10), [0, 10]);
});
