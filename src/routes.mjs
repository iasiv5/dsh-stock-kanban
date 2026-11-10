/**
 * HTTP 路由：业务状态 / 标的 CRUD / 行情 / K线 / 分时 / 搜索 / 导入导出。
 * 全部 exact 路由，POST 强制同源 + JSON + 体积上限；响应 no-store。
 * 日志不输出持仓数值与备份内容（只记 id 与动作）。
 */

import { isSameOriginRequest } from "./access.mjs";
import { identityConsistent, MARKETS } from "./identity.mjs";
import { buildExportPayload, parseImportPayload } from "./model.mjs";
import { targetState, validateTargets } from "./targets.mjs";
import { positionMetrics } from "./portfolio.mjs";

export const PREFIX = "/stock-kanban";

const MUTATION_BODY_MAX = 64 * 1024;
const IMPORT_BODY_MAX = 512 * 1024;

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": String(body.length),
  });
  res.end(body);
}

function queryOf(req) {
  return new URL(req.url ?? "/", "http://local").searchParams;
}

async function readJsonBody(req, maxBytes) {
  const contentType = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw Object.assign(new Error("content-type must be application/json"), { status: 400 });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += part.length;
    if (bytes > maxBytes) throw Object.assign(new Error("payload too large"), { status: 413 });
    chunks.push(part);
  }
  if (chunks.length === 0) throw Object.assign(new Error("empty body"), { status: 400 });
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid json"), { status: 400 });
  }
}

/** 变更路由公共壳：同源校验 + rev CAS + 错误映射 */
function mutation(handler) {
  return async (req, res) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      sendJson(res, 405, { error: "method-not-allowed" });
      return;
    }
    if (!isSameOriginRequest(req)) {
      sendJson(res, 403, { error: "origin-rejected" });
      return;
    }
    let body;
    try {
      body = await readJsonBody(req, IMPORT_BODY_MAX);
    } catch (e) {
      sendJson(res, e.status ?? 400, { error: String(e.message ?? e) });
      return;
    }
    const rev = deps.store.rev;
    if (body.ifRev != null && Number(body.ifRev) !== rev) {
      sendJson(res, 409, { error: "rev-conflict", rev, state: statePayload() });
      return;
    }
    try {
      await handler(body, res);
    } catch (e) {
      const status = e.status ?? (e.code === "invalid-patch" ? 400 : 500);
      sendJson(res, status, { error: String(e.message ?? e), rev: deps.store.rev });
    }
  };
}

/** 依赖注入（host.mjs 装配） */
let deps = null;

export function createRoutes({ store, quotes, logger }) {
  deps = { store, quotes, logger: logger ?? console };
  return [
    { path: `${PREFIX}/state`, handler: stateRoute },
    { path: `${PREFIX}/symbols/add`, handler: mutation(addSymbolRoute) },
    { path: `${PREFIX}/symbols/update`, handler: mutation(updateSymbolRoute) },
    { path: `${PREFIX}/symbols/reorder`, handler: mutation(reorderSymbolRoute) },
    { path: `${PREFIX}/symbols/remove`, handler: mutation(removeSymbolRoute) },
    { path: `${PREFIX}/settings`, handler: mutation(settingsRoute) },
    { path: `${PREFIX}/search`, handler: searchRoute },
    { path: `${PREFIX}/quotes`, handler: quotesRoute },
    { path: `${PREFIX}/kline`, handler: klineRoute },
    { path: `${PREFIX}/minute`, handler: minuteRoute },
    { path: `${PREFIX}/export`, handler: exportRoute },
    { path: `${PREFIX}/import`, handler: mutation(importRoute) },
    { path: `${PREFIX}/health`, handler: healthRoute },
  ];
}

/** 导出业务状态（GET /state）。持仓数值原样下发——脱敏是客户端展示行为（4.6 界面遮挡）。 */
function statePayload() {
  const store = deps.store;
  return {
    rev: store.rev,
    settings: { privacyMode: store.global.settings.privacyMode === true },
    updatedAt: store.global.updatedAt,
    symbols: store.symbols,
    driverKind: store.driverKind,
  };
}

function stateRoute(_req, res) {
  sendJson(res, 200, statePayload());
}

