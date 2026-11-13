import test from "node:test";
import assert from "node:assert/strict";
import { makeIdentity, normalizeInputCode, isValidCode, guessMarket, checkTargetRelation, parseCryptoCode, identityConsistent } from "../src/identity.mjs";

test("makeIdentity：市场/代码/报价币种三元组", () => {
  assert.deepEqual(makeIdentity("cn", "SH600519"), { id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" });
  assert.deepEqual(makeIdentity("hk", "00700"), null); // hk 必须带前缀（makeIdentity 不做补前缀，补前缀走 normalizeInputCode）
  assert.deepEqual(makeIdentity("us", "aapl"), { id: "us:AAPL", market: "us", code: "AAPL", quoteCurrency: "USD" });
  assert.deepEqual(makeIdentity("crypto", "btc-usdt"), { id: "crypto:BTC-USDT", market: "crypto", code: "BTC-USDT", quoteCurrency: "USDT" });
  assert.deepEqual(makeIdentity("crypto", "eth-usdc")?.quoteCurrency, "USDC");
  assert.equal(makeIdentity("crypto", "BTC"), null); // 无报价币
  assert.equal(makeIdentity("cn", "600519"), null); // 裸代码不带前缀不符合格式
  assert.equal(makeIdentity("what", "x"), null);
});

test("normalizeInputCode：裸代码补前缀", () => {
  assert.equal(normalizeInputCode("cn", "600519"), "sh600519");
  assert.equal(normalizeInputCode("cn", "000001"), "sz000001");
  assert.equal(normalizeInputCode("cn", "300750"), "sz300750");
  assert.equal(normalizeInputCode("cn", "510300"), "sh510300");
  assert.equal(normalizeInputCode("cn", "830799"), "bj830799");
  assert.equal(normalizeInputCode("cn", "sh600519"), "sh600519");
  assert.equal(normalizeInputCode("hk", "0700"), "hk0700");
  assert.equal(normalizeInputCode("hk", "hk00700"), "hk00700");
  assert.equal(normalizeInputCode("us", "aapl"), "AAPL");
  assert.equal(normalizeInputCode("crypto", "btc-usdt"), "BTC-USDT");
  assert.equal(normalizeInputCode("cn", "abc"), null);
});

test("isValidCode 号段白名单", () => {
  assert.equal(isValidCode("cn", "sh600519"), true);
  assert.equal(isValidCode("cn", "sh999999"), false); // 非法号段
  assert.equal(isValidCode("hk", "hk00700"), true);
  assert.equal(isValidCode("crypto", "BTC-USDT"), true);
  assert.equal(isValidCode("crypto", "BTC-"), false);
  assert.equal(isValidCode("us", "AAPL.OQ"), true);
});

test("guessMarket 与 parseCryptoCode", () => {
  assert.equal(guessMarket("sh600519"), "cn");
  assert.equal(guessMarket("hk00700"), "hk");
  assert.equal(guessMarket("BTC-USDT"), "crypto");
  assert.deepEqual(parseCryptoCode("btc-usdt"), { base: "BTC", quote: "USDT" });
  assert.equal(parseCryptoCode("BTC"), null);
});

test("identityConsistent：id 与 market/code 自洽", () => {
  const good = { id: "cn:sh600519", market: "cn", code: "sh600519", quoteCurrency: "CNY" };
  assert.equal(identityConsistent(good), true);
  assert.equal(identityConsistent({ ...good, id: "cn:sz000001" }), false);
  assert.equal(identityConsistent(null), false);
});

test("目标价阈值关系：重叠要显式暴露", () => {
  assert.deepEqual(checkTargetRelation(10, 20), { ok: true, overlap: false });
  const overlap = checkTargetRelation(20, 10);
  assert.equal(overlap.overlap, true);
  assert.equal(checkTargetRelation(null, null).overlap, false);
});

/* ---------------- 指数目录（P0-2，2026-11-13） ---------------- */
import { normalizeKind } from "../src/identity.mjs";

test("指数目录：目录代码过身份校验（hkHSI 大小写敏感、DJI 归 us）", () => {
  const cn = makeIdentity("cn", "sh000001");
  assert.deepEqual(cn, { id: "cn:sh000001", market: "cn", code: "sh000001", quoteCurrency: "CNY" });
  const hk = makeIdentity("hk", "HKHSI");
  assert.equal(hk.code, "hkHSI");
  assert.equal(hk.id, "hk:hkHSI");
  const us = makeIdentity("us", "inx");
  assert.deepEqual(us, { id: "us:INX", market: "us", code: "INX", quoteCurrency: "USD" });
  assert.equal(isValidCode("hk", "hkHSI"), true);
  assert.equal(isValidCode("cn", "sh000999"), false); // 目录外指数形态代码仍拒
});

test("guessMarket：目录代码优先（HSI→hk 不误判 us；DJI→us；sh000300→cn）", () => {
  assert.equal(guessMarket("hkHSI"), "hk");
  assert.equal(guessMarket("hkhsi"), "hk"); // 目录键是代码小写（别名不参与 guessMarket）
  assert.equal(guessMarket("DJI"), "us");
  assert.equal(guessMarket("sh000300"), "cn");
});

test("normalizeKind：index 由目录裁决；目录外 kind=index 降级 stock（防绕过持仓校验）", () => {
  assert.equal(normalizeKind("cn", "index", "sh000001"), "index");
  assert.equal(normalizeKind("hk", "stock", "hkHSI"), "index");
  assert.equal(normalizeKind("cn", "index", "sh600519"), "stock");
  assert.equal(normalizeKind("cn", "etf", "sh510300"), "etf");
});

test("normalizeInputCode：目录代码原样（含 hk 别名）；裸 000001 仍走股票号段", () => {
  assert.equal(normalizeInputCode("hk", "hkHSI"), "hkHSI");
  assert.equal(normalizeInputCode("cn", "sh000001"), "sh000001");
  assert.equal(normalizeInputCode("cn", "000001"), "sz000001");
});
