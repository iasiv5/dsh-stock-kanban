/**
 * 客户端状态存储（vanilla 订阅漏斗，无框架依赖）。
 *
 * 两类状态严格分离（需求 9.2）：
 *   - business：服务端实例数据（rev/settings/symbols）+ quotes —— 全访问端共享；
 *   - ui：纯界面偏好（上次市场、筛选、MA 显隐、胶囊标的）—— 按访问端 localStorage 独立。
 * 永不把业务数据写入 localStorage。
 *
 * 位置记忆已移出（vanilla 重写 Task 7）：胶囊坐标由 client/float-prefs.mjs +
 * 胶囊 DOM 持有（键 dsh-stock-kanban:float-position）；面板锚定胶囊即位置，
 * 无独立位置记忆。
 */

import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";

const UI_KEY = "stock-kanban:ui:v1";
/** 落盘字段集（会话态 panelOpen/view/detailId/showAdd/showSettings/quotaCapable 不落盘） */
const UI_PERSIST_KEYS = ["lastMarket", "holdingsOnly", "maVisible", "capsuleSymbolId", "quotaMerge"];

const DEFAULT_UI = {
  panelOpen: false,
  view: "list", // 'list' | 'detail'（会话内状态；重开面板始终先列表）
  detailId: null,
  showAdd: false, // 会话态：添加对话框
  showSettings: false, // 会话态：设置对话框（备份与迁移）
  quotaCapable: false, // 会话态：quota-watch 嵌入能力在线（onCapabilityChange 驱动；footer 开关门控；不落盘）
  lastMarket: "cn",
  holdingsOnly: false,
  maVisible: { 5: true, 10: true, 20: true, 60: true },
  capsuleSymbolId: null, // null → 第一个标的
  quotaMerge: true, // 持久：合并显示 quota（默认开；仅能力在线时生效）
};

/** 读旧 ui:v1 时只取白名单键：退役的 pos/panelPos 与未知键一律忽略，不抛错 */
function loadUi(storage) {
  const ui = { ...DEFAULT_UI };
  try {
    const raw = storage.getItem(UI_KEY);
    if (!raw) return ui;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return ui;
    for (const key of UI_PERSIST_KEYS) {
      if (key in parsed) ui[key] = parsed[key];
    }
    return ui;
  } catch {
    return ui;
  }
}

export function createStore(storage = window.localStorage) {
  let state = {
    business: { rev: 0, settings: { privacyMode: false }, symbols: [], driverKind: null, loaded: false },
    quotes: {}, // id → row
    quoteMeta: { fetchedAt: null, error: null },
    ui: loadUi(storage),
    toast: null,
    providers: null,
  };
  const listeners = new Set();

  const emit = () => { for (const l of [...listeners]) { try { l(state); } catch { /* 订阅者异常不扩散 */ } } };

  const persistUi = () => {
    try {
      const persisted = {};
      for (const key of UI_PERSIST_KEYS) persisted[key] = state.ui[key];
      storage.setItem(UI_KEY, JSON.stringify(persisted));
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
        setToast(t("toast.conflict"));
        return { ok: false, conflict: true, error: e };
      }
      setToast(t("toast.op-failed", { e: tErr(e.body?.error, String(e?.message ?? e)) }));
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
    setUi({ panelOpen: true, view: "list", detailId: null, showAdd: false, showSettings: false }); // 每次从胶囊展开：先列表（4.2）
    restartPolling();
  }
  function closePanel() {
    setUi({ panelOpen: false, view: "list", detailId: null, showSettings: false });
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
  function setQuotaMerge(v) { setUi({ quotaMerge: v }); }
  function setQuotaCapable(v) { setUi({ quotaCapable: v }); }

  function setToast(text) {
    set({ toast: text ? { text, at: Date.now() } : null });
    if (text) {
      setTimeout(() => {
        if (state.toast && Date.now() - state.toast.at >= 3800) set({ toast: null });
      }, 4000);
    }
  }

  function setShowAdd(v) { setUi({ showAdd: v }); }
  function setShowSettings(v) { setUi({ showSettings: v }); }

  /** 页面可见性恢复：立即拉一次并重启轮询（后台节流后的追赶） */
  function handleVisibility() {
    if (!document.hidden) restartPolling();
  }

  /** 订阅漏斗：即刻回放当前快照一次；之后每次 set 收到新快照。返回止订函数。 */
  function subscribe(listener) {
    listeners.add(listener);
    try { listener(state); } catch { /* 回放异常不扩散 */ }
    return () => listeners.delete(listener);
  }
  function getState() {
    return state;
  }

  /** 释放：清轮询定时器与订阅者（Task 13 dispose 契约） */
  function dispose() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    listeners.clear();
  }

  return {
    subscribe, getState, dispose,
    refreshState, mutate, addSymbol, updateSymbol, removeSymbol, setPrivacy, importBackup,
    pollQuotes, restartPolling, openPanel, closePanel, togglePanel, openDetail, backToList,
    setLastMarket, setHoldingsOnly, setMaVisible, setCapsuleSymbol,
    setQuotaMerge, setQuotaCapable,
    setToast, setShowAdd, setShowSettings, handleVisibility,
  };
}
