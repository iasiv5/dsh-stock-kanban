/**
 * 业务数据存储：DSH storage hub KV 驱动（首选）+ 原子文件驱动（回退），单一写链串行化。
 *
 * - DSH 0.2.2-rc1 web profile 内置 `storage` + `storage-json` 后端（json），
 *   单元落盘 ~/.dsh/storages/stock_kanban.json（原子 temp+fsync+rename，崩溃安全）→ 实例级共享，
 *   同一 DSH 的所有浏览器看到同一份数据。
 * - KV 层不串行化并发写（见 dsh-storage 类型注释），本模块用 promise 链串行全部变更，
 *   并在每次变更后推进 global.rev（多页面一致性 CAS 的依据）。
 * - desktop profile 若缺 storage 服务 → 回退文件驱动（同接口），落 ~/.dsh/stock-kanban/data.json。
 */

import { mkdir, readFile, rename, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { defaultGlobal, normalizeGlobal, normalizeSymbolRecord } from "./model.mjs";

const UNIT_NAME = "stock_kanban";
const UNIT_VERSION = 1;
const TABLE = "symbols";

/* ---------------------------------------------------------------- 文件驱动 */

import { writeFile } from "node:fs/promises";

async function writeDocFile(path, doc) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, JSON.stringify({ symbols: doc.tables[TABLE] ?? {}, global: doc.global ?? null }, null, 1), "utf8");
  await rename(tmp, path);
}

export function createFileDriver(filePath) {
  // 测试/部署可覆盖：DSH_STOCK_KANBAN_FILE（模式对齐 Bob-Bo1 的 DSH_STOCK_HOLDINGS）
  const path = filePath
    ?? (typeof process.env.DSH_STOCK_KANBAN_FILE === "string" && process.env.DSH_STOCK_KANBAN_FILE.trim() !== ""
      ? process.env.DSH_STOCK_KANBAN_FILE.trim()
      : join(homedir(), ".dsh", "stock-kanban", "data.json"));
  return {
    kind: "file",
    path,
    async load() {
      try {
        const text = await readFile(path, "utf8");
        const doc = JSON.parse(text);
        return {
          tables: doc && typeof doc === "object" ? { [TABLE]: doc.symbols && typeof doc.symbols === "object" ? doc.symbols : {} } : { [TABLE]: {} },
          global: doc?.global ?? null,
        };
      } catch (e) {
        if (e?.code === "ENOENT") return { tables: { [TABLE]: {} }, global: null };
        if (e instanceof SyntaxError) {
          // 介质损坏：把原字节隔离保存（可人工恢复），再以空态继续 —— 不静默覆盖、不永久锁死写入
          const quarantinePath = `${path}.corrupt-${Date.now()}`;
          try {
            await rename(path, quarantinePath);
          } catch {
            /* 无法隔离时保持抛错路径 */
          }
          return { tables: { [TABLE]: {} }, global: null };
        }
        throw e;
      }
    },
    async putRecord(table, key, value) {
      const doc = await this.load();
      doc.tables[table] = doc.tables[table] ?? {};
      doc.tables[table][key] = value;
      await writeDocFile(path, doc);
    },
    async deleteRecord(table, key) {
      const doc = await this.load();
      if (doc.tables[table]) delete doc.tables[table][key];
      await writeDocFile(path, doc);
    },
    async setGlobal(value) {
      const doc = await this.load();
      doc.global = value;
      await writeDocFile(path, doc);
    },
    async close() {},
  };
}

/* ---------------------------------------------------------------- KV 驱动包装 */

function createKvDriver(unit) {
  return {
    kind: "dsh-storage",
    async load() {
      const snapshot = await unit.loadAll();
      return {
        tables: snapshot.tables && typeof snapshot.tables === "object" ? snapshot.tables : { [TABLE]: {} },
        global: snapshot.global ?? null,
      };
    },
    async putRecord(table, key, value) {
      await unit.putRecord(table, key, value);
    },
    async deleteRecord(table, key) {
      await unit.deleteRecord(table, key);
    },
    async setGlobal(value) {
      await unit.setGlobal(value);
    },
    async close() {
      await unit.close();
    },
  };
}

/* ---------------------------------------------------------------- Store */

