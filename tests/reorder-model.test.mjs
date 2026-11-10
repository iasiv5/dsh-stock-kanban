import test from "node:test";
import assert from "node:assert/strict";
import { compareBySort, reorderSorts } from "../src/model.mjs";
import {
  liftIntent,
  moveId,
  slotIndexFromY,
  mergeVisibleIntoFull,
  flipOffsets,
  DRAG_SLOP,
  LONG_PRESS_MS,
} from "../client/reorder.mjs";

/* 拖拽排序：模型纯函数（reorderSorts/compareBySort）+ 客户端手势决策（client/reorder.mjs） */

function rec(id, sort, addedAt = "2026-01-01T00:00:00.000Z") {
  return { id, market: "cn", code: id.split(":")[1] ?? id, quoteCurrency: "CNY", kind: "stock", name: id, quantity: null, avgCost: null, buyTarget: null, sellTarget: null, addedAt, sort };
}

test("compareBySort：sort 升序 → addedAt 升序 → id 升序兜底", () => {
  const a = rec("cn:a", 1);
  const b = rec("cn:b", 2);
  assert.equal(compareBySort(a, b), -1);
  assert.equal(compareBySort(b, a), 1);
  // sort 同值：addedAt 早者在前
  const early = rec("cn:x", 100, "2025-01-01T00:00:00.000Z");
  const late = rec("cn:y", 100, "2026-01-01T00:00:00.000Z");
  assert.equal(compareBySort(early, late), -1);
  // 全同：id 字典序（确定性）
  const i1 = rec("cn:m", 5);
  const i2 = rec("cn:n", 5);
  assert.equal(compareBySort(i1, i2), -1);
  assert.equal(compareBySort(i1, i1), 0);
});

test("reorderSorts：重排生成全组新记录（sort 重编号 0..n-1）", () => {
  const group = [rec("cn:a", 100), rec("cn:b", 200), rec("cn:c", 300)];
  const applied = reorderSorts(group, ["cn:c", "cn:a", "cn:b"]);
  assert.equal(applied.ok, true);
  assert.equal(applied.changed, true);
  assert.deepEqual(applied.records.map((r) => [r.id, r.sort]), [["cn:c", 0], ["cn:a", 1], ["cn:b", 2]]);
  assert.notEqual(applied.records[0], group[2]); // 变更组全量新对象（整组一次写）
});

test("reorderSorts：同排列但 sort 值异构（存量时间戳）→ changed=false 幂等", () => {
  const group = [rec("cn:a", 1760000000000), rec("cn:b", 1760000001000), rec("cn:c", 1760000002000)];
  const applied = reorderSorts(group, ["cn:a", "cn:b", "cn:c"]); // 当前展示序，值未重编号
  assert.equal(applied.changed, false);
  assert.deepEqual(applied.records, group);
});

test("reorderSorts：顺序未变 → changed=false 且原引用返回", () => {
  const group = [rec("cn:a", 0), rec("cn:b", 1)];
  const applied = reorderSorts(group, ["cn:a", "cn:b"]);
  assert.equal(applied.changed, false);
  assert.deepEqual(applied.records, group);
});

test("reorderSorts：非排列一律拒绝（缺员/重复/未知 id/长度不齐/非数组/非字符串）", () => {
  const group = [rec("cn:a", 1), rec("cn:b", 2)];
  for (const bad of [
    ["cn:a"], // 缺员
    ["cn:a", "cn:a"], // 重复
    ["cn:a", "cn:x"], // 未知 id
    ["cn:a", "cn:b", "cn:c"], // 长度不齐
    "cn:a,cn:b", // 非数组
    ["cn:a", 42], // 非字符串
    [], // 空排列 vs 非空组
  ]) {
    const applied = reorderSorts(group, bad);
    assert.equal(applied.ok, false, `应拒绝: ${JSON.stringify(bad)}`);
    assert.equal(applied.error, "invalid-order");
  }
});

