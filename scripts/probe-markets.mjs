#!/usr/bin/env node
// 四市场数据源实测探针 —— 逐端点验证真实可用性，结果输出为 JSON。
// 仅作调研取证用，不进入生产路径（生产行情适配在 src/markets/）。
import { writeFileSync } from "node:fs";
import { parseBatchSnapshot, fetchKline } from "../src/markets/tencent.mjs";
import { fetchBatchSnapshots as sinaFetch } from "../src/markets/sina.mjs";

const out = { at: new Date().toISOString(), results: [] };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function probe(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    out.results.push({ name, ok: true, ms: Date.now() - t0, detail });
  } catch (e) {
    out.results.push({ name, ok: false, ms: Date.now() - t0, error: String(e?.message ?? e).slice(0, 200) });
  }
}

async function getText(url, timeout = 10000) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

// 1) 腾讯批量快照 qt.gtimg.cn（A股+港股+ETF 一批）
await probe("tencent-batch-snapshot", async () => {
  const buf = await getText("https://qt.gtimg.cn/q=sh600519,sz000001,hk00700,sh510300,r_hkHSI");
  const text = new TextDecoder("gbk").decode(buf);
  const rows = text.split(";").filter((r) => r.includes("="));
  return { bytes: buf.length, rows: rows.length, sample: rows[0]?.slice(0, 120), fields0: rows[0]?.split("~").slice(0, 40).map((s) => s.slice(0, 12)) };
});

// 2) 腾讯 minute/query（快照+分时）双 host
for (const host of ["https://proxy.finance.qq.com/ifzqgtimg", "https://web.ifzq.gtimg.cn"]) {
  await probe(`tencent-minute ${host}`, async () => {
    const json = await (await fetch(`${host}/appstock/app/minute/query?code=sh600519&r=0.1`, { signal: AbortSignal.timeout(10000) })).json();
    const sd = json?.data?.sh600519;
    return { code: json?.code, hasData: !!sd, minutePoints: sd?.data?.data?.length ?? 0, qtLen: Array.isArray(sd?.qt?.sh600519) ? sd.qt.sh600519.length : 0, date: sd?.data?.date };
  });
}

