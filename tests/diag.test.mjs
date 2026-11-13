import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDiagLogger, isErrorEvent } from "../src/diag.mjs";

/* 诊断日志（P1-6，2026-11-13）：等级过滤 / 轮转 / 回读。 */

const dir = () => mkdtempSync(join(tmpdir(), "sk-diag-"));
const T0 = new Date("2026-11-13T10:00:00.000Z");
const clock = () => T0;

test("isErrorEvent：errors 档保留清单", () => {
  assert.equal(isErrorEvent("provider.fail"), true);
  assert.equal(isErrorEvent("route.status"), true);
  assert.equal(isErrorEvent("route.reject"), true);
  assert.equal(isErrorEvent("store.conflict"), true);
  assert.equal(isErrorEvent("panel.quotes.fail"), true);
  assert.equal(isErrorEvent("host.ready"), false);
});

test("off 全静默；errors 只留失败行；full 全记", async () => {
  const d1 = createDiagLogger({ dir: dir(), level: "off", now: clock });
  await d1.append({ ev: "provider.fail" });
  await d1.flush();
  assert.equal(existsSync(d1.path()), false);

  const d2 = createDiagLogger({ dir: dir(), level: "errors", now: clock });
  await d2.append({ ev: "host.ready" });
  await d2.append({ ev: "provider.fail", provider: "tencent", error: "HTTP 502" });
  await d2.flush();
  const rows2 = (await d2.tail(10)).rows;
  assert.equal(rows2.length, 1);
  assert.equal(rows2[0].ev, "provider.fail");
  assert.equal(rows2[0].provider, "tencent");

  const d3 = createDiagLogger({ dir: dir(), level: "full", now: clock });
  await d3.append({ ev: "host.ready" });
  await d3.append({ ev: "route.status", path: "x", status: 502 });
  await d3.flush();
  assert.equal((await d3.tail(10)).rows.length, 2);
});

test("轮转：超 maxBytes 轮 .1（每 20 次追加 stat 一次）", async () => {
  const d = createDiagLogger({ dir: dir(), level: "full", maxBytes: 200, now: clock });
  for (let i = 0; i < 25; i++) await d.append({ ev: "host.ready", i });
  await d.flush();
  const tail = await d.tail(100);
  assert.equal(tail.rows.length, 5);
  assert.ok(existsSync(d.path() + ".1"));
});

test("tail 回读上限（新→旧序取尾）", async () => {
  const d = createDiagLogger({ dir: dir(), level: "full", now: clock });
  for (let i = 0; i < 8; i++) await d.append({ ev: "host.ready", i });
  await d.flush();
  const { rows } = await d.tail(3);
  assert.equal(rows.length, 3);
  assert.equal(rows[2].i, 7);
});

test("append 展开序：服务端时间戳权威，客户端自带 t 被覆盖（评审轮2 P3）", async () => {
  const d = createDiagLogger({ dir: dir(), level: "full", now: clock });
  await d.append({ ev: "host.ready", t: "1999-01-01T00:00:00.000Z" });
  await d.flush();
  const { rows } = await d.tail(5);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].t, T0.toISOString());
  assert.equal(rows[0].ev, "host.ready");
});
