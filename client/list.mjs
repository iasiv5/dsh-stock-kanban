/**
 * 市场分组列表（vanilla）：固定四市场 Tab、只看持仓筛选、持仓标记、目标价状态、隐私遮挡。
 * 列表在详情期间不卸载（保留滚动位置/筛选），详情以覆盖层呈现（4.3）。
 * 位置：常驻层（面板 body 内）；update(snapshot) 增量重绘行区。
 */

import { fmtPrice, fmtPct, fmtAmount, trendClass, MASK } from "./fmt.mjs";
import { t } from "./i18n.mjs";
import { iconEl } from "./icons.mjs";
import { targetBadgeKind } from "../src/sessions.mjs";
import { MARKETS } from "../src/identity.mjs";
import { compareBySort } from "../src/model.mjs";
import {
  liftIntent,
  moveId,
  slotIndexFromY,
  mergeVisibleIntoFull,
  LONG_PRESS_MS,
} from "./reorder.mjs";

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

  // 筛选栏已退役（2026-11-10）：「只看持仓」迁 footer 持仓开关；刷新仅保留 footer 一处
  const rowsEl = document.createElement("div");
  rowsEl.className = "skc-rows";

  el.append(tabsEl, rowsEl);

  /* ---------------- 拖拽排序（手势粘合层；决策数学在 reorder.mjs，shape 定稿 2026-11-10） ----------------
   * 桌面：整行拖拽，位移 ≥ slop 起拖；触屏：长按起拖，未满长按的位移交还原生滚动。
   * 平滑模型：起拖一次性快照行几何（拖拽期间零布局读）→ 被拖行 transform 直写 1:1 跟随指针，
   * 过半行阈值换槽、兄弟行 FLIP 滑移让位；松手 settle 过渡滑回槽位。落点后可见序并入全序
   * 一次 reorderSymbols 持久化（失败由 mutate 刷新回权威顺序）。拖拽期间冻结轮询重绘。 */
  let dragPending = null; // { id, pointerId, type, x0, y0, t0, timer }
  let dragActive = false; // 已起拖：冻结重绘 + 压制行点击
  let dragPointerId = -1;
  let dragId = null;
  let dragIndex = -1; // 被拖行当前逻辑槽位
  let dragCache = null; // { listTop, rowH, orderIds, grabOffsetY } —— 起拖时的行几何快照
  let suppressClick = false;
  let flipTimer = null;
  let dragSkippedStructural = false; // 拖拽期间被跳过的结构重建标记（endDrag 补一次全量）

  /** 当前市场分组的权威全序（渲染序 = sort 升序，与列表一致） */
  const marketState = () => {
    const { business, ui } = store.getState();
    const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
    const rows = business.symbols.filter((s) => s.market === market).sort(compareBySort);
    return { market, rows };
  };

  const rowById = (id) => rowsEl.querySelector(`.skc-row[data-id="${id}"]`);

  /** 依据可见序提交持久化：无过滤时可见序即全序；「只看持仓」下并入全序（未可见项保持原位） */
  const commitVisibleOrder = (visibleOrder) => {
    const { market, rows } = marketState();
    const full = rows.map((s) => s.id);
    const merged = mergeVisibleIntoFull(full, visibleOrder);
    if (merged.some((id, i) => id !== full[i])) store.reorderSymbols(market, merged);
  };

  const cancelPending = () => {
    if (dragPending) {
      clearTimeout(dragPending.timer);
      dragPending = null;
    }
  };

  const reducedMotion = () => document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const beginDrag = (pending, y = pending.y0) => {
    clearTimeout(pending.timer);
    dragPending = null;
    const rows = [...rowsEl.querySelectorAll(".skc-row")];
    const index = rows.findIndex((r) => r.dataset.id === pending.id);
    if (index === -1 || rows.length < 2) return;
    // 一次性几何快照（行高结构齐整：行距即行高）；此后拖拽期间不再读布局
    const rects = rows.map((r) => r.getBoundingClientRect());
    const rowH = index < rows.length - 1
      ? Math.max(1, rects[index + 1].top - rects[index].top)
      : Math.max(1, rects[index].bottom - rects[index].top);
    dragActive = true;
    dragPointerId = pending.pointerId;
    dragId = pending.id;
    dragIndex = index;
    suppressClick = true;
    dragCache = {
      listTop: rects[0].top,
      rowH,
      orderIds: rows.map((r) => r.dataset.id),
      grabOffsetY: y - rects[index].top,
    };
    rowById(pending.id)?.classList.add("skc-row-dragging");
    try {
      rowsEl.setPointerCapture(pending.pointerId);
    } catch {
      /* 合成事件/无捕获环境：委托监听仍收得到冒泡 */
    }
  };

  const endDrag = () => {
    const row = dragId != null ? rowById(dragId) : null;
    const cache = dragCache;
    const wasActive = dragActive;
    const order = cache ? [...cache.orderIds] : null;
    if (row) {
      if (!reducedMotion() && row.style.transform) {
        // 指针跟随位置 → 最终槽位：settle 过渡滑回（基准已是槽位，清 transform 即归位）
        row.classList.add("skc-row-settle");
        row.style.transform = "";
        clearTimeout(flipTimer);
        flipTimer = setTimeout(() => row.classList.remove("skc-row-settle"), 200);
      } else {
        row.style.transform = "";
      }
      row.classList.remove("skc-row-dragging");
    }
    rowsEl.classList.remove("skc-rows-flipping");
    dragActive = false;
    dragId = null;
    dragPointerId = -1;
    dragIndex = -1;
    dragCache = null;
    if (wasActive && order) commitVisibleOrder(order); // 失败路径：mutate 内 refreshState 回权威顺序
    if (dragSkippedStructural) {
      dragSkippedStructural = false;
      update(store.getState()); // 拖拽期间被跳过的结构重建补一次（state 本体无 changed → 全量）
    }
  };

  /** 兄弟行 FLIP：逻辑位差反演 → 瞬时位移 → 回流后释放过渡归零；被拖行不参与（其 1:1 跟随指针） */
  const playFlipVirtual = (beforeTops, cache, excludeId) => {
    if (reducedMotion()) return;
    const moved = [];
    for (const child of rowsEl.children) {
      if (child.dataset.id === excludeId) continue;
      const before = beforeTops[child.dataset.id];
      const now = cache.listTop + cache.orderIds.indexOf(child.dataset.id) * cache.rowH;
      const dy = before - now;
      if (dy) {
        child.style.transform = `translateY(${dy}px)`;
        moved.push(child);
      }
    }
    if (moved.length === 0) return;
    rowsEl.classList.add("skc-rows-flipping");
    void rowsEl.offsetHeight; // 强制回流：起始位移先生效
    for (const node of moved) node.style.transform = "";
    clearTimeout(flipTimer);
    flipTimer = setTimeout(() => rowsEl.classList.remove("skc-rows-flipping"), 200);
  };

  /** 指针跟随：被拖行 transform 直写（无过渡、零布局读），过半行换槽时兄弟行滑移 */
  const onDragMove = (y) => {
    const cache = dragCache;
    const dragged = dragId != null ? rowById(dragId) : null;
    if (!cache || !dragged) return;
    const visualTop = y - cache.grabOffsetY;
    const target = slotIndexFromY(visualTop, cache.listTop, cache.rowH, cache.orderIds.length);
    if (target !== dragIndex) {
      const beforeTops = {};
      cache.orderIds.forEach((id, i) => { beforeTops[id] = cache.listTop + i * cache.rowH; });
      cache.orderIds = moveId(cache.orderIds, dragId, target);
      dragIndex = target;
      for (const id of cache.orderIds) rowsEl.append(rowById(id));
      playFlipVirtual(beforeTops, cache, dragId);
    }
    dragged.style.transform = `translateY(${visualTop - (cache.listTop + dragIndex * cache.rowH)}px)`;
  };

  const moveByKeyboard = (id, delta) => {
    const shown = [...rowsEl.querySelectorAll(".skc-row")].map((r) => r.dataset.id);
    const from = shown.indexOf(id);
    if (from === -1 || shown.length < 2) return;
    const to = Math.max(0, Math.min(shown.length - 1, from + delta));
    if (to === from) return;
    commitVisibleOrder(moveId(shown, id, to));
  };

  const onRowsPointerDown = (e) => {
    suppressClick = false; // 新手势开启：上一手势的点击压制窗口关闭
    if (dragActive || dragPending || e.button !== 0) return;
    const row = e.target.closest?.(".skc-row");
    if (!row || !rowsEl.contains(row)) return;
    if (marketState().rows.length < 2) return;
    const pending = {
      id: row.dataset.id,
      pointerId: e.pointerId,
      type: e.pointerType ?? "mouse",
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      timer: null,
    };
    if (pending.type === "touch" || pending.type === "pen") {
      pending.timer = setTimeout(() => beginDrag(pending), LONG_PRESS_MS);
    }
    dragPending = pending;
  };

  const onRowsPointerMove = (e) => {
    const pending = dragPending;
    if (pending && e.pointerId === pending.pointerId) {
      const intent = liftIntent({
        pointerType: pending.type,
        movedPx: Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0),
        heldMs: performance.now() - pending.t0,
      });
      if (intent === "reject") cancelPending();
      else if (intent === "lift" && pending.type !== "touch" && pending.type !== "pen") beginDrag(pending, e.clientY);
      return;
    }
    if (dragActive && e.pointerId === dragPointerId) onDragMove(e.clientY);
  };

  const onRowsPointerEnd = (e) => {
    if (dragPending && e.pointerId === dragPending.pointerId) cancelPending();
    else if (dragActive && e.pointerId === dragPointerId) endDrag();
  };

  // 起拖后压制原生滚动：touch-action 在手势起点采样，长按起拖必须显式拦截（非被动）
  rowsEl.addEventListener("pointerdown", onRowsPointerDown);
  rowsEl.addEventListener("pointermove", onRowsPointerMove);
  rowsEl.addEventListener("pointerup", onRowsPointerEnd);
  rowsEl.addEventListener("pointercancel", onRowsPointerEnd);
  rowsEl.addEventListener("touchmove", (e) => {
    if (dragActive) e.preventDefault();
  }, { passive: false });

  const buildRow = (s, ui, quotes, privacy) => {
    const q = quotes[s.id];
    const price = q?.status === "ok" ? q.price : null;
    const pct = q?.changePercent ?? null;
    const hasPos = s.quantity != null && s.quantity > 0;
    const m = q?.metrics;
    const pnlUnknown = privacy ? null : (m && (m.flags.zeroCost || m.flags.missingPrice) ? "masked-flag" : null);

    const row = document.createElement("div");
    row.className = "skc-row";
    row.dataset.id = s.id; // 轮询重绘后按 id 归还键盘焦点（第三轮 2026-11-10）
    row.tabIndex = 0; // 键盘可达：Tab 进入行，Enter/Space 打开详情（polish：焦点 + 激活路径）
    row.setAttribute("role", "button");
    row.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown"); // 拖拽排序的键盘等价路径
    row.addEventListener("click", () => {
      if (suppressClick) {
        suppressClick = false; // 刚结束的拖拽释放出的 click：吞掉，不开详情
        return;
      }
      store.openDetail(s.id);
    });
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        store.openDetail(s.id);
        return;
      }
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        moveByKeyboard(s.id, e.key === "ArrowUp" ? -1 : 1);
      }
    });

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

    const gripEl = document.createElement("span");
    gripEl.className = "skc-row-grip"; // 悬停浮现的排序可供性；装饰件，行整体是拖拽面
    gripEl.append(iconEl(document, "grip"));

    row.append(nameCol, priceCol, tailCol, gripEl);
    return row;
  };

  /** quotes tick 行内动态域原位改写。dragMode=true 时零节点增删（仅文本，tailCol 徽标不动）。 */
  const patchRowDynamic = (row, s, ui, quotes, privacy, dragMode) => {
    const q = quotes[s.id];
    const price = q?.status === "ok" ? q.price : null;
    const pct = q?.changePercent ?? null;
    const priceCol = row.querySelector(".skc-row-price");
    if (!priceCol) return;
    const priceSpan = priceCol.children[0];
    const pctSpan = priceCol.children[1];
    if (priceSpan) {
      priceSpan.textContent = price != null ? fmtPrice(price) : q ? (q.status === "error" ? t("list.quote-failed") : "—") : "…";
      priceSpan.className = trendClass(pct);
    }
    if (pctSpan) {
      pctSpan.textContent = fmtPct(pct);
      pctSpan.className = `skc-pct ${trendClass(pct)}`;
    }
    const hasPos = s.quantity != null && s.quantity > 0;
    if (ui.holdingsOnly && hasPos) {
      // holdingsOnly 尾巴列（skc-row-pnl）：文本原位写——列类型由全量重建保证，patch 不换列
      const m = q?.metrics;
      const tail = row.querySelector(".skc-row-pnl");
      if (!tail) return;
      const amt = tail.children[0];
      const pctEl = tail.children[1];
      if (amt) {
        amt.textContent = privacy ? MASK : m?.pnl != null ? `${m.pnl > 0 ? "+" : ""}${fmtAmount(m.pnl)}` : "—";
        amt.className = `skc-pnl-amt ${trendClass(m?.pnl)}`;
      }
      if (pctEl) {
        pctEl.textContent = privacy ? MASK : m?.pnlPct != null ? fmtPct(m.pnlPct) : "—";
        pctEl.className = `skc-pnl-pct ${trendClass(m?.pnl)}`;
      }
    } else if (!dragMode) {
      // target 徽标列重建（涉及节点增删，拖拽中跳过——徽标随下次全量/非拖拽 patch 刷新）
      const tail = row.querySelector(".skc-row-target");
      if (!tail) return;
      tail.replaceChildren();
      appendTargetBadges(tail, q?.target, s.market, q?.quoteTime);
    }
  };

  const rebuildRows = (shown, ui, quotes, privacy) => {
    rowsEl.replaceChildren();
    if (shown.length === 0) {
      // 教学式空态：自选空给「添加」图形引导；持仓空纯文案
      const empty = document.createElement("div");
      empty.className = "skc-empty";
      if (!ui.holdingsOnly) {
        const iconWrap = document.createElement("span");
        iconWrap.className = "skc-empty-icon";
        iconWrap.append(iconEl(document, "plus"));
        empty.append(iconWrap);
      }
      const text = document.createElement("span");
      text.textContent = t(ui.holdingsOnly ? "list.empty.holdings" : "list.empty.watch");
      empty.append(text);
      rowsEl.append(empty);
      return;
    }
    for (const s of shown) rowsEl.append(buildRow(s, ui, quotes, privacy));
  };

  const update = (snapshot) => {
    if (disposed) return;
    const ui = snapshot?.ui ?? {};
    const business = snapshot?.business ?? { symbols: [] };
    const quotes = snapshot?.quotes ?? {};
    const privacy = business.settings?.privacyMode === true;
    const changed = snapshot?.changed; // undefined = 全量（订阅回放/语言切换/旧快照）
    const market = MARKETS.includes(ui.lastMarket) ? ui.lastMarket : "cn";
    // 展示序 = sort 升序（compareBySort：sort → addedAt → id 兜底）；过滤保持相对序
    const rows = business.symbols.filter((s) => s.market === market).sort(compareBySort);
    const shown = ui.holdingsOnly ? rows.filter((s) => s.quantity != null && s.quantity > 0) : rows;

    for (const [m, { button, countSpan }] of tabButtons) {
      const count = business.symbols.filter((s) => s.market === m).length;
      if (button.firstChild) button.firstChild.nodeValue = t(`market.${m}`); // 语言实时跟随（骨架静态文案重套 t()）
      button.className = `skc-tab${m === market ? " skc-tab-active" : ""}`;
      countSpan.textContent = String(count);
      countSpan.hidden = count === 0;
    }

    if (market !== prevMarket && !ui.panelOpen) rowsEl.scrollTop = 0;
    prevMarket = market;

    // keyed 行复用判序：全量 / 结构变化（business 或 ui 结构键）→ 整区重建；quotes-only tick → 行内动态域原位写
    const structural = changed === undefined
      || changed.business === true
      || (Array.isArray(changed.ui) ? changed.ui.some((k) => k === "lastMarket" || k === "holdingsOnly") : true);

    if (dragActive) {
      // 拖拽中（§12.24 patch-only 修订）：仅文本 patch、零节点增删/重排——几何快照假设不变；
      // 结构重建跳过并标记，endDrag 补一次全量（外部 rev 变化撞上拖拽的罕见路径）
      if (!structural && changed?.quotes instanceof Set) {
        for (const s of shown) {
          if (!changed.quotes.has(s.id)) continue;
          const row = rowById(s.id);
          if (row) patchRowDynamic(row, s, ui, quotes, privacy, true);
        }
      } else {
        dragSkippedStructural = true;
      }
      return;
    }

    if (ui.view !== "list" && !structural) return; // detail 期间不白做（新鲜度：backToList 即时 pollQuotes 保证最新）

    if (structural) {
      rebuildRows(shown, ui, quotes, privacy);
      return;
    }
    // quotes-only tick：行内动态域原位写（零节点增删，行身份/焦点天然保留）
    if (!(changed.quotes instanceof Set)) return; // 防御：契约外形状不乱动
    for (const s of shown) {
      if (!changed.quotes.has(s.id)) continue;
      const row = rowById(s.id);
      if (row) patchRowDynamic(row, s, ui, quotes, privacy, false);
    }
  };

  const dispose = () => {
    disposed = true;
    cancelPending();
    clearTimeout(flipTimer);
    for (const { button } of tabButtons.values()) {
      button.replaceWith(button.cloneNode(true)); // 丢弃监听器
    }
    rowsEl.replaceChildren();
    el.remove();
  };

  return { el, update, dispose };
}
