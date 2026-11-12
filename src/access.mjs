/**
 * 请求访问控制（模式参考 dsh-quota-watch、dsh-m host.ts 守卫式委派，MIT）。
 *
 * - 全部路由：官方信任检查 connection.requestRejection（Connection 指纹围栏，
 *   DNS rebinding 免疫）；服务缺席/抛错一律 fail-closed 403（warn 一次）。
 * - 写路由：官方检查之外再强制同源（sec-fetch-site + Origin/Host 双校验），纵深防御。
 */

/** 官方信任检查的守卫式委派：返回 401 | 403 | undefined（undefined = 放行） */
export function createTrustGuard(ctx, logger = console) {
  let warned = false;
  const warnOnce = (err) => {
    if (warned) return;
    warned = true;
    logger?.warn?.("stock-kanban: 官方 connection.requestRejection 不可用，全路由 fail-closed 403");
    if (err) logger?.warn?.(err);
  };
  return (req) => {
    try {
      // 非抛式服务查询（cordis Local 对未注入属性的直接读取会抛，不得用作探测）。
      const connection = ctx?.get?.("connection");
      const reject = connection?.requestRejection;
      if (typeof reject !== "function") {
        warnOnce(undefined);
        return 403;
      }
      return reject.call(connection, { headers: req.headers }) ?? undefined;
    } catch (err) {
      warnOnce(err);
      return 403;
    }
  };
}

export function isSameOriginRequest(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (origin === undefined || origin === null || origin === "") {
    const site = req.headers["sec-fetch-site"];
    return site === undefined || site === "same-origin" || site === "same-site" || site === "none";
  }
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
  } catch {
    return false;
  }
}
