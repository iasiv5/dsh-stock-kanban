import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { inject as mainInject } from "../client/main.mjs";

// 包形状与 inject lockstep 守卫（docs/plans/2026-11-09 Task 15）：
// vanilla 挂载通道为 body 直挂，dsh.client.inject 必须与 client/main.mjs 导出的
// inject 逐字一致（空数组），否则宿主会向已退役的 slot 通道注值。
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("package-shape · exports 形状（5 项）", () => {
  assert.deepEqual(pkg.exports, {
    ".": "./src/host.mjs",
    "./client": "./lib/client.js",
    "./icon": "./icon.svg",
    "./locale/*.json": "./locale/*.json",
    "./package.json": "./package.json",
  });
});

test("package-shape · dsh.client.platform === web", () => {
  assert.equal(pkg.dsh?.client?.platform, "web");
});

test("package-shape · inject lockstep（package.json ↔ client/main.mjs）", () => {
  assert.deepEqual(pkg.dsh?.client?.inject, mainInject);
  assert.deepEqual(mainInject, []);
});

test("package-shape · 零运行时依赖", () => {
  const deps = pkg.dependencies;
  assert.ok(deps === undefined || Object.keys(deps).length === 0, "dependencies 不存在或为空");
});

test("package-shape · devDependencies 含 jsdom", () => {
  assert.ok(pkg.devDependencies && typeof pkg.devDependencies.jsdom === "string");
});
