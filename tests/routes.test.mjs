import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.mjs";
import { createQuoteService } from "../src/quotes.mjs";
import { createRoutes } from "../src/routes.mjs";
import { createTrustGuard } from "../src/access.mjs";

/* 路由层测试：真实 HTTP 服务器 + mock 上游（不依赖网络） */

const SYM = {
  id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY", kind: "stock",
  name: "贵州茅台", addedAt: "2026-01-01T00:00:00.000Z", sort: 1,
};

async function startServer({ trust, logger, diag } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sk-routes-"));
  process.env.DSH_STOCK_KANBAN_FILE = join(dir, "data.json");
  const store = new Store({}, { info() {}, warn() {} });
  await store.init();
  await store.addSymbol(SYM);
  const quotes = createQuoteService({});
  const routes = createRoutes({ store, quotes, logger: logger ?? { info() {}, warn() {} }, trust, diag });
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

/* ---------------- 拖拽排序路由（symbols/reorder，2026-11-10） ---------------- */

test("路由：reorder 200 重编号 / 422 非排列与非法市场 / ifRev 冲突 409", async () => {
  const t = await startServer();
  try {
    await t.store.addSymbol({ ...SYM, id: "cn:sz000001", code: "sz000001", sort: 200 });
    const ok = await t.j("/stock-kanban/symbols/reorder", {
      method: "POST",
      headers: H(t.base),
      body: JSON.stringify({ market: "cn", orderedIds: ["cn:sz000001", "cn:sh600519"], ifRev: t.store.rev }),
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.changed, true);
    assert.ok(Number.isInteger(ok.body.rev));
    assert.equal(t.store.getSymbol("cn:sz000001").sort, 0);

    const bad = await t.j("/stock-kanban/symbols/reorder", {
      method: "POST",
      headers: H(t.base),
      body: JSON.stringify({ market: "cn", orderedIds: ["cn:sh600519"] }), // 缺员
    });
    assert.equal(bad.status, 422);
    assert.equal(bad.body.error, "invalid-order");

    const badMarket = await t.j("/stock-kanban/symbols/reorder", {
      method: "POST",
      headers: H(t.base),
      body: JSON.stringify({ market: "nope", orderedIds: [] }),
    });
    assert.equal(badMarket.status, 422);

    const conflict = await t.j("/stock-kanban/symbols/reorder", {
      method: "POST",
      headers: H(t.base),
      body: JSON.stringify({ market: "cn", orderedIds: ["cn:sh600519", "cn:sz000001"], ifRev: 999999 }),
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error, "rev-conflict");
  } finally { t.close(); }
});

/* ---------------- 官方信任检查（connection.requestRejection 守卫式委派，2026-11-12） ---------------- */

/** 挂上指定 connection mock 的信任围栏后启动同一套路由 */
function trustServer(conn, logger) {
  return startServer({ trust: createTrustGuard({ get: () => conn }, logger) });
}

test("路由：信任检查拒绝 → 401/403 原样下发（error=untrusted）", async () => {
  for (const status of [401, 403]) {
    const t = await trustServer({ requestRejection: () => status });
    try {
      const res = await t.j("/stock-kanban/state");
      assert.equal(res.status, status);
      assert.equal(res.body.error, "untrusted");
    } finally { t.close(); }
  }
});

test("路由：信任检查放行 → 业务照常；写路由仍受同源校验", async () => {
  const restore = await mockUpstream();
  const t = await trustServer({ requestRejection: () => undefined });
  try {
    const res = await t.j("/stock-kanban/state");
    assert.equal(res.status, 200);
    assert.equal(res.body.rev, 1);
    const cross = await t.j("/stock-kanban/settings", { method: "POST", headers: { "content-type": "application/json", origin: "http://evil.example", "sec-fetch-site": "cross-site" }, body: JSON.stringify({ ifRev: t.store.rev, privacyMode: true }) });
    assert.equal(cross.status, 403);
    assert.equal(cross.body.error, "origin-rejected");
  } finally { t.close(); restore(); }
});

test("路由：connection 服务缺席 → fail-closed 403，warn 只发一次", async () => {
  const warns = [];
  const t = await trustServer(undefined, { warn: (m) => warns.push(String(m)) });
  try {
    const r1 = await t.j("/stock-kanban/state");
    const r2 = await t.j("/stock-kanban/health");
    assert.equal(r1.status, 403);
    assert.equal(r2.status, 403);
    assert.equal(r1.body.error, "untrusted");
    assert.equal(warns.length, 1);
    assert.match(warns[0], /fail-closed/);
  } finally { t.close(); }
});

test("路由：requestRejection 抛错 → fail-closed 403", async () => {
  const t = await trustServer({ requestRejection: () => { throw new Error("boom"); } });
  try {
    const res = await t.j("/stock-kanban/state");
    assert.equal(res.status, 403);
    assert.equal(res.body.error, "untrusted");
  } finally { t.close(); }
});

test("路由：读路由不豁免（export/health/quotes 同样过信任检查）", async () => {
  const t = await trustServer({ requestRejection: () => 403 });
  try {
    assert.equal((await t.j("/stock-kanban/export")).status, 403);
    assert.equal((await t.j("/stock-kanban/health")).status, 403);
    assert.equal((await t.j("/stock-kanban/quotes?ids=cn:sh600519")).status, 403);
  } finally { t.close(); }
});

test("路由：非 import 变更默认 64KiB 体积上限（413）", async () => {
  const restore = await mockUpstream();
  const t = await trustServer({ requestRejection: () => undefined });
  try {
    const big = JSON.stringify({ ifRev: t.store.rev, privacyMode: true, pad: "x".repeat(70 * 1024) });
    const res = await t.j("/stock-kanban/settings", { method: "POST", headers: { "content-type": "application/json", origin: t.base, "sec-fetch-site": "same-origin" }, body: big });
    assert.equal(res.status, 413);
  } finally { t.close(); restore(); }
});

/* ---------------- 诊断闭环（P1-6，2026-11-13） ---------------- */

test("诊断：POST /diag 同源收批量行；跨源 403；GET tail 回读", async () => {
  const { createDiagLogger } = await import("../src/diag.mjs");
  const diag = createDiagLogger({ dir: mkdtempSync(join(tmpdir(), "sk-diag-")), level: "full" });
  const restore = await mockUpstream();
  const t = await startServer({ diag });
  try {
    const cross = await t.j("/stock-kanban/diag", { method: "POST", headers: { "content-type": "application/json", origin: "http://evil.example", "sec-fetch-site": "cross-site" }, body: JSON.stringify({ rows: [{ ev: "panel.mount" }] }) });
    assert.equal(cross.status, 403);

    const ok = await t.j("/stock-kanban/diag", { method: "POST", headers: H(t.base), body: JSON.stringify({ rows: [{ ev: "panel.quotes.fail", message: "HTTP 502" }] }) });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.stored, 1);
    await diag.flush();

    const tail = await t.j("/stock-kanban/diag?tail=20");
    assert.equal(tail.status, 200);
    assert.ok(tail.body.rows.some((r) => r.ev === "client.panel.quotes.fail" && r.src === "client")); // 评审轮2：客户端行归 client. 命名空间
  } finally {
    t.close();
    restore();
  }
});

test("诊断：route.status 门——同 path+status 两分钟一行 + dropped 计数", async () => {
  const { createDiagLogger } = await import("../src/diag.mjs");
  const diag = createDiagLogger({ dir: mkdtempSync(join(tmpdir(), "sk-diag-")), level: "full" });
  const t = await startServer({ diag });
  try {
    const a = await t.j("/stock-kanban/kline?id=cn:missing&period=day");
    const b = await t.j("/stock-kanban/kline?id=cn:missing2&period=day");
    assert.equal(a.status, 404);
    assert.equal(b.status, 404);
    await diag.flush();
    const { rows } = await diag.tail(10);
    const status = rows.filter((r) => r.ev === "route.status" && r.path === "/stock-kanban/kline" && r.status === 404);
    assert.equal(status.length, 1); // 第二次被门拦下（窗口内不重复落行）
    // dropped 计数在窗口内只累加在门的状态里，随下一次落行补记（有界日志语义，对齐 lens route.status gate）
    assert.equal(status[0].dropped, 0);
  } finally {
    t.close();
  }
});

test("诊断：客户端行 ev 命名空间化——服务端保留事件不可伪造（评审轮2 P3）", async () => {
  const { createDiagLogger } = await import("../src/diag.mjs");
  const diag = createDiagLogger({ dir: mkdtempSync(join(tmpdir(), "sk-diag-")), level: "full" });
  const restore = await mockUpstream();
  const t = await startServer({ diag });
  try {
    const ok = await t.j("/stock-kanban/diag", { method: "POST", headers: H(t.base), body: JSON.stringify({ rows: [
      { ev: "route.status", path: "/x", status: 502 },
      { ev: "provider.fail", provider: "tencent" },
      { ev: "client.panel.crash", message: "boom" },
      { ev: "panel.quotes.fail", message: "HTTP 502" },
    ] }) });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.stored, 2);
    assert.equal(ok.body.rejected, 2);
    await diag.flush();
    const { rows } = await diag.tail(20);
    const evs = rows.filter((r) => r.src === "client").map((r) => r.ev).sort();
    assert.deepEqual(evs, ["client.panel.crash", "client.panel.quotes.fail"]); // 自带 client. 前缀被归一化为单层（幂等）
    assert.ok(rows.every((r) => r.src !== "client" || !/^(provider.|route.|store.|host.)/.test(String(r.ev).replace(/^client./, ""))));
  } finally {
    t.close();
    restore();
  }
});
