import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

/** 语法闸（2026-11-13 retro）：TS 注解混入纯 .mjs 曾两次炸在构建/测试加载阶段
 *  （client/charts.mjs `: any`、tests/client-dom.test.mjs `: any[]`）——
 *  node --check 对每个入库 .mjs 做确定性语法检查，TS 语法泄漏即红；毫秒级/文件。 */
test("语法闸：所有入库 .mjs 通过 node --check（防 TS 注解泄漏）", () => {
  const files = execSync("git ls-files '*.mjs'", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const bad = [];
  for (const f of files) {
    try {
      execSync(`node --check ${JSON.stringify(f)}`, { stdio: "pipe" });
    } catch (e) {
      bad.push(`${f}: ${String((e.stderr || e.message) ?? "").split("\n")[0]}`);
    }
  }
  assert.deepEqual(bad, [], `以下 .mjs 语法不合法（多为 TS 注解泄漏）：\n${bad.join("\n")}`);
});
