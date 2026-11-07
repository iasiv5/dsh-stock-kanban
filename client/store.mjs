/**
 * 客户端状态存储（React 无关的极简 pub/sub + hook）。
 *
 * 两类状态严格分离（需求 9.2）：
 *   - business：服务端实例数据（rev/settings/symbols）+ quotes —— 全访问端共享；
 *   - ui：纯界面偏好（胶囊/面板几何、上次市场、筛选、MA 显隐、胶囊标的）—— 按访问端 localStorage 独立。
 * 永不把业务数据写入 localStorage。
 */

import { useEffect, useState } from "react";
import { api } from "./api.mjs";
import { snapToEdge } from "./fmt.mjs";

const UI_KEY = "stock-kanban:ui:v1";

const DEFAULT_UI = {
  panelOpen: false,
  view: "list", // 'list' | 'detail'（会话内状态；重开面板始终先列表）
  detailId: null,
  showAdd: false, // 会话态：添加对话框
  pos: null, // 胶囊 {x,y,dock}；null → 默认右上
  panelPos: null, // 面板 {x,y}
  lastMarket: "cn",
  holdingsOnly: false,
  maVisible: { 5: true, 10: true, 20: true, 60: true },
  capsuleSymbolId: null, // null → 第一个标的
};

function loadUi() {
  try {
    const raw = window.localStorage.getItem(UI_KEY);
    if (!raw) return { ...DEFAULT_UI };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_UI, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_UI };
  }
}

