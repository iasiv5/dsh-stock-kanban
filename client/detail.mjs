/**
 * 详情视图：行情头部（含行情时间/拉取时间区分）、图表（分时/日K/周K/月K + 均线 + 成交量）、
 * 持仓编辑、目标价编辑、删除标的。快速切换标的时以 fetchKey 守卫异步响应（12.2 无串数据）。
 */

import { createElement as h, useEffect, useRef, useState } from "react";
import { api } from "./api.mjs";
import { fmtPrice, fmtPct, fmtAmount, fmtQty, maskIf, trendClass, parsePositiveInput, fmtClock, fmtClockSec, fmtDate } from "./fmt.mjs";
import { MinuteChart, CandleChart, MaLegend } from "./charts.mjs";
import { MARKET_LABELS, checkTargetRelation } from "../src/identity.mjs";

const PERIODS = [
  { key: "minute", label: "分时" },
  { key: "day", label: "日K" },
  { key: "week", label: "周K" },
  { key: "month", label: "月K" },
];

function Field({ label, value, privacy, mono }) {
  return h("div", { className: "skc-field" },
    h("span", { className: "skc-field-label" }, label),
    h("span", { className: `skc-field-value${mono ? " skc-mono" : ""}` }, privacy ? maskIf(true, value) : value));
}

