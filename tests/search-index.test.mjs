import test from "node:test";
import assert from "node:assert/strict";
import { search, resolveDirect, parseSmartbox } from "../src/markets/search.mjs";

/* 指数目录（P0-2，2026-11-13）：catalog 匹配零网络；直连主备源切换。 */

test("搜索：指数目录本地匹配（名称/别名/小写代码），上游全挂也在", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("down"); };
  try {
    const cn = await search("cn", "上证");
    assert.ok(cn.rows.some((r) => r.id === "cn:sh000001" && r.kind === "index"));
    const hk = await search("hk", "恒指");
    assert.ok(hk.rows.some((r) => r.id === "hk:hkHSI"));
    const us = await search("us", "纳指");
    assert.ok(us.rows.some((r) => r.id === "us:IXIC"));
    const byCode = await search("us", "inx");
    assert.ok(byCode.rows.some((r) => r.id === "us:INX"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("搜索只返回本市场：smartbox 全市场混排不得串进当前 Tab（2026-11-13 实录：美股 Tab 搜「1」出现港股「长和 00001」）", async () => {
  const originalFetch = globalThis.fetch;
  // smartbox 对任意关键字返回港股/美股/ETF 混排（t=all），形态对照 parseSmartbox 的 v_hint 解析
  const mixed = 'v_hint="hk~00001~CHANGHE~changhe~GP^us~AAPL~APPLE~apple~GP^sh~510300~HS300ETF~hs300~ETF"';
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Buffer.from(mixed, "utf8") });
  try {
    const us = await search("us", "1");
    assert.deepEqual(us.rows.map((r) => r.code), ["AAPL"]);
    const hk = await search("hk", "zzz");
    assert.deepEqual(hk.rows.map((r) => r.market), ["hk"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("搜索：名称按 NFKC+去空白匹配（池内「万 科Ａ」可被「万科」「万科a」命中）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const plain = await search("cn", "万科");
    assert.ok(plain.rows.some((r) => r.id === "cn:sz000002"), JSON.stringify(plain.rows.map((r) => r.id)));
    const latin = await search("cn", "万科a");
    assert.ok(latin.rows.some((r) => r.id === "cn:sz000002"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("搜索：股票与 ETF 交错合并，数字查询不让 ETF 被饿死", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const r = await search("cn", "300");
    assert.ok(r.rows.some((x) => x.kind === "etf"), "结果中应含 ETF");
    assert.ok(r.rows.length <= 30);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("搜索：精确代码排第一（600519 → 贵州茅台）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const r = await search("cn", "600519");
    assert.equal(r.rows[0].id, "cn:sh600519");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("身份：sh52/53/55 基金号段纳入白名单（池内科创债等 ETF 不再被静默丢弃）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const r = await search("cn", "551520");
    assert.equal(r.rows[0].id, "cn:sh551520");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("搜索：港股人民币柜台（8xxxx，报价 CNY）不展示，港币正股保留", async () => {
  const originalFetch = globalThis.fetch;
  const body = 'v_hint="hk~80700~TXKG-R~txkgr~GP^hk~00700~TXKG~txkg~GP"';
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Buffer.from(body, "utf8") });
  try {
    const r = await search("hk", "腾讯控股");
    assert.ok(!r.rows.some((x) => x.id === "hk:hk80700"), JSON.stringify(r.rows.map((x) => x.id)));
    assert.ok(r.rows.some((x) => x.id === "hk:hk00700"), JSON.stringify(r.rows.map((x) => x.id)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("解析：美股点号类别股（BRK.A/BRK.B）不再误写成 BRK；普通代码保留", () => {
  const rows = parseSmartbox('v_hint="us~brk.a.n~BERK-A~bkxe~GP^us~brk.b.n~BERK-B~bkxeb~GP^us~aapl.oq~APPLE~pg~GP"');
  assert.deepEqual(rows.map((r) => r.code), ["AAPL"]);
});

test("搜索：smartbox 响应缺少结果标记（错误页/改版）→ 明确 error，不当作无匹配", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Buffer.from("<html>blocked</html>", "utf8") });
  try {
    const r = await search("us", "aapl");
    assert.equal(r.error, "smartbox-unavailable");
    assert.deepEqual(r.rows, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("搜索：OKX 清单不可用 → 本地币种仍返回并标记 okx-unavailable；冷却期内不重复请求上游", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("down");
  };
  try {
    const first = await search("crypto", "btc");
    assert.equal(first.error, "okx-unavailable");
    assert.ok(first.rows.some((r) => r.code === "BTC-USDT"));
    const second = await search("crypto", "eth");
    assert.equal(second.error, "okx-unavailable");
    assert.equal(calls, 1, "冷却期内不应再次请求 OKX");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("直连：指数经腾讯主源校验（hkHSI → kind index）；腾讯挂 → EM 备源补位（cn 股票）", async () => {
  const originalFetch = globalThis.fetch;
  let tencentDown = false;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("qt.gtimg.cn")) {
      if (tencentDown) throw new Error("waf-blocked");
      const text = 'v_hkHSI="100~恒生指数~HSI~23859.810~24008.550~23871.910~0~0~23859.810~0~0~0~0~0~0~0~0~0~23859.810~0~0~0~0~0~0~0~0~0~0.0~2026/11/13 10:30:48~-148.740~-0.62~23930.130~23822.130~x~1~1~0~0~x~0~0~0~0~x~0~0~0~0~0~0";';
      return { ok: true, arrayBuffer: async () => Buffer.from(text, "utf8") };
    }
    if (u.includes("push2")) {
      return { ok: true, json: async () => ({ data: { f43: 1453, f57: "600519", f58: "贵州茅台", f124: 1762416840 } }) };
    }
    throw new Error("unexpected " + u);
  };
  try {
    const hsi = await resolveDirect("hk", "hkHSI");
    assert.equal(hsi.ok, true);
    assert.equal(hsi.kind, "index");
    assert.equal(hsi.identity.code, "hkHSI");
    assert.ok(hsi.identity.id === "hk:hkHSI");

    tencentDown = true;
    const mt = await resolveDirect("cn", "600519");
    assert.equal(mt.ok, true);
    assert.equal(mt.kind, "stock");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("直连：美股添加校验链 EM 502 → 腾讯美股顶上（2026-11-13 补腿回归：IXIC 指数）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("push2")) throw new Error("HTTP 502"); // EM 主源（本机 2026-11-13 实测 https/http 均 502）
    if (u.includes("finance.yahoo.com")) throw new Error("HTTP 429"); // Yahoo 限流（本机实测 Edge: Too Many Requests）
    if (u.includes("qt.gtimg.cn/q=usIXIC")) {
      // 形态对照 providers-tencent-us.test.mjs；名称中文按 GBK 通道会乱码，只断言链路结果不断言名称内容
      const text = 'v_usIXIC="200~nasdaq~.IXIC~25366.09~25466.19~25092.11~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~2026-11-12 17:15:59~-100.10~-0.39~25597.23~25068.00~x~1~1~0~0~x~0~0~0~0~x~0~0~0~0~0~0";';
      return { ok: true, arrayBuffer: async () => Buffer.from(text, "utf8") };
    }
    throw new Error("unexpected " + u);
  };
  try {
    const ixic = await resolveDirect("us", "IXIC");
    assert.equal(ixic.ok, true);
    assert.equal(ixic.kind, "index");
    assert.equal(ixic.identity.id, "us:IXIC");
    assert.ok(String(ixic.name).length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("直连：美股全链传输失败报 quote-unavailable，不误报 symbol-not-found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("push2")) throw new Error("HTTP 502");
    if (u.includes("finance.yahoo.com")) throw new Error("HTTP 429");
    if (u.includes("qt.gtimg.cn")) throw new Error("HTTP 503");
    throw new Error("unexpected " + u);
  };
  try {
    const dead = await resolveDirect("us", "IXIC");
    assert.equal(dead.ok, false);
    assert.equal(dead.error, "quote-unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parseSmartbox：A股正股 GP/GP-A 收录为 cn stock（sh/sz/bj），指数与基金仍过滤（ADR-0006）", () => {
  const body = 'v_hint="sh~600000~浦发银行~pfyh~GP-A^sz~300750~宁德时代~ndsd~GP^bj~920000~安徽凤凰~ahfh~GP-A^sh~000001~上证指数~szzs~ZS^jj~000001~华夏成长~hxczhh~KJ"';
  const rows = parseSmartbox(body);
  assert.deepEqual(rows.map((r) => [r.market, r.kind, r.code]), [
    ["cn", "stock", "sh600000"],
    ["cn", "stock", "sz300750"],
    ["cn", "stock", "bj920000"],
  ]);
});

test("搜索 cn：池子未凑满时 smartbox 补充（拼音查询池内无命中）；上游挂时池结果仍在并标错", async () => {
  const originalFetch = globalThis.fetch;
  const body = 'v_hint="sz~000001~平安银行~payh~GP-A"';
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Buffer.from(body, "utf8") });
  try {
    const r = await search("cn", "payh");
    assert.ok(r.rows.some((x) => x.id === "cn:sz000001" && x.source === "smartbox"), JSON.stringify(r));
  } finally {
    globalThis.fetch = originalFetch;
  }
  globalThis.fetch = async () => { throw new Error("down"); };
  try {
    const r = await search("cn", "600519");
    assert.equal(r.rows[0].id, "cn:sh600519");
    assert.equal(r.error, "smartbox-unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

