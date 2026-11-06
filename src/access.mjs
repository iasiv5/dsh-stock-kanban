/**
 * 请求访问控制（模式参考 dsh-quota-watch / Bob-Bo1 stock-watch，MIT）。
 *
 * - 读路由：同 DSH 源即可（外层 ingress 已有认证墙；与其它插件路由一致）；
 * - 写路由：强制同源（sec-fetch-site + Origin/Host 双校验），防跨站驱动变更。
 */

function isIPv4Loopback(address) {
  const parts = address.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

export function isLoopbackRequest(req) {
  const remote = req.socket?.remoteAddress ?? "";
  const normalized = String(remote).toLowerCase().replace(/^::ffff:/, "");
  const loopback = normalized === "::1" || isIPv4Loopback(normalized);
  if (!loopback) return false;
  const host = req.headers?.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    const hostname = new URL(`http://${host}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "[::1]" || isIPv4Loopback(hostname) || hostname === "127.0.0.1";
  } catch {
    return false;
  }
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
