import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = /^(\/|~|dsh-m\/|https?:)/; // 绝对路径、家目录、外部仓库引用；`../` 按仓库根解析后校验（发版脚本路径即为此类）
const PATHLIKE = /^[\w.\-\/]+$/;

test("AGENTS.md 中反引号包裹的仓库内路径必须存在（失效导航即红灯）", () => {
  // 去掉代码围栏，只看行内反引号；路径只检查目录（以 / 结尾）与带扩展名的文件
  const text = readFileSync(join(ROOT, "AGENTS.md"), "utf8").replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g, "");
  const missing = [];
  let checked = 0;
  for (const span of text.matchAll(/\x60([^\x60]+)\x60/g)) {
    for (const token of span[1].split(/\s+/)) {
      if (!PATHLIKE.test(token) || !token.includes("/") || SKIP.test(token)) continue;
      if (!(token.endsWith("/") || /\.[A-Za-z0-9]+$/.test(token))) continue;
      checked += 1;
      if (!existsSync(join(ROOT, token))) missing.push(token);
    }
  }
  assert.ok(checked >= 5, "应至少检查到若干路径，防止正则失效");
  assert.deepEqual(missing, [], "以下路径在仓库内不存在：" + missing.join("，"));
});
