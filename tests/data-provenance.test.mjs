import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson, sortRows } from "../scripts/refresh-pools.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

test("标的池由生成器产出：manifest 的哈希、条目数、排序与规范格式与文件逐一一致", () => {
  const manifest = JSON.parse(readFileSync(join(DATA, "manifest.json"), "utf8"));
  assert.equal(manifest.schema, 1);
  assert.ok(Date.parse(manifest.generatedAt) > 0, "generatedAt 必须是有效时间");
  for (const [file, meta] of Object.entries(manifest.files)) {
    const text = readFileSync(join(DATA, file), "utf8");
    const digest = createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
    assert.equal(digest, meta.sha256, file + " 与 manifest 哈希不一致：请经 scripts/refresh-pools.mjs 重新生成");
    const rows = JSON.parse(text);
    assert.equal(rows.length, meta.records, file + " 条目数与 manifest 不一致");
    assert.deepEqual(rows, sortRows(rows), file + " 未按代码升序");
    assert.equal(text, canonicalJson(rows), file + " 不是生成器的规范格式（2 空格缩进）");
    for (const source of meta.sources) {
      assert.ok(manifest.sources.some((s) => s.id === source), file + " 引用了未登记的来源 " + source);
    }
  }
});
