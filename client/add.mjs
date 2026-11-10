/**
 * 添加标的（vanilla）：先选市场（默认当前 Tab），搜索为主 + 直连代码；
 * 搜索失败明确提示；重复添加被拒（409）。输入事件原位更新不重绘，
 * 异步搜索完成后仅整段重绘「状态区 + 结果区」。
 *
 * 结构纪律（2026-11-10 手机软键盘修复）：对话框骨架（头部/市场 Tab/搜索框/直连区）
 * 一次构建、永不 replaceChildren。旧实现整段重绘会把聚焦中的输入框一并销毁，移动端
 * 不带用户手势的程序化 focus() 无法唤回软键盘 → 每键一次键盘消失；面板开着时的行情
 * 轮询（15s）同样打断输入。骨架静态化后焦点天然保活，中文 IME 组合输入也不再被
 * 重建打断（回归钉：client-restyle.test.mjs「搜索不重建输入框」节点身份断言）。
 */

import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";
import { iconEl } from "./icons.mjs";
import { MARKETS } from "../src/identity.mjs";

export function createAdd({ store }) {
  let disposed = false;
  let snapshot = null;
  let market = null; // 惰性初始化为 ui.lastMarket
  let query = "";
  let results = null; // null = 未搜索
  let searching = false;
  let searchError = null;
  let directCode = "";
  let busy = false;
  let debounceTimer = null;

  const onClose = () => store.setShowAdd(false);

  const doSearch = async (text, mkt) => {
    const needle = String(text ?? "").trim();
    if (!needle) {
      results = null;
      searchError = null;
      render();
      return;
    }
    searching = true;
    render();
    try {
      const data = await api.search(mkt ?? market, needle);
      if (disposed) return;
      results = data.rows ?? [];
      searchError = data.error ?? null;
    } catch (e) {
      if (disposed) return;
      results = [];
      searchError = String(e?.message ?? e);
    } finally {
      searching = false;
      if (!disposed) render();
    }
  };

  const onQueryInput = (value) => {
    query = value;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      doSearch(query);
    }, 300);
  };

  const addResult = async (row) => {
    busy = true;
    render();
    const result = await store.addSymbol(row.market, row.code, null);
    busy = false;
    if (disposed) return;
    render();
    if (result.ok) store.setToast(t("toast.added", { name: row.name }));
    else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
      store.setToast(t("toast.duplicate"));
    }
  };

  const addDirect = async () => {
    const code = directCode.trim();
    if (!code) return;
    busy = true;
    render();
    const result = await store.addSymbol(market, code, null);
    busy = false;
    if (disposed) return;
    if (result.ok) {
      store.setToast(t("toast.added", { name: code }));
      directCode = "";
    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
      store.setToast(t("toast.duplicate"));
    } else if (result.error?.status === 422) {
      store.setToast(t("add.not-found", { e: tErr(result.error.body?.error) }));
    }
    render();
  };

  /* ---------------- 静态骨架（一次构建；软键盘/IME 保活的前提） ---------------- */

  const el = document.createElement("div");
  // 钉住头/Tab/输入框/直连区：只有状态区+结果区内滚（2026-11-10 手机实录：整段滚动容器
  // 会让浏览器为聚焦框滚动，市场 Tab 被顶出截半）
  el.className = "skc-dialog skc-dialog--pinned";

  const head = document.createElement("div");
  head.className = "skc-dialog-head";
  const title = document.createElement("span");
  title.className = "skc-section-title";
  title.textContent = t("add.title");
  const spacer = document.createElement("span");
  spacer.className = "skc-spacer";
  const closeBtn = document.createElement("button");
  closeBtn.className = "skc-icon-btn";
  closeBtn.type = "button";
  closeBtn.append(iconEl(document, "close"));
  closeBtn.setAttribute("aria-label", t("app.collapse"));
  closeBtn.addEventListener("click", onClose);
  head.append(title, spacer, closeBtn);

  const tabs = document.createElement("div");
  tabs.className = "skc-tabs";
  const tabButtons = new Map();
  for (const m of MARKETS) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "skc-tab";
    tab.textContent = t(`market.${m}`);
    tab.addEventListener("click", () => {
      market = m;
      if (query.trim()) doSearch(query, m);
      else render();
    });
    tabs.append(tab);
    tabButtons.set(m, tab);
  }

  // 搜索输入：静态节点，渲染永不触碰其 value（软键盘与 IME 保活的关键）
  const queryInput = document.createElement("input");
  queryInput.className = "skc-input";
  queryInput.dataset.field = "query";
  queryInput.addEventListener("input", () => onQueryInput(queryInput.value));
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch(query);
    if (e.key === "Escape") onClose();
  });

  // 动态区：状态（搜索中/错误/无匹配）与结果行——随搜索状态整段重建；位于内滚区
  const statusEl = document.createElement("div");
  const resultsEl = document.createElement("div");
  resultsEl.className = "skc-add-results";
  const scrollRegion = document.createElement("div");
  scrollRegion.className = "skc-dialog-scroll";
  scrollRegion.append(statusEl, resultsEl);

  const direct = document.createElement("div");
  direct.className = "skc-direct";
  const directTitle = document.createElement("span");
  directTitle.className = "skc-section-title";
  directTitle.textContent = t("add.direct");
  const directRow = document.createElement("div");
  directRow.className = "skc-direct-row";
  const directInput = document.createElement("input");
  directInput.className = "skc-input";
  directInput.dataset.field = "direct";
  directInput.addEventListener("input", () => {
    directCode = directInput.value;
    validateBtn.disabled = busy || !directCode.trim();
  });
  directInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addDirect();
  });
  const validateBtn = document.createElement("button");
  validateBtn.className = "skc-btn skc-btn-primary";
  validateBtn.type = "button";
  validateBtn.textContent = t("add.validate");
  validateBtn.addEventListener("click", addDirect);
  directRow.append(directInput, validateBtn);
  const directHint = document.createElement("div");
  directHint.className = "skc-hint";
  directHint.textContent = t("add.hint");
  direct.append(directTitle, directRow, directHint);

  el.append(head, tabs, queryInput, scrollRegion, direct);

  /* ---------------- 渲染：只更新属性与动态区 ---------------- */

  const render = () => {
    if (disposed) return;
    const business = snapshot?.business ?? { symbols: [] };
    if (market === null) {
      const last = snapshot?.ui?.lastMarket;
      market = MARKETS.includes(last) ? last : "cn";
    }
    const known = new Set(business.symbols.map((s) => s.id));

    // 静态区：只改类名/placeholder/disabled/文案，不重建结构、不碰 value
    // 语言实时跟随：骨架静态文案重套 t()（保持 12.9 实时切换语义）
    for (const [m, tab] of tabButtons) {
      if (tab.firstChild) tab.firstChild.nodeValue = t(`market.${m}`);
      tab.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
    }
    title.textContent = t("add.title");
    closeBtn.setAttribute("aria-label", t("app.collapse"));
    directTitle.textContent = t("add.direct");
    directHint.textContent = t("add.hint");
    validateBtn.textContent = t("add.validate");
    const placeholder = t(`add.search.${market}`);
    if (queryInput.placeholder !== placeholder) queryInput.placeholder = placeholder;
    const directPlaceholder = t(`add.direct.${market}`);
    if (directInput.placeholder !== directPlaceholder) directInput.placeholder = directPlaceholder;
    validateBtn.disabled = busy || !directCode.trim();

    // 状态区（整段重建安全：非输入框）
    statusEl.replaceChildren();
    if (searching) {
      const hint = document.createElement("div");
      hint.className = "skc-hint";
      hint.textContent = t("add.searching");
      statusEl.append(hint);
    }
    if (searchError) {
      const err = document.createElement("div");
      err.className = "skc-error";
      err.textContent = t("add.search-error", { e: searchError });
      statusEl.append(err);
    }
    if (results && !searching && !searchError && results.length === 0) {
      const hint = document.createElement("div");
      hint.className = "skc-hint";
      hint.textContent = t("add.no-match");
      statusEl.append(hint);
    }

    // 结果区（整段重建安全：非输入框）
    resultsEl.replaceChildren();
    if (results && results.length > 0) {
      for (const row of results) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skc-add-row";
        btn.disabled = busy || known.has(row.id);
        btn.addEventListener("click", () => addResult(row));
        const name = document.createElement("span");
        name.className = "skc-add-name";
        name.textContent = row.name;
        const code = document.createElement("span");
        code.className = "skc-code";
        code.textContent = row.code + (row.kind === "etf" ? " · ETF" : "") + (row.market === "crypto" ? ` · ${row.quoteCurrency}` : "");
        btn.append(name, code);
        if (known.has(row.id)) {
          const badge = document.createElement("span");
          badge.className = "skc-badge";
          badge.textContent = t("badge.added");
          btn.append(badge);
        }
        resultsEl.append(btn);
      }
    }
  };

  const update = (next) => {
    if (disposed) return;
    snapshot = next;
    render();
  };

  const dispose = () => {
    disposed = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    el.replaceChildren();
    el.remove();
  };

  return { el, update, dispose };
}
