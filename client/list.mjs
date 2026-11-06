/**
 * 市场分组列表：固定四市场 Tab、只看持仓筛选、持仓标记、目标价状态、隐私遮挡。
 * 列表在详情期间不卸载（保留滚动位置/筛选），详情以覆盖层呈现（4.3）。
 */

import { createElement as h, useEffect, useRef } from "react";
import { fmtPrice, fmtPct, fmtAmount, fmtQty, maskIf, trendClass, MASK } from "./fmt.mjs";
import { MARKETS, MARKET_LABELS } from "../src/identity.mjs";

function TargetBadges({ target }) {
  if (!target || target.status === "no-targets") return null;
  if (target.status === "stale") return h("span", { className: "skc-badge skc-badge-stale", title: "行情过期：触价状态暂停判断" }, "旧");
  if (target.status === "no-data") return h("span", { className: "skc-badge skc-badge-stale", title: "行情缺失：触价状态未知" }, "无");
  const badges = [];
  if (target.buyTriggered) badges.push(h("span", { key: "b", className: "skc-badge skc-badge-buy", title: "达到买入目标价" }, "Ⓑ"));
  if (target.sellTriggered) badges.push(h("span", { key: "s", className: "skc-badge skc-badge-sell", title: "达到卖出目标价" }, "Ⓢ"));
  return badges;
}

export function MarketList({ store, ui, business, quotes, privacy }) {
  const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
  const rows = business.symbols.filter((s) => s.market === market);
  const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;
  const scrollRef = useRef(null);

  // 首次挂载时恢复上次滚动位置（重开面板从列表开始，滚动自然复位；详情返回则保持）
  useEffect(() => {
    const el = scrollRef.current;
    if (el && !ui.panelOpen) el.scrollTop = 0;
  }, [market]); // eslint-disable-line react-hooks/exhaustive-deps

  return h("div", { className: "skc-listwrap" },
    h("div", { className: "skc-tabs" },
      MARKETS.map((m) => h("button", {
        key: m,
        className: `skc-tab${m === market ? " skc-tab-active" : ""}`,
        onClick: () => { store.setLastMarket(m); store.pollQuotes(); },
      }, `${MARKET_LABELS[m]}${business.symbols.filter((s) => s.market === m).length > 0 ? ` (${business.symbols.filter((s) => s.market === m).length})` : ""}`)),
    ),
    h("div", { className: "skc-filterbar" },
      h("label", { className: "skc-filter" },
        h("input", {
          type: "checkbox", checked: ui.holdingsOnly,
          onChange: (e) => store.setHoldingsOnly(e.target.checked),
        }),
        "只看持仓"),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-btn skc-btn-ghost", onClick: () => store.pollQuotes() }, "刷新"),
    ),
    h("div", { className: "skc-rows", ref: scrollRef },
      shown.length === 0
        ? h("div", { className: "skc-empty" }, ui.holdingsOnly ? "该市场暂无持仓标的" : "该市场暂无自选标的，点下方“添加标的”")
        : shown.map((s) => {
          const q = quotes[s.id];
          const price = q?.status === "ok" ? q.price : null;
          const pct = q?.changePercent ?? null;
          const hasPos = s.quantity != null && s.quantity > 0;
          const m = q?.metrics;
          return h("div", {
            key: s.id,
            className: "skc-row",
            onClick: () => store.openDetail(s.id),
          },
            h("div", { className: "skc-row-name" },
              h("span", { className: "skc-name-text" }, s.name),
              h("span", { className: "skc-code" },
                s.code.replace(/^(sh|sz|bj|hk)/, ""),
                hasPos ? h("span", { className: "skc-pos-dot", title: "已填持仓" }, " ★") : null,
              ),
            ),
            h("div", { className: "skc-row-price" },
              h("span", { className: trendClass(pct) }, price != null ? fmtPrice(price) : q ? (q.status === "error" ? "获取失败" : "—") : "…"),
              h("span", { className: `skc-pct ${trendClass(pct)}` }, fmtPct(pct)),
            ),
            ui.holdingsOnly && hasPos
              ? h("div", { className: "skc-row-pnl" },
                  h("span", { className: `skc-pnl-amt ${trendClass(m?.pnl)}` },
                    privacy ? MASK : (m?.pnl != null ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}` : (m && (m.flags.zeroCost || m.flags.missingPrice) ? "口径缺" : "—"))),
                  h("span", { className: `skc-pnl-pct ${trendClass(m?.pnl)}` },
                    privacy ? MASK : (m?.pnlPct != null ? fmtPct(m.pnlPct) : (m && (m.flags.zeroCost || m.flags.missingPrice) ? "—" : "—"))),
                )
              : h("div", { className: "skc-row-target" }, h(TargetBadges, { target: q?.target })),
          );
        }),
    ),
  );
}
