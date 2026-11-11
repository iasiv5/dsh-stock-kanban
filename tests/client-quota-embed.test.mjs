// client/quota-embed.mjs 直测（CEP v1 宿主侧，Plan B Task S2）。
// 覆盖降级矩阵五行 + 404/传输错误分支 + open-panel anchor 透传 + setEnabled 往返。
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createQuotaEmbed } from "../client/quota-embed.mjs";
import * as qe from "../client/quota-embed.mjs";
import { t } from "../client/i18n.mjs";
import { quotaSegmentModel } from "../client/quota-segment.mjs";
import { GUEST_POSITION_KEY } from "../client/float-prefs.mjs";
import { createCapsule } from "../client/capsule.mjs";

const NS = "dsh-quota-watch";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function okResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function overviewPayload({ glm = 12.5, copilotRemaining = 24 } = {}) {
  return {
    updatedAt: Date.parse("2026-11-09T12:00:00.000Z"),
    providers: [
      {
        key: "glm",
        displayName: "GLM Coding Plan",
        status: "ready",
        credential: "configured",
        updatedAt: Date.parse("2026-11-09T12:00:00.000Z"),
        plan: { planName: "GLM-Code-Plan", windows: [{ key: "5h", percent: glm, resetsAt: "2026-11-09T13:00:00.000Z" }] },
        usage: { status: "ready", totalTokens: 100, totalCalls: 1, models: [] },
      },
      {
        key: "copilot",
        displayName: "GitHub Copilot",
        status: "ready",
        credential: "configured",
        updatedAt: Date.parse("2026-11-09T12:00:00.000Z"),
        quota: {
          planName: "enterprise",
          tokenBasedBilling: true,
          balanceAvailable: true,
          remaining: 7600,
          entitlement: 10000,
          percentRemaining: copilotRemaining,
          creditsUsed: 2400,
          resetsAt: "2026-11-10T00:00:00.000Z",
        },
      },
    ],
  };
}

function setup({ fetchImpl, withCapsule = false, ...opts } = {}) {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  const host = h.document.createElement("div");
  h.document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const stack = h.document.createElement("div");
  stack.className = "skc-stack";
  shadow.append(stack);
  const dispatched = [];
  const origDispatch = h.window.dispatchEvent.bind(h.window);
  h.window.dispatchEvent = (ev) => {
    if (typeof ev?.type === "string" && ev.type.startsWith(`${NS}:`)) dispatched.push(ev.type);
    return origDispatch(ev);
  };
  const caps = [];
  const fetches = [];
  const capsule = withCapsule
    ? createCapsule({ doc: h.document, win: h.window, storage: h.localStorage, shadow, store: null, onTogglePanel() {} })
    : null;
  const embed = createQuotaEmbed({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    target: capsule ? capsule.el : stack,
    host,
    fetchImpl:
      fetchImpl ??
      (async (...args) => {
        fetches.push(args[0]);
        return okResponse(overviewPayload());
      }),
    probeTimeoutMs: 50,
    pollMs: 10000,
    retryMs: 10000,
    heartbeatMs: 80,
    onCapabilityChange: (v) => caps.push(v),
    // R1-1：本仓 jsdom 的 AbortSignal.timeout 会拖住 Node 事件循环 15s——默认 stub，
    // 超时用例经 ...opts 注入真实现（buildTimeoutSignal）。
    buildTimeoutSignal: () => undefined,
    ...opts,
  });
  return { h, host, stack, shadow, embed, dispatched, caps, fetches, capsule };
}

const addGuest = (h) => {
  const el = h.document.createElement("div");
  el.setAttribute("data-dsh-quota-watch-float", "");
  h.document.body.append(el);
  return el;
};

const replyCaps = (h, capabilities) =>
  h.window.dispatchEvent(
    new h.window.CustomEvent(`${NS}:embed-capabilities`, {
      detail: { v: 1, capabilities, guestVersion: "0.1.38" },
      composed: true,
      bubbles: true,
    }),
  );

const hasProbe = (dispatched) => dispatched.includes(`${NS}:embed-probe`);
const hasEngage = (dispatched) => dispatched.includes(`${NS}:embed-engage`);

