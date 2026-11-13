/**
 * 业务数据模型与备份校验 —— 纯函数，无 IO。
 *
 * 存储形状（DSH storage KV 单元 stock_kanban v1，layout single）：
 *   global:  { rev: number, settings: { privacyMode: boolean }, updatedAt: ISO }
 *   symbols: { [id]: SymbolRecord }
 *
 * SymbolRecord：
 *   { id, market, code, quoteCurrency, kind, name,
 *     quantity: number|null, avgCost: number|null,
 *     buyTarget: number|null, sellTarget: number|null,
 *     addedAt: ISO, sort: number }
 */

import { identityConsistent, makeIdentity, MARKETS, normalizeInputCode, normalizeKind } from "./identity.mjs";

const finiteOr = (v, { positive = false, allowInt = false } = {}) => {
  if (v === null || v === undefined || v === "") return null;
  let n = v;
  if (typeof n === "string") {
    const t = n.trim();
    if (t === "") return null;
    n = Number(t);
  }
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined; // undefined = 非法
  if (positive && n <= 0) return undefined;
  if (allowInt && !Number.isSafeInteger(n)) return undefined;
  return n;
};

/** 名称仅作显示：剥离控制字符、限长；非字符串 → null */
export function sanitizeName(raw) {
  if (typeof raw !== "string") return null;
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean ? clean.slice(0, 64) : null;
}

const isoOrNull = (v) => {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/**
 * 规范化一条标的记录（含身份一致性校验）。返回新记录或 null。
 * 身份（id/market/code/quoteCurrency）必须自洽且符合格式；数值字段非法时保留原值则拒绝。
 */
export function normalizeSymbolRecord(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (!identityConsistent(raw)) return null;
  if (!MARKETS.includes(raw.market)) return null;
  const record = {
    id: raw.id,
    market: raw.market,
    code: String(raw.code),
    quoteCurrency: String(raw.quoteCurrency),
    kind: normalizeKind(raw.market, raw.kind, raw.code),
    name: sanitizeName(raw.name) ?? raw.code,
    quantity: null,
    avgCost: null,
    buyTarget: null,
    sellTarget: null,
    addedAt: isoOrNull(raw.addedAt) ?? new Date().toISOString(),
    sort: finiteOr(raw.sort, { allowInt: true }) ?? Date.now(),
  };
  if (record.kind === "index") {
    // 指数：无持仓/目标价语义，业务字段恒空（导入容忍：历史脏数据剥除而非整条拒绝）
    return record;
  }
  const quantity = finiteOr(raw.quantity, { positive: true });
  if (quantity === undefined) return null;
  record.quantity = quantity;
  const avgCost = finiteOr(raw.avgCost, { positive: true });
  if (avgCost === undefined) return null;
  record.avgCost = avgCost;
  for (const key of ["buyTarget", "sellTarget"]) {
    const v = finiteOr(raw[key], { positive: true });
    if (v === undefined) return null;
    record[key] = v;
  }
  return record;
}

/** 默认全局 */
export function defaultGlobal() {
  return { rev: 0, settings: { privacyMode: false }, updatedAt: new Date(0).toISOString() };
}

/** 规范化 global（读取/导入边界）。非法回退默认；rev 必须非负整数 */
export function normalizeGlobal(raw) {
  const base = defaultGlobal();
  if (!raw || typeof raw !== "object") return base;
  const rev = typeof raw.rev === "number" && Number.isSafeInteger(raw.rev) && raw.rev >= 0 ? raw.rev : base.rev;
  const privacyMode = raw.settings?.privacyMode === true;
  return { rev, settings: { privacyMode }, updatedAt: isoOrNull(raw.updatedAt) ?? base.updatedAt };
}

/**
 * 新建标的（添加入口）：从身份 + 展示名构造记录，业务字段留空。
 * 返回 {ok, record} 或 {ok:false, error}。
 */
export function newSymbolRecord(market, code, name, { kind, now = new Date() } = {}) {
  const normalized = normalizeInputCode(market, code);
  if (!normalized) return { ok: false, error: "invalid-identity" };
  const identity = makeIdentity(market, normalized);
  if (!identity) return { ok: false, error: "invalid-identity" };
  return {
    ok: true,
    record: normalizeSymbolRecord({
      ...identity,
      kind: normalizeKind(market, kind, identity.code),
      name: sanitizeName(name) ?? identity.code,
      addedAt: now.toISOString(),
      sort: now.getTime(),
    }),
  };
}

/**
 * 对既有记录应用局部更新（持仓/目标价/名称）。返回 {ok, record} 或 {ok:false, errors}。
 * patch 中显式 null 表示清除该字段；undefined 表示不修改。
 */
export function patchSymbolRecord(record, patch) {
  if (!record || typeof record !== "object") return { ok: false, errors: ["record-missing"] };
  if (!patch || typeof patch !== "object") return { ok: false, errors: ["patch-missing"] };
  const next = { ...record };
  const errors = [];
  if (next.kind === "index" && ["quantity", "avgCost", "buyTarget", "sellTarget"].some((k) => k in patch && patch[k] !== null)) {
    // 指数不支持持仓/目标价（2026-11-13）：显式拒绝而非静默剥除——直连添加与表单更新同口径
    return { ok: false, errors: ["index-no-position"] };
  }
  const applyNumber = (key, { positive = true } = {}) => {
    if (!(key in patch)) return;
    const v = patch[key];
    if (v === null) { next[key] = null; return; }
    const n = finiteOr(v, { positive });
    if (n === undefined) { errors.push(`${key}-invalid`); return; }
    next[key] = n;
  };
  applyNumber("quantity");
  applyNumber("avgCost");
  applyNumber("buyTarget");
  applyNumber("sellTarget");
  if ("name" in patch) {
    const n = sanitizeName(patch.name);
    if (n) next.name = n;
  }
  if (errors.length) return { ok: false, errors };
  const checked = normalizeSymbolRecord(next);
  if (!checked) return { ok: false, errors: ["record-invalid"] };
  return { ok: true, record: checked };
}

/**
 * 展示排序比较器：sort 升序 → addedAt 升序 → id 升序（确定性兜底）。
 * 列表渲染与「全序合并」统一走它；sort 重编号后的组内天然 0..n-1 有序，
 * 未重排过的组以添加时间为序（sort 初值 = 添加时刻），新添加的标的排在组尾。
 */
export function compareBySort(a, b) {
  if (a.sort !== b.sort) return a.sort < b.sort ? -1 : 1;
  const ta = Date.parse(a.addedAt) || 0;
  const tb = Date.parse(b.addedAt) || 0;
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * 校验 orderedIds 是 group（同市场分组记录数组）全量 id 的一个排列，并按新顺序
 * 把 sort 重编号为 0..n-1。返回 {ok, records, changed} 或 {ok:false, error}。
 * - changed 按「排列是否变化」判定（对照 compareBySort 的当前展示序）：排列未变 →
 *   原记录原样返回，调用方跳过落盘与 rev 推进（幂等，拖回原位零副作用）；
 * - 排列变化 → 全组新记录（sort 重编号），整组一次写。
 * 纯函数，无 IO；持久化语义见 store.reorderSymbols。
 */
export function reorderSorts(group, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "invalid-order" };
  }
  const byId = new Map(group.map((s) => [s.id, s]));
  if (
    orderedIds.length !== group.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !byId.has(id))
  ) {
    return { ok: false, error: "invalid-order" };
  }
  const currentOrder = [...group].sort(compareBySort).map((s) => s.id);
  const changed = orderedIds.some((id, index) => id !== currentOrder[index]);
  if (!changed) return { ok: true, records: [...group], changed: false };
  const records = orderedIds.map((id, index) => ({ ...byId.get(id), sort: index }));
  return { ok: true, records, changed: true };
}

