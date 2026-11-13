import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DICT_KEYS } from "../client/i18n.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function mjsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mjsFiles(p));
    else if (name.endsWith(".mjs")) out.push(p);
  }
  return out;
}

test("错误码守卫：服务端返回的每个 error 码在 zh/en 都有 err.<code> 文案，界面不再显示裸码", () => {
  const codes = new Map(); // code → 首次出现的文件
  const pattern = /\berror\s*[:=]\s*"([a-z][a-z0-9-]*)"/g;
  for (const file of mjsFiles(join(ROOT, "src"))) {
    for (const m of readFileSync(file, "utf8").matchAll(pattern)) {
      if (!codes.has(m[1])) codes.set(m[1], file.slice(ROOT.length + 1));
    }
  }
  assert.ok(codes.size >= 5, "扫描应至少命中若干错误码，防止正则失效");
  const missing = [];
  for (const [code, file] of codes) {
    for (const lang of ["zh", "en"]) {
      if (!DICT_KEYS[lang].includes("err." + code)) missing.push(lang + " err." + code + "（" + file + "）");
    }
  }
  assert.deepEqual(missing, [], "以下错误码缺少文案，请在 client/i18n.mjs 的 zh/en 同步补齐");
});
