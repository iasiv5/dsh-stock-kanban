import test from "node:test";
import assert from "node:assert/strict";
import { search, resolveDirect } from "../src/markets/search.mjs";

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
