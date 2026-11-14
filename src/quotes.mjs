/**
 * 行情服务：市场分链路由 + TTL 缓存 + 在途合并 + 失败退避 + 失败诊断。
 *
 * - 同一批 codes 在 TTL 内只打一次上游（多页面/多视图轮询在此合并）；
 * - 每市场一条有序提供方链（2026-11-13，P0-1 多源降级；链形态参考 dsh-market-lens，MIT，见 NOTICE；
 *   2026-11-14 §12.44 cn 链增新浪第三源）：
 *     cn: 腾讯 → 东方财富 → 新浪（hq.sinajs.cn，GBK+Referer，f8=股口径）；hk: 腾讯 → 东方财富；
 *     us: 东方财富 → Yahoo chart（EM push2 在部分网络不可达时的兜底，顺带补美股行情时间戳）；crypto: OKX（单源）。
 *   链内逐源补位：主源失败或漏行（EM 会静默丢弃无效 secid）时，未取到的标的交下一源；
 *   全链失败 → 该批标的标 error；
 * - 退避是提供方级的并天然覆盖整链：任一源连续失败进入指数退避（30s 起翻倍、封顶 5 分钟）后，
 *   退避期内该源直接回退陈旧缓存或快速失败，不再打上游——不会像无退避链那样每拍重试死源
 *   （这是对参考实现的修正：无退避的链在死源上会随轮询频率反复打上游）；
 * - 无任何常驻定时器：全部惰性触发，宿主空闲时零后台活动（需求 8.2 不变）；
 * - 诊断钩子（可选 diag 回调，P1-6）：仅真实上游尝试失败时发 provider.fail
 *   （退避快速失败不发，死源静默期零日志噪音）。
 */

import { handles as tencentHandles, fetchBatchSnapshots as tencentBatch, quoteTimeOf as tencentQuoteTime } from "./markets/tencent.mjs";
import { handles as emHandles, fetchBatchSnapshots as emBatch, fetchQuote as emQuote } from "./markets/eastmoney.mjs";
import { handles as yahooHandles, fetchBatchSnapshots as yahooBatch } from "./markets/yahoo.mjs";
import { handles as tencentUsHandles, fetchBatchSnapshots as tencentUsBatch, quoteTimeOf as tencentUsQuoteTime } from "./markets/tencent-us.mjs";
import { handles as okxHandles, fetchBatchSnapshots as okxBatch, fetchQuote as okxQuote } from "./markets/okx.mjs";
import { handles as sinaHandles, fetchBatchSnapshots as sinaBatch } from "./markets/sina.mjs";

const DEFAULT_TTL_MS = 10 * 1000;
const BACKOFF_BASE_MS = 30 * 1000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

/** 市场提供方链（顺序即优先级；handles 不符的项跳过） */
const CHAINS = {
  cn: ["tencent", "eastmoney", "sina"], // 2026-11-14 §12.44：新浪第三源（cn-only，含北交所 920 号段实测覆盖）
  hk: ["tencent", "eastmoney"],
  us: ["eastmoney", "tencent-us", "yahoo"], // 2026-11-13：东方财富 → 腾讯美股 → Yahoo（Yahoo 429 时仍有备源）
  crypto: ["okx"],
};