async function addSymbolRoute(body, res) {
  const market = String(body.market ?? "");
  const code = String(body.code ?? "");
  const { resolveDirect } = await import("./markets/search.mjs");
  const resolved = await resolveDirect(market, code);
  if (!resolved.ok) {
    sendJson(res, 422, { error: resolved.error === "invalid-format" ? "invalid-identity" : resolved.error });
    return;
  }
  const { newSymbolRecord, patchSymbolRecord } = await import("./model.mjs");
  const built = newSymbolRecord(market, code, resolved.name, { kind: resolved.kind });
  if (!built.ok) {
    sendJson(res, 422, { error: built.error });
    return;
  }
  // 直连添加可带初始持仓/目标价（可选）
  let record = built.record;
  const patchKeys = ["quantity", "avgCost", "buyTarget", "sellTarget"];
  const patch = {};
  for (const key of patchKeys) if (key in (body.patch ?? {})) patch[key] = body.patch[key];
  if (Object.keys(patch).length > 0) {
    const applied = patchSymbolRecord(record, patch);
    if (!applied.ok) {
      sendJson(res, 422, { error: applied.errors.join(",") });
      return;
    }
    record = applied.record;
  }
  const targets = validateTargets(record.buyTarget, record.sellTarget);
  if (!targets.ok) {
    sendJson(res, 422, { error: targets.errors.join(",") });
    return;
  }
  try {
    const result = await deps.store.addSymbol(record);
    deps.logger?.info?.(`stock-kanban: symbol added ${record.id}`);
    sendJson(res, 200, { rev: result.global.rev, symbol: result.symbol, overlapHint: targets.overlap ? "overlap" : null });
  } catch (e) {
    if (String(e.message) === "duplicate") sendJson(res, 409, { error: "duplicate" });
    else sendJson(res, 500, { error: "save-failed" });
  }
}

async function updateSymbolRoute(body, res) {
  const id = String(body.id ?? "");
  const patch = body.patch ?? {};
  const current = deps.store.getSymbol(id);
  if (!current) {
    sendJson(res, 404, { error: "not-found" });
    return;
  }
  const next = {
    buyTarget: "buyTarget" in patch ? patch.buyTarget : current.buyTarget,
    sellTarget: "sellTarget" in patch ? patch.sellTarget : current.sellTarget,
  };
  const targets = validateTargets(next.buyTarget, next.sellTarget);
  if (!targets.ok) {
    sendJson(res, 422, { error: targets.errors.join(",") });
    return;
  }
  const result = await deps.store.updateSymbol(id, patch);
  sendJson(res, 200, { rev: result.global.rev, symbol: result.symbol, overlapHint: targets.overlap ? "overlap" : null });
}

async function removeSymbolRoute(body, res) {
  const result = await deps.store.removeSymbol(String(body.id ?? ""));
  deps.logger?.info?.(`stock-kanban: symbol removed ${body.id}`);
  sendJson(res, 200, { rev: result.global.rev });
}

/** 拖拽排序持久化：market 分组内全量 id 排列 → 组内 sort 重编号（单次 rev 推进） */
async function reorderSymbolRoute(body, res) {
  const market = String(body.market ?? "");
  const orderedIds = body.orderedIds;
  if (!MARKETS.includes(market) || !Array.isArray(orderedIds)) {
    sendJson(res, 422, { error: "invalid-order" });
    return;
  }
  try {
    const result = await deps.store.reorderSymbols(market, orderedIds);
    if (result.changed) deps.logger?.info?.(`stock-kanban: symbols reordered ${market} n=${result.count}`);
    sendJson(res, 200, { rev: result.global.rev, changed: result.changed });
  } catch (e) {
    if (e.code === "invalid-order") sendJson(res, 422, { error: "invalid-order" });
    else sendJson(res, 500, { error: "save-failed" });
  }
}

async function settingsRoute(body, res) {
  const patch = {};
  if (typeof body.privacyMode === "boolean") patch.privacyMode = body.privacyMode;
  const result = await deps.store.setSettings(patch);
  sendJson(res, 200, { rev: result.global.rev, settings: result.global.settings });
}

async function searchRoute(req, res) {
  const q = queryOf(req);
  const market = q.get("market") ?? "";
  const needle = q.get("q") ?? "";
  const { search } = await import("./markets/search.mjs");
  try {
    const result = await search(market, needle);
    sendJson(res, 200, { rows: result.rows, error: result.error });
  } catch (e) {
    // 搜索源故障：明确报错，绝不给虚构结果
    sendJson(res, 200, { rows: [], error: `search-unavailable: ${String(e?.message ?? e).slice(0, 80)}` });
  }
}