export function createStore() {
  let state = {
    business: { rev: 0, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: false },
    quotes: {}, // id → row
    quoteMeta: { fetchedAt: null, error: null },
    ui: loadUi(),
    toast: null,
    providers: null,
  };
  const listeners = new Set();

  const emit = () => { for (const l of [...listeners]) { try { l(); } catch { /* 订阅者异常不扩散 */ } } };

  const persistUi = () => {
    try {
      const { panelOpen, view, detailId, showAdd, toast, ...persisted } = state.ui; // 会话态不落盘
      window.localStorage.setItem(UI_KEY, JSON.stringify(persisted));
    } catch {
      /* localStorage 不可用（隐私模式等）：仅内存 */
    }
  };

  const set = (partial) => {
    state = { ...state, ...partial };
    emit();
  };
  const setUi = (partial) => {
    const ui = { ...state.ui, ...partial };
    set({ ui });
    persistUi();
  };

  /* ------------------------------------------------ 业务动作 */

  async function refreshState() {
    const data = await api.state();
    set({ business: { ...data, loaded: true } });
    // 胶囊标的若已被删除 → 回落第一个
    const ui = state.ui;
    if (ui.capsuleSymbolId && !data.symbols.some((s) => s.id === ui.capsuleSymbolId)) {
      setUi({ capsuleSymbolId: data.symbols[0]?.id ?? null });
    } else if (!ui.capsuleSymbolId && data.symbols.length > 0) {
      setUi({ capsuleSymbolId: data.symbols[0].id });
    }
    return data;
  }

  async function mutate(action) {
    // 统一变更入口：带 ifRev；409 → 刷新状态 + 明确提示（不静默覆盖）
    try {
      const result = await action(state.business.rev);
      await refreshState();
      return { ok: true, result };
    } catch (e) {
      if (e.status === 409) {
        await refreshState();
        setToast("数据已被其他页面更新，已为你刷新最新数据，请重试。");
        return { ok: false, conflict: true, error: e };
      }
      setToast(`操作失败：${e.message ?? e}`);
      return { ok: false, error: e };
    }
  }

  const addSymbol = (market, code, patch) => mutate((rev) => api.add(market, code, patch, rev));
  const updateSymbol = (id, patch) => mutate((rev) => api.update(id, patch, rev));
  const removeSymbol = (id) => mutate((rev) => api.remove(id, rev));
  const setPrivacy = (privacyMode) => mutate((rev) => api.setSettings({ privacyMode }, rev));
  const importBackup = (payload) => mutate((rev) => api.importBackup(payload, rev));

  /* ------------------------------------------------ 行情轮询 */

  let pollTimer = null;

  function quoteIdsFor(stateNow) {
    const { ui, business } = stateNow;
    if (ui.panelOpen) {
      if (ui.view === "detail" && ui.detailId) return [ui.detailId];
      const market = ui.lastMarket;
      const ids = business.symbols.filter((s) => s.market === market).map((s) => s.id);
      return ids.length > 0 ? ids : (ui.capsuleSymbolId ? [ui.capsuleSymbolId] : []);
    }
    const ids = new Set();
    if (ui.capsuleSymbolId) ids.add(ui.capsuleSymbolId);
    for (const s of business.symbols) {
      if (s.buyTarget != null || s.sellTarget != null) ids.add(s.id);
    }
    return [...ids];
  }

  async function pollQuotes() {
    const ids = quoteIdsFor(state);
    if (ids.length === 0) return;
    const full = state.ui.panelOpen && state.ui.view === "detail";
    try {
      const data = await api.quotes(ids, full);
      const quotes = { ...state.quotes };
      for (const [id, row] of Object.entries(data.rows ?? {})) quotes[id] = row;
      set({ quotes, providers: data.providers, quoteMeta: { fetchedAt: Date.now(), error: null } });
    } catch (e) {
      set({ quoteMeta: { fetchedAt: state.quoteMeta.fetchedAt, error: String(e?.message ?? e) } });
    }
  }

  function restartPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    const { ui } = state;
    if (typeof document !== "undefined" && document.hidden) return; // 隐藏期间不轮询，恢复可见时重启
    let intervalMs;
    if (!ui.panelOpen) intervalMs = 30000; // 收起：胶囊+目标价轻量刷新
    else if (ui.view === "detail") intervalMs = 15000;
    else intervalMs = 15000;
    pollTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      pollQuotes();
    }, intervalMs);
    pollQuotes(); // 立即拉一次
  }

  /* ------------------------------------------------ UI 动作 */

  function openPanel() {
    setUi({ panelOpen: true, view: "list", detailId: null, showAdd: false }); // 每次从胶囊展开：先列表（4.2）
    restartPolling();
  }
  function closePanel() {
    setUi({ panelOpen: false, view: "list", detailId: null });
    restartPolling();
  }
  function togglePanel() {
    if (state.ui.panelOpen) closePanel();
    else openPanel();
  }
  function openDetail(id) {
    setUi({ view: "detail", detailId: id }); // 返回列表时保留 lastMarket/holdingsOnly/滚动（列表不卸载）
    restartPolling();
  }
  function backToList() {
    setUi({ view: "list", detailId: null });
    restartPolling();
  }
  function setLastMarket(market) { setUi({ lastMarket: market }); }
  function setHoldingsOnly(v) { setUi({ holdingsOnly: v }); }
  function setMaVisible(v) { setUi({ maVisible: v }); }
  function setCapsuleSymbol(id) { setUi({ capsuleSymbolId: id }); }
  function setCapsulePos(pos) { setUi({ pos }); }
  function setPanelPos(pos) { setUi({ panelPos: pos }); }

  function setToast(text) {
    set({ toast: text ? { text, at: Date.now() } : null });
    if (text) {
      setTimeout(() => {
        if (state.toast && Date.now() - state.toast.at >= 3800) set({ toast: null });
      }, 4000);
    }
  }

  function setShowAdd(v) { setUi({ showAdd: v }); }

  /** 视口变化后保证胶囊仍可见（4.1） */
  function handleResize(capsuleSize) {
    const pos = state.ui.pos;
    if (!pos || !capsuleSize) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const snapped = snapToEdge(pos.x, pos.y, capsuleSize.w, capsuleSize.h, vw, vh);
    setCapsulePos(snapped);
  }

  /** 页面可见性恢复：立即拉一次并重启轮询（后台节流后的追赶） */
  function handleVisibility() {
    if (!document.hidden) restartPolling();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function getState() {
    return state;
  }

  return {
    subscribe, getState,
    refreshState, mutate, addSymbol, updateSymbol, removeSymbol, setPrivacy, importBackup,
    pollQuotes, restartPolling, openPanel, closePanel, togglePanel, openDetail, backToList,
    setLastMarket, setHoldingsOnly, setMaVisible, setCapsuleSymbol, setCapsulePos, setPanelPos,
    setToast, setShowAdd, handleResize, handleVisibility,
  };
}

/** hook：订阅 store（React 16.8+ 兼容写法，不依赖 useSyncExternalStore） */
export function useStore(store) {
  const [snapshot, setSnapshot] = useState(store.getState());
  useEffect(() => store.subscribe(() => setSnapshot(store.getState())), [store]);
  return snapshot;
}
