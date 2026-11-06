/**
 * 添加标的：先选市场（默认当前 Tab），搜索为主 + 直连代码；搜索失败明确提示；重复添加被拒（409）。
 */

import { createElement as h, useState, useRef, useEffect } from "react";
import { api } from "./api.mjs";
import { MARKETS, MARKET_LABELS } from "../src/identity.mjs";

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
      setSearchError(`搜索接口不可用：${e.message ?? e}`);
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
    if (result.ok) {
      store.setToast(`已添加 ${row.name}`);
    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
      store.setToast("该标的已在自选中");
    }
  };

  const addDirect = async () => {
    const code = directCode.trim();
    if (!code) return;
    setBusy(true);
    const result = await store.addSymbol(market, code, null);
    setBusy(false);
    if (result.ok) {
      store.setToast(`已添加 ${code}`);
      setDirectCode("");
    } else if (result.error?.status === 409 && result.error?.body?.error === "duplicate") {
      store.setToast("该标的已在自选中");
    } else if (result.error?.status === 422) {
      store.setToast(`代码无效或行情不可用（${result.error.body?.error ?? "invalid"}）——直连添加必须通过行情校验`);
    }
  };

  const known = new Set(business.symbols.map((s) => s.id));

  return h("div", { className: "skc-dialog" },
    h("div", { className: "skc-dialog-head" },
      h("span", { className: "skc-section-title" }, "添加标的"),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-icon-btn", onClick: onClose }, "✕")),
    h("div", { className: "skc-tabs skc-add-tabs" },
      MARKETS.map((m) => h("button", {
        key: m,
        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
        onClick: () => { setMarket(m); if (query.trim()) doSearch(query, m); },
      }, MARKET_LABELS[m])),
    ),
    h("input", {
      ref: inputRef,
      className: "skc-input",
      placeholder: market === "crypto" ? "搜索币种或交易对，如 BTC / 以太坊" : "搜索名称或代码…",
      value: query,
      onChange: (e) => onQueryChange(e.target.value),
      onKeyDown: (e) => { if (e.key === "Enter") doSearch(query); if (e.key === "Escape") onClose(); },
    }),
    searching ? h("div", { className: "skc-hint" }, "搜索中…") : null,
    searchError ? h("div", { className: "skc-error" }, `${searchError} —— 不展示虚构结果，请稍后重试或直接输入准确代码。`) : null,
    results && results.length > 0 ? h("div", { className: "skc-add-results" },
      results.map((row) => h("button", {
        key: row.id,
        className: `skc-add-row${known.has(row.id) ? " skc-add-known" : ""}`,
        disabled: busy || known.has(row.id),
        onClick: () => addResult(row),
      },
        h("span", { className: "skc-add-name" }, row.name),
        h("span", { className: "skc-code" }, row.code + (row.kind === "etf" ? " · ETF" : "") + (row.market === "crypto" ? ` · ${row.quoteCurrency} 对` : "")),
        known.has(row.id) ? h("span", { className: "skc-badge" }, "已添加") : null,
      ))) : null,
    results && !searching && !searchError && results.length === 0 ? h("div", { className: "skc-hint" }, "无匹配结果") : null,
    h("div", { className: "skc-direct" },
      h("span", { className: "skc-section-title" }, "直接输入代码"),
      h("div", { className: "skc-direct-row" },
        h("input", {
          className: "skc-input",
          placeholder: market === "cn" ? "如 600519 / 000001 / sh510300" : market === "hk" ? "如 00700" : market === "us" ? "如 AAPL" : "如 BTC-USDT",
          value: directCode,
          onChange: (e) => setDirectCode(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter") addDirect(); },
        }),
        h("button", { className: "skc-btn skc-btn-primary", disabled: busy || !directCode.trim(), onClick: addDirect }, "校验并添加"),
      ),
      h("div", { className: "skc-hint" }, "直连代码同样要过行情校验（取到有效价格才收），无效代码不会被加入。"),
    ),
  );
}
