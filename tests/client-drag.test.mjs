import { test } from "node:test";
import assert from "node:assert/strict";

// client/drag.mjs parity 测试——与 quota-watch tests/drag.test.mjs 同向量
// （docs/plans/2026-11-09-client-vanilla-rewrite-implementation-plan.md Task 4）。
import {
  DRAG_SLOP_MOUSE,
  DRAG_SLOP_TOUCH,
  dragSlop,
  grabOffset,
  clampFrame,
  parseInset,
} from "../client/drag.mjs";

test("drag · slop 常量字面量", () => {
  assert.equal(DRAG_SLOP_MOUSE, 6);
  assert.equal(DRAG_SLOP_TOUCH, 10);
});

test("drag · dragSlop 分级", () => {
  assert.equal(dragSlop("mouse"), 6);
  assert.equal(dragSlop("touch"), 10);
  assert.equal(dragSlop("pen"), 10);
});

test("drag · grabOffset", () => {
  assert.deepEqual(grabOffset({ x: 100, y: 50 }, { left: 80, top: 40 }), { dx: 20, dy: 10 });
});

test("drag · clampFrame 界内直通与越界钳位", () => {
  const viewport = { width: 1024, height: 768 };
  const size = { width: 150, height: 26 };
  const inBounds = clampFrame({ x: 150, y: 60 }, { dx: 20, dy: 10 }, size, viewport, {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  assert.deepEqual(inBounds, { x: 130, y: 50 });

  const clamped = clampFrame({ x: -500, y: -500 }, { dx: 20, dy: 10 }, size, viewport, {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  assert.equal(clamped.x, 8, "越界点钳到左边界");
  assert.equal(clamped.y, 8, "越界点钳到上边界");
});

test("drag · parseInset", () => {
  assert.equal(parseInset("20px"), 20);
  assert.equal(parseInset(""), 0);
  assert.equal(parseInset("auto"), 0);
});