/* ------------------------------------------------------------------ 备份 */

export const BACKUP_KIND = "stock-kanban-backup";
export const BACKUP_SCHEMA_VERSION = 1;

/** 构造导出备份（含个人持仓信息，调用方需提示用户） */
export function buildExportPayload(global, symbolsById) {
  return {
    kind: BACKUP_KIND,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { privacyMode: global.settings.privacyMode === true },
    symbols: Object.values(symbolsById).map((s) => ({ ...s })),
  };
}

/**
 * 解析并校验导入备份。结构/字段/数值/身份逐项校验，任何一条标的非法 → 计入 rejected（不中断整体），
 * 但结构级错误（kind/schemaVersion/非对象/settings/symbols 不是数组）→ 整体拒绝。
 * @returns {{ok: true, settings: {privacyMode: boolean}, symbols: SymbolRecord[], rejected: number}
 *           |{ok: false, error: string}}
 */
export function parseImportPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "not-an-object" };
  if (raw.kind !== BACKUP_KIND) return { ok: false, error: "wrong-kind" };
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) return { ok: false, error: "unsupported-schema-version" };
  if (!Array.isArray(raw.symbols)) return { ok: false, error: "symbols-not-array" };
  const settings = { privacyMode: raw.settings?.privacyMode === true };
  const symbols = [];
  let rejected = 0;
  const seen = new Set();
  for (const item of raw.symbols) {
    const record = normalizeSymbolRecord(item);
    if (!record || seen.has(record.id)) {
      rejected += 1;
      continue;
    }
    seen.add(record.id);
    symbols.push(record);
  }
  return { ok: true, settings, symbols, rejected };
}
