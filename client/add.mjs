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
 *
 * 第三轮排版（2026-11-10）：
 *   - 未搜索时结果区给出按市场的示例（教学空态），无匹配/失败时同一位置给恢复路径；
 *   - 直连代码的校验失败/重复以内联错误呈现在输入区下方（不只靠底部 toast）；
 *   - 打开时聚焦搜索框（仅精细指针；触屏不主动弹软键盘）；
 *   - 搜索竞态：只采用最新一次请求的结果（慢响应不再覆盖新结果）。
 */

import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";
import { iconEl } from "./icons.mjs";
import { MARKETS } from "../src/identity.mjs";

/** 代码展示与列表一致：去掉 sh/sz/bj/hk 交易所前缀（list.mjs 同口径） */
const displayCode = (code) => String(code ?? "").replace(/^(sh|sz|bj|hk)/, "");
const isDuplicate = (result) => result.error?.status === 409 && result.error?.body?.error === "duplicate";
/** 失败文案：优先服务端稳定代码的本地化，其次原始信息，最后兜底 */
const errText = (error) => tErr(error?.body?.error) || String(error?.message ?? "") || t("err.api-error");
const isFinePointer = () => {
  try {
    return typeof globalThis.window?.matchMedia === "function" && globalThis.window.matchMedia("(pointer: fine)").matches;
  } catch {
    return false;
  }
};

