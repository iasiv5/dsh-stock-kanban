// 契约测试装配层：react 钩子注册 → 全局桩安装 → fake-slots 取渲染函数 → 树遍历器。
// 静态 import 只允许 helper（client 模块一律动态 import，且必须在 register 之后）。

import { register } from "node:module";

register(new URL("./react-resolve-hook.mjs", import.meta.url).href, import.meta.url);

const { installClientEnv } = await import("./client-env.mjs");
export const env = installClientEnv();

// SNAPSHOT_KEYS：清空 storage 后 createStore().getState() 的键集（随 store 默认状态键自动扩展，免维护）。
const storeMod = await import("../../client/store.mjs");
for (const k of [...env.storage.keys()]) env.storage.delete(k);
const probe = storeMod.createStore();
export const SNAPSHOT_KEYS = Object.keys(probe.getState());

const UI_KEY = "stock-kanban:ui:v1";

/**
 * 种子 localStorage → 动态 import main.mjs（?state=<tag> 取独立模块实例，createStore 读到种子 UI）
 * → fake-slots 走真实 apply() 接缝 → 返回插槽渲染函数。
 */
export async function bootMain(seedUi, tag) {
  for (const k of [...env.storage.keys()]) env.storage.delete(k);
  if (seedUi && Object.keys(seedUi).length > 0) env.storage.set(UI_KEY, JSON.stringify(seedUi));
  const factories = {};
  const ctx = {
    slots: {
      inject: (slot, factory) => {
        factories[slot] = factory;
      },
      register: (opts, render) => render,
    },
  };
  const main = await import(new URL(`../../client/main.mjs?state=${tag}`, import.meta.url).href);
  main.apply(ctx);
  const factory = factories["shell.overlay"];
  return factory(); // register(opts, render) → render
}

/** 元素树遍历：函数组件就地执行（触发 hooks 录制），宿主元素递归 props.children。 */
export function walkTree(node, visit, depth = 0) {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") return;
  if (Array.isArray(node)) {
    for (const child of node) walkTree(child, visit, depth + 1);
    return;
  }
  if (depth > 50) throw new Error("walkTree depth exceeded 50");
  visit(node);
  if (typeof node.type === "function") {
    walkTree(node.type(node.props), visit, depth + 1);
  } else if (node.props && node.props.children !== undefined) {
    walkTree(node.props.children, visit, depth + 1);
  }
}
