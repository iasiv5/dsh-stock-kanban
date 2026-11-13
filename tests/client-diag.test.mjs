import test from "node:test";
import assert from "node:assert/strict";
import { createDiagReporter } from "../client/diag.mjs";

/* 评审轮3（批次2 收口）：诊断上报的 visibilitychange 监听须有 dispose 摘除；拆卸后 add 不再入队。 */

function fakeWin() {
  const listeners = new Map();
  const beacons = [];
  let timers = 0;
  const doc = {
    hidden: false,
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
  };
  return {
    document: doc,
    listeners,
    beacons,
    navigator: { sendBeacon(url, blob) { beacons.push({ url, blob }); return true; } },
    setTimeout() { timers += 1; return timers; },
    clearTimeout() {},
    timersCreated: () => timers,
  };
}

test("拆卸：dispose 冲掉队列、摘除监听，之后 add 不再入队或建定时器", () => {
  const win = fakeWin();
  const rep = createDiagReporter({ win });
  assert.equal(win.listeners.has("visibilitychange"), true);
  rep.add("panel.mount", { v: "x" });
  rep.dispose();
  assert.equal(win.listeners.has("visibilitychange"), false);
  assert.equal(win.beacons.length, 1);
  const before = win.timersCreated();
  rep.add("panel.quotes.fail", { message: "late" });
  assert.equal(win.timersCreated(), before);
  rep.flush();
  assert.equal(win.beacons.length, 1);
});

test("隐藏即冲队列（监听在位时）", () => {
  const win = fakeWin();
  const rep = createDiagReporter({ win });
  rep.add("panel.quotes.fail", { message: "boom" });
  win.document.hidden = true;
  win.listeners.get("visibilitychange")();
  assert.equal(win.beacons.length, 1);
  rep.dispose();
});
