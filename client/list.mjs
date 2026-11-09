/**
 * 市场分组列表（vanilla）：固定四市场 Tab、只看持仓筛选、持仓标记、目标价状态、隐私遮挡。
 * 列表在详情期间不卸载（保留滚动位置/筛选），详情以覆盖层呈现（4.3）。
 * 位置：常驻层（面板 body 内）；update(snapshot) 增量重绘行区。
 */

import { fmtPrice, fmtPct, fmtAmount, trendClass, MASK } from "./fmt.mjs";
import { t } from "./i18n.mjs";
import { targetBadgeKind } from "../src/sessions.mjs";
import { MARKETS } from "../src/identity.mjs";

function appendText(parent, className, text) {
  const span = document.createElement("span");
  if (className) span.className = className;
  span.textContent = text;
  parent.append(span);
  return span;
}

/** 触价/休市/过期标记（语义与 React 版一致） */
function appendTargetBadges(container, target, market, quoteTime) {
  if (!target || target.status === "no-targets") return;
  if (target.buyTriggered || target.sellTriggered) {
    if (target.buyTriggered) {
      const b = appendText(container, "skc-badge skc-badge-buy", "B");
      b.title = t("detail.buy-target", { ccy: "" });
    }
    if (target.sellTriggered) {
      const s = appendText(container, "skc-badge skc-badge-sell", "S");
      s.title = t("detail.sell-target", { ccy: "" });
    }
    return;
  }
  const kind = targetBadgeKind(target, market, quoteTime, Date.now());
  if (!kind) return;
  if (kind === "closed" || kind === "stale" || kind === "no-data") {
    const el = appendText(container, "skc-badge skc-badge-stale", t(`badge.${kind}`));
    el.title = t(`badge.${kind}.tip`);
  }
}

export function createList({ store }) {
  let disposed = false;
  let prevMarket = null;

  const el = document.createElement("div");
  el.className = "skc-listwrap";

  const tabsEl = document.createElement("div");
  tabsEl.className = "skc-tabs";
  const tabButtons = new Map(); // market → { button, countSpan }
  const onTabClick = (market) => () => {
    store.setLastMarket(market);
    store.pollQuotes();
  };
  for (const m of MARKETS) {
    const button = document.createElement("button");
    button.className = "skc-tab";
    button.type = "button";
    button.textContent = t(`market.${m}`);
    const countSpan = appendText(button, "skc-tab-count", "");
    countSpan.hidden = true;
    button.addEventListener("click", onTabClick(m));
    tabsEl.append(button);
    tabButtons.set(m, { button, countSpan });
  }

  const filterEl = document.createElement("div");
  filterEl.className = "skc-filterbar";
  const filterLabel = document.createElement("label");
  filterLabel.className = "skc-filter";
  const holdingsCheckbox = document.createElement("input");
  holdingsCheckbox.type = "checkbox";
  holdingsCheckbox.addEventListener("change", () => {
    store.setHoldingsOnly(holdingsCheckbox.checked);
  });
  filterLabel.append(holdingsCheckbox, document.createTextNode(t("list.holdings-only")));
  const spacer = document.createElement("span");
  spacer.className = "skc-spacer";
  const refreshButton = document.createElement("button");
  refreshButton.className = "skc-btn skc-btn-ghost";
  refreshButton.type = "button";
  refreshButton.textContent = t("list.refresh");
  refreshButton.addEventListener("click", () => store.pollQuotes());
  filterEl.append(filterLabel, spacer, refreshButton);

  const rowsEl = document.createElement("div");
  rowsEl.className = "skc-rows";

  el.append(tabsEl, filterEl, rowsEl);

  const buildRow = (s, ui, quotes, privacy) => {
    const q = quotes[s.id];
    const price = q?.status === "ok" ? q.price : null;
    const pct = q?.changePercent ?? null;
    const hasPos = s.quantity != null && s.quantity > 0;
    const m = q?.metrics;
    const pnlUnknown = privacy ? null : (m && (m.flags.zeroCost || m.flags.missingPrice) ? "masked-flag" : null);

    const row = document.createElement("div");
    row.className = "skc-row";
    row.addEventListener("click", () => store.openDetail(s.id));

    const nameCol = document.createElement("div");
    nameCol.className = "skc-row-name";
    appendText(nameCol, "skc-name-text", s.name);
    const codeCol = document.createElement("span");
    codeCol.className = "skc-code";
    codeCol.textContent = s.code.replace(/^(sh|sz|bj|hk)/, "");
    if (hasPos) {
      const dot = appendText(codeCol, "skc-pos-dot", " ★");
      dot.title = t("badge.holder");
    }
    nameCol.append(codeCol);

    const priceCol = document.createElement("div");
    priceCol.className = "skc-row-price";
    appendText(
      priceCol,
      trendClass(pct),
      price != null ? fmtPrice(price) : q ? (q.status === "error" ? t("list.quote-failed") : "—") : "…",
    );
    appendText(priceCol, `skc-pct ${trendClass(pct)}`, fmtPct(pct));

    let tailCol;
    if (ui.holdingsOnly && hasPos) {
      tailCol = document.createElement("div");
      tailCol.className = "skc-row-pnl";
      const amt = appendText(
        tailCol,
        `skc-pnl-amt ${trendClass(m?.pnl)}`,
        privacy
          ? MASK
          : m?.pnl != null
            ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}`
            : "—",
      );
      if (pnlUnknown) {
        amt.title = m.flags.zeroCost ? t("detail.cost-unset") : t("detail.no-quote");
      }
      appendText(
        tailCol,
        `skc-pnl-pct ${trendClass(m?.pnl)}`,
        privacy ? MASK : m?.pnlPct != null ? fmtPct(m.pnlPct) : "—",
      );
    } else {
      tailCol = document.createElement("div");
      tailCol.className = "skc-row-target";
      appendTargetBadges(tailCol, q?.target, s.market, q?.quoteTime);
    }

    row.append(nameCol, priceCol, tailCol);
    return row;
  };

  const update = (snapshot) => {
    if (disposed) return;
    const ui = snapshot?.ui ?? {};
    const business = snapshot?.business ?? { symbols: [] };
    const quotes = snapshot?.quotes ?? {};
    const privacy = business.settings?.privacyMode === true;
    const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
    const rows = business.symbols.filter((s) => s.market === market);
    const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;

    for (const [m, { button, countSpan }] of tabButtons) {
      const count = business.symbols.filter((s) => s.market === m).length;
      button.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
      countSpan.textContent = String(count);
      countSpan.hidden = count === 0;
    }
    holdingsCheckbox.checked = ui.holdingsOnly === true;

    if (market !== prevMarket && !ui.panelOpen) rowsEl.scrollTop = 0;
    prevMarket = market;

    rowsEl.replaceChildren();
    if (shown.length === 0) {
      const empty = document.createElement("div");
      empty.className = "skc-empty";
      empty.textContent = t(ui.holdingsOnly ? "list.empty.holdings" : "list.empty.watch");
      rowsEl.append(empty);
      return;
    }
    for (const s of shown) rowsEl.append(buildRow(s, ui, quotes, privacy));
  };

  const dispose = () => {
    disposed = true;
    for (const { button } of tabButtons.values()) {
      button.replaceWith(button.cloneNode(true)); // 丢弃监听器
    }
    holdingsCheckbox.replaceWith(holdingsCheckbox.cloneNode(true));
    refreshButton.replaceWith(refreshButton.cloneNode(true));
    rowsEl.replaceChildren();
    el.remove();
  };

  return { el, update, dispose };
}
