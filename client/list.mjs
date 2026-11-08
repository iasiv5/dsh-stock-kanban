/**
 * 市场分组列表：固定四市场 Tab、只看持仓筛选、持仓标记、目标价状态、隐私遮挡。
 * 列表在详情期间不卸载（保留滚动位置/筛选），详情以覆盖层呈现（4.3）。
 */

import { createElement as h, useEffect, useRef } from "react";
import { fmtPrice, fmtPct, fmtAmount, maskIf, trendClass, MASK } from "./fmt.mjs";
import { t } from "./i18n.mjs";
import { targetBadgeKind } from "../src/sessions.mjs";
import { MARKETS } from "../src/identity.mjs";

function TargetBadges({ target, market, quoteTime, now }) {
  if (!target || target.status === "no-targets") return null;
  // 有效行情下的触价标记（fresh 时 targetBadgeKind 返回 null，先查触发）
  if (target.buyTriggered || target.sellTriggered) {
    const marks = [];
    if (target.buyTriggered) marks.push(h("span", { key: "b", className: "skc-badge skc-badge-buy", title: t("detail.buy-target", { ccy: "" }) }, "Ⓑ"));
    if (target.sellTriggered) marks.push(h("span", { key: "s", className: "skc-badge skc-badge-sell", title: t("detail.sell-target", { ccy: "" }) }, "Ⓢ"));
    return marks;
  }
  const kind = targetBadgeKind(target, market, quoteTime, now);
  if (!kind) return null;
  if (kind === "closed") return h("span", { className: "skc-badge skc-badge-stale", title: t("badge.closed.tip") }, t("badge.closed"));
  if (kind === "stale") return h("span", { className: "skc-badge skc-badge-stale", title: t("badge.stale.tip") }, t("badge.stale"));
  if (kind === "no-data") return h("span", { className: "skc-badge skc-badge-stale", title: t("badge.no-data.tip") }, t("badge.no-data"));
  return null;
}

export function MarketList({ store, ui, business, quotes, privacy }) {
  const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
  const rows = business.symbols.filter((s) => s.market === market);
  const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && !ui.panelOpen) el.scrollTop = 0;
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps

  const marketCount = (m) => business.symbols.filter((s) => s.market === m).length;

  return h("div", { className: "skc-listwrap" },
    h("div", { className: "skc-tabs" },
      MARKETS.map((m) => h("button", {
        key: m,
        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
        onClick: () => { store.setLastMarket(m); store.pollQuotes(); },
      }, marketCount(m) > 0
        ? [t(`market.${m}`), h("span", { key: "c", className: "skc-tab-count" }, String(marketCount(m)))]
        : t(`market.${m}`))),
    ),
    h("div", { className: "skc-filterbar" },
      h("label", { className: "skc-filter" },
        h("input", {
          type: "checkbox", checked: ui.holdingsOnly,
          onChange: (e) => store.setHoldingsOnly(e.target.checked),
        }),
        t("list.holdings-only")),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-btn skc-btn-ghost", onClick: () => store.pollQuotes() }, t("list.refresh")),
    ),
    h("div", { className: "skc-rows", ref: scrollRef },
      shown.length === 0
        ? h("div", { className: "skc-empty" }, ui.holdingsOnly ? t("list.empty.holdings") : t("list.empty.watch"))
        : shown.map((s) => {
          const q = quotes[s.id];
          const price = q?.status === "ok" ? q.price : null;
          const pct = q?.changePercent ?? null;
          const hasPos = s.quantity != null && s.quantity > 0;
          const m = q?.metrics;
          const pnlUnknown = privacy ? null : (m && (m.flags.zeroCost || m.flags.missingPrice) ? "masked-flag" : null);
          return h("div", {
            key: s.id,
            className: "skc-row",
            onClick: () => store.openDetail(s.id),
          },
            h("div", { className: "skc-row-name" },
              h("span", { className: "skc-name-text" }, s.name),
              h("span", { className: "skc-code" },
                s.code.replace(/^(sh|sz|bj|hk)/, ""),
                hasPos ? h("span", { className: "skc-pos-dot", title: t("badge.holder") }, " ★") : null,
              ),
            ),
            h("div", { className: "skc-row-price" },
              h("span", { className: trendClass(pct) }, price != null ? fmtPrice(price) : q ? (q.status === "error" ? t("list.quote-failed") : "—") : "…"),
              h("span", { className: `skc-pct ${trendClass(pct)}` }, fmtPct(pct)),
            ),
            ui.holdingsOnly && hasPos
              ? h("div", { className: "skc-row-pnl" },
                  h("span", {
                    className: `skc-pnl-amt ${trendClass(m?.pnl)}`,
                    title: pnlUnknown ? (m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote")) : undefined,
                  },
                    privacy ? MASK : (m?.pnl != null ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}` : (pnlUnknown ? "—" : "—"))),
                  h("span", { className: `skc-pnl-pct ${trendClass(m?.pnl)}` },
                    privacy ? MASK : (m?.pnlPct != null ? fmtPct(m.pnlPct) : "—")),
                )
              : h("div", { className: "skc-row-target" },
                  h(TargetBadges, { target: q?.target, market: s.market, quoteTime: q?.quoteTime, now: Date.now() })),
          );
        }),
    ),
  );
}
