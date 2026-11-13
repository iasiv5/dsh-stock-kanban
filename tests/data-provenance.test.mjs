import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("标的池是上游原样快照：data/SHA256SUMS 的字节指纹与文件一致（改格式或内容须同步更新清单与 NOTICE.md）", () => {
  const entries = readFileSync(join(ROOT, "data", "SHA256SUMS"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/));
  assert.equal(entries.length, 3, "清单应列出三个标的池文件");
  for (const [want, name] of entries) {
    const got = createHash("sha256").update(readFileSync(join(ROOT, "data", name))).digest("hex");
    assert.equal(got, want, name + " 的字节指纹与清单不一致：若是有意刷新，请更新 data/SHA256SUMS 与 NOTICE.md");
  }
});
