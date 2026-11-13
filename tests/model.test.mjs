import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSymbolRecord, patchSymbolRecord, newSymbolRecord, buildExportPayload, parseImportPayload, normalizeGlobal, sanitizeName, defaultGlobal } from "../src/model.mjs";

const BASE = { id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY", kind: "stock", name: "贵州茅台" };

test("normalizeSymbolRecord：合法记录通过并补默认", () => {
  const r = normalizeSymbolRecord(BASE);
  assert.equal(r.id, "cn:sh600519");
  assert.equal(r.quantity, null);
  assert.equal(r.buyTarget, null);
  assert.equal(typeof r.addedAt, "string");
  assert.equal(r.name, "贵州茅台");
});

test("normalizeSymbolRecord：身份不自洽/非法数值被拒", () => {
  assert.equal(normalizeSymbolRecord({ ...BASE, id: "cn:sz000001" }), null);
  assert.equal(normalizeSymbolRecord({ ...BASE, quantity: -1 }), null);
  assert.equal(normalizeSymbolRecord({ ...BASE, quantity: "many" }), null);
  assert.equal(normalizeSymbolRecord({ ...BASE, avgCost: 0 }), null); // 成本必须为正或空
  assert.equal(normalizeSymbolRecord({ ...BASE, buyTarget: NaN }), null);
  assert.equal(normalizeSymbolRecord(null), null);
  assert.equal(normalizeSymbolRecord([BASE]), null);
});

test("sanitizeName：控制字符剥离 + 限长（防注入面）", () => {
  assert.equal(sanitizeName("  贵州茅台\n"), "贵州茅台");
  assert.equal(sanitizeName("<script>alert(1)</script>").startsWith("<script"), true); // 仅剥控制字符，渲染层 React 转义
  assert.equal(sanitizeName("x".repeat(100)).length, 64);
  assert.equal(sanitizeName(123), null);
});

test("patchSymbolRecord：局部更新 / null 清除 / 非法拒绝", () => {
  const base = normalizeSymbolRecord(BASE);
  const up = patchSymbolRecord(base, { quantity: 100, avgCost: 1500.5 });
  assert.equal(up.ok, true);
  assert.equal(up.record.quantity, 100);
  const clear = patchSymbolRecord(up.record, { quantity: null });
  assert.equal(clear.ok, true);
  assert.equal(clear.record.quantity, null);
  assert.equal(clear.record.avgCost, 1500.5); // 未提及字段不动
  const bad = patchSymbolRecord(up.record, { quantity: 0 });
  assert.equal(bad.ok, false);
  const badTarget = patchSymbolRecord(up.record, { buyTarget: "xyz" });
  assert.equal(badTarget.ok, false);
});

test("newSymbolRecord：身份错误返回 invalid-identity", () => {
  assert.equal(newSymbolRecord("cn", "999999").ok, false);
  assert.equal(newSymbolRecord("cn", "600519").ok, true); // 裸代码由 normalizeInputCode 补前缀
});

test("global 归一化：非法回退默认", () => {
  assert.equal(normalizeGlobal(null).rev, 0);
  assert.equal(normalizeGlobal({ rev: -1 }).rev, 0);
  assert.equal(normalizeGlobal({ rev: 5, settings: { privacyMode: true } }).settings.privacyMode, true);
  assert.equal(normalizeGlobal({ rev: 5, settings: { privacyMode: "yes" } }).settings.privacyMode, false);
  assert.deepEqual(defaultGlobal().settings, { privacyMode: false });
});

test("备份导出/导入校验与版本处理（12.1）", () => {
  const globalState = normalizeGlobal({ rev: 3, settings: { privacyMode: true } });
  const symbols = {
    "cn:sh600519": normalizeSymbolRecord({ ...BASE, quantity: 100, avgCost: 1500 }),
    "crypto:BTC-USDT": normalizeSymbolRecord({ id: "crypto:BTC-USDT", market: "crypto", code: "BTC-USDT", quoteCurrency: "USDT", kind: "coin", quantity: 0.5, avgCost: 70000 }),
  };
  const backup = buildExportPayload(globalState, symbols);
  assert.equal(backup.kind, "stock-kanban-backup");
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.symbols.length, 2);

  // 合法导入
  const parsed = parseImportPayload(backup);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.symbols.length, 2);
  assert.equal(parsed.settings.privacyMode, true);

  // 结构级错误：整体拒绝
  assert.equal(parseImportPayload({ ...backup, kind: "other" }).ok, false);
  assert.equal(parseImportPayload({ ...backup, schemaVersion: 2 }).error, "unsupported-schema-version");
  assert.equal(parseImportPayload({ ...backup, symbols: "nope" }).ok, false);
  assert.equal(parseImportPayload(null).ok, false);
  assert.equal(parseImportPayload("json").ok, false);

  // 单条标的非法：计入 rejected 不中断
  const mixed = { ...backup, symbols: [...backup.symbols, { id: "us:BAD!", market: "us", code: "BAD!", quoteCurrency: "USD" }] };
  const parsedMixed = parseImportPayload(mixed);
  assert.equal(parsedMixed.ok, true);
  assert.equal(parsedMixed.rejected, 1);

  // id 重复：按重复计 rejected
  const dup = { ...backup, symbols: [...backup.symbols, backup.symbols[0]] };
  assert.equal(parseImportPayload(dup).rejected, 1);
});

/* ---------------- 指数记录（P0-2，2026-11-13） ---------------- */

test("指数记录：normalize 剥除业务字段（导入容忍）；patch 拒绝持仓/目标价", () => {
  const raw = { id: "cn:sh000001", market: "cn", code: "sh000001", quoteCurrency: "CNY", kind: "index", name: "上证指数", quantity: 100, avgCost: 3000, buyTarget: 3500, addedAt: "2026-11-13T00:00:00.000Z", sort: 1 };
  const clean = normalizeSymbolRecord(raw);
  assert.equal(clean.kind, "index");
  assert.equal(clean.quantity, null);
  assert.equal(clean.buyTarget, null);
  const patched = patchSymbolRecord(clean, { quantity: 10 });
  assert.equal(patched.ok, false);
  assert.equal(patched.errors[0], "index-no-position");
  const patched2 = patchSymbolRecord(clean, { buyTarget: 3000, sellTarget: 4000 });
  assert.equal(patched2.ok, false);
});

test("指数记录：目录外代码传 kind=index 降级 stock（不绕过校验）", () => {
  const built = newSymbolRecord("cn", "sh600519", "贵州茅台", { kind: "index" });
  assert.equal(built.ok, true);
  assert.equal(built.record.kind, "stock");
});
