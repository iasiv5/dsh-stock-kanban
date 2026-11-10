/**
 * 渲染切片广播——跨 tick 节点身份回归（渲染切片广播 Task 2/3/4 累积）。
 * 守住「不重建」承诺：守卫补丁退役后（detail 跳绘/光标恢复、list 焦点抢救/拖拽冻结），
 * 节点身份断言是唯一防回归锚（实施计划 Task 7 / verification §12.25 的单测对应物）。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createList } from "../client/list.mjs";

const SNAPB = (overrides = {}) => ({
  business: { rev: 1, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: true },
  quotes: {},
  quoteMeta: { fetchedAt: null, error: null },
  ui: {
    panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false,
    lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: null, quotaMerge: true, quotaCapable: false,
  },
  toast: null,
  providers: null,
  ...overrides,
});

const mkSym = (id, sort) => ({
  id, market: "cn", code: id, name: `标的${id}`, quantity: null, avgCost: null,
  buyTarget: null, sellTarget: null, addedAt: "2026-01-01T00:00:00.000Z", sort,
});

test("list · 拖拽中行情 tick：零节点增删、价格原位更新（§12.24 patch-only 修订）", () => {
  const h = createDomHarness();
  const prevDoc = globalThis.document;
  globalThis.document = h.document;
  let list = null;
  try {
    const symbols = [mkSym("a", 1), mkSym("b", 2)];
    const store = {
      getState: () => ({ business: { rev: 1, settings: { privacyMode: false }, loaded: true, symbols }, ui: { panelOpen: true, view: "list", lastMarket: "cn", holdingsOnly: false } }),
      setLastMarket() {}, pollQuotes() {}, openDetail() {}, setHoldingsOnly() {}, reorderSymbols() {},
    };
    list = createList({ store });
    h.document.body.append(list.el);
    list.update(SNAPB({ business: { rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true, symbols } }));
    assert.equal(list.el.querySelectorAll(".skc-row").length, 2, "前置：两行在位");
    const rowA = list.el.querySelector('.skc-row[data-id="a"]');
    const rowB = list.el.querySelector('.skc-row[data-id="b"]');

    // 起拖（mouse：位移 20 > slop 6 → lift；firePointer pointerId 恒 1）
    h.firePointer(rowB, "pointerdown", { x: 100, y: 100 });
    h.firePointer(rowB, "pointermove", { x: 120, y: 100 });

    // 拖拽中 quotes tick：patch-only（零节点增删，文本原位写）
    list.update(SNAPB({
      business: { rev: 1, settings: { privacyMode: false }, driverKind: null, loaded: true, symbols },
      quotes: { a: { id: "a", status: "ok", price: 99.5, changePercent: -1.2, quoteTime: "15:00:00" } },
      changed: { quotes: new Set(["a"]), business: false, ui: [], quoteMetaError: false },
    }));
    assert.equal(list.el.querySelectorAll(".skc-row").length, 2, "拖拽中零节点增删");
    assert.equal(list.el.querySelector('.skc-row[data-id="a"]'), rowA, "行 A 身份不变");
    assert.equal(list.el.querySelector('.skc-row[data-id="b"]'), rowB, "行 B 身份不变");
    assert.match(rowA?.querySelector(".skc-row-price")?.children[0]?.textContent ?? "", /99\.50/, "价格已原位更新");

    // 松手：拖拽内无换槽（y 未动）→ 顺序不变、不触发 reorder、行区完整
    h.firePointer(rowB, "pointerup", { x: 120, y: 100 });
    assert.equal(list.el.querySelectorAll(".skc-row").length, 2, "endDrag 后行区完整");
  } finally {
    list?.dispose();
    globalThis.document = prevDoc;
    h.cleanup();
  }
});