/** GET /quotes?ids=a:sh600519,crypto:BTC-USDT[&full=1] */
async function quotesRoute(req, res) {
  const ids = (queryOf(req).get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 80);
  const full = queryOf(req).get("full") === "1";
  const identities = [];
  for (const id of ids) {
    const symbol = deps.store.getSymbol(id);
    if (symbol && identityConsistent(symbol)) identities.push(symbol);
  }
  const rowsById = {};
  if (identities.length > 0) {
    let rows;
    if (full) {
      rows = await deps.quotes.getQuoteFull(identities);
    } else {
      rows = await deps.quotes.getQuotes(identities);
    }
    const now = Date.now();
    for (const [id, row] of rows) {
      const symbol = deps.store.getSymbol(id);
      const metrics = positionMetrics(symbol, row.status === "ok" ? row.quote.price : null);
      const target = targetState({
        price: row.status === "ok" ? row.quote.price : null,
        quoteTime: row.quoteTime,
        fetchedAt: row.fetchedAt,
        now,
        buyTarget: symbol?.buyTarget ?? null,
        sellTarget: symbol?.sellTarget ?? null,
      });
      rowsById[id] = {
        id,
        status: row.status,
        name: row.quote?.name || symbol?.name || null,
        price: row.quote?.price ?? null,
        prevClose: row.quote?.prevClose ?? null,
        open: row.quote?.open ?? null,
        high: row.quote?.high ?? null,
        low: row.quote?.low ?? null,
        changeAmount: row.quote?.changeAmount ?? null,
        changePercent: row.quote?.changePercent ?? null,
        volume: row.quote?.volume ?? null,
        amount: row.quote?.amount ?? null,
        fetchedAt: row.fetchedAt,
        quoteTime: row.quoteTime,
        target,
        metrics: metrics.hasPosition ? metrics : null,
      };
    }
  }
  sendJson(res, 200, { rev: deps.store.rev, rows: rowsById, providers: deps.quotes.health() });
}

async function klineRoute(req, res) {
  const q = queryOf(req);
  const symbol = deps.store.getSymbol(q.get("id") ?? "");
  const period = ["day", "week", "month"].includes(q.get("period") ?? "") ? q.get("period") : "day";
  if (!symbol) {
    sendJson(res, 404, { error: "symbol-not-found" });
    return;
  }
  const adapter = await adapterFor(symbol.market);
  const result = await adapter.fetchKline(symbol.code, period);
  sendJson(res, 200, {
    id: symbol.id,
    period,
    candles: result.candles,
    adjust: result.adjust,
    error: result.error,
    errorDetail: result.errorDetail ?? null,
    updatedAt: Date.now(),
  });
}

async function minuteRoute(req, res) {
  const symbol = deps.store.getSymbol(queryOf(req).get("id") ?? "");
  if (!symbol) {
    sendJson(res, 404, { error: "symbol-not-found" });
    return;
  }
  const adapter = await adapterFor(symbol.market);
  const result = await adapter.fetchMinuteDetail(symbol.code);
  sendJson(res, 200, {
    id: symbol.id,
    date: result.date,
    prevClose: result.prevClose,
    points: result.points,
    error: result.error,
    errorDetail: result.errorDetail ?? null,
    updatedAt: Date.now(),
  });
}

async function adapterFor(market) {
  const mod = market === "us" ? "eastmoney" : market === "crypto" ? "okx" : "tencent";
  return import(`./markets/${mod}.mjs`);
}

function exportRoute(_req, res) {
  const payload = buildExportPayload(deps.store.global, Object.fromEntries(deps.store.symbols.map((s) => [s.id, s])));
  const body = Buffer.from(JSON.stringify(payload, null, 1));
  const stamp = new Date().toISOString().slice(0, 10);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-disposition": `attachment; filename="stock-kanban-backup-${stamp}.json"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": String(body.length),
  });
  res.end(body);
}

async function importRoute(body, res) {
  const parsed = parseImportPayload(body.payload);
  if (!parsed.ok) {
    sendJson(res, 422, { error: parsed.error });
    return;
  }
  const result = await deps.store.importAll(parsed.symbols, parsed.settings);
  deps.logger?.info?.(`stock-kanban: import applied imported=${result.imported} removed=${result.removed} rejected=${parsed.rejected}`);
  sendJson(res, 200, {
    rev: result.global.rev,
    imported: result.imported,
    removed: result.removed,
    rejected: parsed.rejected,
  });
}

function healthRoute(_req, res) {
  sendJson(res, 200, {
    driver: deps.store.driverKind,
    symbolCount: deps.store.symbols.length,
    providers: deps.quotes.health(),
  });
}