export class Store {
  /** @type {Map<string, object>} 标的表（权威内存态） */
  #symbols = new Map();
  #global = defaultGlobal();
  #driver = null;
  #chain = Promise.resolve();
  #ready = null;

  /**
   * @param {object} ctx cordis 上下文（可空；空则直接文件驱动）
   * @param {object} log logger（ctx.logger 兼容，可空）
   */
  constructor(ctx, log) {
    this.#log = log;
    this.#ctx = ctx;
  }

  #log;
  #ctx;

  get driverKind() {
    return this.#driver?.kind ?? "uninitialized";
  }

  get rev() {
    return this.#global.rev;
  }

  get global() {
    return this.#global;
  }

  get symbols() {
    return [...this.#symbols.values()];
  }

  getSymbol(id) {
    return this.#symbols.get(id) ?? null;
  }

  /** 初始化：优先 DSH storage KV，缺服务/后端时回退文件驱动 */
  async init() {
    if (this.#ready) return this.#ready;
    this.#ready = (async () => {
      const driver = await this.#resolveDriver();
      this.#driver = driver;
      let snapshot;
      try {
        snapshot = await driver.load();
      } catch (e) {
        // 版本不符/介质损坏：不覆盖已有数据，回退到空态并记录（用户数据安全优先）
        this.#log?.warn?.(`stock-kanban: storage load failed (${e?.message ?? e}); using empty state`);
        snapshot = { tables: { [TABLE]: {} }, global: null };
      }
      const table = snapshot.tables?.[TABLE];
      if (table && typeof table === "object") {
        for (const [id, record] of Object.entries(table)) {
          const clean = normalizeSymbolRecord(record);
          if (clean && clean.id === id) this.#symbols.set(id, clean);
        }
      }
      this.#global = normalizeGlobal(snapshot.global);
      return this;
    })();
    return this.#ready;
  }

