/**
 * 胶囊拖拽收起卡面（第 8 轮 2026-11-10，缺陷修复）：
 *   卡面打开时按住并拖动胶囊，卡面必须收起（与 qw 胶囊一致；一级与二级卡片都收），
 *   不能停在原地或跟着胶囊走。轻点（未拖动）仍走原来的切换语义。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createCapsule } from "../client/capsule.mjs";

function setup({ panelOpen }) {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const calls = [];
  const state = { ui: { panelOpen } };
  const store = {
    getState: () => state,
    closePanel() {
      calls.push("close");
      state.ui.panelOpen = false;
    },
    togglePanel() {
      calls.push("toggle");
    },
  };
  const capsule = createCapsule({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    shadow,
    store,
  });
  shadow.append(capsule.el);
  return { h, capsule, calls, state };
}

test("卡面打开时拖拽超 slop：收起一次（closePanel），拖拽手势照常完成", () => {
  const s = setup({ panelOpen: true });
  try {
    s.h.firePointer(s.capsule.el, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(s.capsule.el, "pointermove", { x: 120, y: 100 }); // 超 slop 6：拖拽开始
    s.h.firePointer(s.capsule.el, "pointerup", { x: 120, y: 100 });
    assert.deepEqual(s.calls, ["close"], "拖拽开始时收起卡面，且只收一次");
    assert.equal(s.state.ui.panelOpen, false, "store 中卡面已收起");
  } finally {
    s.capsule.dispose();
    s.h.cleanup();
  }
});

test("卡面关闭时拖拽：不写收起状态（无多余 store 写入）", () => {
  const s = setup({ panelOpen: false });
  try {
    s.h.firePointer(s.capsule.el, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(s.capsule.el, "pointermove", { x: 120, y: 100 });
    s.h.firePointer(s.capsule.el, "pointerup", { x: 120, y: 100 });
    assert.deepEqual(s.calls, [], "卡面本就关闭：不调用 closePanel");
  } finally {
    s.capsule.dispose();
    s.h.cleanup();
  }
});

test("轻点（未拖动）仍走切换语义：卡面打开时轻点 = togglePanel，不走拖拽收起", () => {
  const s = setup({ panelOpen: true });
  try {
    s.h.firePointer(s.capsule.el, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(s.capsule.el, "pointerup", { x: 100, y: 100 }); // 位移 0：点击
    assert.deepEqual(s.calls, ["toggle"], "轻点交给 togglePanel 完成切换");
  } finally {
    s.capsule.dispose();
    s.h.cleanup();
  }
});
