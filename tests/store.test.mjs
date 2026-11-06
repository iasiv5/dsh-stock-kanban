import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store, createFileDriver } from "../src/store.mjs";

function tempStore() {
  const dir = mkdtempSync(join(tmpdir(), "sk-store-"));
  process.env.DSH_STOCK_KANBAN_FILE = join(dir, "data.json");
  return { store: new Store({}, { info() {}, warn() {} }), dir };
}

const SYM = {
  id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY", kind: "stock",
  name: "贵州茅台", addedAt: "2026-01-01T00:00:00.000Z", sort: 1,
};

test("存储：CRUD 推进 rev + 落盘持久化（12.3）", async () => {
  const { store, dir } = tempStore();
  await store.init();
  assert.equal(store.driverKind, "file");
  await store.addSymbol(SYM);
  assert.equal(store.rev, 1);
  await store.updateSymbol(SYM.id, { quantity: 100, avgCost: 1500, buyTarget: 1400 });
  assert.equal(store.rev, 2);
  await store.setSettings({ privacyMode: true });
  assert.equal(store.global.settings.privacyMode, true);

  // 重开（12.3 重启后数据仍存在）
  const again = new Store({}, { info() {}, warn() {} });
  await again.init();
  assert.equal(again.rev, 3);
  assert.equal(again.symbols.length, 1);
  assert.equal(again.getSymbol(SYM.id).quantity, 100);
  assert.equal(again.global.settings.privacyMode, true);
  assert.ok(existsSync(join(dir, "data.json")));
});

test("存储：重复添加拒绝 / 不存在更新删除报错", async () => {
  const { store } = tempStore();
  await store.init();
  await store.addSymbol(SYM);
  await assert.rejects(() => store.addSymbol(SYM), /duplicate/);
  await assert.rejects(() => store.updateSymbol("us:NOPE", { quantity: 1 }), /not-found/);
  await assert.rejects(() => store.removeSymbol("us:NOPE"), /not-found/);
  assert.equal(store.rev, 1); // 失败不推进 rev
});

test("存储：非法 patch 拒绝且不落盘（12.3 接口失败不删用户数据）", async () => {
  const { store } = tempStore();
  await store.init();
  await store.addSymbol(SYM);
  await store.updateSymbol(SYM.id, { quantity: 50 });
  await assert.rejects(() => store.updateSymbol(SYM.id, { quantity: -5 }), /invalid/);
  assert.equal(store.getSymbol(SYM.id).quantity, 50);
  assert.equal(store.rev, 2);
});

test("存储：写链串行化并发写，无交错丢失（12.3 多页面不静默丢失）", async () => {
  const { store } = tempStore();
  await store.init();
  await store.addSymbol({ ...SYM, id: "us:AAPL", market: "us", code: "AAPL", quoteCurrency: "USD" });
  await store.updateSymbol("us:AAPL", { quantity: 10, avgCost: 100 });
  const results = await Promise.allSettled([
    store.updateSymbol("us:AAPL", { quantity: 11 }),
    store.updateSymbol("us:AAPL", { quantity: 12 }),
    store.updateSymbol("us:AAPL", { avgCost: 200 }),
  ]);
  assert.deepEqual(results.map((r) => r.status), ["fulfilled", "fulfilled", "fulfilled"]);
  assert.equal(store.getSymbol("us:AAPL").quantity, 12); // 最后一个写生效（串行序）
  assert.equal(store.getSymbol("us:AAPL").avgCost, 200);
  assert.equal(store.rev, 5);
});

test("存储：导入覆盖语义 + 失败回滚", async () => {
  const { store } = tempStore();
  await store.init();
  await store.addSymbol(SYM);
  const result = await store.importAll([
    { ...SYM, id: "us:AAPL", market: "us", code: "AAPL", quoteCurrency: "USD", quantity: 3, avgCost: 100 },
  ], { privacyMode: false });
  assert.equal(result.imported, 1);
  assert.equal(result.removed, 1); // 原有的 cn:sh600519 被覆盖删除
  assert.deepEqual(store.symbols.map((s) => s.id), ["us:AAPL"]);

  // 导入含非法记录：跳过非法条目
  const result2 = await store.importAll([
    { ...SYM, id: "us:BAD!", market: "us", code: "BAD!", quoteCurrency: "USD" },
    { ...SYM, id: "hk:hk00700", market: "hk", code: "hk00700", quoteCurrency: "HKD", quantity: 100, avgCost: 400 },
  ], { privacyMode: true });
  assert.equal(result2.imported, 1);
  assert.equal(store.symbols.length, 1);
  assert.equal(store.global.settings.privacyMode, true);
});

test("存储：损坏文件隔离后可继续使用（原字节保留）", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sk-store-"));
  const file = join(dir, "data.json");
  process.env.DSH_STOCK_KANBAN_FILE = file;
  const { writeFileSync, readdirSync } = await import("node:fs");
  writeFileSync(file, "{corrupted!!");
  const store = new Store({}, { info() {}, warn() {} });
  await store.init(); // 不应抛出：损坏文件被隔离
  assert.equal(store.symbols.length, 0);
  await store.addSymbol(SYM); // 隔离后写入可用
  assert.equal(store.getSymbol(SYM.id).id, SYM.id);
  const quarantined = readdirSync(dir).filter((f) => f.includes(".corrupt-"));
  assert.equal(quarantined.length, 1); // 原字节保留供人工恢复
  assert.ok(readFileSync(join(dir, quarantined[0]), "utf8").includes("corrupted"));
});

test("文件驱动：原子结构（symbols + global 双字段文档）", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sk-store-"));
  const file = join(dir, "data.json");
  process.env.DSH_STOCK_KANBAN_FILE = file;
  const driver = createFileDriver(file);
  await driver.setGlobal({ rev: 1, settings: { privacyMode: false } });
  await driver.putRecord("symbols", "cn:sh600519", { hello: "world" });
  const doc = JSON.parse(readFileSync(file, "utf8"));
  assert.deepEqual(doc.symbols["cn:sh600519"], { hello: "world" });
  assert.equal(doc.global.rev, 1);
});
