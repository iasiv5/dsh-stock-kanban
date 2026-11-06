/**
 * 行情服务：提供方路由 + TTL 缓存 + 在途合并 + 失败退避。
 *
 * - 同一批 codes 在 TTL 内只打一次上游（多页面/多视图轮询在此合并）；
 * - 提供方连续失败进入指数退避（30s 起、翻倍、封顶 5 分钟），退避期内直接返回 stale 缓存或错误态，
 *   不打上游（限流友好）；
 * - 无任何常驻定时器：全部惰性触发，宿主空闲时零后台活动。
 */

import { handles as tencentHandles, fetchBatchSnapshots as tencentBatch, quoteTimeOf as tencentQuoteTime } from "./markets/tencent.mjs";
import { handles as emHandles, fetchBatchSnapshots as emBatch, fetchQuote as emQuote } from "./markets/eastmoney.mjs";
import { handles as okxHandles, fetchBatchSnapshots as okxBatch, fetchQuote as okxQuote } from "./markets/okx.mjs";

const DEFAULT_TTL_MS = 10 * 1000;
const BACKOFF_BASE_MS = 30 * 1000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

export function createQuoteService({ ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
  const providers = [
    { name: "tencent", handles: tencentHandles, fetch: tencentBatch, quoteTime: tencentQuoteTime },
    { name: "eastmoney", handles: emHandles, fetch: emBatch, quoteTime: null },
    { name: "okx", handles: okxHandles, fetch: okxBatch, quoteTime: null },
  ];

  /** provider 名 → { cache: Map(batchKey → {at, rows: Map}), inFlight: Map, failures: n, backoffUntil: t } */
  const state = new Map(providers.map((p) => [p.name, { cache: new Map(), inFlight: new Map(), failures: 0, backoffUntil: 0 }]));

  function backoffMs(s) {
    return s.failures === 0 ? 0 : Math.min(BACKOFF_BASE_MS * 2 ** (s.failures - 1), BACKOFF_MAX_MS);
  }

  /**
   * 单提供方批量取数（带缓存/在途合并/退避）。
   * @returns Promise<Map(code→quote)> 失败时抛错（调用方逐 provider 兜底）
   */
  async function fetchProvider(provider, codes) {
    const s = state.get(provider.name);
    const key = [...codes].sort().join(",");
    const cached = s.cache.get(key);
    const t = now();
    if (cached && t - cached.at < ttlMs) return cached.rows;
    if (t < s.backoffUntil) {
      if (cached) return cached.rows; // 退避期内回退陈旧缓存（调用方按 fetchedAt 标 stale）
      throw new Error(`backoff-${provider.name}`);
    }
    const inflight = s.inFlight.get(key);
    if (inflight) return inflight;
    const p = (async () => {
      try {
        const rows = await provider.fetch(codes);
        s.failures = 0;
        s.backoffUntil = 0;
        s.cache.set(key, { at: now(), rows });
        return rows;
      } catch (e) {
        s.failures += 1;
        s.backoffUntil = now() + backoffMs(s);
        throw e;
      } finally {
        s.inFlight.delete(key);
      }
    })();
    s.inFlight.set(key, p);
    return p;
  }

  /**
   * 行情快照（跨提供方）。返回 Map(id → row)。
   * row: { id, identity, status:'ok'|'error', quote?, fetchedAt, quoteTime?, error? }
   * 每个标的独立判错：提供方整体失败只影响该提供方下的标的。
   */
  async function getQuotes(identities) {
    const byProvider = new Map();
    for (const identity of identities) {
      const provider = providers.find((p) => p.handles(identity.market));
      if (!provider) continue;
      if (!byProvider.has(provider)) byProvider.set(provider, []);
      byProvider.get(provider).push(identity);
    }
    const out = new Map();
    await Promise.all([...byProvider.entries()].map(async ([provider, list]) => {
      const codes = list.map((i) => i.code);
      let rows = null;
      let error = null;
      try {
        rows = await fetchProvider(provider, codes);
      } catch (e) {
        error = String(e?.message ?? e);
      }
      const fetchedAt = now();
      for (const identity of list) {
        if (rows) {
          const quote = rows.get(identity.code) ?? rows.get(identity.code.toUpperCase()) ?? null;
          if (quote) {
            const quoteTime = provider.quoteTime ? provider.quoteTime(quote) : (quote.quoteTimeMs ?? null);
            out.set(identity.id, { id: identity.id, identity, status: "ok", quote, fetchedAt, quoteTime });
            continue;
          }
        }
        out.set(identity.id, { id: identity.id, identity, status: "error", quote: null, fetchedAt, quoteTime: null, error: error ?? "no-data" });
      }
    }));
    return out;
  }

  /**
   * 详情页完整快照（high/low/open/prevClose 等全字段；每标的独立请求）。
   * 返回与 getQuotes 相同形状的 Map(id → row)。
   */
  async function getQuoteFull(identities) {
    const out = new Map();
    await Promise.all(identities.map(async (identity) => {
      const fetchedAt = now();
      try {
        let quote = null;
        let quoteTime = null;
        if (identity.market === "cn" || identity.market === "hk") {
          const rows = await tencentBatch([identity.code]);
          quote = rows.get(identity.code) ?? null;
          if (quote) quoteTime = tencentQuoteTime(quote);
        } else if (identity.market === "us") {
          quote = await emQuote(identity.code);
        } else if (identity.market === "crypto") {
          quote = await okxQuote(identity.code);
          if (quote) quoteTime = quote.quoteTimeMs ?? null;
        }
        if (quote && quote.price > 0) {
          out.set(identity.id, { id: identity.id, identity, status: "ok", quote, fetchedAt, quoteTime });
        } else {
          out.set(identity.id, { id: identity.id, identity, status: "error", quote: null, fetchedAt, quoteTime: null, error: "no-data" });
        }
      } catch (e) {
        out.set(identity.id, { id: identity.id, identity, status: "error", quote: null, fetchedAt, quoteTime: null, error: String(e?.message ?? e) });
      }
    }));
    return out;
  }

  /** 诊断：提供方失败计数与退避余量（路由 /health 用，避免输出业务数据） */
  function health() {
    return Object.fromEntries(providers.map((p) => {
      const s = state.get(p.name);
      return [p.name, { failures: s.failures, backoffRemainMs: Math.max(0, s.backoffUntil - now()) }];
    }));
  }

  return { getQuotes, getQuoteFull, health };
}
