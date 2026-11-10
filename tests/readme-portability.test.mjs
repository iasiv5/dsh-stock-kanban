import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

/**
 * README 渲染可移植性守卫（2026-11-10 retro）。
 * README 同时面向三个渲染面：GitHub、npm（tarball 内副本）、市场注册页。
 * npm 的渲染器不清除浮动——align="right" 曾把「设置与备份」的图挤出文档流（v0.2.1 实录）。
 * 注意：npm 页随下次发版生效，本守卫绿 ≠ npm 页已更新。
 */

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("README 可移植性：禁浮动与内联样式（npm 渲染器不清浮动）", () => {
  const banned = ['align="right"', "align='right'", "align=\"left\"", "style=", "<script", "javascript:"];
  for (const frag of banned) {
    assert.equal(readme.includes(frag), false, `README 含被禁片段：${frag}（居中排版用 <p align="center"> 模式）`);
  }
});

test("README 引用的仓库图片资产存在且非空（docs/images/*.webp）", () => {
  const srcs = [
    ...readme.matchAll(/raw\.githubusercontent\.com\/iasiv5\/dsh-stock-kanban\/main\/(docs\/images\/[^)\s"]+)/g),
  ].map((m) => m[1]);
  assert.ok(srcs.length > 0, "README 至少引用一张仓库图");
  const seen = new Set();
  for (const rel of srcs) {
    if (seen.has(rel)) continue;
    seen.add(rel);
    const file = new URL(`../${rel}`, import.meta.url);
    const stat = statSync(file); // 不存在会抛 ERR_ENOENT，消息含路径
    assert.ok(stat.size > 0, `${rel} 非空`);
  }
});
