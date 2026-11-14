import test from "node:test";
import assert from "node:assert/strict";
import { detailSourceText, setLang } from "../client/i18n.mjs";

/* 脚注文案 helper 单测（§12.48）：文案钉死——zh「数据源：{name}」/「数据源：{name}（降级自 {from}）」，
 * en "Source: {name}" / "Source: {name} (fell back from {from})"；error/null 行返回 null。 */

test("detailSourceText：正常态常显数据源（zh）", () => {
  setLang("zh");
  const s = detailSourceText({ status: "ok", source: "eastmoney", fallbackFrom: null });
  assert.equal(s, "数据源：东方财富");
  assert.ok(!s.includes("降级自"));
});

test("detailSourceText：降级态附加降级来源（zh）", () => {
  setLang("zh");
  assert.equal(detailSourceText({ status: "ok", source: "sina", fallbackFrom: "tencent" }), "数据源：新浪（降级自 腾讯）");
});

test("detailSourceText：error/null/缺 source → null（脚注隐藏）", () => {
  setLang("zh");
  assert.equal(detailSourceText({ status: "error", source: null, fallbackFrom: null }), null);
  assert.equal(detailSourceText(null), null);
  assert.equal(detailSourceText({ status: "ok", source: null, fallbackFrom: null }), null);
});

test("detailSourceText：英文两态", () => {
  setLang("en");
  assert.equal(detailSourceText({ status: "ok", source: "eastmoney", fallbackFrom: null }), "Source: EastMoney");
  assert.equal(detailSourceText({ status: "ok", source: "sina", fallbackFrom: "tencent" }), "Source: Sina (fell back from Tencent)");
  setLang("zh");
});

test("detailSourceText：六个 provider token 双语键齐全（parity 手检）", () => {
  for (const lang of ["zh", "en"]) {
    setLang(lang);
    for (const p of ["tencent", "eastmoney", "tencent-us", "yahoo", "okx", "sina"]) {
      const s = detailSourceText({ status: "ok", source: p, fallbackFrom: null });
      assert.ok(!s.includes("provider.") && s.length > 0, `${lang}/${p} -> ${s}`);
    }
  }
  setLang("zh");
});
