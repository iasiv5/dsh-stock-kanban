/**
 * dsh-stock-kanban — host 端入口。
 *
 * 服务依赖：webServer（路由）、storage（实例级持久化；缺失时回退文件驱动）；
 * connection 经 ctx.get 非抛式查询（官方信任检查，缺席 fail-closed 403）。
 * 无任何常驻定时器：行情缓存惰性 TTL，宿主空闲时零后台活动（需求 8.2）。
 *
 * 插件配置（cordis.patch.yml 行内 config，零依赖手写校验，2026-11-13 P1-6）：
 *   diagLevel: 'off' | 'errors'（默认；只留 provider.fail / route.status / store.conflict 等失败行）
 *             | 'full'（开发调试，全部事件）
 *   diagDir:  诊断 JSONL 目录（默认 ~/.dsh/stock-kanban）
 *   diagLogMaxBytes: 单文件上限（默认 1MiB，超限轮转 .1；钳位 64KiB–16MiB）
 */

import { Store } from "./store.mjs";
import { createQuoteService } from "./quotes.mjs";
import { createTrustGuard } from "./access.mjs";
import { createRoutes, PREFIX } from "./routes.mjs";
import { DIAG_LEVELS, createDiagLogger, defaultDiagDir } from "./diag.mjs";

export const name = "stock-kanban";
export const inject = ["webServer", "storage"];

/** 配置钳位与缺省（零依赖；非法值回落默认并 warn 一行） */
function resolveConfig(raw, logger) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const diagLevel = DIAG_LEVELS.includes(cfg.diagLevel) ? cfg.diagLevel : "errors";
  if (cfg.diagLevel != null && !DIAG_LEVELS.includes(cfg.diagLevel)) {
    logger?.warn?.("stock-kanban: 非法 diagLevel（" + String(cfg.diagLevel) + "），回落 errors");
  }
  const diagDir = typeof cfg.diagDir === "string" && cfg.diagDir.trim() !== "" ? cfg.diagDir.trim() : defaultDiagDir();
  let diagLogMaxBytes = 1048576;
  if (Number.isFinite(cfg.diagLogMaxBytes)) {
    diagLogMaxBytes = Math.min(Math.max(Math.floor(cfg.diagLogMaxBytes), 65536), 16777216);
  }
  return { diagLevel, diagDir, diagLogMaxBytes };
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} [config] 插件配置（cordis.patch.yml 行内 config；未配置为空对象）
 */
export async function apply(ctx, config = {}) {
  const logger = {
    info: (...args) => { try { ctx.logger?.info?.(...args); } catch { /* logger 不可用时静默 */ } },
    warn: (...args) => { try { ctx.logger?.warn?.(...args); } catch { /* 同上 */ } },
  };

  const cfg = resolveConfig(config, logger);
  const diag = createDiagLogger({ dir: cfg.diagDir, level: cfg.diagLevel, maxBytes: cfg.diagLogMaxBytes });

  const store = new Store(ctx, logger);
  await store.init();
  logger.info("stock-kanban: store ready (driver=" + store.driverKind + ", rev=" + store.rev + ", symbols=" + store.symbols.length + ")");
  diag.append({ ev: "host.ready", driver: store.driverKind, rev: store.rev, symbols: store.symbols.length, diagLevel: cfg.diagLevel }); // full 档才落盘

  const quotes = createQuoteService({ diag: (row) => diag.append(row) });

  let disposeRoutes = null;
  try {
    const webServer = ctx.webServer;
    const trust = createTrustGuard(ctx, logger); // 全路由官方信任检查（DNS rebinding 免疫）
    const disposers = createRoutes({ store, quotes, logger, trust, diag }).map((route) =>
      webServer.register({ kind: "exact", path: route.path, handler: route.handler }));
    disposeRoutes = () => { for (const d of disposers) { try { d(); } catch { /* 幂等 */ } } };
  } catch (e) {
    logger.warn("stock-kanban: route registration failed (" + (e?.message ?? e) + ")");
    await store.close();
    return;
  }

  ctx.effect(() => async () => {
    disposeRoutes?.();
    await store.close();
  }, "stock-kanban: routes + store lifecycle");
}

export { PREFIX };
