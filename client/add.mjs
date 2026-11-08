/**
 * 添加标的：先选市场（默认当前 Tab），搜索为主 + 直连代码；搜索失败明确提示；重复添加被拒（409）。
 */

import { createElement as h, useState, useRef, useEffect } from "react";
import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";
import { MARKETS } from "../src/identity.mjs";

export function AddDialog({ store, business, defaultMarket, onClose }) {
  const [market, setMarket] = useState(defaultMarket);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = 未搜索
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [directCode, setDirectCode] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus?.();
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const doSearch = async (text, mkt) => {
    const needle = String(text ?? "").trim();
    if (!needle) { setResults(null); setSearchError(null); return; }
    setSearching(true);
    try {
      const data = await api.search(mkt ?? market, needle);
      setResults(data.rows ?? []);
      setSearchError(data.error ?? null);
    } catch (e) {
      setResults([]);
      setSearchError(String(e?.message ?? e));
    } finally {
      setSearching(false);
    }
  };

  const onQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 300);
  };

  const addResult = async (row) => {
    setBusy(true);
    const result = await store.addSymbol(row.market, row.code, null);
    setBusy(false);
    if (result.ok) store.setToast(t("toast.added", { name: row.name }));
    else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") store.setToast(t("toast.duplicate"));
  };

  const addDirect = async () => {
    const code = directCode.trim();
    if (!code) return;
    setBusy(true);
    const result = await store.addSymbol(market, code, null);
    setBusy(false);
    if (result.ok) {
      store.setToast(t("toast.added", { name: code }));
      setDirectCode("");
    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
      store.setToast(t("toast.duplicate"));
    } else if (result.error?.status === 422) {
      store.setToast(t("add.not-found", { e: tErr(result.error.body?.error) }));
    }
  };

  const known = new Set(business.symbols.map((s) => s.id));

  return h("div", { className: "skc-dialog" },
    h("div", { className: "skc-dialog-head" },
      h("span", { className: "skc-section-title" }, t("add.title")),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-icon-btn", onClick: onClose }, "✕")),
    h("div", { className: "skc-tabs" },
      MARKETS.map((m) => h("button", {
        key: m,
        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
        onClick: () => { setMarket(m); if (query.trim()) doSearch(query, m); },
      }, t(`market.${m}`))),
    ),
    h("input", {
      ref: inputRef,
      className: "skc-input",
      placeholder: t(`add.search.${market}`),
      value: query,
      onChange: (e) => onQueryChange(e.target.value),
      onKeyDown: (e) => { if (e.key === "Enter") doSearch(query); if (e.key === "Escape") onClose(); },
    }),
    searching ? h("div", { className: "skc-hint" }, t("add.searching")) : null,
    searchError ? h("div", { className: "skc-error" }, t("add.search-error", { e: searchError })) : null,
    results && results.length > 0 ? h("div", { className: "skc-add-results" },
      results.map((row) => h("button", {
        key: row.id,
        className: "skc-add-row",
        disabled: busy || known.has(row.id),
        onClick: () => addResult(row),
      },
        h("span", { className: "skc-add-name" }, row.name),
        h("span", { className: "skc-code" }, row.code + (row.kind === "etf" ? " · ETF" : "") + (row.market === "crypto" ? ` · ${row.quoteCurrency}` : "")),
        known.has(row.id) ? h("span", { className: "skc-badge" }, t("badge.added")) : null,
      ))) : null,
    results && !searching && !searchError && results.length === 0 ? h("div", { className: "skc-hint" }, t("add.no-match")) : null,
    h("div", { className: "skc-direct" },
      h("span", { className: "skc-section-title" }, t("add.direct")),
      h("div", { className: "skc-direct-row" },
        h("input", {
          className: "skc-input",
          placeholder: t(`add.direct.${market}`),
          value: directCode,
          onChange: (e) => setDirectCode(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter") addDirect(); },
        }),
        h("button", { className: "skc-btn skc-btn-primary", disabled: busy || !directCode.trim(), onClick: addDirect }, t("add.validate")),
      ),
      h("div", { className: "skc-hint" }, t("add.hint")),
    ),
  );
}
