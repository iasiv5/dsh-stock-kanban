/**
 * 悬浮胶囊：名称 + 现价 + 涨跌幅 + 触价标记；拖动（阈值防误触）→ 松手吸附最近边缘 → 位置按访问端记忆。
 * 触价时仅加标记（Ⓑ/Ⓢ），不抢占行情内容（4.1）。
 */

import { useCallback, useEffect, useRef } from "react";
import { createElement as h } from "react";
import { fmtPrice, fmtPct, trendClass, shouldDrag, snapToEdge } from "./fmt.mjs";

export function Capsule({ store, ui, symbol, quote }) {
  const ref = useRef(null);
  const drag = useRef(null);

  const pos = ui.pos ?? { x: Math.max(8, window.innerWidth - 180), y: 14, dock: "right" };

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      baseX: rect.left, baseY: rect.top,
      moved: false, pointerId: e.pointerId,
    };
    try { el.setPointerCapture?.(e.pointerId); } catch { /* 合成事件/无活动指针时捕获不可用，拖动逻辑不依赖捕获 */ }
  }, []);

  const onPointerMove = useCallback((e) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && shouldDrag(dx, dy)) {
      d.moved = true;
      el.classList.add("skc-capsule-dragging");
    }
    if (d.moved) {
      el.style.left = `${d.baseX + dx}px`;
      el.style.top = `${d.baseY + dy}px`;
    }
  }, []);

  const onPointerUp = useCallback((e) => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d || !el) return;
    el.classList.remove("skc-capsule-dragging");
    if (d.moved) {
      const rect = el.getBoundingClientRect();
      const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
      el.style.left = `${snapped.x}px`;
      el.style.top = `${snapped.y}px`;
      store.setCapsulePos(snapped); // 位置按访问端保存（9.2）
    } else {
      // 点击 = 开/关切换：面板已开时再点胶囊直接收起（窄屏下按钮可能不可达的兜底恢复路径）
      store.togglePanel();
    }
  }, [store]);

  // 挂载即钳位：已存位置可能来自更宽的视口（如横屏保存后转竖屏）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
    el.style.left = `${snapped.x}px`;
    el.style.top = `${snapped.y}px`;
    store.setCapsulePos(snapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const snapped = snapToEdge(rect.left, rect.top, rect.width, rect.height, window.innerWidth, window.innerHeight);
      store.setCapsulePos(snapped); // 窗口变化后钳回可视区（4.1）
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [store]);

  const price = quote?.status === "ok" ? quote.price : null;
  const pct = quote?.changePercent ?? null;
  const name = symbol ? (quote?.name || symbol.name || symbol.code) : "自选";
  const target = quote?.target;
  const stale = target?.status === "stale" || target?.status === "no-data";
  const buyHit = target?.buyTriggered === true;
  const sellHit = target?.sellTriggered === true;

  return h("div", {
    ref,
    className: `skc-capsule skc-dock-${pos.dock}`,
    style: { left: pos.x, top: pos.y },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    title: stale && (symbol?.buyTarget != null || symbol?.sellTarget != null) ? "行情已过期或不可用：触价标记暂停显示" : undefined,
  },
    buyHit ? h("span", { className: "skc-capsule-mark skc-mark-buy" }, "Ⓑ") : null,
    sellHit ? h("span", { className: "skc-capsule-mark skc-mark-sell" }, "Ⓢ") : null,
    h("span", { className: "skc-capsule-name" }, name),
    h("span", { className: `skc-capsule-price ${trendClass(pct)}` }, price != null ? fmtPrice(price) : stale && quote ? "行情旧" : "—"),
    h("span", { className: `skc-capsule-pct ${trendClass(pct)}` }, fmtPct(pct)),
  );
}
