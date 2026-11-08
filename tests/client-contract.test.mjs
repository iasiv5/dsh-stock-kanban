// 客户端插槽契约测试：bundle 挂载并完整渲染零未解析引用、转发 props 与快照形状一致（GLOSSARY「插槽契约」）。
// 三态 UI 经 localStorage 种子驱动（走生产 loadUi 真实路径），react 经 resolve 钩子映射假实现。

import test from "node:test";
import assert from "node:assert/strict";
import { bootMain, walkTree, SNAPSHOT_KEYS } from "./helpers/contract-harness.mjs";

test("插槽契约 · list 态：App 全树渲染零抛错", async () => {
  const render = await bootMain({}, "list");
  assert.doesNotThrow(() => walkTree(render(), () => {}));
});

test("插槽契约 · detail 态：面板详情回退渲染零抛错", async () => {
  const render = await bootMain({ panelOpen: true, view: "detail", detailId: "cn:600519" }, "detail");
  assert.doesNotThrow(() => walkTree(render(), () => {}));
});

test("插槽契约 · add 态：添加对话框渲染零抛错", async () => {
  const render = await bootMain({ panelOpen: true, view: "list", showAdd: true }, "add");
  assert.doesNotThrow(() => walkTree(render(), () => {}));
});

test("插槽契约 · 形状：无组件收到 undefined 且快照同名的 prop", async () => {
  const { elementRecords } = await import("./helpers/react-stub.mjs");
  const violations = [];
  for (const el of elementRecords) {
    for (const [k, v] of Object.entries(el.props)) {
      if (k !== "children" && v === undefined && SNAPSHOT_KEYS.includes(k)) {
        violations.push(`${el.type.name}.${k}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("插槽契约 · lifecycle：langObserver 只在 cleanup 断开", async () => {
  const { env } = await import("./helpers/contract-harness.mjs");
  const { effectRecords } = await import("./helpers/react-stub.mjs");
  const render = await bootMain({}, "lifecycle");
  const baseline = effectRecords.length;
  walkTree(render(), () => {});
  // 调用点序：walkTree 执行 App 时，main.mjs:18 useStore 先于 main.mjs:22 useEffect；
  // useStore 内部 subscribe effect（store.mjs:239）记录于 baseline+0，App 生命周期 effect 记录于 baseline+1。
  const app = effectRecords[baseline + 1];
  assert.ok(app, `effectRecords[baseline + 1] 应为 App 生命周期 effect（baseline=${baseline}）`);
  const cleanup = app.fn(); // 执行 setup（refreshState 失败走 .catch → toast 定时器 ≈4s，进程收尾多等属预期）；cleanup 属本次 setup
  const observer = env.observers[env.observers.length - 1];
  assert.ok(observer, "setup 应建立 MutationObserver");
  assert.equal(observer.observed.target, globalThis.document.documentElement, "应 observe documentElement");
  assert.deepEqual(observer.observed.options.attributeFilter, ["lang"], "应只监听 lang 属性");
  assert.equal(observer.disconnected, false, "setup 路径不得 disconnect：langObserver.disconnected 应为 false");
  cleanup();
  assert.equal(observer.disconnected, true, "disconnect 应仅出现在 cleanup：langObserver.disconnected 应为 true");
});
