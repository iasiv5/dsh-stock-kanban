import { test } from "node:test";
import assert from "node:assert/strict";

// client/float-prefs.mjs parity 测试——与 quota-watch tests/prefs.test.mjs 同向量
// （docs/plans/2026-11-09-client-vanilla-rewrite-implementation-plan.md Task 3）。
import {
  FLOAT_POSITION_KEY,
  GUEST_POSITION_KEY,
  MARGIN,
  clampPoint,
  titlebarTopInset,
  loadFloatPosition,
  saveFloatPosition,
  loadGuestFloatPosition,
  mirrorGuestFloatPosition,
} from "../client/float-prefs.mjs";

function createStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test("float-prefs · 键名与 MARGIN 常量", () => {
  assert.equal(FLOAT_POSITION_KEY, "dsh-stock-kanban:float-position");
  assert.equal(MARGIN, 8);
});

test("float-prefs · clampPoint 与 quota-watch 同向量", () => {
  const viewport = { width: 1024, height: 768 };
  const size = { width: 150, height: 26 };
  assert.deepEqual(clampPoint({ x: 0, y: 0 }, viewport, size), { x: 8, y: 8 });
  assert.deepEqual(clampPoint({ x: 2000, y: 2000 }, viewport, size), { x: 866, y: 734 });
  const insets = { left: 0, top: 32, right: 0, bottom: 0 };
  assert.deepEqual(clampPoint({ x: 0, y: 0 }, viewport, size, insets), { x: 8, y: 40 });
});

test("float-prefs · 退化视口（viewport < size）钳位不越界", () => {
  const clamped = clampPoint({ x: -500, y: -500 }, { width: 50, height: 40 }, { width: 150, height: 26 });
  assert.ok(clamped.x >= 8, `x ≥ minX（实际 ${clamped.x}）`);
  assert.ok(clamped.y >= 8, `y ≥ minY（实际 ${clamped.y}）`);
});

test("float-prefs · titlebarTopInset", () => {
  assert.equal(titlebarTopInset({ titlebar: true, height: "36px" }), 36);
  assert.equal(titlebarTopInset({ titlebar: true, fullscreen: true, height: "36px" }), 0);
  assert.equal(titlebarTopInset({ titlebar: true, height: "not-a-number" }), 0);
  assert.equal(titlebarTopInset({}), 0);
});

test("float-prefs · loadFloatPosition 容错", () => {
  const ok = createStorage();
  ok.setItem(FLOAT_POSITION_KEY, JSON.stringify({ x: 1, y: 2 }));
  assert.deepEqual(loadFloatPosition(ok), { x: 1, y: 2 });

  const empty = createStorage();
  assert.equal(loadFloatPosition(empty), null, "缺键 → null");

  const corrupt = createStorage();
  corrupt.setItem(FLOAT_POSITION_KEY, "{not json");
  assert.equal(loadFloatPosition(corrupt), null, "损坏 JSON → null");

  const nonFinite = createStorage();
  nonFinite.setItem(FLOAT_POSITION_KEY, JSON.stringify({ x: NaN, y: 2 }));
  assert.equal(loadFloatPosition(nonFinite), null, "非有限 → null");
});

test("float-prefs · saveFloatPosition 契约", () => {
  const storage = createStorage();
  saveFloatPosition(storage, { x: 1, y: 2 });
  assert.equal(storage.getItem(FLOAT_POSITION_KEY), JSON.stringify({ x: 1, y: 2 }));

  assert.throws(() => saveFloatPosition(storage, { x: NaN, y: 2 }), TypeError);

  const hostile = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
  assert.doesNotThrow(() => saveFloatPosition(hostile, { x: 1, y: 2 }), "写失败静默不冒泡");
});

test("guest 位置键：load 读 dsh-quota-watch 键，坏数据返回 null", () => {
  const storage = createStorage();
  assert.equal(loadGuestFloatPosition(storage), null, "空存储 → null");
  storage.setItem(GUEST_POSITION_KEY, "{broken");
  assert.equal(loadGuestFloatPosition(storage), null, "坏 JSON → null");
  storage.setItem(GUEST_POSITION_KEY, JSON.stringify({ x: 3, y: "x" }));
  assert.equal(loadGuestFloatPosition(storage), null, "非有限数值 → null");
  storage.setItem(GUEST_POSITION_KEY, JSON.stringify({ x: 3, y: 6 }));
  assert.deepEqual(loadGuestFloatPosition(storage), { x: 3, y: 6 });
});

test("guest 位置键：mirror 写 {x,y}，非法抛 TypeError，写失败静默", () => {
  const storage = createStorage();
  mirrorGuestFloatPosition(storage, { x: 1, y: 2 });
  assert.equal(storage.getItem(GUEST_POSITION_KEY), JSON.stringify({ x: 1, y: 2 }));
  assert.throws(() => mirrorGuestFloatPosition(storage, { x: NaN, y: 2 }), TypeError);
  const hostile = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
  assert.doesNotThrow(() => mirrorGuestFloatPosition(hostile, { x: 1, y: 2 }), "写失败静默不冒泡");
});