export function Detail({ store, ui, business, quotes, privacy }) {
  const symbol = business.symbols.find((s) => s.id === ui.detailId);
  const [period, setPeriod] = useState("minute");
  const [chart, setChart] = useState({ key: "", loading: false, data: null, error: null, adjust: null });
  const chartKeyRef = useRef("");
  const [form, setForm] = useState(null); // { quantity, avgCost, buyTarget, sellTarget } 字符串草稿
  const [overlapHint, setOverlapHint] = useState(false);

  // 切标的/标的被删时：重置草稿与图表
  useEffect(() => {
    setForm(null);
    setOverlapHint(false);
    chartKeyRef.current = "";
    setChart({ key: "", loading: false, data: null, error: null, adjust: null });
  }, [ui.detailId]);

  // 图表加载（fetchKey 守卫：响应回来时若 key 已变则丢弃）
  useEffect(() => {
    if (!symbol) return;
    const key = `${symbol.id}:${period}`;
    chartKeyRef.current = key;
    setChart((c) => ({ ...c, key, loading: true }));
    const load = period === "minute"
      ? api.minute(symbol.id)
      : api.kline(symbol.id, period);
    load.then((data) => {
      if (chartKeyRef.current !== key) return; // 已切换：丢弃过期响应
      setChart({
        key,
        loading: false,
        data: period === "minute" ? data : data.candles,
        error: data.error ?? null,
        adjust: data.adjust ?? null,
        prevClose: data.prevClose ?? null,
        date: data.date ?? null,
      });
    }).catch((e) => {
      if (chartKeyRef.current !== key) return;
      setChart({ key, loading: false, data: null, error: `加载失败：${e.message ?? e}`, adjust: null });
    });
  }, [symbol?.id, period]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!symbol) {
    return h("div", { className: "skc-detail skc-empty" }, "标的不存在或已被删除");
  }

  const q = quotes[symbol.id];
  const price = q?.status === "ok" ? q.price : null;
  const pct = q?.changePercent ?? null;
  const hasPos = symbol.quantity != null && symbol.quantity > 0;
  const m = q?.metrics;
  const draft = form ?? {
    quantity: symbol.quantity != null ? String(symbol.quantity) : "",
    avgCost: symbol.avgCost != null ? String(symbol.avgCost) : "",
    buyTarget: symbol.buyTarget != null ? String(symbol.buyTarget) : "",
    sellTarget: symbol.sellTarget != null ? String(symbol.sellTarget) : "",
  };
  const setDraft = (key, value) => setForm({ ...draft, [key]: value });

  const saveHoldings = async () => {
    const quantity = parsePositiveInput(draft.quantity);
    const avgCost = parsePositiveInput(draft.avgCost);
    if (quantity === undefined || avgCost === undefined) {
      store.setToast("数量与平均成本必须是正数（留空表示清除）");
      return;
    }
    const result = await store.updateSymbol(symbol.id, { quantity, avgCost });
    if (result.ok) { setForm(null); store.setToast("持仓已保存"); }
  };
  const clearHoldings = async () => {
    const result = await store.updateSymbol(symbol.id, { quantity: null, avgCost: null });
    if (result.ok) { setForm(null); store.setToast("已清除持仓"); }
  };
  const saveTargets = async () => {
    const buyTarget = parsePositiveInput(draft.buyTarget);
    const sellTarget = parsePositiveInput(draft.sellTarget);
    if (buyTarget === undefined || sellTarget === undefined) {
      store.setToast("目标价必须是正数（留空表示不设置）");
      return;
    }
    const relation = checkTargetRelation(buyTarget, sellTarget);
    if (relation.overlap) {
      // 明确校验：重叠允许保存但必须显式确认（不静默覆盖任一状态）
      const confirmed = window.confirm("买入目标价不低于卖出目标价：价格可能同时满足两个条件（两个标记会同时显示）。仍要保存吗？");
      if (!confirmed) return;
      setOverlapHint(true);
    } else {
      setOverlapHint(false);
    }
    const result = await store.updateSymbol(symbol.id, { buyTarget, sellTarget });
    if (result.ok) { setForm(null); store.setToast("目标价已保存"); }
  };
  const remove = async () => {
    if (!window.confirm(`从自选中删除「${symbol.name}」？（持仓与目标价一并移除，可用备份恢复）`)) return;
    const result = await store.removeSymbol(symbol.id);
    if (result.ok) store.backToList();
  };

  const qTime = q?.quoteTime ?? null;
  const fTime = q?.fetchedAt ?? null;
  const dataStale = q?.target?.status === "stale" || q?.target?.status === "no-data";

  return h("div", { className: "skc-detail" },
    h("div", { className: "skc-detail-head" },
      h("button", { className: "skc-btn skc-btn-ghost", onClick: () => store.backToList() }, "← 返回列表"),
      h("span", { className: "skc-detail-title" }, symbol.name),
      h("span", { className: "skc-code" }, `${symbol.code} · ${MARKET_LABELS[symbol.market]}${symbol.kind === "etf" ? " · ETF" : ""} · ${symbol.quoteCurrency}`),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-btn skc-btn-danger", onClick: remove }, "删除"),
    ),
    h("div", { className: "skc-quote-line" },
      h("span", { className: `skc-quote-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : (q ? (q.status === "error" ? "行情失败" : "…") : "—")),
      h("span", { className: `skc-quote-pct ${trendClass(pct)}` }, fmtPct(pct)),
      h("span", { className: "skc-quote-meta" },
        `行情 ${q && q.status === "ok" ? (qTime != null ? fmtClock(qTime) : "—") : "—"} · 拉取 ${fTime != null ? fmtClockSec(fTime) : "—"}`,
        dataStale ? h("span", { className: "skc-badge skc-badge-stale" }, q?.target?.status === "stale" ? "行情过期" : "行情缺失") : null,
      ),
    ),
    h("div", { className: "skc-period-tabs" },
      PERIODS.map((p) => h("button", {
        key: p.key,
        className: `skc-tab skc-period${p.key === period ? " skc-tab-active" : ""}`,
        onClick: () => setPeriod(p.key),
      }, p.label)),
      period !== "minute" ? h(MaLegend, { maVisible: ui.maVisible, onToggle: (p) => store.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false }) }) : null,
      period !== "minute" && chart.adjust ? h("span", { className: "skc-adjust" }, chart.adjust === "qfq" ? "前复权" : "不复权") : null,
    ),
    h("div", { className: "skc-chartbox" },
      chart.loading ? h("div", { className: "skc-chart-empty" }, "加载中…")
        : chart.error ? h("div", { className: "skc-chart-empty skc-chart-error" }, `${chart.error}（临时失败可点其他周期重试；持续出现视为该市场暂不支持）`)
        : period === "minute"
          ? h(MinuteChart, { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null, dark: false })
          : h(CandleChart, { candles: chart.data ?? [], maVisible: ui.maVisible, dark: false }),
    ),
    h("div", { className: "skc-holdings" },
      h("div", { className: "skc-section-title" }, "持仓", hasPos && m ? h("span", { className: "skc-section-meta" },
        privacy ? `${MASK} ${MARKET_LABELS[symbol.market]}·${symbol.quoteCurrency}` :
          `市值 ${m.marketValue != null ? fmtAmount(m.marketValue) : "—"} ${symbol.quoteCurrency} · 盈亏 ${m.pnl != null ? fmtAmount(m.pnl) : (m.flags.zeroCost ? "成本未填" : m.flags.missingPrice ? "无行情" : "—")}（${m.pnlPct != null ? fmtPct(m.pnlPct) : "—"}）`) : null),
      h("div", { className: "skc-form-grid" },
        h("label", {}, "数量（" + (symbol.market === "crypto" ? "币" : "股") + "）",
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.quantity, placeholder: "留空清除", onChange: (e) => setDraft("quantity", e.target.value) }),
          privacy && draft.quantity !== "" ? h("span", { className: "skc-masked-hint" }, "隐私模式下输入仍可见（仅展示遮挡）") : null),
        h("label", {}, `平均成本（${symbol.quoteCurrency}）`,
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.avgCost, placeholder: "留空清除", onChange: (e) => setDraft("avgCost", e.target.value) })),
        h("div", { className: "skc-form-actions" },
          h("button", { className: "skc-btn skc-btn-primary", onClick: saveHoldings }, "保存持仓"),
          h("button", { className: "skc-btn", onClick: clearHoldings }, "清除持仓"),
        ),
      ),
    ),
    h("div", { className: "skc-targets" },
      h("div", { className: "skc-section-title" }, "目标价",
        overlapHint ? h("span", { className: "skc-badge skc-badge-stale" }, "阈值重叠：两标记可能同时显示") : null),
      h("div", { className: "skc-form-grid" },
        h("label", {}, `买入目标价（≤ 触发 Ⓑ，${symbol.quoteCurrency}）`,
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.buyTarget, placeholder: "不设置", onChange: (e) => setDraft("buyTarget", e.target.value) })),
        h("label", {}, `卖出目标价（≥ 触发 Ⓢ，${symbol.quoteCurrency}）`,
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.sellTarget, placeholder: "不设置", onChange: (e) => setDraft("sellTarget", e.target.value) })),
        h("div", { className: "skc-form-actions" },
          h("button", { className: "skc-btn skc-btn-primary", onClick: saveTargets }, "保存目标价"),
        ),
      ),
      h("div", { className: "skc-hint" }, "触价判断只基于有效行情；行情过期或缺失时标记暂停显示，恢复后自动继续。"),
    ),
  );
}
