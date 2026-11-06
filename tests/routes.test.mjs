import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { createQuoteService } from "../src/quotes.mjs";
import { createRoutes } from "../src/routes.mjs";

/* 路由层测试：真实 HTTP 服务器 + mock 上游（不依赖网络） */

const SYM = {
  id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY", kind: "stock",
  name: "贵州茅台", addedAt: "2026-01-01T00:00:00.000Z", sort: 1,
};

async function startServer() {
  const dir = mkdtempSync(join(tmpdir(), "sk-routes-"));
  process.env.DSH_STOCK_KANBAN_FILE = join(dir, "data.json");
  const store = new Store({}, { info() {}, warn() {} });
  await store.init();
  await store.addSymbol(SYM);
  const quotes = createQuoteService({});
  const routes = createRoutes({ store, quotes, logger: { info() {}, warn() {} } });
  const server = http.createServer((req, res) => {
    const route = routes.find((r) => r.path === (req.url ?? "").split("?")[0]);
    if (!route) { res.writeHead(404); res.end("not found"); return; }
    try {
      const r = route.handler(req, res);
      if (r?.catch) r.catch(() => {});
    } catch { res.writeHead(500); res.end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const j = async (path, opts) => {
    const res = await fetch(base + path, opts);
    return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
  };
  return { store, base, j, server, close: () => server.close() };
}

const H = (origin) => ({ "content-type": "application/json", origin, "sec-fetch-site": "same-origin" });

async function mockUpstream() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes("127.0.0.1")) return originalFetch(url, init);
    if (u.includes("qt.gtimg.cn")) {
      const text = 'v_sh600519="1~贵州茅台~600519~1453.00~1452.00~1450.00~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~202611061614~1.00~0.07~1457.72~1436.00~x~42848~619953~0.34~22.11";';
      return { ok: true, arrayBuffer: async () => Buffer.from(text, "utf8"), json: async () => ({}) };
    }
    if (u.includes("push2")) {
      return { ok: true, json: async () => ({ data: { diff: [] } }) };
    }
    if (u.includes("okx.com")) {
      return { ok: true, json: async () => ({ code: "0", data: [] }) };
    }
    return { ok: false, status: 404 };
  };
  return () => { globalThis.fetch = originalFetch; };
}

test("路由：/state 返回实例业务数据", async () => {
  const t = await startServer();
  try {
    const res = await t.j("/stock-kanban/state");
    assert.equal(res.status, 200);
    assert.equal(res.body.rev, 1);
    assert.equal(res.body.symbols[0].id, SYM.id);
    assert.equal(res.body.driverKind, "file");
  } finally { t.close(); }
});

test("路由：行情行包含持仓指标与目标状态", async () => {
  const restore = await mockUpstream();
  const t = await startServer();
  try {
    await t.store.updateSymbol(SYM.id, { quantity: 100, avgCost: 1500, buyTarget: 1400 });
    const res = await t.j(`/stock-kanban/quotes?ids=${SYM.id}`);
    const row = res.body.rows[SYM.id];
    assert.equal(row.status, "ok");
    assert.equal(row.price, 1453);
    assert.equal(row.metrics.cost, 150000);
    assert.equal(row.metrics.marketValue, 145300);
    assert.ok(row.metrics.pnl < 0); // 1453 < 1500 → 亏损，不得显示虚假盈利
    assert.equal(row.target.status, "stale"); // 行情时间已过 30 分钟窗 → 不伪装有效触价
    await t.store.updateSymbol(SYM.id, { buyTarget: null, sellTarget: null });
    const res2 = await t.j(`/stock-kanban/quotes?ids=${SYM.id}`);
    assert.equal(res2.body.rows[SYM.id].target.status, "no-targets");
  } finally { t.close(); restore(); }
});

test("路由：同源校验 + CAS 冲突 409 + 重复添加 409", async () => {
  const restore = await mockUpstream();
  const t = await startServer();
  const base = t.base;
  try {
    const cross = await t.j("/stock-kanban/settings", { method: "POST", headers: { "content-type": "application/json", origin: "http://evil.example", "sec-fetch-site": "cross-site" }, body: JSON.stringify({ ifRev: t.store.rev, privacyMode: true }) });
    assert.equal(cross.status, 403);

    const conflict = await t.j("/stock-kanban/symbols/update", { method: "POST", headers: H(base), body: JSON.stringify({ ifRev: 0, id: SYM.id, patch: { quantity: 1 } }) });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error, "rev-conflict");
    assert.ok(conflict.body.state.symbols.length >= 1); // 冲突响应携带最新状态

    const dup = await t.j("/stock-kanban/symbols/add", { method: "POST", headers: H(base), body: JSON.stringify({ ifRev: t.store.rev, market: "cn", code: "600519" }) });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error, "duplicate");

    const badType = await t.j("/stock-kanban/settings", { method: "GET", headers: H(base) });
    assert.equal(badType.status, 405);
  } finally { t.close(); restore(); }
});

test("路由：添加走真实行情校验（无效代码 422）", async () => {
  const restore = await mockUpstream();
  const t = await startServer();
  try {
    const bad = await t.j("/stock-kanban/symbols/add", { method: "POST", headers: H(t.base), body: JSON.stringify({ ifRev: t.store.rev, market: "cn", code: "999999" }) });
    assert.equal(bad.status, 422); // 格式合法但行情校验不过 → 不加入
    assert.equal(t.store.symbols.length, 1);
  } finally { t.close(); restore(); }
});

test("路由：搜索失败明确报错，不返回虚构结果（12.2）", async () => {
  const originalFetch = globalThis.fetch;
  const downstream = originalFetch;
  globalThis.fetch = async (url) => (String(url).includes("127.0.0.1") ? downstream(url) : (() => { throw new Error("down"); })());
  const t = await startServer();
  try {
    const res = await t.j("/stock-kanban/search?market=us&q=aapl"); // us 只依赖 smartbox → 必失败
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.rows, []);
    assert.match(res.body.error, /unavailable/);
  } finally { t.close(); globalThis.fetch = originalFetch; }
});

test("路由：导出→导入往返（12.3 备份可恢复业务数据）", async () => {
  const restore = await mockUpstream();
  const t = await startServer();
  try {
    await t.store.updateSymbol(SYM.id, { quantity: 100, avgCost: 1500, buyTarget: 1400, sellTarget: 1800 });
    const ex = await fetch(t.base + "/stock-kanban/export");
    const backup = await ex.json();
    assert.equal(ex.headers.get("content-disposition")?.startsWith("attachment"), true);

    // 清空后导入恢复
    await t.store.removeSymbol(SYM.id);
    assert.equal(t.store.symbols.length, 0);
    const imp = await t.j("/stock-kanban/import", { method: "POST", headers: H(t.base), body: JSON.stringify({ ifRev: t.store.rev, payload: backup }) });
    assert.equal(imp.status, 200);
    assert.equal(imp.body.imported, 1);
    const restored = t.store.getSymbol(SYM.id);
    assert.equal(restored.quantity, 100);
    assert.equal(restored.buyTarget, 1400);
    assert.equal(t.store.global.settings.privacyMode, backup.settings.privacyMode);
  } finally { t.close(); restore(); }
});

test("路由：/health 不含业务数据", async () => {
  const t = await startServer();
  try {
    const res = await t.j("/stock-kanban/health");
    assert.equal(res.status, 200);
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes("sh600519"));
    assert.ok(!text.includes("贵州茅台"));
    assert.ok(res.body.providers.tencent !== undefined);
  } finally { t.close(); }
});
