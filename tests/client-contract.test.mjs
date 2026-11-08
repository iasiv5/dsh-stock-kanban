// 客户端插槽契约测试：bundle 挂载并完整渲染零未解析引用、转发 props 与快照形状一致（GLOSSARY「插槽契约」）。
// 三态 UI 经 localStorage 种子驱动（走生产 loadUi 真实路径），react 经 resolve 钩子映射假实现。

import test from "node:test";
import assert from "node:assert/strict";
import { bootMain, walkTree, SNAPSHOT_KEYS } from "./helpers/contract-harness.mjs";
import { CSS_TEXT } from "../client/styles.mjs";
import { trendClass } from "../client/fmt.mjs";

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

test("插槽契约 · settings 态：设置对话框（备份与迁移）渲染零抛错", async () => {
  const render = await bootMain({ panelOpen: true, view: "list", showSettings: true }, "settings");
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

test("插槽契约 · 命中面：胶囊显式 pointer-events:auto（父层 .skc-root 为 none，继承即对真实指针免疫）", () => {
  const capsuleRule = CSS_TEXT.match(/\.skc-capsule\{[^}]*\}/);
  assert.ok(capsuleRule, ".skc-capsule 规则应存在");
  assert.match(capsuleRule[0], /pointer-events:\s*auto/, "胶囊必须显式声明 pointer-events:auto，否则拖动/点击全部失效（0d950f3 回归实录）");
  const panelRule = CSS_TEXT.match(/\.skc-panel\{[^}]*\}/);
  assert.ok(panelRule && /pointer-events:\s*auto/.test(panelRule[0]), ".skc-panel 须显式 pointer-events:auto");
});

// ─── 类名缝守卫（GLOSSARY「插槽契约」·样式类名对齐）────────────────────────
// 背景：trendClass 曾产出 sk-up/sk-down/sk-flat，样式表定义的却是 .skc-up/.skc-down/.skc-flat
//（前缀差一字符，首版起涨跌配色从未生效，89 用例无一能查，2026-11-09 架构走查才暴露）。
// 双层封死整类事故：渲染态（真实接缝产出的 token）+ 源码全集（含动态生产者注册表）。无豁免清单。

function cssClassSet() {
  const set = new Set();
  for (const m of CSS_TEXT.matchAll(/\.([a-zA-Z][\w-]*)/g)) set.add(m[1]);
  return set;
}

test("插槽契约 · 类名缝渲染态：三态种子渲染树产出的类名均已在样式表定义", async () => {
  const css = cssClassSet();
  const violations = [];
  const states = [
    ["cls-list", {}],
    ["cls-detail", { panelOpen: true, view: "detail", detailId: "cn:600519" }],
    ["cls-add", { panelOpen: true, view: "list", showAdd: true }],
    ["cls-settings", { panelOpen: true, view: "list", showSettings: true }],
  ];
  for (const [tag, seedUi] of states) {
    const render = await bootMain(seedUi, tag);
    walkTree(render(), (node) => {
      const cls = node?.props?.className;
      if (typeof cls !== "string") return;
      for (const token of cls.split(/\s+/)) {
        if (token && !css.has(token)) violations.push(`${tag}:${token}`);
      }
    });
  }
  assert.deepEqual(violations, [], `渲染产出未定义类名：${violations.join("、")}`);
});

test("插槽契约 · 类名缝源码全集：className/classList 静态产出（含动态生产者）均已在样式表定义", async () => {
  const css = cssClassSet();
  const { readdirSync, readFileSync } = await import("node:fs");
  const clientDir = new URL("../client/", import.meta.url);
  // 动态生产者注册表：className 位置的非字面量表达式必须在此登记，
  // 且其全部可能产出都要能在样式表中解析——防止未来动态拼接绕过静态扫描。
  const producers = new Map([
    ["trendClass", new Set([trendClass(1), trendClass(-1), trendClass(0), trendClass(null), trendClass(NaN)])],
  ]);
  const exact = new Set();
  const prefixes = new Set();
  const unknownProducers = [];
  for (const f of readdirSync(clientDir).filter((n) => n.endsWith(".mjs"))) {
    const src = readFileSync(new URL(`../client/${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/className:\s*("([^"]*)"|`([^`]*)`|([A-Za-z_$][\w$.]*))/g)) {
      if (m[2] !== undefined) {
        for (const t of m[2].split(/\s+/)) if (t) exact.add(t);
      } else if (m[3] !== undefined) {
        const parts = m[3].split(/\$\{[^}]*\}/);
        parts.forEach((chunk, idx) => {
          for (const t of chunk.split(/\s+/)) {
            if (!t) continue;
            (idx < parts.length - 1 ? prefixes : exact).add(t);
          }
        });
        // 模板 ${} 内三元备选（cond ? " a" : " b" 惯用法）按精确 token 收；
        // 比较操作数（如 ui.view === "detail"）不是类名，不收。
        for (const block of m[3].matchAll(/\$\{([^}]*)\}/g)) {
          for (const s of block[1].matchAll(/\?\s*"([^"]*)"|:\s*"([^"]*)"/g)) {
            for (const t of (s[1] ?? s[2]).split(/\s+/)) if (t) exact.add(t);
          }
        }
      } else if (!producers.has(m[4])) {
        unknownProducers.push(`${f}:${m[4]}`);
      }
    }
    for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\("([^"]+)"\)/g)) exact.add(m[1]);
  }
  const violations = [];
  for (const t of exact) if (!css.has(t)) violations.push(t);
  for (const t of prefixes) if (![...css].some((c) => c.startsWith(t))) violations.push(`${t}（模板前缀）`);
  for (const p of unknownProducers) violations.push(`未注册动态生产者 ${p}`);
  for (const outs of producers.values()) for (const t of outs) if (!css.has(t)) violations.push(`${t}（生产者产出）`);
  assert.deepEqual(violations, [], `类名缝漂移：${violations.join("、")}`);
});
