import test from "node:test";
import assert from "node:assert/strict";
import { t, tErr, resolveLang, setLang, DICT_KEYS } from "../client/i18n.mjs";

test("字典键位：zh 与 en 完全对齐（无缺失/多余）", () => {
  assert.deepEqual(DICT_KEYS.zh, DICT_KEYS.en);
  assert.ok(DICT_KEYS.zh.length >= 80, `keys=${DICT_KEYS.zh.length}`);
});

test("resolveLang：跟随系统语言", () => {
  assert.equal(resolveLang("zh-CN"), "zh");
  assert.equal(resolveLang("zh_TW"), "zh");
  assert.equal(resolveLang("en-US"), "en");
  assert.equal(resolveLang("ja-JP"), "en");
  assert.equal(resolveLang(undefined), "en");
});

test("t：zh 文案与参数插值", () => {
  setLang("zh");
  assert.equal(t("badge.stale"), "旧");
  assert.equal(t("badge.closed"), "休");
  assert.ok(t("toast.added", { name: "贵州茅台" }).includes("贵州茅台"));
  assert.ok(t("app.footer", { privacy: "" }).includes("免费行情"));
});

test("t：en 文案", () => {
  setLang("en");
  assert.equal(t("badge.stale"), "Stale");
  assert.equal(t("badge.closed"), "Closed");
  assert.ok(t("toast.added", { name: "AAPL" }).startsWith("Added"));
});

test("tErr：已知代码本地化、未知代码原样透出、detail 附加", () => {
  setLang("zh");
  assert.equal(tErr("duplicate"), "该标的已在自选中");
  assert.equal(tErr("totally-unknown-code"), "totally-unknown-code");
  assert.ok(tErr("fetch-failed", "HTTP 503").includes("HTTP 503"));
  setLang("en");
  assert.equal(tErr("duplicate"), "Already in watchlist");
});
