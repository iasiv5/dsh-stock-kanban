/**
 * 悬浮胶囊（vanilla）：名称 + 现价 + 涨跌幅 + 触价标记。
 * 位置记忆挂 shadow.host 的 left/top（:host position:fixed）；pill 在 shadow 内
 * 为流内元素（position:relative），随 .skc-stack 流动——拖动胶囊 = 移动 host。
 * 拖拽管线对齐 quota-watch ADR 0002：grab 保留 + slop 分级（mouse 6 / touch·pen 10）
 * + rAF 批 transform（不可用同步回退）+ 释放钳位写 left/top 并落盘 +
 * suppressNextClick 吞拖拽尾随 click；pointercancel 复位且不落盘。
 * 手势期间才绑 doc 级 move/up/cancel（rest 态零 document 监听）。
 */

import { fmtPrice, fmtPct, trendClass } from "./fmt.mjs";
import { t } from "./i18n.mjs";
import {
  clampPoint,
  loadFloatPosition,
  saveFloatPosition,
  titlebarTopInset,
  MARGIN,
} from "./float-prefs.mjs";
import { dragSlop, grabOffset, clampFrame, parseInset } from "./drag.mjs";

/** 测量回退：jsdom / 未布局时按 38×26 计（行为基准逐字常量） */
const FALLBACK_SIZE = { width: 38, height: 26 };
const ZERO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 };

