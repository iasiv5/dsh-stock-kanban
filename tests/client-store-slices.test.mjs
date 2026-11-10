/**
 * store 切片广播契约测试（渲染切片广播 Task 1）。
 *
 * 钉住计划「接口契约」节的全部行为：
 *   - 实质变化判定域（quotes fingerprint 剔 fetchedAt / business.rev+loaded / ui 逐键 /
 *     quoteMeta.error / providers 引用 / toast 引用）；
 *   - 无实质变化不 emit；
 *   - changed 只随 emit 投递（浅拷贝快照），state 本体与 getState() / 订阅回放永不携带；
 *   - providers 引用是例外通道：poll 每 tick 新引用 → 恒 emit 空切片（B3 基线，例⑨）。
 *
 * fetch 注入：api.mjs 走全局 fetch + 绝对路径，stub globalThis.fetch 按前缀路由。
 * 时钟注入：setToast 的 4s 清除定时器用 node:test mock.timers 停表（例⑦），避免挂起进程。
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../client/store.mjs";

function createStorageStub(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

/** 全局 fetch stub：按前缀路由；返回恢复函数。handler 可带计数实现「首次/第二次不同响应」。 */
function stubFetch(routes) {
  const real = globalThis.fetch;
  globalThis.fetch = async (path) => {
    const hit = routes.find(([prefix]) => String(path).startsWith(prefix));
    if (!hit) throw new Error(`stub-fetch: no route for ${String(path)}`);
    const payload = await hit[1](String(path));
    return { ok: true, json: async () => payload };
  };
  return () => {
    globalThis.fetch = real;
  };
}

const SYMBOLS = [
  { id: "s1", market: "cn", code: "600519", name: "贵州茅台", sort: 0 },
  { id: "s2", market: "hk", code: "00700", name: "腾讯控股", sort: 1 },
];
const STATE_PAYLOAD = {
  rev: 5,
  settings: { privacyMode: false },
  symbols: SYMBOLS,
  driverKind: "stub",
};

const quoteRow = (price, fetchedAt) => ({
  id: "s1",
  status: "ok",
  price,
  changePercent: 2.1,
  name: "贵州茅台",
  quoteTime: "15:00:00",
  fetchedAt,
});

/** 种子：refreshState 写入 business/symbols + 默认 capsuleSymbolId（quoteIdsFor 才有目标可轮询） */
async function seedBusiness(store, rev = 5) {
  const restore = stubFetch([
    ["/stock-kanban/state", async () => ({ ...STATE_PAYLOAD, rev })],
  ]);
  try {
    await store.refreshState();
  } finally {
    restore();
  }
}

test("① 相同 quotes 内容（仅 fetchedAt 变化）且 providers 同引用 → 不 emit", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store);
  const providers = [{ name: "tencent", failures: 0 }];
  let first = true;
  const restore = stubFetch([
    ["/stock-kanban/quotes", async () => {
      const rows = { s1: quoteRow(1500.5, first ? 1000 : 2000) };
      first = false;
      return { rows, providers };
    }],
  ]);
  try {
    await store.pollQuotes(); // 首次：种子 quotes（emit）
    let emits = 0;
    store.subscribe(() => {
      emits += 1;
    });
    emits = 0; // 订阅即刻回放会计一次，清零后再驱动
    await store.pollQuotes(); // 第二次：内容全同、fetchedAt 变
    assert.equal(emits, 0, "fetchedAt 不在实质变化判定域 → 不 emit");
  } finally {
    restore();
    store.dispose();
  }
});

test("② 单 id price 变化 → emit 且 changed.quotes 为含该 id 的 Set", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store);
  const providers = [{ name: "tencent", failures: 0 }];
  let price = 1500.5;
  const restore = stubFetch([
    ["/stock-kanban/quotes", async () => {
      price += 1;
      return { rows: { s1: quoteRow(price, 1000 + price) }, providers };
    }],
  ]);
  try {
    await store.pollQuotes();
    const seen = [];
    store.subscribe((snap) => seen.push(snap));
    seen.length = 0; // 清掉即刻回放，只看后续驱动
    await store.pollQuotes();
    assert.equal(seen.length, 1, "price 变化 → emit 一次");
    const changed = seen[0].changed;
    assert.ok(changed, "快照携带 changed");
    assert.ok(changed.quotes instanceof Set, "changed.quotes 是 Set");
    assert.deepEqual([...changed.quotes], ["s1"]);
    assert.equal(changed.business, false);
    assert.deepEqual(changed.ui, []);
    assert.equal(changed.quoteMetaError, false);
  } finally {
    restore();
    store.dispose();
  }
});

test("③ ui 键变化 → changed.ui 含该键名", () => {
  const store = createStore(createStorageStub());
  const seen = [];
  store.subscribe((snap) => seen.push(snap));
  store.setLastMarket("hk");
  const changed = seen.at(-1).changed;
  assert.ok(changed, "setUi 产生 changed");
  assert.ok(changed.ui.includes("lastMarket"), `ui 切片含 lastMarket，实得 ${JSON.stringify(changed.ui)}`);
  assert.equal(changed.quotes.size, 0);
  assert.equal(changed.business, false);
  store.dispose();
});

