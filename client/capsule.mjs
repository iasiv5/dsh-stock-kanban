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

/**
 * 浮动壳拖拽手势（S3 从 createCapsule 抽出，行为逐语义不变）：
 * slop 分级（mouse 6 / touch·pen 10）、grab 保留、rAF 批 transform（写 host）、
 * 释放钳位 + saveFloatPosition + host left/top 写回、cancel 复位不落盘、
 * suppressNextClick 吞拖拽尾随 click、tap → onTap。手势期间才绑 doc 级监听。
 * 两枚 pill（stock 胶囊 / quota 嵌入 pill）复用同一管线：拖 = 移动 host，
 * 落同一位置记忆键（dsh-stock-kanban:float-position），tap = 各自点击语义。
 * readInsets 可注入（胶囊传自有探针，避免重复探针）；缺省自建惰性探针。
 */
export function attachFloatDrag({ el, host, doc, win, storage, onTap, readInsets: readInsetsArg }) {
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
  let disposedDrag = false;
  let downTarget = null; // S6：分区分流依据，由 pointerdown 记录（pointerup 不读自身 target）

  let dragProbe = null;
  const readInsets =
    readInsetsArg ??
    (() => {
      try {
        const root = el.getRootNode();
        if (!dragProbe && root && typeof root.append === "function" && root !== doc) {
          dragProbe = doc.createElement("div");
          dragProbe.style.cssText =
            "position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
          root.append(dragProbe);
        }
        if (!dragProbe) return ZERO_INSETS;
        const style = win.getComputedStyle(dragProbe);
        return {
          top: Math.max(parseInset(style?.paddingTop), titlebarInset(win, doc)),
          right: parseInset(style?.paddingRight),
          bottom: parseInset(style?.paddingBottom),
          left: parseInset(style?.paddingLeft),
        };
      } catch {
        return ZERO_INSETS;
      }
    });

  const viewportOf = () => ({ width: win.innerWidth ?? 1024, height: win.innerHeight ?? 768 });

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
    downTarget = event.target; // S6：pointerdown 记录按下处的目标，供未拖动的 pointerup 分流
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
      if (!dragging || !lastPoint || disposedDrag) return;
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
      onTap(downTarget); // 点击（未拖动的 pointerup）：分流依据是 pointerdown 的目标（S6），不读 pointerup 的 target
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
    host.style.left = `${Math.round(point.x)}px`;
    host.style.top = `${Math.round(point.y)}px`;
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
    // 拖拽释放后浏览器仍会派发 click：吞掉；轻点的 onTap 已在 pointerup 处理
    if (suppressNextClick) suppressNextClick = false;
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("click", onClick);

  return {
    isDragging: () => dragging,
    dispose() {
      disposedDrag = true;
      unbindGesture();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("click", onClick);
      dragProbe?.remove?.();
    },
  };
}

/** Windows 桌面壳标题栏带 inset（与胶囊探针同语义的私有读取） */
function titlebarInset(win, doc) {
  try {
    const html = doc.documentElement;
    return titlebarTopInset({
      titlebar: html.hasAttribute("data-windows-titlebar"),
      fullscreen: html.hasAttribute("data-fullscreen"),
      height: parseInset(win.getComputedStyle(html)?.getPropertyValue("--dsh-windows-titlebar-height")),
    });
  } catch {
    return 0;
  }
}