export function createCapsule({ doc, win, storage, shadow, store, onTogglePanel }) {
  const host = shadow.host;
  const toggle = () =>
    typeof onTogglePanel === "function" ? onTogglePanel() : store?.togglePanel?.();
  let disposed = false;

  /* ------------------------------------------------ DOM 构建 */

  const el = doc.createElement("div");
  el.className = "skc-capsule";
  el.setAttribute("data-dsh-stock-kanban-capsule", "");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.setAttribute("aria-haspopup", "dialog");
  el.setAttribute("aria-expanded", "false");
  const markBuy = doc.createElement("span");
  markBuy.className = "skc-capsule-mark skc-mark-buy";
  markBuy.textContent = "Ⓑ";
  const markSell = doc.createElement("span");
  markSell.className = "skc-capsule-mark skc-mark-sell";
  markSell.textContent = "Ⓢ";
  const nameEl = doc.createElement("span");
  nameEl.className = "skc-capsule-name";
  const priceEl = doc.createElement("span");
  priceEl.className = "skc-capsule-price skc-flat";
  const pctEl = doc.createElement("span");
  pctEl.className = "skc-capsule-pct skc-flat";
  markBuy.hidden = true;
  markSell.hidden = true;
  el.append(markBuy, markSell, nameEl, priceEl, pctEl);

  /* ------------------------------------------------ insets 探针（safe-area + 标题栏带） */

  const safeAreaProbe = doc.createElement("div");
  safeAreaProbe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
  shadow.append(safeAreaProbe);

  const readTitlebarInset = () => {
    try {
      const html = doc.documentElement;
      return titlebarTopInset({
        titlebar: html.hasAttribute("data-windows-titlebar"),
        fullscreen: html.hasAttribute("data-fullscreen"),
        height: parseInset(
          win.getComputedStyle(html)?.getPropertyValue("--dsh-windows-titlebar-height"),
        ),
      });
    } catch {
      return 0;
    }
  };
  /** env(safe-area-inset-*) 经 computed padding 实读；top 取安全区与标题栏带之大者 */
  const readInsets = () => {
    try {
      const style = win.getComputedStyle(safeAreaProbe);
      return {
        top: Math.max(parseInset(style?.paddingTop), readTitlebarInset()),
        right: parseInset(style?.paddingRight),
        bottom: parseInset(style?.paddingBottom),
        left: parseInset(style?.paddingLeft),
      };
    } catch {
      return ZERO_INSETS;
    }
  };

  /* ------------------------------------------------ 位置（挂 host） */

  const viewportOf = () => ({ width: win.innerWidth ?? 1024, height: win.innerHeight ?? 768 });
  const measureSize = () => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 ? { width: rect.width, height: rect.height } : FALLBACK_SIZE;
  };
  const applyPosition = () => {
    const viewport = viewportOf();
    const size = measureSize();
    const insets = readInsets();
    const pos = loadFloatPosition(storage) ?? {
      x: viewport.width - MARGIN - insets.right - size.width,
      y: viewport.height - MARGIN - insets.bottom - size.height,
    };
    const point = clampPoint(pos, viewport, size, insets);
    host.style.left = `${Math.round(point.x)}px`;
    host.style.top = `${Math.round(point.y)}px`;
  };

  /* ------------------------------------------------ 拖拽管线 */

  let dragging = false;
  let moved = false;
  let originX = 0;
  let originY = 0;
  let slop = 6;
  let grab = { dx: 0, dy: 0 };
  let dragSize = FALLBACK_SIZE;
  let restX = 0;
  let restY = 0;
  let lastPoint = null;
  let suppressNextClick = false;

  const scheduleFrame = (fn) =>
    typeof win.requestAnimationFrame === "function" ? win.requestAnimationFrame.call(win, fn) : fn();

  const bindGesture = () => {
    doc.addEventListener("pointermove", onPointerMove);
    doc.addEventListener("pointerup", onPointerUp);
    doc.addEventListener("pointercancel", onPointerCancel);
  };
  const unbindGesture = () => {
    doc.removeEventListener("pointermove", onPointerMove);
    doc.removeEventListener("pointerup", onPointerUp);
    doc.removeEventListener("pointercancel", onPointerCancel);
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    dragging = true;
    moved = false;
    originX = event.clientX;
    originY = event.clientY;
    slop = dragSlop(event.pointerType);
    restX = Number.parseFloat(host.style.left) || 0;
    restY = Number.parseFloat(host.style.top) || 0;
    let rect = el.getBoundingClientRect();
    dragSize = rect.width > 0 ? { width: rect.width, height: rect.height } : FALLBACK_SIZE;
    if (rect.width === 0) {
      // jsdom / 未布局：rect 全零，以已写 rest 坐标合成回退矩形（与真实浏览器等价）
      rect = { left: restX, top: restY, width: dragSize.width, height: dragSize.height };
    }
    grab = grabOffset({ x: event.clientX, y: event.clientY }, rect);
    try {
      el.setPointerCapture?.(event.pointerId);
    } catch {
      /* jsdom 无活动指针时捕获不可用 */
    }
    bindGesture();
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    if (!moved) {
      if (Math.hypot(event.clientX - originX, event.clientY - originY) < slop) return;
      moved = true;
      doc.body.style.userSelect = "none";
      el.classList.add("skc-capsule--dragging");
    }
    lastPoint = { x: event.clientX, y: event.clientY };
    scheduleFrame(() => {
      if (!dragging || !lastPoint || disposed) return;
      const topLeft = clampFrame(lastPoint, grab, dragSize, viewportOf(), readInsets());
      const dx = topLeft.x - restX;
      const dy = topLeft.y - restY;
      host.style.willChange = "transform";
      host.style.transform = `translate3d(${Math.round(dx)}px, ${Math.round(dy)}px, 0)`;
    });
  };

  const onPointerUp = (event) => {
    if (!dragging) return;
    dragging = false;
    unbindGesture();
    doc.body.style.userSelect = "";
    if (!moved) {
      toggle(); // 点击（未拖动的 pointerup）= 开/关面板
      return;
    }
    const point = clampFrame(
      { x: event.clientX, y: event.clientY },
      grab,
      dragSize,
      viewportOf(),
      readInsets(),
    );
    suppressNextClick = true;
    el.classList.remove("skc-capsule--dragging");
    host.style.willChange = "";
    host.style.transform = "";
    saveFloatPosition(storage, point);
    applyPosition();
  };

  /** 取消的手势（滚动接管/来电/掌触）复位：不落盘，尾随 click 不吞 */
  const onPointerCancel = () => {
    if (!dragging) return;
    dragging = false;
    unbindGesture();
    doc.body.style.userSelect = "";
    el.classList.remove("skc-capsule--dragging");
    host.style.willChange = "";
    host.style.transform = "";
  };

  const onClick = () => {
    // 拖拽释放后浏览器仍会派发 click：吞掉；轻点的 toggle 已在 pointerup 处理
    if (suppressNextClick) suppressNextClick = false;
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  /** 窗口变化：重测 insets 钳回可视区（仅视觉，不回写存储） */
  const onResize = () => {
    const viewport = viewportOf();
    const size = measureSize();
    const insets = readInsets();
    const point = clampPoint(
      { x: Number.parseFloat(host.style.left) || 0, y: Number.parseFloat(host.style.top) || 0 },
      viewport,
      size,
      insets,
    );
    host.style.left = `${Math.round(point.x)}px`;
    host.style.top = `${Math.round(point.y)}px`;
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  win.addEventListener("resize", onResize);
  applyPosition();

  /* ------------------------------------------------ 快照渲染 */

  const update = (snapshot) => {
    const ui = snapshot?.ui ?? {};
    const symbols = snapshot?.business?.symbols ?? [];
    const symbol = symbols.find((s) => s.id === ui.capsuleSymbolId) ?? null;
    const quote = snapshot?.quotes?.[ui.capsuleSymbolId] ?? null;

    el.setAttribute("aria-expanded", ui.panelOpen ? "true" : "false");

    const price = quote?.status === "ok" ? quote.price : null;
    const pct = quote?.changePercent ?? null;
    const name = symbol ? quote?.name || symbol.name || symbol.code : t("capsule.empty");
    const target = quote?.target;
    const paused = target?.status === "stale" || target?.status === "no-data";
    markBuy.hidden = target?.buyTriggered !== true;
    markSell.hidden = target?.sellTriggered !== true;
    nameEl.textContent = name;
    priceEl.textContent =
      price != null ? fmtPrice(price) : paused && quote ? t("capsule.stale") : "—";
    priceEl.className = `skc-capsule-price ${trendClass(pct)}`;
    pctEl.textContent = fmtPct(pct);
    pctEl.className = `skc-capsule-pct ${trendClass(pct)}`;
    if (paused && (symbol?.buyTarget != null || symbol?.sellTarget != null)) {
      el.title = t("capsule.tip.stale");
    } else {
      el.removeAttribute("title");
    }
  };

  const dispose = () => {
    disposed = true;
    unbindGesture();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
    win.removeEventListener("resize", onResize);
    safeAreaProbe.remove();
    el.remove();
  };

  return { el, update, dispose };
}