// 3) 腾讯 fqkline 日/周/月
for (const period of ["day", "week", "month"]) {
  await probe(`tencent-fqkline-${period}`, async () => {
    const json = await (await fetch(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,${period},,,20,qfq`, { signal: AbortSignal.timeout(10000) })).json();
    const sd = json?.data?.sh600519;
    const key = `qfq${period}`;
    const rows = sd?.[key] ?? sd?.[period] ?? [];
    return { code: json?.code, rows: rows.length, first: rows[0]?.slice(0, 6), last: rows.at(-1)?.slice(0, 6), keyFound: sd ? Object.keys(sd).filter((k) => k.includes(period)) : [] };
  });
}

// 3b) 腾讯港股 K 线
await probe("tencent-fqkline-hk", async () => {
  const json = await (await fetch(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=hk00700,day,,,20,qfq`, { signal: AbortSignal.timeout(10000) })).json();
  const sd = json?.data?.hk00700;
  return { code: json?.code, rows: sd?.qfqday?.length ?? sd?.day?.length ?? 0, keys: sd ? Object.keys(sd).slice(0, 6) : [] };
});

// 4) EM 美股：快照（105=NASDAQ）+ K线三周期 + 分时
await probe("em-us-snapshot", async () => {
  const json = await (await fetch("https://push2.eastmoney.com/api/qt/stock/get?secid=105.AAPL&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170&invt=2&fltt=2", { headers: { "user-agent": UA, referer: "https://quote.eastmoney.com/" }, signal: AbortSignal.timeout(10000) })).json();
  return { name: json?.data?.f58, price: json?.data?.f43, pct: json?.data?.f170 };
});
for (const [klt, label] of [["101", "day"], ["102", "week"], ["103", "month"]]) {
  await probe(`em-us-kline-${label}`, async () => {
    const json = await (await fetch(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=105.AAPL&klt=${klt}&fqt=1&lmt=20&end=20500101&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57`, { headers: { "user-agent": UA, referer: "https://quote.eastmoney.com/" }, signal: AbortSignal.timeout(10000) })).json();
    const rows = json?.data?.klines ?? [];
    return { name: json?.data?.name, rows: rows.length, first: rows[0]?.split(",").slice(0, 6), last: rows.at(-1)?.split(",").slice(0, 6) };
  });
}
await probe("em-us-trends2", async () => {
  const json = await (await fetch("https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=105.AAPL&fields1=f1,f2,f3&fields2=f51,f53&iscr=0&ndays=1", { headers: { "user-agent": UA, referer: "https://quote.eastmoney.com/" }, signal: AbortSignal.timeout(10000) })).json();
  const tr = json?.data?.trends ?? [];
  return { preClose: json?.data?.preClose, points: tr.length, first: tr[0], last: tr.at(-1) };
});

// 5) OKX：ticker + K线三周期 + 分时(5m) + instruments
await probe("okx-ticker", async () => {
  const json = await (await fetch("https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) })).json();
  return { code: json?.code, last: json?.data?.[0]?.last, open24h: json?.data?.[0]?.open24h, ts: json?.data?.[0]?.ts };
});
for (const [bar, label] of [["1D", "day"], ["1W", "week"], ["1M", "month"], ["5m", "minute"]]) {
  await probe(`okx-candles-${label}`, async () => {
    const json = await (await fetch(`https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=${bar}&limit=20`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) })).json();
    const rows = json?.data ?? [];
    return { code: json?.code, rows: rows.length, firstTs: rows[0]?.[0], firstClose: rows[0]?.[4] };
  });
}
await probe("okx-instruments", async () => {
  const json = await (await fetch("https://www.okx.com/api/v5/public/instruments?instType=SPOT", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) })).json();
  const all = json?.data ?? [];
  return { code: json?.code, total: all.length, usdtPairs: all.filter((i) => i.quoteCcy === "USDT" && i.state === "live").length };
});

// 6) smartbox 搜索：中文 A股 / 港股代码 / 美股
for (const q of ["茅台", "00700", "aapl", "沪深300ETF"]) {
  await probe(`smartbox "${q}"`, async () => {
    const buf = await getText(`https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(q)}&t=all`);
    const text = new TextDecoder("gbk").decode(buf).replace(/\\\\u([0-9a-fA-F]{4})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
    const m = text.match(/v_hint="([^"]*)"/);
    const rows = m ? m[1].split("^").slice(0, 6).map((p) => p.split("~").slice(0, 5).join("|")) : [];
    return { hits: m ? m[1].split("^").length : 0, sample: rows };
  });
}

// 7) EM A股对照（腾讯被封时的备选，仅探测）
await probe("em-cn-snapshot", async () => {
  const json = await (await fetch("https://push2.eastmoney.com/api/qt/stock/get?secid=1.600519&fields=f43,f57,f58,f170&invt=2&fltt=2", { headers: { "user-agent": UA, referer: "https://quote.eastmoney.com/" }, signal: AbortSignal.timeout(10000) })).json();
  return { name: json?.data?.f58, price: json?.data?.f43, pct: json?.data?.f170 };
});

// 8) 新浪快照形状取证（2026-11-14 Task 1）：适配器字段位依据。
//    唯一的「非生产 parser」例外——sina.mjs 尚不存在，先录原始形状；Task 2 落地后由 sina-parse-recheck 复跑接管。
await probe("sina-cn-snapshot", async () => {
  const res = await fetch("https://hq.sinajs.cn/list=sh600519,sh510300,sh000001,sz000001", { headers: { "user-agent": UA, referer: "https://finance.sina.com.cn/" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = new TextDecoder("gbk").decode(Buffer.from(await res.arrayBuffer()));
  const rows = text.split(";").filter((r) => r.includes("="));
  const f0 = /hq_str_([\w]+)="([^"]*)"/.exec(rows[0] ?? "")?.[2]?.split(",").slice(0, 36).map((s) => s.slice(0, 16)) ?? [];
  return { bytes: text.length, rows: rows.length, raw0: rows[0]?.slice(0, 120), fields0: f0 };
});

// 9) 688 量纲三方对照（2026-11-14 Task 1，评审 Q7：bj 独立 try 不拖垮整组）：
//    同日腾讯 K 线末根 volume vs 腾讯快照 f36（parseBatchSnapshot 生产口径）vs 新浪快照 f8（股——实测修正早期「手」假定）。
//    ratio 语义（Task 7 归一后）：sh/sz/bj 非 688 = 0.01（腾讯手 ↔ 新浪股互证）；sh688/689 与 hk = 1.00（同为股）。
await probe("volume-cn-kline-compare", async () => {
  const samples = [];
  for (const code of ["sh600519", "sh688111", "bj920000"]) {
    try {
      const k = await fetchKline(code, "day");
      const klineLast = k.candles.at(-1)?.volume ?? null;
      const buf = await getText(`https://qt.gtimg.cn/q=${code}`);
      const q = parseBatchSnapshot(new TextDecoder("gbk").decode(buf)).get(code) ?? null;
      let sinaName = null, sinaF8 = null, sinaDateF30 = null, sinaTimeF31 = null;
      try {
        const res = await fetch(`https://hq.sinajs.cn/list=${code}`, { headers: { "user-agent": UA, referer: "https://finance.sina.com.cn/" }, signal: AbortSignal.timeout(10000) });
        const f = new TextDecoder("gbk").decode(Buffer.from(await res.arrayBuffer())).match(/hq_str_[\w]+="([^"]*)"/)?.[1]?.split(",") ?? [];
        sinaName = f[0] ?? null;
        sinaF8 = f[8] ?? null;
        sinaDateF30 = f[30] ?? null;
        sinaTimeF31 = f[31] ?? null;
      } catch { /* 新浪侧失败不影响腾讯侧量纲证据 */ }
      samples.push({ code, klineAdjust: k.adjust, klineLast, snapVol: q?.volume ?? null, sinaName, sinaF8, sinaDateF30, sinaTimeF31, klineOverSina: klineLast != null && sinaF8 != null && parseFloat(sinaF8) > 0 ? (klineLast / parseFloat(sinaF8)).toFixed(2) : null });
    } catch (e) {
      samples.push({ code, error: String(e?.message ?? e).slice(0, 120) });
    }
  }
  return { samples };
});

// 10) 新浪 parser 复跑（Task 2 落地后接管组 8 的取证职责）：生产 parser 实测五码覆盖
await probe("sina-parse-recheck", async () => {
  const rows = await sinaFetch(["sh600519", "sh510300", "sh000001", "sz000001", "bj920000"]);
  const q = rows.get("sh600519");
  return { rows: rows.size, codes: [...rows.keys()], price600519: q?.price ?? null, volume: q?.volume ?? null, quoteTimeMs: q?.quoteTimeMs ?? null };
});

writeFileSync(new URL("./probe-result.json", import.meta.url), JSON.stringify(out, null, 2));
const pass = out.results.filter((r) => r.ok).length;
console.log(`probe done: ${pass}/${out.results.length} ok, results in scripts/probe-result.json`);
for (const r of out.results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? ` (${r.ms}ms)` : ` — ${r.error}`}`);