test("④ rev 变化 → changed.business 为 true", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store, 5);
  const seen = [];
  store.subscribe((snap) => seen.push(snap));
  await seedBusiness(store, 6); // rev 5 → 6
  const changed = seen.at(-1).changed;
  assert.ok(changed, "rev 变化产生 changed");
  assert.equal(changed.business, true, "business 切片为 true");
  store.dispose();
});

test("⑤ quoteMeta.error 变化 → changed.quoteMetaError 为 true（quotes 空 Set）", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store);
  const providers = [{ name: "tencent", failures: 0 }];
  let fail = false;
  const real = globalThis.fetch;
  globalThis.fetch = async (path) => {
    if (String(path).startsWith("/stock-kanban/quotes") && fail) {
      return { ok: false, status: 500, json: async () => ({ error: "upstream-boom" }) };
    }
    const payload = fail ? null : { rows: { s1: quoteRow(1500.5, 1000) }, providers };
    return { ok: true, json: async () => payload };
  };
  try {
    await store.pollQuotes();
    const seen = [];
    store.subscribe((snap) => seen.push(snap));
    seen.length = 0; // 清掉即刻回放，只看后续驱动
    fail = true;
    await store.pollQuotes(); // 上游失败 → quoteMeta.error
    assert.equal(seen.length, 1, "error 变化 → emit 一次");
    const changed = seen[0].changed;
    assert.equal(changed.quoteMetaError, true);
    assert.equal(changed.quotes.size, 0, "失败 poll 不产生 quotes 切片");
  } finally {
    globalThis.fetch = real;
    store.dispose();
  }
});

test("⑥ 带切片 emit 之后新建订阅 → 回放快照 changed === undefined（changed 不残留回放路径）", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store);
  const providers = [{ name: "tencent", failures: 0 }];
  let price = 1500.5;
  const restore = stubFetch([
    ["/stock-kanban/quotes", async () => {
      price += 1;
      return { rows: { s1: quoteRow(price, 1000 + price) }, providers };
    }],
  ]);
  try {
    await store.pollQuotes();
    const firstSeen = [];
    const unsub1 = store.subscribe((snap) => firstSeen.push(snap));
    await store.pollQuotes(); // 带切片 emit
    assert.ok(firstSeen.at(-1).changed, "先决条件：老订阅者收到过带 changed 的快照");
    unsub1();
    const replay = [];
    store.subscribe((snap) => replay.push(snap)); // 新订阅：即刻回放
    assert.equal(replay.length, 1);
    assert.equal(replay[0].changed, undefined, "回放走 state 本体 → 无 changed → 全量");
  } finally {
    restore();
    store.dispose();
  }
});

test("⑦ 仅 toast 变化 → emit 但 quotes 空 Set / business false / ui 空数组（B3 基线）", (t) => {
  assert.ok(typeof t.mock?.timers?.enable === "function", "node>=20.4 mock timers");
  t.mock.timers.enable({ apis: ["setTimeout"] }); // 停掉 setToast 的 4s 清除定时器
  const store = createStore(createStorageStub());
  const seen = [];
  store.subscribe((snap) => seen.push(snap));
  store.setToast("已保存");
  const changed = seen.at(-1).changed;
  assert.ok(changed, "toast 变化 → emit");
  assert.equal(changed.quotes.size, 0);
  assert.equal(changed.business, false);
  assert.deepEqual(changed.ui, []);
  assert.equal(changed.quoteMetaError, false);
  store.dispose();
});

test("⑧ 带切片 emit 投递 changed，但 getState() 永不携带 changed（state 纯净）", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store);
  const providers = [{ name: "tencent", failures: 0 }];
  let price = 1500.5;
  const restore = stubFetch([
    ["/stock-kanban/quotes", async () => {
      price += 1;
      return { rows: { s1: quoteRow(price, 1000 + price) }, providers };
    }],
  ]);
  try {
    await store.pollQuotes();
    const seen = [];
    store.subscribe((snap) => seen.push(snap));
    await store.pollQuotes();
    assert.ok(seen.at(-1).changed, "投递副本携带 changed");
    assert.equal("changed" in store.getState(), false, "state 本体纯净");
  } finally {
    restore();
    store.dispose();
  }
});

test("⑨ providers 引用变化、其余判定域全等 → 照常 emit 且 quotes 空 Set（poll 恒 emit 基线）", async () => {
  const store = createStore(createStorageStub());
  await seedBusiness(store);
  let first = true;
  const restore = stubFetch([
    ["/stock-kanban/quotes", async () => {
      // 行内容全同（含 fetchedAt 同值），providers 每次新引用（模拟 routes/health 每响应新构造）
      const rows = { s1: quoteRow(1500.5, 1000) };
      const providers = first ? [{ name: "tencent", failures: 0 }] : [{ name: "tencent", failures: 0 }];
      first = false;
      return { rows, providers };
    }],
  ]);
  try {
    await store.pollQuotes();
    const seen = [];
    store.subscribe((snap) => seen.push(snap));
    seen.length = 0; // 清掉即刻回放，只看后续驱动
    await store.pollQuotes();
    assert.equal(seen.length, 1, "providers 引用变化 → 恒 emit（例外通道）");
    const changed = seen[0].changed;
    assert.equal(changed.quotes.size, 0, "quotes 内容全等 → 空切片");
    assert.equal(changed.business, false);
    assert.deepEqual(changed.ui, []);
  } finally {
    restore();
    store.dispose();
  }
});