  async #resolveDriver() {
    try {
      const storage = this.#ctx?.storage;
      const backend = storage?.backend?.get?.("json");
      const unit = await backend?.kv?.open({
        name: UNIT_NAME,
        version: UNIT_VERSION,
        tables: [TABLE],
        hasGlobal: true,
        layout: "single",
      });
      if (unit) return createKvDriver(unit);
    } catch (e) {
      this.#log?.warn?.(`stock-kanban: DSH storage unavailable (${e?.message ?? e}); falling back to file driver`);
    }
    return createFileDriver();
  }

  /** 串行化变更：所有 mutation 排队执行，任一步失败不推进 rev */
  #enqueue(fn) {
    const run = this.#chain.then(() => fn());
    this.#chain = run.then(() => undefined, () => undefined);
    return run;
  }

  async #persistGlobalLocked() {
    await this.#driver.setGlobal(this.#global);
  }

  /** 加入标的（已校验记录）。重复 id 报错。 */
  addSymbol(record) {
    return this.#enqueue(async () => {
      const clean = normalizeSymbolRecord(record);
      if (!clean) throw new Error("invalid-record");
      if (this.#symbols.has(clean.id)) throw new Error("duplicate");
      this.#symbols.set(clean.id, clean);
      this.#bumpRev();
      try {
        await this.#driver.putRecord(TABLE, clean.id, clean);
        await this.#persistGlobalLocked();
      } catch (e) {
        this.#symbols.delete(clean.id);
        this.#rollbackRev();
        throw e;
      }
      return { global: this.#global, symbol: clean };
    });
  }

  /** 局部更新标的。不存在报错。 */
  updateSymbol(id, patch) {
    return this.#enqueue(async () => {
      const current = this.#symbols.get(id);
      if (!current) throw new Error("not-found");
      const { patchSymbolRecord } = await import("./model.mjs");
      const applied = patchSymbolRecord(current, patch ?? {});
      if (!applied.ok) {
        const e = new Error(applied.errors.join(","));
        e.code = "invalid-patch";
        throw e;
      }
      const prev = current;
      this.#symbols.set(id, applied.record);
      this.#bumpRev();
      try {
        await this.#driver.putRecord(TABLE, id, applied.record);
        await this.#persistGlobalLocked();
      } catch (e) {
        this.#symbols.set(id, prev);
        this.#rollbackRev();
        throw e;
      }
      return { global: this.#global, symbol: applied.record };
    });
  }

  /**
   * 批量重排某市场分组的标的（拖拽排序持久化）。orderedIds 须为该组全量 id 的一个排列，
   * 组内 sort 按新顺序重编号 0..n-1。整组一次串行写 + 单次 rev 推进（多页面一致性 CAS 一次生效）；
   * 任一记录落盘失败 → 整组回滚（含 rev），不留半套顺序。
   */
  reorderSymbols(market, orderedIds) {
    return this.#enqueue(async () => {
      const group = [...this.#symbols.values()].filter((s) => s.market === market);
      const { reorderSorts } = await import("./model.mjs");
      const applied = reorderSorts(group, orderedIds);
      if (!applied.ok) {
        const e = new Error(applied.error);
        e.code = "invalid-order";
        throw e;
      }
      if (!applied.changed) {
        return { global: this.#global, changed: false, count: 0 };
      }
      const prevById = new Map(applied.records.map((rec) => [rec.id, this.#symbols.get(rec.id)]));
      for (const rec of applied.records) this.#symbols.set(rec.id, rec);
      this.#bumpRev();
      try {
        for (const rec of applied.records) {
          if (rec !== prevById.get(rec.id)) await this.#driver.putRecord(TABLE, rec.id, rec);
        }
        await this.#persistGlobalLocked();
      } catch (e) {
        for (const [id, prev] of prevById) this.#symbols.set(id, prev);
        this.#rollbackRev();
        throw e;
      }
      return { global: this.#global, changed: true, count: applied.records.length };
    });
  }

  /** 删除标的。不存在报错。 */
  removeSymbol(id) {
    return this.#enqueue(async () => {
      const prev = this.#symbols.get(id);
      if (!prev) throw new Error("not-found");
      this.#symbols.delete(id);
      this.#bumpRev();
      try {
        await this.#driver.deleteRecord(TABLE, id);
        await this.#persistGlobalLocked();
      } catch (e) {
        this.#symbols.set(id, prev);
        this.#rollbackRev();
        throw e;
      }
      return { global: this.#global };
    });
  }

  /** 更新设置（如隐私开关） */
  setSettings(patch) {
    return this.#enqueue(async () => {
      const prevGlobal = this.#global;
      const prevSettings = { ...this.#global.settings };
      this.#global = normalizeGlobal({
        ...prevGlobal,
        settings: { ...prevSettings, ...(patch ?? {}) },
        updatedAt: new Date().toISOString(),
      });
      this.#global.rev = prevGlobal.rev + 1;
      try {
        await this.#persistGlobalLocked();
      } catch (e) {
        this.#global = prevGlobal;
        throw e;
      }
      return { global: this.#global };
    });
  }

  /** 备份导入（覆盖语义）。返回统计。 */
  importAll(symbols, settings) {
    return this.#enqueue(async () => {
      const prevTable = new Map(this.#symbols);
      const prevGlobal = this.#global;
      const nextGlobal = normalizeGlobal({
        ...prevGlobal,
        settings: { privacyMode: settings?.privacyMode === true },
        updatedAt: new Date().toISOString(),
      });
      nextGlobal.rev = prevGlobal.rev + 1;
      const cleaned = [];
      for (const raw of symbols) {
        const clean = normalizeSymbolRecord(raw);
        if (clean) cleaned.push(clean);
      }
      // 覆盖：先删多余，再写全部（单文件介质每步原子）
      const nextIds = new Set(cleaned.map((s) => s.id));
      const removed = [...prevTable.keys()].filter((id) => !nextIds.has(id));
      this.#symbols = new Map(cleaned.map((s) => [s.id, s]));
      this.#global = nextGlobal;
      try {
        for (const id of removed) await this.#driver.deleteRecord(TABLE, id);
        for (const s of cleaned) await this.#driver.putRecord(TABLE, s.id, s);
        await this.#persistGlobalLocked();
      } catch (e) {
        this.#symbols = prevTable;
        this.#global = prevGlobal;
        throw e;
      }
      return { global: this.#global, imported: cleaned.length, removed: removed.length };
    });
  }

  #bumpRev() {
    this.#global = {
      ...this.#global,
      rev: this.#global.rev + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  #rollbackRev() {
    this.#global = { ...this.#global, rev: Math.max(0, this.#global.rev - 1) };
  }

  async close() {
    await this.#chain.catch(() => {});
    await this.#driver?.close?.();
  }
}
