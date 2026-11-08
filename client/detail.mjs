/**
 * 详情视图：行情头部（行情时间/拉取时间区分）、图表（分时/日K/周K/月K + 均线 + 成交量）、
 * 持仓编辑、目标价编辑、删除标的。快速切换标的时以 fetchKey 守卫异步响应（12.2 无串数据）。
 */

import { createElement as h, useEffect, useRef, useState } from "react";
import { api } from "./api.mjs";
import { fmtPrice, fmtPct, fmtAmount, maskIf, trendClass, parsePositiveInput, fmtClock, fmtClockSec } from "./fmt.mjs";
import { MinuteChart, CandleChart, MaLegend } from "./charts.mjs";
import { t, tErr } from "./i18n.mjs";
import { checkTargetRelation } from "../src/identity.mjs";

const PERIODS = [
  { key: "minute", label: () => t("detail.period.minute") },
  { key: "day", label: () => t("detail.period.day") },
  { key: "week", label: () => t("detail.period.week") },
  { key: "month", label: () => t("detail.period.month") },
];

export function Detail({ store, ui, business, quotes, privacy }) {
  const symbol = business.symbols.find((s) => s.id === ui.detailId);
  const [period, setPeriod] = useState("minute");
  const [chart, setChart] = useState({ key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null });
  const chartKeyRef = useRef("");
  const [form, setForm] = useState(null);
  const [overlapHint, setOverlapHint] = useState(false);

  useEffect(() => {
    setForm(null);
    setOverlapHint(false);
    chartKeyRef.current = "";
    setChart({ key: "", loading: false, data: null, error: null, errorDetail: null, adjust: null });
  }, [ui.detailId]);

  // 图表加载（fetchKey 守卫：响应回来时若 key 已变则丢弃）
  useEffect(() => {
    if (!symbol) return;
    const key = `${symbol.id}:${period}`;
    chartKeyRef.current = key;
    setChart((c) => ({ ...c, key, loading: true }));
    const load = period === "minute" ? api.minute(symbol.id) : api.kline(symbol.id, period);
    load.then((data) => {
      if (chartKeyRef.current !== key) return;
      setChart({
        key,
        loading: false,
        data: period === "minute" ? data : data.candles,
        error: data.error ?? null,
        errorDetail: data.errorDetail ?? null,
        adjust: data.adjust ?? null,
        prevClose: data.prevClose ?? null,
        date: data.date ?? null,
      });
    }).catch((e) => {
      if (chartKeyRef.current !== key) return;
      setChart({ key, loading: false, data: null, error: "fetch-failed", errorDetail: String(e?.message ?? e), adjust: null });
    });
  }, [symbol?.id, period]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!symbol) {
    return h("div", { className: "skc-empty" }, t("detail.missing"));
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
      store.setToast(t("detail.err.numbers"));
      return;
    }
    const result = await store.updateSymbol(symbol.id, { quantity, avgCost });
    if (result.ok) { setForm(null); store.setToast(t("toast.position-saved")); }
  };
  const clearHoldings = async () => {
    const result = await store.updateSymbol(symbol.id, { quantity: null, avgCost: null });
    if (result.ok) { setForm(null); store.setToast(t("toast.position-cleared")); }
  };
  const saveTargets = async () => {
    const buyTarget = parsePositiveInput(draft.buyTarget);
    const sellTarget = parsePositiveInput(draft.sellTarget);
    if (buyTarget === undefined || sellTarget === undefined) {
      store.setToast(t("detail.err.targets"));
      return;
    }
    const relation = checkTargetRelation(buyTarget, sellTarget);
    if (relation.overlap && !window.confirm(t("detail.confirm.overlap"))) return;
    setOverlapHint(relation.overlap);
    const result = await store.updateSymbol(symbol.id, { buyTarget, sellTarget });
    if (result.ok) { setForm(null); store.setToast(t("toast.targets-saved")); }
  };
  const remove = async () => {
    if (!window.confirm(t("detail.confirm.remove", { name: symbol.name }))) return;
    const result = await store.removeSymbol(symbol.id);
    if (result.ok) store.backToList();
  };

  const qTime = q?.quoteTime ?? null;
  const fTime = q?.fetchedAt ?? null;
  const dataStale = q?.target?.status === "stale" || q?.target?.status === "no-data";
  const quoteTimeText = q && q.status === "ok" && qTime != null ? fmtClock(qTime) : "—";
  const fetchTimeText = fTime != null ? fmtClockSec(fTime) : "—";
  const chartErrorText = chart.error ? tErr(chart.error, chart.errorDetail) || chart.error : null;

  return h("div", {},
    h("div", { className: "skc-detail-head" },
      h("button", { className: "skc-btn skc-btn-ghost", onClick: () => store.backToList() }, t("detail.back")),
      h("span", { className: "skc-detail-title" }, symbol.name),
      h("span", { className: "skc-code" }, `${symbol.code} · ${t(`market.${symbol.market}`)}${symbol.kind === "etf" ? " · ETF" : ""} · ${symbol.quoteCurrency}`),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-btn skc-btn-danger", onClick: remove }, t("detail.delete")),
    ),
    h("div", { className: "skc-quote-line" },
      h("span", { className: `skc-quote-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : (q ? (q.status === "error" ? t("list.quote-failed") : "…") : "—")),
      h("span", { className: `skc-quote-pct ${trendClass(pct)}` }, fmtPct(pct)),
      h("span", { className: "skc-quote-meta" },
        t("detail.quote-time", { t: quoteTimeText, f: fetchTimeText }),
        dataStale ? h("span", { className: "skc-badge skc-badge-stale" }, q?.target?.status === "stale" ? t("detail.stale") : t("detail.no-data")) : null,
      ),
    ),
    h("div", { className: "skc-period-tabs" },
      PERIODS.map((p) => h("button", {
        key: p.key,
        className: `skc-tab skc-period${p.key === period ? " skc-tab-active" : ""}`,
        onClick: () => setPeriod(p.key),
      }, p.label())),
      period !== "minute" ? h(MaLegend, { maVisible: ui.maVisible, onToggle: (p) => store.setMaVisible({ ...ui.maVisible, [p]: ui.maVisible[p] === false }) }) : null,
      period !== "minute" && chart.adjust ? h("span", { className: "skc-adjust" }, chart.adjust === "qfq" ? t("detail.adjust.fwd") : t("detail.adjust.none")) : null,
    ),
    h("div", { className: "skc-chartbox" },
      chart.loading ? h("div", { className: "skc-chart-empty" }, t("detail.chart.loading"))
        : chartErrorText ? h("div", { className: "skc-chart-empty skc-chart-error" }, t("detail.chart.error", { e: chartErrorText }))
        : period === "minute"
          ? h(MinuteChart, { points: chart.data?.points ?? [], prevClose: chart.data?.prevClose ?? chart.prevClose ?? null, dark: false })
          : h(CandleChart, { candles: chart.data ?? [], maVisible: ui.maVisible, dark: false }),
    ),
    h("div", { className: "skc-holdings" },
      h("div", { className: "skc-section-title" }, t("detail.holdings"), hasPos && m ? h("span", { className: "skc-section-meta" },
        privacy ? `${maskIf(true, "")}${symbol.quoteCurrency}` :
          t("detail.holdings.meta", {
            v: m.marketValue != null ? fmtAmount(m.marketValue) : "—",
            ccy: symbol.quoteCurrency,
            p: m.pnl != null ? fmtAmount(m.pnl) : (m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote")),
            pct: m.pnlPct != null ? fmtPct(m.pnlPct) : "—",
          })) : null),
      h("div", { className: "skc-form-grid" },
        h("label", {}, t(symbol.market === "crypto" ? "detail.quantity.coins" : "detail.quantity.shares"),
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.quantity, placeholder: t("detail.blank-clears"), onChange: (e) => setDraft("quantity", e.target.value) })),
        h("label", {}, t("detail.avg-cost", { ccy: symbol.quoteCurrency }),
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.avgCost, placeholder: t("detail.blank-clears"), onChange: (e) => setDraft("avgCost", e.target.value) })),
        h("div", { className: "skc-form-actions" },
          h("button", { className: "skc-btn skc-btn-primary", onClick: saveHoldings }, t("detail.save-position")),
          h("button", { className: "skc-btn", onClick: clearHoldings }, t("detail.clear-position")),
        ),
      ),
    ),
    h("div", { className: "skc-targets" },
      h("div", { className: "skc-section-title" }, t("detail.targets"),
        overlapHint ? h("span", { className: "skc-badge skc-badge-stale" }, t("detail.overlap")) : null),
      h("div", { className: "skc-form-grid" },
        h("label", {}, t("detail.buy-target", { ccy: symbol.quoteCurrency }),
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.buyTarget, placeholder: t("detail.unset"), onChange: (e) => setDraft("buyTarget", e.target.value) })),
        h("label", {}, t("detail.sell-target", { ccy: symbol.quoteCurrency }),
          h("input", { className: "skc-input", inputMode: "decimal", value: draft.sellTarget, placeholder: t("detail.unset"), onChange: (e) => setDraft("sellTarget", e.target.value) })),
        h("div", { className: "skc-form-actions" },
          h("button", { className: "skc-btn skc-btn-primary", onClick: saveTargets }, t("detail.save-targets")),
        ),
      ),
      h("div", { className: "skc-hint" }, t("detail.targets.hint")),
    ),
  );
}
