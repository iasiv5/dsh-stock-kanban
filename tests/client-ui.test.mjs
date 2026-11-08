import test from "node:test";
import assert from "node:assert/strict";
import { maskIf, fmtPrice, fmtPct, fmtAmount, fmtQty, parsePositiveInput, trendClass } from "../client/fmt.mjs";
import { computeMa, niceBounds } from "../client/chartmath.mjs";
import { createStore } from "../client/store.mjs";

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

// 旧拖拽/贴边辅助纯函数（Task 14 退役）用例已删：
// 视口钳位语义由 Task 3 的 clampPoint parity 测试接棒（tests/client-float-prefs.test.mjs）。

test("均线计算：MA5 语义（12.2 常用均线）", () => {
  const candles = [1, 2, 3, 4, 5, 6].map((close, i) => ({ time: `2026-01-0${i + 1}`, close }));
  const ma = computeMa(candles, 5);
  assert.equal(ma.length, 2);
  assert.equal(ma[0].value, 3); // (1+2+3+4+5)/5
  assert.equal(ma[1].value, 4);
  assert.equal(ma[0].index, 4);
  assert.equal(computeMa(candles, 10).length, 0);
});

test("涨跌颜色类名：trendClass 语义（A股红涨绿跌平灰；与样式表的对齐由契约测试类名缝守卫执有）", () => {
  assert.equal(trendClass(3.5), "skc-up");
  assert.equal(trendClass(-2), "skc-down");
  assert.equal(trendClass(0), "skc-flat");
  assert.equal(trendClass(null), "skc-flat");
  assert.equal(trendClass(NaN), "skc-flat");
});

test("niceBounds 退化保护", () => {
  assert.deepEqual(niceBounds(2, 2), [1, 3]);
  assert.deepEqual(niceBounds(NaN, 5), [0, 1]);
  assert.deepEqual(niceBounds(0, 10), [0, 10]);
});

/* ---------------- client/store.mjs 去 React 化（vanilla 重写 Task 7） ---------------- */

function createStorageStub(seed = {}) {
  const map = new Map(Object.entries(seed));
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

test("store · ui 快照无 pos/panelPos（职责移出）", () => {
  const store = createStore(createStorageStub());
  const ui = store.getState().ui;
  assert.equal("pos" in ui, false, "ui 不含 pos");
  assert.equal("panelPos" in ui, false, "ui 不含 panelPos");
});

test("store · persist 字段集不含 pos", () => {
  const storage = createStorageStub();
  const store = createStore(storage);
  store.setHoldingsOnly(true);
  const persisted = JSON.parse(storage.getItem("stock-kanban:ui:v1"));
  assert.equal("pos" in persisted, false, "落盘不含 pos");
  assert.equal("panelPos" in persisted, false, "落盘不含 panelPos");
  assert.equal(persisted.holdingsOnly, true);
  assert.equal(persisted.lastMarket, "cn");
});

test("store · 读旧 ui:v1 忽略 pos 键不抛错", () => {
  const storage = createStorageStub({
    "stock-kanban:ui:v1": JSON.stringify({ pos: { x: 1, y: 2, dock: "right" }, lastMarket: "hk" }),
  });
  const store = createStore(storage);
  const ui = store.getState().ui;
  assert.equal("pos" in ui, false, "旧 pos 键被忽略");
  assert.equal(ui.lastMarket, "hk", "其余字段照常读取");
});

test("store · subscribe 即刻回放 + 动作通知 + unsubscribe 止噪", () => {
  const store = createStore(createStorageStub());
  const seen = [];
  const unsub = store.subscribe((snapshot) => seen.push(snapshot));
  assert.equal(seen.length, 1, "subscribe 即刻回放当前快照一次");
  store.setHoldingsOnly(true);
  assert.equal(seen.length, 2, "动作经通知漏斗触发订阅者");
  assert.equal(seen[1].ui.holdingsOnly, true, "订阅者收到新快照");
  unsub();
  store.setHoldingsOnly(false);
  assert.equal(seen.length, 2, "unsubscribe 后不再触发");
});