export function createAdd({ store }) {
  let disposed = false;
  let snapshot = null;
  let market = null; // 惰性初始化为 ui.lastMarket
  let query = "";
  let results = null; // null = 未搜索
  let searching = false;
  let searchError = null;
  let searchSeq = 0; // 搜索竞态：只采用最新一次请求
  let directCode = "";
  let directError = null; // 直连代码的内联错误（重复/校验失败），输入即清除
  let busy = false;
  let debounceTimer = null;

  const onClose = () => store.setShowAdd(false);

  const doSearch = async (text, mkt) => {
    const needle = String(text ?? "").trim();
    if (!needle) {
      searchSeq += 1; // 作废仍在途的请求
      results = null;
      searchError = null;
      searching = false;
      render();
      return;
    }
    const seq = ++searchSeq;
    searching = true;
    searchError = null;
    render();
    try {
      const data = await api.search(mkt ?? market, needle);
      if (disposed || seq !== searchSeq) return;
      results = data.rows ?? [];
      searchError = data.error ?? null;
    } catch (e) {
      if (disposed || seq !== searchSeq) return;
      results = [];
      searchError = String(e?.message ?? e);
    } finally {
      if (!disposed && seq === searchSeq) {
        searching = false;
        render();
      }
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

  /** 结果行加入：失败呈现由本对话框负责（toast 统一出口，重复给明确提示） */
  const addResult = async (row) => {
    busy = true;
    render();
    const result = await store.addSymbol(row.market, row.code, null);
    busy = false;
    if (disposed) return;
    if (result.ok) store.setToast(t("toast.added", { name: row.name }));
    else if (isDuplicate(result)) store.setToast(t("toast.duplicate"));
    else if (!result.conflict) store.setToast(t("toast.op-failed", { e: errText(result.error) }));
    render();
  };

  const addDirect = async () => {
    const code = directCode.trim();
    if (!code || busy) return;
    busy = true;
    directError = null;
    render();
    const result = await store.addSymbol(market, code, null);
    busy = false;
    if (disposed) return;
    if (result.ok) {
      store.setToast(t("toast.added", { name: result.result?.symbol?.name ?? code }));
      directCode = "";
      directInput.value = "";
    } else if (isDuplicate(result)) {
      directError = t("toast.duplicate");
    } else if (result.error?.status === 422) {
      directError = t("add.not-found", { e: tErr(result.error.body?.error) || t("err.invalid-code") });
    } else if (!result.conflict) {
      directError = t("toast.op-failed", { e: errText(result.error) });
    }
    render();
  };

  /* ---------------- 静态骨架（一次构建；软键盘/IME 保活的前提） ---------------- */

  const el = document.createElement("div");
  // 钉住头/Tab/输入框/直连区：只有状态区+结果区内滚（2026-11-10 手机实录：整段滚动容器
  // 会让浏览器为聚焦框滚动，市场 Tab 被顶出截半）
  el.className = "skc-dialog skc-dialog--pinned";
  el.setAttribute("role", "dialog");

  const head = document.createElement("div");
  head.className = "skc-dialog-head";
  const title = document.createElement("span");
  title.className = "skc-section-title skc-dialog-title";
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
      // 切换市场即清空上一市场的结果：加载期间不残留他市场的行（否则可点击加入错市场的行）
      results = null;
      searchError = null;
      if (query.trim()) doSearch(query, m);
      else render();
    });
    tabs.append(tab);
    tabButtons.set(m, tab);
  }

  // 搜索输入：静态节点，渲染永不触碰其 value（软键盘与 IME 保活的关键）
  const queryInput = document.createElement("input");
  queryInput.className = "skc-input";
  queryInput.type = "text";
  queryInput.dataset.field = "query";
  queryInput.autocomplete = "off";
  queryInput.spellcheck = false;
  queryInput.enterKeyHint = "search";
  queryInput.addEventListener("input", () => onQueryInput(queryInput.value));
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch(query);
    if (e.key === "Escape") onClose();
  });

  // 动态区：状态（搜索中/错误/无匹配/教学示例）与结果行——随搜索状态整段重建；位于内滚区
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
  directInput.type = "text";
  directInput.dataset.field = "direct";
  directInput.autocomplete = "off";
  directInput.spellcheck = false;
  directInput.enterKeyHint = "done";
  directInput.addEventListener("input", () => {
    directCode = directInput.value;
    if (directError) directError = null;
    paintDirect();
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
  direct.append(directTitle, directRow, directHint);

  el.append(head, tabs, queryInput, scrollRegion, direct);

  /* ---------------- 渲染：只更新属性与动态区 ---------------- */

  /** 直连区（输入框旁按钮 + 提示/内联错误）：不触碰输入框 value */
  const paintDirect = () => {
    validateBtn.disabled = busy || !directCode.trim();
    if (directError) {
      directHint.className = "skc-error";
      directHint.textContent = directError;
    } else {
      directHint.className = "skc-hint";
      directHint.textContent = t("add.hint");
    }
  };

  const hintEl = (text) => {
    const node = document.createElement("div");
    node.className = "skc-hint";
    node.textContent = text;
    return node;
  };
  const errorEl = (text) => {
    const node = document.createElement("div");
    node.className = "skc-error";
    node.textContent = text;
    return node;
  };
  const guideEl = (text) => {
    const node = document.createElement("div");
    node.className = "skc-guide";
    node.textContent = text;
    return node;
  };

  const resultRow = (row, known) => {
    const isKnown = known.has(row.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skc-add-row";
    btn.dataset.id = row.id; // 重绘后按 id 归还键盘焦点（第三轮 2026-11-10）
    btn.disabled = busy || isKnown;
    btn.addEventListener("click", () => addResult(row));
    const main = document.createElement("span");
    main.className = "skc-add-main";
    const name = document.createElement("span");
    name.className = "skc-add-name";
    name.textContent = row.name;
    const code = document.createElement("span");
    code.className = "skc-code";
    code.textContent =
      displayCode(row.code) +
      (row.kind === "etf" ? " · ETF" : "") +
      (row.kind === "index" ? ` · ${t("kind.index")}` : "") +
      (row.market === "crypto" && row.quoteCurrency ? ` · ${row.quoteCurrency}` : "");
    main.append(name, code);
    btn.append(main);
    if (isKnown) {
      const badge = document.createElement("span");
      badge.className = "skc-badge";
      badge.textContent = t("badge.added");
      btn.append(badge);
    } else {
      const action = document.createElement("span");
      action.className = "skc-add-action";
      action.append(iconEl(document, "plus"));
      btn.append(action);
    }
    return btn;
  };

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
    el.setAttribute("aria-label", t("add.title"));
    title.textContent = t("add.title");
    closeBtn.setAttribute("aria-label", t("app.collapse"));
    directTitle.textContent = t("add.direct");
    validateBtn.textContent = t("add.validate");
    const placeholder = t(`add.search.${market}`);
    if (queryInput.placeholder !== placeholder) queryInput.placeholder = placeholder;
    const directPlaceholder = t(`add.direct.${market}`);
    if (directInput.placeholder !== directPlaceholder) directInput.placeholder = directPlaceholder;
    paintDirect();

    // 状态区（整段重建安全：非输入框）
    statusEl.replaceChildren();
    if (searching) {
      statusEl.append(hintEl(t("add.searching")));
    } else if (searchError) {
      statusEl.append(errorEl(t("add.search-error", { e: tErr(searchError) })));
    } else if (results && results.length === 0) {
      statusEl.append(guideEl(t("add.no-match", { q: query.trim() })));
    } else if (!results) {
      statusEl.append(guideEl(t(`add.guide.${market}`)));
    }

    // 结果区（整段重建安全：非输入框）；键盘焦点停在某结果行时，重绘后按 id 归还
    const focusedId = resultsEl.getRootNode?.().activeElement?.dataset?.id ?? null;
    resultsEl.replaceChildren();
    if (results && results.length > 0) {
      // 纵深防御：只渲染当前市场的行（服务端已有市场门禁，此处防止回归时串台）
      for (const row of results) if (row.market === market) resultsEl.append(resultRow(row, known));
    }
    if (focusedId != null) {
      [...resultsEl.children].find((node) => node.dataset?.id === focusedId && !node.disabled)?.focus({ preventScroll: true });
    }
  };

  const update = (next) => {
    if (disposed) return;
    snapshot = next;
    render();
  };

  /** 对话框刚打开（面板上升沿）：桌面端聚焦搜索框；触屏不主动弹软键盘 */
  const onOpen = () => {
    if (disposed || !isFinePointer()) return;
    queryInput.focus({ preventScroll: true });
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

  return { el, update, dispose, onOpen };
}
