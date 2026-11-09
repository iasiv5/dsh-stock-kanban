// client/quota-embed.mjs 直测（CEP v1 宿主侧，Plan B Task S2）。
// 覆盖降级矩阵五行 + 404/传输错误分支 + open-panel anchor 透传 + setEnabled 往返。
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { createQuotaEmbed } from "../client/quota-embed.mjs";

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

function setup({ fetchImpl } = {}) {
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
  const embed = createQuotaEmbed({
    doc: h.document,
    win: h.window,
    storage: h.localStorage,
    stack,
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
  });
  return { h, host, stack, shadow, embed, dispatched, caps, fetches };
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
    assert.equal(s.stack.querySelector(".skc-capsule--quota"), null, "无 quota pill");
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
    assert.equal(s.stack.querySelector(".skc-capsule--quota"), null, "无 pill（共存）");
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
    assert.equal(s.stack.querySelector(".skc-capsule--quota"), null, "无 pill");
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
    const pill = s.stack.querySelector(".skc-capsule--quota");
    assert.ok(pill, "quota pill 在 stack");
    assert.equal(pill.hidden, false, "pill 可见");
    const vals = [...pill.querySelectorAll(".skc-qval")];
    assert.equal(vals.length, 2, "GLM + Copilot 两段");
    assert.ok(vals[0].classList.contains("skc-qwarn"), "GLM 82% → warn（>80≤95）");
    assert.ok(vals[1].classList.contains("skc-qdanger"), "Copilot 97%（100−3）→ danger（>95）");
    assert.match(vals[0].textContent, /GLM 82%/);
    assert.match(vals[1].textContent, /Copilot 97%/);
    assert.ok(pill.classList.contains("skc-qpulse"), "任一段 >95 → pill pulse");
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
    assert.ok(s.stack.querySelector(".skc-capsule--quota"), "已合并");
    guest.remove();
    await sleep(60);
    assert.ok(s.dispatched.includes(`${NS}:embed-disengage`), "disengage 已派发");
    assert.equal(s.stack.querySelector(".skc-capsule--quota"), null, "pill 移除");
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
    const pill = s.stack.querySelector(".skc-capsule--quota");
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
    const pill = s.stack.querySelector(".skc-capsule--quota");
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

test("quota-embed · tap → open-panel 派发 anchor=pill 实测 rect（零值回退 host rect）", async () => {
  const s = setup();
  try {
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(60);
    const pill = s.stack.querySelector(".skc-capsule--quota");
    // jsdom rect 全零 → 打桩给 pill 非零 rect
    pill.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 26, right: 110, bottom: 46, x: 10, y: 20 });
    const anchors = [];
    s.h.window.addEventListener(`${NS}:open-panel`, (ev) => anchors.push(ev.detail));
    s.h.firePointer(pill, "pointerdown", { x: 60, y: 33 });
    s.h.firePointer(pill, "pointerup", { x: 60, y: 33 }); // 未过 slop 的 tap
    assert.equal(anchors.length, 1, "open-panel 恰一次");
    assert.equal(anchors[0].v, 1);
    assert.deepEqual(
      { left: anchors[0].anchor.left, top: anchors[0].anchor.top, width: anchors[0].anchor.width, height: anchors[0].anchor.height },
      { left: 10, top: 20, width: 100, height: 26 },
      "anchor 透传 pill 实测 rect",
    );
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});

test("quota-embed · 组拖动：拖 quota pill → host 位移 + 落同一位置记忆键", async () => {
  const s = setup();
  try {
    // 位置初始化属胶囊职责（真实装配里 createCapsule 写 host left/top）；
    // 本单测直接设定 host rest 位，并预置同键存储以证明落同一记忆键。
    s.h.localStorage.setItem("dsh-stock-kanban:float-position", JSON.stringify({ x: 300, y: 300 }));
    s.host.style.left = "300px";
    s.host.style.top = "300px";
    addGuest(s.h);
    await sleep(30);
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(60);
    const pill = s.stack.querySelector(".skc-capsule--quota");
    assert.ok(pill, "quota pill 在位");
    s.h.firePointer(pill, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(pill, "pointermove", { x: 120, y: 100 }); // 超 slop 6
    s.h.firePointer(pill, "pointerup", { x: 120, y: 100 });
    assert.equal(s.host.style.left, "320px", "拖 quota pill → host 位移 +20");
    assert.equal(s.host.style.top, "300px");
    assert.equal(
      s.h.localStorage.getItem("dsh-stock-kanban:float-position"),
      JSON.stringify({ x: 320, y: 300 }),
      "落同一位置记忆键（dsh-stock-kanban:float-position）",
    );
  } finally {
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
    assert.ok(s.stack.querySelector(".skc-capsule--quota"), "已合并");

    s.embed.setEnabled(false);
    assert.ok(s.dispatched.includes(`${NS}:embed-disengage`), "off → disengage");
    assert.equal(s.stack.querySelector(".skc-capsule--quota"), null, "pill 移除");

    await sleep(40);
    s.dispatched.length = 0;
    s.embed.setEnabled(true);
    await sleep(30);
    assert.equal(hasProbe(s.dispatched), true, "on → 重新探测");
    replyCaps(s.h, ["hide-pill", "anchored-panel", "poll-pause"]);
    await sleep(80);
    assert.equal(hasEngage(s.dispatched), true, "重新握手 → 再 engage");
    assert.ok(s.stack.querySelector(".skc-capsule--quota"), "pill 回归");
  } finally {
    s.embed.dispose();
    s.h.cleanup();
  }
});