test("reorderSorts：单元素/空组 changed=false（幂等）", () => {
  assert.equal(reorderSorts([rec("cn:a", 9)], ["cn:a"]).changed, false);
  assert.equal(reorderSorts([], []).changed, false);
});

test("liftIntent：鼠标位移 slop 起拖；触摸先动=滚动意图；触摸长按起拖", () => {
  assert.equal(DRAG_SLOP, 6);
  assert.equal(LONG_PRESS_MS, 300);
  // 鼠标：≥slop 即 lift，反之 wait
  assert.equal(liftIntent({ pointerType: "mouse", movedPx: 6, heldMs: 10 }), "lift");
  assert.equal(liftIntent({ pointerType: "mouse", movedPx: 5, heldMs: 10 }), "wait");
  // 触摸：先动 ≥ slop → reject（滚动意图），与时长无关
  assert.equal(liftIntent({ pointerType: "touch", movedPx: 20, heldMs: 50 }), "reject");
  assert.equal(liftIntent({ pointerType: "touch", movedPx: 20, heldMs: 500 }), "reject");
  // 触摸：满长按且未滚动 → lift
  assert.equal(liftIntent({ pointerType: "touch", movedPx: 3, heldMs: 300 }), "lift");
  assert.equal(liftIntent({ pointerType: "pen", movedPx: 3, heldMs: 299 }), "wait");
});

test("moveId：终序下标语义 + 钳位 + 不改原数组", () => {
  const list = ["a", "b", "c", "d"];
  assert.deepEqual(moveId(list, "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveId(list, "d", 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveId(list, "b", 99), ["a", "c", "d", "b"]); // 越界钳到尾
  assert.deepEqual(moveId(list, "b", -3), ["b", "a", "c", "d"]); // 越界钳到头
  assert.deepEqual(moveId(list, "b", 1), list); // 位移无效 → 原序副本
  assert.deepEqual(moveId(list, "x", 0), list); // 不存在 → 原序副本
  assert.deepEqual(list, ["a", "b", "c", "d"]); // 原数组不被修改
});

test("slotIndexFromY：视觉顶缘换算槽位（过半行换槽 + 钳位）", () => {
  const listTop = 100, rowH = 50, count = 4;
  assert.equal(slotIndexFromY(100, listTop, rowH, count), 0); // 对齐第 0 槽顶
  assert.equal(slotIndexFromY(124, listTop, rowH, count), 0); // 不足半行
  assert.equal(slotIndexFromY(126, listTop, rowH, count), 1); // 过半行 → 换槽
  assert.equal(slotIndexFromY(233, listTop, rowH, count), 3); // 尾槽
  assert.equal(slotIndexFromY(999, listTop, rowH, count), 3); // 越界钳到尾
  assert.equal(slotIndexFromY(-50, listTop, rowH, count), 0); // 越界钳到头
});

test("mergeVisibleIntoFull：可见子序并入全序——只有可见项换槽，未可见项保持原位", () => {
  const full = ["a", "b", "c", "d", "e"];
  // 持仓过滤视图 [a,c,e] 内把 c 拖到最前：c 接管 a 的槽位，隐藏的 b 不动（用户看不到的项永不位移）
  assert.deepEqual(mergeVisibleIntoFull(full, ["c", "a", "e"]), ["c", "b", "a", "d", "e"]);
  assert.deepEqual(mergeVisibleIntoFull(full, ["e", "d", "c", "b", "a"]), ["e", "d", "c", "b", "a"]); // 无过滤：恒等
  assert.deepEqual(mergeVisibleIntoFull(full, []), full);
});

test("flipOffsets：仅计算发生位移的行的反演 dy", () => {
  const dy = flipOffsets({ a: 100, b: 140, c: 180 }, { a: 140, b: 100, c: 180 });
  assert.equal(dy.a, -40);
  assert.equal(dy.b, 40);
  assert.equal("c" in dy, false); // 未动行不参与
});