export function createCapsule({ doc, win, storage, shadow, store, onTogglePanel, onQuotaTap }) {
  const host = shadow.host;
  /** 股票面板切换：传股票段矩形与胶囊矩形（S6；S8 据此定位，本步 capsuleRect 原样透传） */
  const toggle = (segRect) =>
    typeof onTogglePanel === "function"
      ? onTogglePanel(segRect, el.getBoundingClientRect())
      : store?.togglePanel?.();
  /** 股票段矩形（无股票段时回退胶囊根）：轻点分流与键盘路径共用（S6） */
  const stockRect = () => (el.querySelector('[data-seg="stock"]') ?? el).getBoundingClientRect();
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
  markBuy.textContent = "B";
  const markSell = doc.createElement("span");
  markSell.className = "skc-capsule-mark skc-mark-sell";
  markSell.textContent = "S";
  const nameEl = doc.createElement("span");
  nameEl.className = "skc-capsule-name skc-stock-name";
  const priceEl = doc.createElement("span");
  priceEl.className = "skc-capsule-price skc-flat";
  const pctEl = doc.createElement("span");
  pctEl.className = "skc-capsule-pct skc-flat";
  markBuy.hidden = true;
  markSell.hidden = true;
  const stockSeg = doc.createElement("div"); // S5：股票内容包进股票段（与额度段并列于胶囊根）
  stockSeg.setAttribute("data-seg", "stock");
  stockSeg.append(markBuy, markSell, nameEl, priceEl, pctEl);
  el.append(stockSeg);

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
  /** 尺寸实测读 host（位置载体；host 先 append 再创建胶囊，真实浏览器 rect 可用）。
   * jsdom rect 恒零 → 回退 38×26（回归测试对 host rect 打桩验证实测路径）。 */
  const measureSize = () => {
    // 胶囊 width:max-content 后，宿主（shrink-to-fit）可能窄于胶囊：钳位算术以胶囊真实宽为准
    const rect = el.getBoundingClientRect();
    const source = rect.width > 0 ? rect : host.getBoundingClientRect();
    return source.width > 0 ? { width: source.width, height: source.height } : FALLBACK_SIZE;
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
    lastAppliedSize = size;
  };
  // 首挂定位发生在空胶囊（文本未填充，宽度 34px 级）；首个快照渲染后尺寸跳变
  // （实测 ~156px 级）会越过右缘——update 时按尺寸变化重定位一次（拖拽中跳过）。
  let lastAppliedSize = null;
  const repositionIfResized = () => {
    if (dragCtl.isDragging()) return;
    const size = measureSize();
    if (
      !lastAppliedSize ||
      Math.abs(size.width - lastAppliedSize.width) >= 0.5 ||
      Math.abs(size.height - lastAppliedSize.height) >= 0.5
    ) {
      applyPosition();
    }
  };

  /* ------------------------------------------------ 拖拽管线（S3 共享化：attachFloatDrag） */

  /** 轻点分流（S6，ADR 0003 第 4 条）：命中额度段 → 注入的 onQuotaTap；否则股票 toggle 并传股票段矩形 */
  const routeTap = (target) => {
    if (target?.closest?.('[data-seg="quota"]')) {
      if (typeof onQuotaTap === "function") onQuotaTap();
      return;
    }
    toggle(stockRect());
  };
  const dragCtl = attachFloatDrag({ el, host, doc, win, storage, onTap: routeTap, readInsets });

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(stockRect());
    }
  };

  /** 窄屏降级（B30，ADR 0003 第 6 条）：视口 ≤480 时胶囊带 skc-compact（隐藏股票名称，保留价格与涨跌） */
  const syncCompact = () => el.classList.toggle("skc-compact", viewportOf().width <= 480);

  /** 视口钳位（仅视觉，不回写存储）：挂载/拖动/释放/视口 resize 之外，胶囊自身变宽（额度文案到货）也须重钳 */
  const clampHostToViewport = () => {
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

  /** 窗口变化：窄屏类随视口同步 + 钳回可视区 */
  const onResize = () => {
    syncCompact();
    clampHostToViewport();
  };

  el.addEventListener("keydown", onKeyDown);
  win.addEventListener("resize", onResize);
  // 2026-11-10 实录：fixed 宿主 shrink-to-fit 被视口剩余空间压窄，flex 再压缩额度段，
  // 文字溢出胶囊背景。额度文案到货使胶囊变宽（内容宽 ≠ 挂载时的宽）时必须重钳位。
  // ResizeObserver 在 jsdom 缺席（守卫跳过）；活体验证见 .dsh-research/merged-capsule-impl/textform-*。
  let resizeObserver = null;
  if (typeof win.ResizeObserver === "function") {
    resizeObserver = new win.ResizeObserver(() => clampHostToViewport());
    resizeObserver.observe(el);
  }
  // 先入树再定位（quota-watch 同构）：宿主已 append（main.mjs），胶囊入
  // .skc-stack 后 host 才有可测内容——空 host 的真实 rect 是 0，首挂定位
  // 会错误地走 38×26 回退。stack 缺席时（单元测试）落 shadow root。
  (shadow.querySelector(".skc-stack") ?? shadow).append(el);
  syncCompact();
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
    repositionIfResized();
  };

  const dispose = () => {
    disposed = true;
    dragCtl.dispose();
    el.removeEventListener("keydown", onKeyDown);
    win.removeEventListener("resize", onResize);
    if (resizeObserver) resizeObserver.disconnect();
    safeAreaProbe.remove();
    el.remove();
  };

  return { el, update, dispose };
}
