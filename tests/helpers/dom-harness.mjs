// tests/helpers/dom-harness.mjs — jsdom 装配 + 合成指针辅助（客户端 vanilla 化 DOM 级测试共用）。
// 契约见 docs/plans/2026-11-09-client-vanilla-rewrite-implementation-plan.md Task 2。
import { JSDOM } from "jsdom";

/**
 * 创建一个隔离的 jsdom 实例。
 * pretendToBeVisual 提供 requestAnimationFrame；url 提供 localStorage。
 */
export function createDomHarness() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    pretendToBeVisual: true,
    url: "https://dsh.local/",
  });
  const win = dom.window;
  const doc = win.document;

  /**
   * 强写视口尺寸（jsdom 的 innerWidth/innerHeight 只读，直接赋值无效）。
   * configurable: true 允许测试内多次调整。
   */
  function setViewport(targetWin, width, height) {
    Object.defineProperty(targetWin, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
    Object.defineProperty(targetWin, "innerHeight", {
      configurable: true,
      writable: true,
      value: height,
    });
  }

  /**
   * 在 el 上派发合成指针事件；返回已派发标志。
   * 主路径用原生 PointerEvent 构造器；构造器缺失或 init 字段不被采用时
   * 回退 Event + Object.defineProperty 挂字段。
   */
  function firePointer(el, type, opts = {}) {
    const {
      x = 0,
      y = 0,
      pointerType = "mouse",
      button = 0,
      pointerId = 1,
      isPrimary = true,
    } = opts;
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      button,
      pointerType,
      pointerId,
      isPrimary,
    };
    let ev = null;
    if (typeof win.PointerEvent === "function") {
      try {
        const candidate = new win.PointerEvent(type, init);
        // 校验 init 字段确实被构造器采用（老引擎可能静默忽略）
        if (
          candidate.clientX === x &&
          candidate.clientY === y &&
          candidate.pointerType === pointerType
        ) {
          ev = candidate;
        }
      } catch {
        ev = null;
      }
    }
    if (!ev) {
      ev = new win.Event(type, { bubbles: true, cancelable: true, composed: true });
      for (const [key, value] of Object.entries({
        clientX: x,
        clientY: y,
        button,
        pointerType,
        pointerId,
        isPrimary,
      })) {
        Object.defineProperty(ev, key, { configurable: true, enumerable: true, value });
      }
    }
    try {
      return el.dispatchEvent(ev);
    } catch {
      return false;
    }
  }

  function cleanup() {
    win.close();
  }

  return {
    window: win,
    document: doc,
    localStorage: win.localStorage,
    cleanup,
    firePointer,
    setViewport,
  };
}
