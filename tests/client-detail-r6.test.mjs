/**
 * 详情页持仓 / 目标价区块（第六轮 2026-11-10，方案 B + 第一批修补 + 第二批信息增强）：
 *   - 分段二选一（持仓 | 目标价），段上打点（有数据 / 未保存）；
 *   - 保存钮：未改动或非法值禁用，非法值内联报错；回车（form submit）提交；
 *   - 清除持仓与目标价重叠：区块内确认条，不弹原生 confirm；留空保存且原有持仓 = 清除，走确认；
 *   - 距现价百分比、实时市值与盈亏（输入即刷新）；编辑中行情刷新：派生数字原位更新、输入框节点不变。
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createDetail } from "../client/detail.mjs";
import { t } from "../client/i18n.mjs";
import { fmtPct, fmtAmount } from "../client/fmt.mjs";

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

const SYMBOL = {
  id: "cn:sz159206",
  market: "cn",
  code: "sz159206",
  name: "卫星ETF永赢",
  quoteCurrency: "CNY",
  kind: "etf",
  quantity: 100,
  avgCost: 10,
  buyTarget: null,
  sellTarget: null,
};

const snapshot = ({ symbol = SYMBOL, price = 12.5, privacy = false } = {}) => ({
  business: { rev: 1, settings: { privacyMode: privacy }, symbols: [symbol], driverKind: null, loaded: true },
  quotes: {
    [symbol.id]: { status: "ok", price, changePercent: 1.2, quoteTime: 1, fetchedAt: 1, target: { status: "fresh" } },
  },
  quoteMeta: { fetchedAt: 1, error: null },
  ui: {
    panelOpen: true, view: "detail", detailId: symbol.id, showAdd: false, showSettings: false,
    lastMarket: "cn", holdingsOnly: false, maVisible: { 5: true, 10: true, 20: true, 60: true },
    capsuleSymbolId: null,
  },
  toast: null,
  providers: null,
});

function setup() {
  const h = createDomHarness();
  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  globalThis.document = h.document;
  globalThis.window = h.window;
  globalThis.localStorage = h.localStorage;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ points: [], prevClose: null }) });
  const calls = [];
  const store = {
    backToList: () => calls.push(["back"]),
    updateSymbol: async (id, patch) => {
      calls.push(["updateSymbol", id, patch]);
      return { ok: true };
    },
    removeSymbol: async () => ({ ok: true }),
    setToast: () => {},
    setMaVisible: () => {},
  };
  const detail = createDetail({ store });
  h.document.body.append(detail.el); // jsdom 的 focus() 仅对已入文档的元素生效
  return {
    h,
    calls,
    detail,
    restore() {
      detail.dispose();
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete globalThis[k];
        else globalThis[k] = v;
      }
      h.cleanup();
    },
  };
}

const typeInto = (h, input, value) => {
  input.value = value;
  input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
};
const holdingsForm = (s) => s.detail.el.querySelector("form.skc-holdings");
const targetsForm = (s) => s.detail.el.querySelector("form.skc-targets");
const field = (s, name) => s.detail.el.querySelector(`input[data-field="${name}"]`);
const helperOf = (s, name) => field(s, name).closest("label").querySelector(".skc-field-helper");
const segButtons = (s) => [...s.detail.el.querySelectorAll(".skc-seg")];
const submit = (s, form) => form.dispatchEvent(new s.h.window.Event("submit", { bubbles: true, cancelable: true }));

test("分段：两段同挂同一网格格子（等高占位）；当前段可交互，另一段 inert + aria-hidden；切换后互换", () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    const stack = s.detail.el.querySelector(".skc-seg-stack");
    assert.ok(stack, "两段包在同一网格容器内");
    assert.equal(stack.children.length, 2, "持仓段与目标价段都在 DOM 中（占位等高）");
    assert.equal(holdingsForm(s).hasAttribute("inert"), false, "默认持仓段可交互");
    assert.equal(targetsForm(s).hasAttribute("inert"), true, "目标价段 inert（不可聚焦）");
    assert.equal(targetsForm(s).getAttribute("aria-hidden"), "true");
    segButtons(s)[1].click();
    assert.equal(targetsForm(s).hasAttribute("inert"), false, "切到目标价段后可交互");
    assert.equal(holdingsForm(s).hasAttribute("inert"), true, "持仓段 inert");
    const [pos, tgt] = segButtons(s);
    assert.equal(pos.getAttribute("aria-pressed"), "false");
    assert.equal(tgt.getAttribute("aria-pressed"), "true");
  } finally {
    s.restore();
  }
});

test("分段打点：有数据的段显示点；编辑未保存时该段点变橙（skc-seg-dot--unsaved）", () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    const [posDot, tgtDot] = segButtons(s).map((b) => b.querySelector(".skc-seg-dot"));
    assert.equal(posDot.hidden, false, "持仓段有数据 → 点可见");
    assert.equal(tgtDot.hidden, true, "目标价段无数据 → 点隐藏");
    typeInto(s.h, field(s, "quantity"), "200");
    assert.equal(posDot.classList.contains("skc-seg-dot--unsaved"), true, "未保存 → 橙点");
  } finally {
    s.restore();
  }
});

test("保存钮：未改动禁用；合法改动可用；非法值内联报错并禁用，输入框标记 aria-invalid", () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    const save = holdingsForm(s).querySelector(".skc-btn-primary");
    assert.equal(save.disabled, true, "未改动 → 保存禁用");
    typeInto(s.h, field(s, "quantity"), "200");
    assert.equal(save.disabled, false, "合法改动 → 保存可用");
    typeInto(s.h, field(s, "quantity"), "abc");
    assert.equal(save.disabled, true, "非法值 → 保存禁用");
    assert.equal(helperOf(s, "quantity").textContent, t("detail.err.positive"), "非法值 → 字段下方内联错误");
    assert.equal(field(s, "quantity").getAttribute("aria-invalid"), "true");
    assert.equal(field(s, "quantity").classList.contains("skc-input-invalid"), true);
  } finally {
    s.restore();
  }
});

test("回车提交：表单 submit 以草稿保存数量与成本", async () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    typeInto(s.h, field(s, "quantity"), "200");
    submit(s, holdingsForm(s));
    await sleepMs(5);
    assert.deepEqual(s.calls.find((c) => c[0] === "updateSymbol"), ["updateSymbol", SYMBOL.id, { quantity: 200, avgCost: 10 }]);
  } finally {
    s.restore();
  }
});

test("清除持仓需区块内确认：点击只出现确认条；确认后才清空", async () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    const clear = holdingsForm(s).querySelector(".skc-btn-text");
    assert.equal(clear.hidden, false, "已有持仓 → 显示清除");
    clear.click();
    assert.equal(s.calls.filter((c) => c[0] === "updateSymbol").length, 0, "点击清除不直接提交");
    const strip = holdingsForm(s).querySelector(".skc-confirm");
    assert.ok(strip, "区块内出现确认条");
    assert.equal(strip.textContent.includes(t("detail.confirm.clear")), true);
    const ok = [...strip.querySelectorAll("button")].find((b) => b.textContent === t("detail.confirm.clear-ok"));
    ok.click();
    await sleepMs(5);
    assert.deepEqual(s.calls.find((c) => c[0] === "updateSymbol"), ["updateSymbol", SYMBOL.id, { quantity: null, avgCost: null }]);
  } finally {
    s.restore();
  }
});

test("留空保存且原有持仓 = 清除：走确认条，不直接清空", async () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    typeInto(s.h, field(s, "quantity"), "");
    typeInto(s.h, field(s, "avgCost"), "");
    submit(s, holdingsForm(s));
    await sleepMs(5);
    assert.equal(s.calls.filter((c) => c[0] === "updateSymbol").length, 0, "留空保存不直接提交");
    assert.ok(holdingsForm(s).querySelector(".skc-confirm"), "出现确认条");
  } finally {
    s.restore();
  }
});

test("距现价：买入提醒价 80、现价 100 → 距现价在标签行右侧，提示在输入框下方", () => {
  const s = setup();
  try {
    s.detail.update(snapshot({ price: 100 }));
    segButtons(s)[1].click();
    typeInto(s.h, field(s, "buyTarget"), "80");
    const dist = t("detail.dist", { p: fmtPct(((80 / 100) - 1) * 100) });
    const label = field(s, "buyTarget").closest("label");
    assert.equal(label.querySelector(".skc-field-meta").textContent, dist, "距现价在标签行右侧");
    assert.equal(label.querySelector(".skc-field-meta").hidden, false);
    assert.equal(helperOf(s, "buyTarget").textContent, t("detail.buy-hint"), "输入框下方只放提示");
  } finally {
    s.restore();
  }
});

test("实时市值与盈亏：数量改为 200 即刷新摘要（市值 = 200 × 现价，盈亏 = 200 × (现价 − 成本)）", () => {
  const s = setup();
  try {
    s.detail.update(snapshot({ price: 12.5 }));
    typeInto(s.h, field(s, "quantity"), "200");
    const expected = t("detail.holdings.meta", {
      v: fmtAmount(2500),
      ccy: "CNY",
      p: fmtAmount(500),
      pct: fmtPct(25),
    });
    assert.equal(holdingsForm(s).querySelector(".skc-holdings-meta").textContent, expected);
  } finally {
    s.restore();
  }
});

test("买入提醒价不低于卖出提醒价：保存先出现区块内确认（不调用 updateSymbol、不弹原生窗口）；确认后才保存", async () => {
  const s = setup();
  let nativeCalled = false;
  s.h.window.confirm = () => {
    nativeCalled = true;
    return false;
  };
  try {
    s.detail.update(snapshot());
    segButtons(s)[1].click();
    typeInto(s.h, field(s, "buyTarget"), "100");
    typeInto(s.h, field(s, "sellTarget"), "90");
    submit(s, targetsForm(s));
    await sleepMs(5);
    assert.equal(nativeCalled, false, "不使用原生 confirm");
    assert.equal(s.calls.filter((c) => c[0] === "updateSymbol").length, 0, "确认前不提交");
    const strip = targetsForm(s).querySelector(".skc-confirm");
    assert.ok(strip, "区块内确认条在位");
    const ok = [...strip.querySelectorAll("button")].find((b) => b.textContent === t("detail.confirm.overlap-ok"));
    ok.click();
    await sleepMs(5);
    assert.deepEqual(s.calls.find((c) => c[0] === "updateSymbol"), ["updateSymbol", SYMBOL.id, { buyTarget: 100, sellTarget: 90 }]);
  } finally {
    s.restore();
  }
});

test("编辑中行情刷新：输入框节点不变，距现价与摘要原位更新", () => {
  const s = setup();
  try {
    s.detail.update(snapshot({ price: 100 }));
    segButtons(s)[1].click();
    const buy = field(s, "buyTarget");
    buy.focus();
    typeInto(s.h, buy, "80");
    // 轮询 tick（渲染切片广播 Task 3）：真实 tick 带 changed 切片 → 活区 patch，输入框不重建
    s.detail.update({
      ...snapshot({ price: 200 }),
      changed: { quotes: new Set([SYMBOL.id]), business: false, ui: [], quoteMetaError: false },
    });
    assert.equal(field(s, "buyTarget"), buy, "编辑中不重绘：同一输入框节点");
    const dist = t("detail.dist", { p: fmtPct(((80 / 200) - 1) * 100) });
    const label = buy.closest("label");
    assert.equal(label.querySelector(".skc-field-meta").textContent, dist, "距现价随行情原位刷新（标签行）");
    assert.equal(helperOf(s, "buyTarget").textContent, t("detail.buy-hint"), "提示行不变");
  } finally {
    s.restore();
  }
});

test("清除目标价需区块内确认：点击只出现确认条；确认后买卖提醒价一并清空", async () => {
  const withTargets = { ...SYMBOL, buyTarget: 80, sellTarget: 120 };
  const s = setup();
  try {
    s.detail.update(snapshot({ symbol: withTargets }));
    segButtons(s)[1].click();
    const clear = targetsForm(s).querySelector(".skc-btn-text");
    assert.equal(clear.hidden, false, "已有目标价 → 显示清除目标价");
    clear.click();
    assert.equal(s.calls.filter((c) => c[0] === "updateSymbol").length, 0, "点击清除不直接提交");
    const strip = targetsForm(s).querySelector(".skc-confirm");
    assert.ok(strip, "区块内出现确认条");
    assert.equal(strip.textContent.includes(t("detail.confirm.clear-targets")), true);
    const ok = [...strip.querySelectorAll("button")].find((b) => b.textContent === t("detail.confirm.clear-ok"));
    ok.click();
    await sleepMs(5);
    assert.deepEqual(s.calls.find((c) => c[0] === "updateSymbol"), ["updateSymbol", withTargets.id, { buyTarget: null, sellTarget: null }]);
  } finally {
    s.restore();
  }
});

test("目标价留空保存且原有目标价 = 清除：走确认条，不直接清空", async () => {
  const withTargets = { ...SYMBOL, buyTarget: 80, sellTarget: 120 };
  const s = setup();
  try {
    s.detail.update(snapshot({ symbol: withTargets }));
    segButtons(s)[1].click();
    typeInto(s.h, field(s, "buyTarget"), "");
    typeInto(s.h, field(s, "sellTarget"), "");
    submit(s, targetsForm(s));
    await sleepMs(5);
    assert.equal(s.calls.filter((c) => c[0] === "updateSymbol").length, 0, "留空保存不直接提交");
    assert.ok(targetsForm(s).querySelector(".skc-confirm"), "出现确认条");
  } finally {
    s.restore();
  }
});

test("目标价段为两列表单（与持仓段一致）；无目标价时清除按钮隐藏", () => {
  const s = setup();
  try {
    s.detail.update(snapshot());
    segButtons(s)[1].click();
    const form = targetsForm(s);
    assert.ok(form.querySelector(".skc-form-grid"), "两列网格");
    assert.equal(form.querySelector(".skc-form-col"), null, "不再使用单列容器");
    assert.equal(form.querySelector(".skc-btn-text").hidden, true, "无目标价时隐藏清除");
  } finally {
    s.restore();
  }
});