export function createQuoteService({ ttlMs = DEFAULT_TTL_MS, now = () => Date.now(), diag } = {}) {
  const providers = [
    { name: "tencent", handles: tencentHandles, fetch: tencentBatch, quoteTime: tencentQuoteTime },
    { name: "eastmoney", handles: emHandles, fetch: emBatch, quoteTime: null },
    { name: "tencent-us", handles: tencentUsHandles, fetch: tencentUsBatch, quoteTime: tencentUsQuoteTime },
    { name: "yahoo", handles: yahooHandles, fetch: yahooBatch, quoteTime: null },
    { name: "okx", handles: okxHandles, fetch: okxBatch, quoteTime: null },
    { name: "sina", handles: sinaHandles, fetch: sinaBatch, quoteTime: null }, // quoteTimeMs 已在 parser 内按东八区解析
  ];
  const byName = new Map(providers.map((p) => [p.name, p]));

  /** provider 名 → { cache: Map(batchKey → {at, rows: Map}), inFlight: Map, failures: n, backoffUntil: t } */
  const state = new Map(providers.map((p) => [p.name, { cache: new Map(), inFlight: new Map(), failures: 0, backoffUntil: 0 }]));

  function backoffMs(s) {
    return s.failures === 0 ? 0 : Math.min(BACKOFF_BASE_MS * 2 ** (s.failures - 1), BACKOFF_MAX_MS);
  }

  /**
   * 单提供方批量取数（带缓存/在途合并/退避）。
   * @returns Promise<Map(code → quote)> 失败时抛错（调用方按链交下一源）
   */
  async function fetchProvider(provider, codes) {
    const s = state.get(provider.name);
    const key = [...codes].sort().join(",");
    const cached = s.cache.get(key);
    const t = now();
    if (cached && t - cached.at < ttlMs) return cached.rows;
    if (t < s.backoffUntil) {
      if (cached) return cached.rows; // 退避期内回退陈旧缓存（行内 quoteTime 保持旧值，客户端按其判 stale）
      throw new Error("backoff-" + provider.name);
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
        const backoff = backoffMs(s);
        s.backoffUntil = now() + backoff;
        try {
          diag?.({ ev: "provider.fail", provider: provider.name, error: String(e?.message ?? e).slice(0, 120), failures: s.failures, backoffMs: backoff });
        } catch {
          /* 诊断不得影响行情 */
        }
        throw e;
      } finally {
        s.inFlight.delete(key);
      }
    })();
    s.inFlight.set(key, p);
    return p;
  }

  /**
   * 行情快照（跨提供方，按市场链逐源补位）。返回 Map(id → row)。
   * row: { id, identity, status:'ok'|'error', quote?, fetchedAt, quoteTime?, error? }
   * 每个标的独立判错：链内未被任何源服务到才标 error。
   */
  async function getQuotes(identities) {
    const byMarket = new Map();
    for (const identity of identities) {
      if (!CHAINS[identity.market]) continue;
      const group = byMarket.get(identity.market) ?? [];
      group.push(identity);
      byMarket.set(identity.market, group);
    }
    const out = new Map();
    await Promise.all([...byMarket.entries()].map(async ([market, list]) => {
      let pending = list;
      let lastError = null;
      for (const name of CHAINS[market] ?? []) {
        if (pending.length === 0) break;
        const provider = byName.get(name);
        if (!provider || !provider.handles(market)) continue;
        let rows = null;
        try {
          rows = await fetchProvider(provider, pending.map((i) => i.code));
        } catch (e) {
          lastError = e;
          continue; // 本源整体失败（含退避快速失败）→ 剩余标的交下一源
        }
        const still = [];
        const fetchedAt = now();
        for (const identity of pending) {
          const quote = rows.get(identity.code) ?? rows.get(String(identity.code).toUpperCase());
          if (quote && quote.price > 0) {
            const quoteTime = provider.quoteTime ? provider.quoteTime(quote) : (quote.quoteTimeMs ?? null);
            out.set(identity.id, { id: identity.id, identity, status: "ok", quote, fetchedAt, quoteTime });
          } else {
            still.push(identity);
          }
        }
        pending = still;
      }
      const fetchedAt = now();
      for (const identity of pending) {
        out.set(identity.id, {
          id: identity.id,
          identity,
          status: "error",
          quote: null,
          fetchedAt,
          quoteTime: null,
          error: lastError ? String(lastError.message ?? lastError) : "no-data",
        });
      }
    }));
    return out;
  }

  /**
   * 详情路径的提供方守卫（2026-11-13）：与批量路径共用提供方状态（失败计数 / 指数退避）。
   * 退避期内直接抛错、不打上游；有行情的成功结果按 ttlMs 短缓存，详情轮询（15 秒）不重复打上游。
   * 修复前：详情路径绕过退避与缓存，头部报价每次轮询都直接打 Yahoo（429 因而持续），且 fullAdapter 缺 tencent-us。
   * 东方财富 secid 探测的传输失败经严格模式抛出（§12.32），与快照失败一并计入退避。
   */
  const fullCache = new Map();
  async function guardedFull(name, code, fn) {
    const s = state.get(name);
    const key = name + ":" + code;
    const hit = fullCache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    if (now() < s.backoffUntil) throw new Error("backoff-" + name);
    try {
      const value = await fn(code);
      s.failures = 0;
      s.backoffUntil = 0;
      if (value?.quote) fullCache.set(key, { at: now(), value });
      return value;
    } catch (e) {
      s.failures += 1;
      const backoff = backoffMs(s);
      s.backoffUntil = now() + backoff;
      try {
        diag?.({ ev: "provider.fail", provider: name, error: String(e?.message ?? e).slice(0, 120), failures: s.failures, backoffMs: backoff });
      } catch {
        /* 诊断不得影响行情 */
      }
      throw e;
    }
  }

  /** 详情页完整快照（高低开收全字段；每标的独立请求，按市场链逐源补位） */
  const fullAdapter = {
    tencent: async (code) => {
      const rows = await tencentBatch([code]);
      const quote = rows.get(code) ?? rows.get(String(code).toLowerCase()) ?? null;
      return { quote, quoteTime: quote ? tencentQuoteTime(quote) : null };
    },
    eastmoney: async (code) => {
      const quote = await emQuote(code, { strict: true });
      return { quote, quoteTime: quote?.quoteTimeMs ?? null };
    },
    yahoo: async (code) => {
      const rows = await yahooBatch([code]);
      const quote = rows.get(String(code).toUpperCase()) ?? null;
      return { quote, quoteTime: quote?.quoteTimeMs ?? null };
    },
    "tencent-us": async (code) => {
      const rows = await tencentUsBatch([code]);
      const quote = rows.get(String(code).toUpperCase()) ?? null;
      return { quote, quoteTime: quote ? tencentUsQuoteTime(quote) : null };
    },
    okx: async (code) => {
      const quote = await okxQuote(code);
      return { quote, quoteTime: quote?.quoteTimeMs ?? null };
    },
    sina: async (code) => {
      const rows = await sinaBatch([code]);
      const quote = rows.get(code) ?? null;
      return { quote, quoteTime: quote?.quoteTimeMs ?? null };
    },
  };

  async function getQuoteFull(identities) {
    const out = new Map();
    await Promise.all(identities.map(async (identity) => {
      const fetchedAt = now();
      for (const name of CHAINS[identity.market] ?? []) {
        try {
          const { quote, quoteTime } = await guardedFull(name, identity.code, fullAdapter[name]);
          if (quote && quote.price > 0) {
            out.set(identity.id, { id: identity.id, identity, status: "ok", quote, fetchedAt, quoteTime });
            return;
          }
        } catch {
          /* 下一源 */
        }
      }
      out.set(identity.id, { id: identity.id, identity, status: "error", quote: null, fetchedAt, quoteTime: null, error: "no-data" });
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
