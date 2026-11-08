// 假 react：createElement 录制组件元素、hooks 捕获不执行 effect（契约测试专用）。
// 经 tests/helpers/react-resolve-hook.mjs 以 "react" 名义提供给 client 模块；
// 测试文件直接 import 本文件可访问同一模块实例的录制数组。

export const elementRecords = []; // 组件元素录制：{ type, props }
export const effectRecords = []; // effect 录制：{ fn, deps }

export function createElement(type, props = null, ...children) {
  const base = props ?? {};
  const el = {
    type,
    props: {
      ...base,
      children:
        children.length === 0
          ? base.children
          : children.length === 1
            ? children[0]
            : children,
    },
  };
  if (typeof type === "function") elementRecords.push(el);
  return el;
}

export function useState(init) {
  const value = typeof init === "function" ? init() : init;
  return [value, () => {}];
}

export function useRef(init = null) {
  return { current: init };
}

export function useCallback(fn) {
  return fn;
}

export function useEffect(fn, deps) {
  effectRecords.push({ fn, deps });
}

export default { createElement, useState, useRef, useCallback, useEffect };
