// client 集成组（CEP v1 宿主侧，Plan B Task S5）：main.mjs 真实 mountKanban 下的 quota 全链。
// 覆盖：挂载后 / 挂载前两条握手路径；pill 与合并开关出现；engage 与心跳（间隔注入）；
// 组拖动（拖 quota pill → host 整组位移）；guest 消失 → disengage；quotaMerge off 不 engage；
// legacy 态（guest 在、不应答 = qw 0.1.37 真实态）零变化；传输错误 → title=quota.stale；dispose 全清。
import { test } from "node:test";
import assert from "node:assert/strict";

import { createDomHarness } from "./helpers/dom-harness.mjs";
import { t } from "../client/i18n.mjs";

const NS = "dsh-quota-watch";
const EV = (type) => `${NS}:${type}`;
const CAPS = ["hide-pill", "anchored-panel", "poll-pause"];
const POS_KEY = "dsh-stock-kanban:float-position";
const UI_KEY = "stock-kanban:ui:v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tick = () => sleep(5);

const STATE_BODY = { rev: 1, settings: { privacyMode: false }, symbols: [], driverKind: null };
const overviewBody = () => ({
  providers: [
    { key: "glm", status: "ready", plan: { windows: [{ key: "5h", percent: 82 }] } },
    { key: "copilot", status: "ready", quota: { balanceAvailable: true, percentRemaining: 3 } },
  ],
});
const json = (payload) =>
  new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });

const countOf = (log, type) => log.filter((e) => e === EV(type)).length;
const overviewFetches = (log) => log.filter((u) => u.includes("dsh-quota-watch/overview")).length;
const click = (h, el) => el.dispatchEvent(new h.window.MouseEvent("click", { bubbles: true }));

/** 假 guest：capabilities 非空 → 对 embed-probe 同步回复；capabilities=null → 不应答（legacy） */
function addGuest(h, { capabilities = CAPS } = {}) {
  const guest = h.document.createElement("div");
  guest.setAttribute("data-dsh-quota-watch-float", "");
  if (capabilities) {
    h.window.addEventListener(EV("embed-probe"), () => {
      h.window.dispatchEvent(
        new h.window.CustomEvent(EV("embed-capabilities"), {
          detail: { v: 1, capabilities, guestVersion: "0.1.38" },
          composed: true,
          bubbles: true,
        }),
      );
    });
  }
  h.document.body.append(guest);
  return guest;
}

async function importMainModule(tag) {
  return import(new URL(`../client/main.mjs?case=${tag}`, import.meta.url).href);
}

let caseSeq = 0;

/**
 * 真实 mountKanban 夹具。
 * - seed：挂载前写入 localStorage（位置记忆 / ui 偏好）。
 * - guestBeforeMount：挂载前即存在的 guest（同步握手路径）；缺省无 guest，由用例之后添加。
 * - fetch 桩：state / overview 可控；其它 URL 抛错，以捕获意外请求。
 * - win.setInterval 记录注册、由用例显式触发（心跳间隔注入，不依赖真实时钟）。
 *   已核实 client/ 中仅 quota-embed 使用 win.setInterval；store 轮询用的是全局 setInterval，不受影响。
 */
async function setupKanban({ seed = {}, guestBeforeMount = null } = {}) {
  const h = createDomHarness();
  h.setViewport(h.window, 1024, 768);
  for (const [k, v] of Object.entries(seed)) h.localStorage.setItem(k, v);

  const prev = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, { document: h.document, window: h.window, localStorage: h.localStorage });

  const ctl = { overviewOk: true };
  const fetchLog = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    fetchLog.push(u);
    if (u.includes("dsh-quota-watch/overview")) {
      if (!ctl.overviewOk) throw new TypeError("network down");
      return json(overviewBody());
    }
    if (u.includes("/stock-kanban/state")) return json(STATE_BODY);
    throw new TypeError(`unexpected fetch: ${u}`);
  };

  const intervals = new Map();
  let nextId = 1;
  h.window.setInterval = (fn, ms) => {
    const id = nextId++;
    intervals.set(id, { fn, ms });
    return id;
  };
  h.window.clearInterval = (id) => {
    intervals.delete(id);
  };

  const events = [];
  const origDispatch = h.window.dispatchEvent.bind(h.window);
  h.window.dispatchEvent = (ev) => {
    if (typeof ev?.type === "string" && ev.type.startsWith(`${NS}:`)) events.push(ev.type);
    return origDispatch(ev);
  };

  if (guestBeforeMount) addGuest(h, guestBeforeMount);

  const mod = await importMainModule(`s5-${++caseSeq}`);
  const dispose = mod.mountKanban({ doc: h.document, win: h.window, storage: h.localStorage });
  let disposed = false;
  const disposeOnce = () => {
    if (disposed) return;
    disposed = true;
    dispose();
  };

  const hostEl = () => h.document.body.querySelector("[data-dsh-stock-kanban-float]");
  const q = (sel) => hostEl()?.shadowRoot?.querySelector(sel) ?? null;

  const cleanup = () => {
    disposeOnce();
    h.cleanup();
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
    }
  };

  return {
    h,
    ctl,
    fetchLog,
    events,
    intervals,
    hostEl,
    pillOf: () => q(".skc-capsule--quota"),
    stockOf: () => q(".skc-capsule[data-dsh-stock-kanban-capsule]"),
    toggleBtnOf: () => q('.skc-footer [data-action="quota-merge"]'),
    disposeOnce,
    cleanup,
  };
}

