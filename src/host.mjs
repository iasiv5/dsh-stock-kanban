/**
 * dsh-stock-kanban — host 端入口。
 *
 * 注入服务：webServer（路由）、storage（实例级持久化；缺失时回退文件驱动）。
 * 无任何常驻定时器：行情缓存惰性 TTL，宿主空闲时零后台活动（需求 8.2）。
 */

import { Store } from "./store.mjs";
import { createQuoteService } from "./quotes.mjs";
import { createRoutes, PREFIX } from "./routes.mjs";

export const name = "stock-kanban";
export const inject = ["webServer", "storage"];

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export async function apply(ctx) {
  const logger = {
    info: (...args) => { try { ctx.logger?.info?.(...args); } catch { /* logger 不可用时静默 */ } },
    warn: (...args) => { try { ctx.logger?.warn?.(...args); } catch { /* 同上 */ } },
  };

  const store = new Store(ctx, logger);
  await store.init();
  logger.info(`stock-kanban: store ready (driver=${store.driverKind}, rev=${store.rev}, symbols=${store.symbols.length})`);

  const quotes = createQuoteService({});

  let disposeRoutes = null;
  try {
    const webServer = ctx.webServer;
    const disposers = createRoutes({ store, quotes, logger }).map((route) =>
      webServer.register({ kind: "exact", path: route.path, handler: route.handler }));
    disposeRoutes = () => { for (const d of disposers) { try { d(); } catch { /* 幂等 */ } } };
  } catch (e) {
    logger.warn(`stock-kanban: route registration failed (${e?.message ?? e})`);
    await store.close();
    return;
  }

  ctx.effect(() => async () => {
    disposeRoutes?.();
    await store.close();
  }, "stock-kanban: routes + store lifecycle");
}

export { PREFIX };