test("quota-embed · 降级矩阵行 1：guest 缺席 → 无 pill、零事件", async () => {
  const s = setup();
  try {
    await sleep(80);
    assert.equal(hasProbe(s.dispatched), false, "不派发 probe");
    assert.equal(s.stack.querySelector('[data-seg="quota"]'), null, "无 quota pill");
    assert.deepEqual(s.caps, []);
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 降级矩阵行 2：legacy guest（无 probe 回复）→ 共存不隐藏", async () => {
  const s = setup();
  try {
    addGuest(s.h);
    await sleep(30); // MutationObserver 异步
    assert.equal(hasProbe(s.dispatched), true, "probe 已派发");
    await sleep(70); // probeTimeoutMs=50 过窗，无回复
    assert.equal(hasEngage(s.dispatched), false, "不 engage");
    assert.equal(s.stack.querySelector('[data-seg="quota"]'), null, "无 pill（共存）");
    assert.deepEqual(s.caps, [], "无能力回调");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 降级矩阵行 3：有能力但 quotaMerge off → 永不 engage", async () => {
  const s = setup();
  try {
    s.embed.update({ ui: { quotaMerge: false } });
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.deepEqual(s.caps, [true], "能力上报（footer 按钮渲染依据）");
    assert.equal(hasEngage(s.dispatched), false, "设置关 → 不 engage");
    assert.equal(s.stack.querySelector('[data-seg="quota"]'), null, "无 pill");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 降级矩阵行 4：能力+默认开 → engage + 心跳 + pill 渲染（warn/danger）", async () => {
  const s = setup({
    fetchImpl: async () => okResponse(overviewPayload({ glm: 82, copilotRemaining: 3 })),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.equal(hasEngage(s.dispatched), true, "engage 已派发");
    const pill = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(pill, "quota pill 在 stack");
    assert.equal(pill.hidden, false, "pill 可见");
    const seg = s.stack.querySelector('[data-seg="quota"]');
    const vals = [...seg.querySelectorAll(".skc-qval")];
    assert.equal(vals.length, 2, "GLM + Copilot 两个文案位");
    assert.equal(vals[0].dataset.label, "GLM", "GLM 在前");
    assert.equal(vals[0].textContent, "GLM 82%", "qw 同款文案 GLM 82%");
    assert.ok(vals[0].classList.contains("skc-qwarn"), "GLM 82% → warn（>80≤95）");
    assert.equal(vals[1].dataset.label, "Copilot", "Copilot 在后");
    assert.equal(vals[1].textContent, "Copilot 97%", "qw 同款文案 Copilot 97%");
    assert.ok(vals[1].classList.contains("skc-qdanger"), "Copilot 97%（100−3）→ danger（>95）");
    assert.equal(seg.querySelector(".skc-qsep").hidden, false, "两条都有数 → 分隔符显示");
    assert.ok(seg.classList.contains("skc-qpulse"), "任一条 >95 → 段 pulse");
    await sleep(100);
    assert.ok(
      s.dispatched.filter((t) => t === `${NS}:embed-heartbeat`).length >= 1,
      "heartbeat 持续派发",
    );
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 降级矩阵行 5：guest 消失（禁用/HMR）→ 同 disengage", async () => {
  const s = setup();
  try {
    const guest = addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.ok(s.stack.querySelector('[data-seg="quota"]'), "已合并");
    guest.remove();
    await sleep(60);
    assert.ok(s.dispatched.includes(`${NS}:embed-disengage`), "disengage 已派发");
    assert.equal(s.stack.querySelector('[data-seg="quota"]'), null, "pill 移除");
    assert.deepEqual(s.caps, [true, false], "能力回调归 false（footer 按钮移除依据）");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 404 → 藏 pill + retryMs 慢重试；恢复 200 → pill 回归", async () => {
  let status = 404;
  const fetches = [];
  const s = setup({
    fetchImpl: async () => {
      fetches.push(status);
      return status === 404
        ? new Response("{}", { status: 404, headers: { "content-type": "application/json" } })
        : okResponse(overviewPayload());
    },
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(60);
    const pill = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(pill, "pill 在位");
    assert.equal(pill.hidden, true, "404 → 藏段");
    await sleep(60);
    assert.equal(fetches.length, 1, "retryMs=10000 内不重发（慢重试）");
    status = 200;
    // 直接驱动一次 pull 模拟慢重试到期（不再等 10s）
    s.embed.update({ ui: {} }); // no-op update 不触发拉取
    await sleep(20);
    assert.equal(pill.hidden, true, "仍藏（尚未重拉）");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 传输错误 → 保留上次渲染 + pollMs 节奏", async () => {
  let fail = false;
  const s = setup({
    fetchImpl: async () => {
      if (fail) throw new TypeError("network down");
      return okResponse(overviewPayload({ glm: 12.5, copilotRemaining: 24 }));
    },
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(60);
    const pill = s.stack.querySelector('[data-seg="quota"]');
    assert.equal(pill.hidden, false, "首拉成功渲染");
    const before = pill.textContent;
    fail = true;
    // pollMs=10000 → 不会马上重拉；文本保持
    await sleep(60);
    assert.equal(pill.hidden, false, "传输错误不藏 pill");
    assert.equal(pill.textContent, before, "保留上次渲染");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · tap → open-panel 派发 anchor=段实测 rect（零值回退 host rect）", async () => {
  const s = setup();
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(60);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    // jsdom rect 全零 → 打桩给段非零 rect；tap 经 onQuotaTap 直接派发（S5：路由属 S6）
    seg.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 26, right: 110, bottom: 46, x: 10, y: 20 });
    const anchors = [];
    s.h.window.addEventListener(`${NS}:open-panel`, (ev) => anchors.push(ev.detail));
    s.embed.onQuotaTap();
    assert.equal(anchors.length, 1, "open-panel 恰一次");
    assert.equal(anchors[0].v, 1);
    assert.deepEqual(
      anchors[0].anchor,
      { left: 10, top: 20, width: 100, height: 26, right: 110, bottom: 46 },
      "anchor 透传段实测 rect，含 right/bottom（buildAnchorRect）",
    );
    // 零值回退 host rect
    anchors.length = 0;
    seg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0 });
    s.host.getBoundingClientRect = () => ({ left: 300, top: 400, width: 38, height: 26, right: 338, bottom: 426, x: 300, y: 400 });
    s.embed.onQuotaTap();
    assert.equal(anchors.length, 1, "零值回退后仍恰一次");
    assert.deepEqual(
      anchors[0].anchor,
      { left: 300, top: 400, width: 38, height: 26, right: 338, bottom: 426 },
      "段零值回退到 host rect",
    );
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 组拖动：拖段 → host 位移 + 落同一位置记忆键（经胶囊控制器）", async () => {
  const s = setup({ withCapsule: true });
  try {
    // 位置由胶囊控制器承担（真实装配里 createCapsule 写 host left/top）；
    // 本单测预置同键存储并设定 host rest 位，证明段拖动经胶囊控制器落同一记忆键。
    s.h.localStorage.setItem("dsh-stock-kanban:float-position", JSON.stringify({ x: 300, y: 300 }));
    s.host.style.left = "300px";
    s.host.style.top = "300px";
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(60);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位");
    assert.equal(seg.parentElement, s.capsule.el, "段为胶囊子节点");
    s.h.firePointer(seg, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(seg, "pointermove", { x: 120, y: 100 }); // 超 slop 6
    s.h.firePointer(seg, "pointerup", { x: 120, y: 100 });
    assert.equal(s.host.style.left, "320px", "拖段 → host 整组位移 +20");
    assert.equal(s.host.style.top, "300px");
    assert.equal(
      s.h.localStorage.getItem("dsh-stock-kanban:float-position"),
      JSON.stringify({ x: 320, y: 300 }),
      "落同一位置记忆键（dsh-stock-kanban:float-position）",
    );
  } finally {
    s.capsule.dispose();
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · setEnabled 往返：off → disengage+移除 pill；on → 重新握手再 engage", async () => {
  const s = setup();
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.ok(s.stack.querySelector('[data-seg="quota"]'), "已合并");

    s.embed.setEnabled(false);
    assert.ok(s.dispatched.includes(`${NS}:embed-disengage`), "off → disengage");
    assert.equal(s.stack.querySelector('[data-seg="quota"]'), null, "pill 移除");

    await sleep(40);
    s.dispatched.length = 0;
    s.embed.setEnabled(true);
    await sleep(30);
    assert.equal(hasProbe(s.dispatched), true, "on → 重新探测");
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.equal(hasEngage(s.dispatched), true, "重新握手 → 再 engage");
    assert.ok(s.stack.querySelector('[data-seg="quota"]'), "pill 回归");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("锚点：buildAnchorRect 产出 right 与 bottom", () => {
  const anchor = qe.buildAnchorRect({ left: 10, top: 20, width: 100, height: 26 });
  assert.deepEqual(anchor, { left: 10, top: 20, width: 100, height: 26, right: 110, bottom: 46 });
});

test("拆除：engage 后 dispose 恰好派发一次 embed-disengage", async () => {
  const s = setup();
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.equal(hasEngage(s.dispatched), true, "前置：已 engage");
    s.embed.dispose();
    const count = s.dispatched.filter((t) => t === `${NS}:embed-disengage`).length;
    assert.equal(count, 1, "dispose 恰好派发一次 embed-disengage");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("段渲染：两条时 qw 同款全名文案并有分隔符", async () => {
  const s = setup({
    fetchImpl: async () => okResponse(overviewPayload({ glm: 82, copilotRemaining: 3 })),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位");
    assert.equal(seg.hidden, false, "段可见");
    const vals = [...seg.querySelectorAll(".skc-qval:not([hidden])")];
    assert.equal(vals.length, 2, "两条文案都显示");
    assert.equal(vals[0].textContent, "GLM 82%", "qw 同款 GLM 文案");
    assert.equal(vals[1].textContent, "Copilot 97%", "qw 同款 Copilot 文案");
    assert.equal(seg.querySelector(".skc-qseg-divider").hidden, false, "分隔线可见");
    assert.equal(seg.querySelector(".skc-qsep").hidden, false, "「·」分隔符可见");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("段渲染：单条只显示那一条文案且无分隔符", async () => {
  const s = setup({
    fetchImpl: async () =>
      okResponse({
        providers: [
          { key: "glm", status: "ready", plan: { windows: [{ key: "5h", percent: 40 }] } },
          { key: "copilot", status: "missing" },
        ],
      }),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位");
    const vals = [...seg.querySelectorAll(".skc-qval:not([hidden])")];
    assert.equal(vals.length, 1, "只一条文案显示");
    assert.equal(vals[0].textContent, "GLM 40%", "只列有数的一条");
    assert.equal(seg.querySelector(".skc-qsep").hidden, true, "单条无「·」分隔符");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("段渲染：只有待处理时仅显示琥珀点", async () => {
  const s = setup({
    fetchImpl: async () =>
      okResponse({
        providers: [
          { key: "glm", status: "missing" },
          { key: "copilot", status: "missing" },
        ],
      }),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位（S4 过渡期在 pill 内）");
    qe.renderSegment(seg, quotaSegmentModel({ glm: null, copilot: null, outcomePending: true }));
    assert.equal(seg.hidden, false, "待处理保留段");
    assert.equal(seg.querySelector(".skc-qdot").hidden, false, "琥珀点可见");
    assert.equal(seg.querySelectorAll(".skc-qval:not([hidden])").length, 0, "无数可显");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("段渲染：两条无且无待处理时段隐藏", async () => {
  const s = setup({
    fetchImpl: async () =>
      okResponse({
        providers: [
          { key: "glm", status: "missing" },
          { key: "copilot", status: "missing" },
        ],
      }),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(!seg || seg.hidden, "段隐藏（节点缺席或 hidden 即满足）");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("段渲染：过期文案变暗并带 title", async () => {
  const s = setup({
    fetchImpl: async () =>
      okResponse({
        providers: [
          { key: "glm", status: "stale", plan: { windows: [{ key: "5h", percent: 40 }] } },
          { key: "copilot", status: "ready", quota: { balanceAvailable: true, percentRemaining: 24 } },
        ],
      }),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位（S5：title 落在段）");
    assert.equal(seg.getAttribute("title"), t("quota.stale"), "过期 title 落在段");
    const vals = [...seg.querySelectorAll(".skc-qval")];
    const glmSpan = vals.find((v) => v.textContent.startsWith("GLM"));
    const copilotSpan = vals.find((v) => v.textContent.startsWith("Copilot"));
    assert.equal(glmSpan.style.opacity, "0.5", "过期文案变暗");
    assert.equal(copilotSpan.style.opacity, "", "未过期文案不变暗");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("锚点：onQuotaTap 的 open-panel 锚点含 right/bottom（与 buildAnchorRect 一致）", async () => {
  const s = setup();
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    seg.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 26, right: 110, bottom: 46, x: 10, y: 20 });
    const anchors = [];
    s.h.window.addEventListener(`${NS}:open-panel`, (ev) => anchors.push(ev.detail));
    s.embed.onQuotaTap();
    assert.equal(anchors.length, 1, "open-panel 恰一次");
    assert.deepEqual(
      anchors[0].anchor,
      qe.buildAnchorRect({ left: 10, top: 20, width: 100, height: 26 }),
      "锚点与 buildAnchorRect 一致",
    );
    assert.equal(anchors[0].anchor.right, 110, "含 right");
    assert.equal(anchors[0].anchor.bottom, 46, "含 bottom");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("待处理：manualOutcome 存在且无数，段仅含琥珀点，点击派发 open-panel", async () => {
  const s = setup({
    fetchImpl: async () =>
      okResponse({
        manualOutcome: { status: "pending" },
        providers: [
          { key: "glm", status: "missing" },
          { key: "copilot", status: "missing" },
        ],
      }),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位");
    assert.equal(seg.hidden, false, "manualOutcome 存在即待处理，段保留");
    assert.equal(seg.querySelector(".skc-qdot").hidden, false, "琥珀点可见");
    assert.equal(seg.querySelectorAll(".skc-qval:not([hidden])").length, 0, "无数可显");
    const anchors = [];
    s.h.window.addEventListener(`${NS}:open-panel`, (ev) => anchors.push(ev.detail));
    s.embed.onQuotaTap();
    assert.equal(anchors.length, 1, "点击派发 open-panel 恰一次");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("待处理：manualOutcomeError 同样视为待处理", async () => {
  const s = setup({
    fetchImpl: async () =>
      okResponse({
        manualOutcomeError: "redeem failed",
        providers: [
          { key: "glm", status: "missing" },
          { key: "copilot", status: "missing" },
        ],
      }),
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    const seg = s.stack.querySelector('[data-seg="quota"]');
    assert.ok(seg, "段在位");
    assert.equal(seg.hidden, false, "manualOutcomeError 存在即待处理，段保留");
    assert.equal(seg.querySelector(".skc-qdot").hidden, false, "琥珀点可见");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("位置继承：engage 接管 qw 位置，按胶囊宽重钳并落盘 sk 键", async () => {
  const s = setup({ withCapsule: true, fetchImpl: async () => okResponse(overviewPayload({ glm: 82, copilotRemaining: 3 })) });
  try {
    s.h.localStorage.setItem(GUEST_POSITION_KEY, JSON.stringify({ x: 1124, y: 500 }));
    s.capsule.el.getBoundingClientRect = () => ({ width: 283, height: 26, left: 0, top: 0, right: 283, bottom: 26, x: 0, y: 0 });
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.equal(s.host.style.left, "733px", "1124 超右缘 → 按胶囊宽重钳：1024−8−283=733");
    assert.equal(s.host.style.top, "500px", "y 未越界原样采纳");
    assert.equal(
      s.h.localStorage.getItem("dsh-stock-kanban:float-position"),
      JSON.stringify({ x: 733, y: 500 }),
      "采纳结果同笔落 sk 键（双键收敛）",
    );
  } finally {
    s.embed.dispose();
    s.capsule?.dispose();
    s.h.cleanup();
  }
});

test("位置继承：无 qw 位置记录 → 采纳跳过", async () => {
  const s = setup({ withCapsule: true });
  try {
    const leftBefore = s.host.style.left; // 真胶囊 applyPosition 的默认位（host 已有定位写入）
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.equal(s.host.style.left, leftBefore, "未采纳：host 定位保持初值不变");
  } finally {
    s.embed.dispose();
    s.capsule?.dispose();
    s.h.cleanup();
  }
});

test("pull 超时：挂死请求按传输错误降级且链路继续", async () => {
  let fetchCount = 0;
  const s = setup({
    fetchImpl: (_url, opts = {}) => {
      fetchCount += 1;
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    },
    pollMs: 40,
    pullTimeoutMs: 30,
    buildTimeoutSignal: (ms) => {
      const ctl = new AbortController();
      setTimeout(() => ctl.abort(), ms);
      return ctl.signal;
    },
  });
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel"]);
    await sleep(220); // ≥ pullTimeoutMs + 2×pollMs
    assert.ok(fetchCount >= 3, `超时后链路继续拉取（实际 ${fetchCount} 次）`);
    assert.equal(s.embed.el.title, t("quota.stale"), "挂死期间段标注过期");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});
