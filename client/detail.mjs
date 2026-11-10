/**
 * 详情视图（vanilla）：行情头部（行情时间/拉取时间区分）、图表（分时/日K/周K/月K + 均线 +
 * 成交量）、持仓编辑、目标价编辑、删除标的。快速切换标的时以 fetchKey 守卫异步响应
 * （12.2 无串数据）。update(snapshot) 整段重绘；表单草稿在输入事件中原位更新不触发重绘，
 * 重绘时恢复焦点与光标。
 */

import { api } from "./api.mjs";
import { fmtPrice, fmtPct, fmtAmount, maskIf, trendClass, parsePositiveInput, fmtClock, fmtClockSec } from "./fmt.mjs";
import { buildMinuteChart, buildCandleChart, buildMaLegend } from "./charts.mjs";
import { iconEl } from "./icons.mjs";
import { t, tErr } from "./i18n.mjs";
import { checkTargetRelation } from "../src/identity.mjs";

const PERIODS = [
  { key: "minute", label: () => t("detail.period.minute") },
  { key: "day", label: () => t("detail.period.day") },
  { key: "week", label: () => t("detail.period.week") },
  { key: "month", label: () => t("detail.period.month") },
];

function textSpan(className, text) {
  const el = document.createElement("span");
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

export function createDetail({ store }) {
  let disposed = false;
  let snapshot = null;
  let period = "minute";
  let chart = { key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null, prevClose: null, date: null };
  let chartKey = "";
  let loadedKey = ""; // 已发起加载的 fetchKey（同 key 的快照更新不重拉）
  let form = null;
  let overlapHint = false;
  let lastDetailId;

  const el = document.createElement("div");

  const symbolOf = () =>
    snapshot?.business?.symbols?.find((s) => s.id === snapshot?.ui?.detailId) ?? null;
  const draftOf = (symbol) =>
    form ?? {
      quantity: symbol.quantity != null ? String(symbol.quantity) : "",
      avgCost: symbol.avgCost != null ? String(symbol.avgCost) : "",
      buyTarget: symbol.buyTarget != null ? String(symbol.buyTarget) : "",
      sellTarget: symbol.sellTarget != null ? String(symbol.sellTarget) : "",
    };

  /** 图表加载（fetchKey 守卫：响应回来时若 key 已变则丢弃） */
  const loadChart = (symbol) => {
    const key = `${symbol.id}:${period}`;
    loadedKey = key;
    chartKey = key;
    chart = { ...chart, key, loading: true };
    const load = period === "minute" ? api.minute(symbol.id) : api.kline(symbol.id, period);
    load.then((data) => {
      if (disposed || chartKey !== key) return;
      chart = {
        key,
        loading: false,
        data: period === "minute" ? data : data.candles,
        error: data.error ?? null,
        errorDetail: data.errorDetail ?? null,
        adjust: data.adjust ?? null,
        prevClose: data.prevClose ?? null,
        date: data.date ?? null,
      };
      render();
    }).catch((e) => {
      if (disposed || chartKey !== key) return;
      chart = { key, loading: false, data: null, error: "fetch-failed", errorDetail: String(e?.message ?? e), adjust: null };
      render();
    });
  };

  const confirmBox = (message) => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok = window.confirm(message);
      return ok === true;
    }
    return true; // 无 confirm 环境（测试）默认放行
  };

  const saveHoldings = async (symbol) => {
    const draft = draftOf(symbol);
    const quantity = parsePositiveInput(draft.quantity);
    const avgCost = parsePositiveInput(draft.avgCost);
    if (quantity === undefined || avgCost === undefined) {
      store.setToast(t("detail.err.numbers"));
      return;
    }
    const result = await store.updateSymbol(symbol.id, { quantity, avgCost });
    if (result.ok) {
      form = null;
      store.setToast(t("toast.position-saved"));
      render();
    }
  };

  const clearHoldings = async (symbol) => {
    const result = await store.updateSymbol(symbol.id, { quantity: null, avgCost: null });
    if (result.ok) {
      form = null;
      store.setToast(t("toast.position-cleared"));
      render();
    }
  };

  const saveTargets = async (symbol) => {
    const draft = draftOf(symbol);
    const buyTarget = parsePositiveInput(draft.buyTarget);
    const sellTarget = parsePositiveInput(draft.sellTarget);
    if (buyTarget === undefined || sellTarget === undefined) {
      store.setToast(t("detail.err.targets"));
      return;
    }
    const relation = checkTargetRelation(buyTarget, sellTarget);
    if (relation.overlap && !confirmBox(t("detail.confirm.overlap"))) return;
    overlapHint = relation.overlap;
    const result = await store.updateSymbol(symbol.id, { buyTarget, sellTarget });
    if (result.ok) {
      form = null;
      store.setToast(t("toast.targets-saved"));
      render();
    }
  };

  const removeSymbol = async (symbol) => {
    if (!confirmBox(t("detail.confirm.remove", { name: symbol.name }))) return;
    const result = await store.removeSymbol(symbol.id);
    if (result.ok) store.backToList();
  };

  const setDraft = (field, value) => {
    const symbol = symbolOf();
    if (!symbol) return;
    form = { ...draftOf(symbol), [field]: value };
    // 输入原位反映在 DOM，无需重绘
  };

  /** 图表宽随详情内宽自适应：面板 320px 时约 280px；移动端 sheet 变宽时同步加宽（封顶 372）；隐藏态取回退 280 */
  const chartWidth = () => {
    const inner = el.clientWidth - 14; // 图表框 padding 6×2 + border 1×2
    return inner > 0 ? Math.min(372, Math.max(240, inner)) : 280;
  };

  const buildChartBox = (symbol, ui) => {
    const box = document.createElement("div");
    box.className = "skc-chartbox";
    const chartErrorText = chart.error ? tErr(chart.error, chart.errorDetail) || chart.error : null;
    if (chart.loading) {
      // 骨架态（operate.md：内容区用 skeleton，不用文字 spinner）+ 保留文案供读屏
      const loading = document.createElement("div");
      loading.className = "skc-chart-loading";
      const price = document.createElement("div");
      price.className = "skc-skeleton skc-skeleton-price";
      const vol = document.createElement("div");
      vol.className = "skc-skeleton skc-skeleton-vol";
      const caption = document.createElement("span");
      caption.className = "skc-skeleton-caption";
      caption.textContent = t("detail.chart.loading");
      loading.append(price, vol, caption);
      box.append(loading);
    } else if (chartErrorText) {
      const err = document.createElement("div");
      err.className = "skc-chart-empty skc-chart-error";
      err.textContent = t("detail.chart.error", { e: chartErrorText });
      box.append(err);
    } else if (period === "minute") {
      box.append(buildMinuteChart(
        { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null },
        { dark: false, width: chartWidth() },
      ));
    } else {
      box.append(buildCandleChart(chart.data ?? [], { maVisible: ui.maVisible, dark: false, width: chartWidth() }));
    }
    return box;
  };

  const buildFormInput = (field, value, placeholder) => {
    const input = document.createElement("input");
    input.className = "skc-input";
    input.inputMode = "decimal";
    input.placeholder = placeholder;
    input.value = value;
    input.dataset.field = field;
    input.addEventListener("input", () => setDraft(field, input.value));
    return input;
  };

  const render = () => {
    if (disposed) return;
    const symbol = symbolOf();
    const ui = snapshot?.ui ?? {};
    const quotes = snapshot?.quotes ?? {};
    const privacy = snapshot?.business?.settings?.privacyMode === true;

    // 焦点保持：重绘前记录活动输入，重绘后恢复
    const active = typeof document !== "undefined" && document.activeElement && el.contains(document.activeElement)
      ? document.activeElement
      : null;
    const activeField = active?.dataset?.field ?? null;
    const activePos = active ? { start: active.selectionStart, end: active.selectionEnd } : null;

    el.replaceChildren();

    if (!symbol) {
      const empty = document.createElement("div");
      empty.className = "skc-empty";
      empty.textContent = t("detail.missing");
      el.append(empty);
      return;
    }

    const q = quotes[symbol.id];
    const price = q?.status === "ok" ? q.price : null;
    const pct = q?.changePercent ?? null;
    const hasPos = symbol.quantity != null && symbol.quantity > 0;
    const m = q?.metrics;
    const draft = draftOf(symbol);

    const head = document.createElement("div");
    head.className = "skc-detail-head";
    const back = document.createElement("button");
    back.className = "skc-btn skc-btn-ghost";
    back.type = "button";
    back.append(iconEl(document, "back"), document.createTextNode(t("detail.back")));
    back.addEventListener("click", () => store.backToList());
    head.append(back, textSpan("skc-detail-title", symbol.name));
    head.append(textSpan("skc-code", `${symbol.code} · ${t(`market.${symbol.market}`)}${symbol.kind === "etf" ? " · ETF" : ""} · ${symbol.quoteCurrency}`));
    head.append(textSpan("skc-spacer", ""));
    const del = document.createElement("button");
    del.className = "skc-btn skc-btn-danger";
    del.type = "button";
    del.append(iconEl(document, "trash", { strokeWidth: 1.4 }), document.createTextNode(t("detail.delete")));
    del.addEventListener("click", () => removeSymbol(symbol));
    head.append(del);

    const quoteLine = document.createElement("div");
    quoteLine.className = "skc-quote-line";
    quoteLine.append(textSpan(`skc-quote-price ${trendClass(pct)}`,
      price != null ? fmtPrice(price) : q ? (q.status === "error" ? t("list.quote-failed") : "…") : "—"));
    quoteLine.append(textSpan(`skc-quote-pct ${trendClass(pct)}`, fmtPct(pct)));
    const quoteMeta = document.createElement("span");
    quoteMeta.className = "skc-quote-meta";
    const qTime = q?.quoteTime ?? null;
    const fTime = q?.fetchedAt ?? null;
    const dataStale = q?.target?.status === "stale" || q?.target?.status === "no-data";
    const quoteTimeText = q && q.status === "ok" && qTime != null ? fmtClock(qTime) : "—";
    const fetchTimeText = fTime != null ? fmtClockSec(fTime) : "—";
    quoteMeta.append(document.createTextNode(t("detail.quote-time", { t: quoteTimeText, f: fetchTimeText })));
    if (dataStale) {
      quoteMeta.append(textSpan("skc-badge skc-badge-stale", q?.target?.status === "stale" ? t("detail.stale") : t("detail.no-data")));
    }
    quoteLine.append(quoteMeta);

    const periodTabs = document.createElement("div");
    periodTabs.className = "skc-period-tabs";
    for (const p of PERIODS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `skc-tab skc-period${p.key === period ? " skc-tab-active" : ""}`;
      btn.textContent = p.label();
      btn.addEventListener("click", () => {
        if (period === p.key) return;
        period = p.key;
        const s = symbolOf();
        render();
        if (s) loadChart(s);
      });
      periodTabs.append(btn);
    }
    if (period !== "minute") {
      periodTabs.append(buildMaLegend(ui.maVisible, (p) =>
        store.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false })));
      if (chart.adjust) {
        periodTabs.append(textSpan("skc-adjust", chart.adjust === "qfq" ? t("detail.adjust.fwd") : t("detail.adjust.none")));
      }
    }

    const chartBox = buildChartBox(symbol, ui);

    const holdings = document.createElement("div");
    holdings.className = "skc-holdings";
    const holdingsTitle = document.createElement("div");
    holdingsTitle.className = "skc-section-title";
    holdingsTitle.append(document.createTextNode(t("detail.holdings")));
    if (hasPos && m) {
      holdingsTitle.append(textSpan("skc-section-meta", privacy
        ? `${maskIf(true, "")}${symbol.quoteCurrency}`
        : t("detail.holdings.meta", {
            v: m.marketValue != null ? fmtAmount(m.marketValue) : "—",
            ccy: symbol.quoteCurrency,
            p: m.pnl != null ? fmtAmount(m.pnl) : (m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote")),
            pct: m.pnlPct != null ? fmtPct(m.pnlPct) : "—",
          })));
    }
    holdings.append(holdingsTitle);
    const holdingsGrid = document.createElement("div");
    holdingsGrid.className = "skc-form-grid";
    const qtyLabel = document.createElement("label");
    qtyLabel.append(document.createTextNode(t(symbol.market === "crypto" ? "detail.quantity.coins" : "detail.quantity.shares")));
    qtyLabel.append(buildFormInput("quantity", draft.quantity, t("detail.blank-clears")));
    const costLabel = document.createElement("label");
    costLabel.append(document.createTextNode(t("detail.avg-cost", { ccy: symbol.quoteCurrency })));
    costLabel.append(buildFormInput("avgCost", draft.avgCost, t("detail.blank-clears")));
    const holdingsActions = document.createElement("div");
    holdingsActions.className = "skc-form-actions";
    const savePos = document.createElement("button");
    savePos.className = "skc-btn skc-btn-primary";
    savePos.type = "button";
    savePos.textContent = t("detail.save-position");
    savePos.addEventListener("click", () => saveHoldings(symbol));
    const clearPos = document.createElement("button");
    clearPos.className = "skc-btn";
    clearPos.type = "button";
    clearPos.textContent = t("detail.clear-position");
    clearPos.addEventListener("click", () => clearHoldings(symbol));
    holdingsActions.append(savePos, clearPos);
    holdingsGrid.append(qtyLabel, costLabel, holdingsActions);
    holdings.append(holdingsGrid);

    const targets = document.createElement("div");
    targets.className = "skc-targets";
    const targetsTitle = document.createElement("div");
    targetsTitle.className = "skc-section-title";
    targetsTitle.append(document.createTextNode(t("detail.targets")));
    if (overlapHint) targetsTitle.append(textSpan("skc-badge skc-badge-stale", t("detail.overlap")));
    targets.append(targetsTitle);
    const targetsGrid = document.createElement("div");
    targetsGrid.className = "skc-form-grid";
    const buyLabel = document.createElement("label");
    buyLabel.append(document.createTextNode(t("detail.buy-target", { ccy: symbol.quoteCurrency })));
    buyLabel.append(buildFormInput("buyTarget", draft.buyTarget, t("detail.unset")));
    const sellLabel = document.createElement("label");
    sellLabel.append(document.createTextNode(t("detail.sell-target", { ccy: symbol.quoteCurrency })));
    sellLabel.append(buildFormInput("sellTarget", draft.sellTarget, t("detail.unset")));
    const targetsActions = document.createElement("div");
    targetsActions.className = "skc-form-actions";
    const saveT = document.createElement("button");
    saveT.className = "skc-btn skc-btn-primary";
    saveT.type = "button";
    saveT.textContent = t("detail.save-targets");
    saveT.addEventListener("click", () => saveTargets(symbol));
    targetsActions.append(saveT);
    targetsGrid.append(buyLabel, sellLabel, targetsActions);
    targets.append(targetsGrid);
    const hint = document.createElement("div");
    hint.className = "skc-hint";
    hint.textContent = t("detail.targets.hint");
    targets.append(hint);

    el.append(head, quoteLine, periodTabs, chartBox, holdings, targets);

    if (activeField) {
      const input = el.querySelector(`input[data-field="${activeField}"]`);
      if (input) {
        input.focus();
        if (activePos && typeof input.setSelectionRange === "function") {
          try { input.setSelectionRange(activePos.start, activePos.end); } catch { /* 类型不符时忽略 */ }
        }
      }
    }
  };

  const update = (next) => {
    if (disposed) return;
    snapshot = next;
    const ui = next?.ui ?? {};
    const symbol = symbolOf();

    // detailId 变化：重置会话态（period 保留，语义与 React 版一致）
    const detailChanged = ui.detailId !== lastDetailId;
    if (detailChanged) {
      lastDetailId = ui.detailId;
      form = null;
      overlapHint = false;
      chartKey = "";
      chart = { key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null, prevClose: null, date: null };
    }
    if (symbol) {
      const key = `${symbol.id}:${period}`;
      if (key !== loadedKey) loadChart(symbol);
    }
    // 编辑中跳过轮询驱动的重绘（手机软键盘保活，2026-11-10）：持仓/目标价输入聚焦时，
    // update() 整段重绘会销毁聚焦框——移动端程序化 focus() 唤不回软键盘。跳过期间行情
    // 展示短暂走旧值（最长一个轮询周期），失焦后的下一次快照即带上最新数据重绘。
    // detailId 变化不豁免（旧输入框属于旧标的，必须重建）。
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (!detailChanged && active && el.contains(active) && active.dataset?.field) return;
    render();
  };

  const dispose = () => {
    disposed = true;
    el.replaceChildren();
    el.remove();
  };

  return { el, update, dispose };
}