test("S5 集成 · 挂载后 guest 握手：quota pill 与合并开关出现，engage 与心跳派发可见", async () => {
  const s = await setupKanban();
  try {
    assert.equal(s.pillOf(), null, "挂载时无 guest → 无 quota pill（默认零变化）");
    addGuest(s.h);
    await tick();
    const pill = s.pillOf();
    assert.ok(pill, "能力回复后 stack 内出现 quota pill");
    assert.equal(countOf(s.events, "embed-engage"), 1, "engage 派发一次");
    const btn = s.toggleBtnOf();
    assert.ok(btn, "能力在线 → footer 合并开关出现");
    assert.equal(btn.getAttribute("aria-pressed"), "true", "默认开");
    await tick();
    assert.ok(pill.textContent.includes("GLM"), "overview 渲染进 pill（GLM 段）");
    assert.equal(s.intervals.size, 1, "注册一个心跳 interval");
    for (const { fn } of s.intervals.values()) fn(); // 手动触发一次心跳
    assert.equal(countOf(s.events, "embed-heartbeat"), 1, "心跳 tick → 派发一次 embed-heartbeat");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · 挂载前即有 guest（同步握手路径）+ 默认开：首帧即合并", async () => {
  const s = await setupKanban({ guestBeforeMount: { capabilities: CAPS } });
  try {
    await tick();
    assert.ok(s.pillOf(), "挂载即合并（同步回复路径）");
    assert.ok(s.toggleBtnOf(), "开关随首帧呈现");
    assert.equal(s.toggleBtnOf().getAttribute("aria-pressed"), "true", "默认开");
    assert.equal(countOf(s.events, "embed-engage"), 1, "engage 一次");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · 拖 quota pill → host 整组位移，落同一位置记忆键", async () => {
  const s = await setupKanban({ seed: { [POS_KEY]: JSON.stringify({ x: 300, y: 300 }) } });
  try {
    addGuest(s.h);
    await tick();
    const pill = s.pillOf();
    assert.ok(pill, "quota pill 在位");
    const host = s.hostEl();
    assert.equal(host.style.left, "300px", "seed 位置已应用");
    s.h.firePointer(pill, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(pill, "pointermove", { x: 120, y: 100 }); // 超 slop 6
    s.h.firePointer(pill, "pointerup", { x: 120, y: 100 });
    assert.equal(host.style.left, "320px", "拖 quota pill → host 整组位移 +20");
    assert.equal(host.style.top, "300px", "纵向不变");
    assert.equal(s.h.localStorage.getItem(POS_KEY), JSON.stringify({ x: 320, y: 300 }), "落同一位置记忆键");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · legacy 态（guest 在、不应答 = qw 0.1.37 真实态）：无 pill、无开关、stock 胶囊零变化", async () => {
  const s = await setupKanban({ seed: { [POS_KEY]: JSON.stringify({ x: 300, y: 300 }) } });
  try {
    addGuest(s.h, { capabilities: null });
    await sleep(600); // 跨过 probeTimeoutMs（500）：超时后也不得补出任何段
    assert.equal(s.pillOf(), null, "无 quota pill");
    assert.equal(s.toggleBtnOf(), null, "无 footer 合并开关");
    assert.equal(countOf(s.events, "embed-engage"), 0, "零 engage");
    assert.equal(s.intervals.size, 0, "无心跳");
    assert.equal(overviewFetches(s.fetchLog), 0, "无 overview 拉取");
    const stock = s.stockOf();
    assert.ok(stock, "stock 胶囊在位");
    assert.equal(stock.classList.contains("skc-capsule--quota"), false, "stock 胶囊未被改写");
    s.h.firePointer(stock, "pointerdown", { x: 100, y: 100 });
    s.h.firePointer(stock, "pointermove", { x: 120, y: 100 });
    s.h.firePointer(stock, "pointerup", { x: 120, y: 100 });
    assert.equal(s.hostEl().style.left, "320px", "stock 单独拖拽照常（host +20）");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · quotaMerge off（seed ui:v1）：有能力也不 engage；开关呈关态；点击开 → 立即合并", async () => {
  const s = await setupKanban({
    seed: { [UI_KEY]: JSON.stringify({ quotaMerge: false }) },
    guestBeforeMount: { capabilities: CAPS },
  });
  try {
    await tick();
    assert.equal(s.pillOf(), null, "quotaMerge off → 不挂 pill");
    assert.equal(countOf(s.events, "embed-engage"), 0, "不 engage");
    assert.equal(s.intervals.size, 0, "无心跳");
    assert.equal(overviewFetches(s.fetchLog), 0, "不拉 overview");
    const btn = s.toggleBtnOf();
    assert.ok(btn, "能力在线 → 开关呈现（关态，可再开）");
    assert.equal(btn.getAttribute("aria-pressed"), "false", "关态");
    click(s.h, btn);
    await tick();
    assert.ok(s.pillOf(), "点击开 → 立即合并");
    assert.equal(countOf(s.events, "embed-engage"), 1, "engage 一次");
    assert.equal(s.toggleBtnOf().getAttribute("aria-pressed"), "true", "开关转开态");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · guest 消失（禁用/HMR）→ disengage：pill 移除、开关消失、心跳停", async () => {
  const s = await setupKanban();
  try {
    const guest = addGuest(s.h);
    await tick();
    assert.ok(s.pillOf(), "前置：已合并");
    assert.ok(s.toggleBtnOf(), "前置：开关在位");
    guest.remove();
    await tick();
    assert.equal(s.pillOf(), null, "pill 移除");
    assert.equal(s.toggleBtnOf(), null, "开关消失");
    assert.equal(countOf(s.events, "embed-disengage"), 1, "disengage 派发一次");
    assert.equal(s.intervals.size, 0, "心跳已 clearInterval");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · overview 传输错误：保留上次渲染，pill title = quota.stale；恢复后清除", async () => {
  const s = await setupKanban();
  try {
    addGuest(s.h);
    await tick();
    const pill = s.pillOf();
    assert.ok(pill && pill.textContent.includes("GLM"), "前置：已有上次渲染");
    assert.equal(pill.getAttribute("title"), null, "正常态无 stale title");
    // 传输错误：关→开 触发 engage→pull（拉取失败）
    s.ctl.overviewOk = false;
    click(s.h, s.toggleBtnOf());
    await tick();
    click(s.h, s.toggleBtnOf());
    await tick();
    const stale = s.pillOf();
    assert.ok(stale, "传输错误后 pill 保留");
    assert.ok(stale.textContent.includes("GLM"), "保留上次渲染内容");
    assert.equal(stale.getAttribute("title"), t("quota.stale"), "title = quota.stale");
    // 恢复：关→开 拉取成功 → title 清除
    s.ctl.overviewOk = true;
    click(s.h, s.toggleBtnOf());
    await tick();
    click(s.h, s.toggleBtnOf());
    await tick();
    assert.equal(s.pillOf().getAttribute("title"), null, "拉取恢复后清除 stale title");
  } finally {
    s.cleanup();
  }
});

test("S5 集成 · dispose 全清：宿主移除、心跳清除；dispose 后的能力回复不再 engage", async () => {
  const s = await setupKanban();
  try {
    addGuest(s.h);
    await tick();
    assert.ok(s.pillOf(), "前置：已合并");
    s.disposeOnce();
    assert.equal(s.hostEl(), null, "宿主已移除");
    assert.equal(s.intervals.size, 0, "心跳已清除");
    const before = countOf(s.events, "embed-engage");
    s.h.window.dispatchEvent(
      new s.h.window.CustomEvent(EV("embed-capabilities"), { detail: { v: 1, capabilities: CAPS } }),
    );
    assert.equal(countOf(s.events, "embed-engage"), before, "dispose 后不再 engage");
  } finally {
    s.cleanup();
  }
});
