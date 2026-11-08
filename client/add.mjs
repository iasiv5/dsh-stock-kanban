/**
 * 添加标的（vanilla）：先选市场（默认当前 Tab），搜索为主 + 直连代码；
 * 搜索失败明确提示；重复添加被拒（409）。输入事件原位更新不重绘，
 * 异步搜索完成后整段重绘（保焦）。
 */

import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";
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

  const el = document.createElement("div");
  el.className = "skc-dialog";

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

  const render = () => {
    if (disposed) return;
    const business = snapshot?.business ?? { symbols: [] };
    if (market === null) {
      const last = snapshot?.ui?.lastMarket;
      market = MARKETS.includes(last) ? last : "cn";
    }
    const known = new Set(business.symbols.map((s) => s.id));

    // 焦点保持
    const active = typeof document !== "undefined" && document.activeElement && el.contains(document.activeElement)
      ? document.activeElement
      : null;
    const activeField = active?.dataset?.field ?? null;
    const activePos = active ? { start: active.selectionStart, end: active.selectionEnd } : null;

    el.replaceChildren();

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
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", onClose);
    head.append(title, spacer, closeBtn);

    const tabs = document.createElement("div");
    tabs.className = "skc-tabs";
    for (const m of MARKETS) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
      tab.textContent = t(`market.${m}`);
      tab.addEventListener("click", () => {
        market = m;
        if (query.trim()) doSearch(query, m);
        else render();
      });
      tabs.append(tab);
    }

    const queryInput = document.createElement("input");
    queryInput.className = "skc-input";
    queryInput.dataset.field = "query";
    queryInput.placeholder = t(`add.search.${market}`);
    queryInput.value = query;
    queryInput.addEventListener("input", () => onQueryInput(queryInput.value));
    queryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch(query);
      if (e.key === "Escape") onClose();
    });

    el.append(head, tabs, queryInput);

    if (searching) {
      const hint = document.createElement("div");
      hint.className = "skc-hint";
      hint.textContent = t("add.searching");
      el.append(hint);
    }
    if (searchError) {
      const err = document.createElement("div");
      err.className = "skc-error";
      err.textContent = t("add.search-error", { e: searchError });
      el.append(err);
    }
    if (results && results.length > 0) {
      const list = document.createElement("div");
      list.className = "skc-add-results";
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
        list.append(btn);
      }
      el.append(list);
    }
    if (results && !searching && !searchError && results.length === 0) {
      const hint = document.createElement("div");
      hint.className = "skc-hint";
      hint.textContent = t("add.no-match");
      el.append(hint);
    }

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
    directInput.placeholder = t(`add.direct.${market}`);
    directInput.value = directCode;
    directInput.addEventListener("input", () => {
      directCode = directInput.value;
    });
    directInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addDirect();
    });
    const validateBtn = document.createElement("button");
    validateBtn.className = "skc-btn skc-btn-primary";
    validateBtn.type = "button";
    validateBtn.disabled = busy || !directCode.trim();
    validateBtn.textContent = t("add.validate");
    validateBtn.addEventListener("click", addDirect);
    directRow.append(directInput, validateBtn);
    const directHint = document.createElement("div");
    directHint.className = "skc-hint";
    directHint.textContent = t("add.hint");
    direct.append(directTitle, directRow, directHint);
    el.append(direct);

    if (activeField) {
      const input = el.querySelector(`input[data-field="${activeField}"]`);
      if (input) {
        input.focus();
        if (activePos && typeof input.setSelectionRange === "function") {
          try { input.setSelectionRange(activePos.start, activePos.end); } catch { /* 忽略 */ }
        }
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
