/**
 * 面板框架：头部（标题/隐私开关/添加/关闭）、列表层（常驻保上下文）、详情覆盖层、
 * 添加对话框、备份区、toast。面板位置可拖动并按访问端记忆。
 */

import { createElement as h, useCallback, useRef } from "react";
import { MarketList } from "./list.mjs";
import { Detail } from "./detail.mjs";
import { AddDialog } from "./add.mjs";
import { BackupSection } from "./backup.mjs";
import { Capsule } from "./capsule.mjs";
import { shouldDrag } from "./fmt.mjs";
import { MARKET_LABELS } from "../src/identity.mjs";

/** 胶囊标的切换器（面板底部；按访问端记忆） */
function CapsulePicker({ store, snapshot }) {
  const { ui, business } = snapshot;
  return h("label", { className: "skc-capsule-picker" },
    "胶囊标的",
    h("select", {
      className: "skc-select",
      value: ui.capsuleSymbolId ?? "",
      onChange: (e) => store.setCapsuleSymbol(e.target.value),
    },
      business.symbols.length === 0 ? h("option", { value: "" }, "（先添加标的）") : null,
      business.symbols.map((s) => h("option", { key: s.id, value: s.id }, `${s.name} · ${MARKET_LABELS[s.market]}`)),
    ));
}

export function Panel({ store, snapshot }) {
  const { ui, business, quotes, quoteMeta, toast } = snapshot;
  const privacy = business.settings.privacyMode === true;
  const dragRef = useRef(null);
  const panelRef = useRef(null);

  const pos = ui.panelPos ?? { x: Math.max(8, window.innerWidth - 420), y: 14 };

  const onHeaderPointerDown = useCallback((e) => {
    if (e.target.closest("button, input, label")) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false, id: e.pointerId };
    el.setPointerCapture?.(e.pointerId);
  }, []);

  const onHeaderPointerMove = useCallback((e) => {
    const d = dragRef.current;
    const el = panelRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && shouldDrag(dx, dy)) d.moved = true;
    if (d.moved) {
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 60;
      el.style.left = `${Math.min(Math.max(d.baseX + dx, 0), maxX)}px`;
      el.style.top = `${Math.min(Math.max(d.baseY + dy, 0), maxY)}px`;
    }
  }, []);

  const onHeaderPointerUp = useCallback(() => {
    const d = dragRef.current;
    const el = panelRef.current;
    dragRef.current = null;
    if (d?.moved && el) {
      const rect = el.getBoundingClientRect();
      store.setPanelPos({ x: Math.round(rect.left), y: Math.round(rect.top) });
    }
  }, [store]);

  const currentMarketLabel = MARKET_LABELS[ui.lastMarket] ?? "";

  return h("div", {
    ref: panelRef,
    className: "skc-panel",
    style: { left: pos.x, top: pos.y },
  },
    h("div", { className: "skc-header", onPointerDown: onHeaderPointerDown, onPointerMove: onHeaderPointerMove, onPointerUp: onHeaderPointerUp },
      h("span", { className: "skc-title" }, "盯盘"),
      h("span", { className: "skc-header-meta" }, quoteMeta?.error ? "行情服务异常" : `${business.symbols.length} 个自选 · 实例共享`),
      h("span", { className: "skc-spacer" }),
      h("button", {
        className: `skc-icon-btn${privacy ? " skc-privacy-on" : ""}`,
        title: privacy ? "隐私开：持仓金额已遮挡（点击关闭）" : "隐私关：点击隐藏持仓金额",
        onClick: () => store.setPrivacy(!privacy),
      }, privacy ? "🙈" : "👁"),
      h("button", { className: "skc-icon-btn", title: "添加标的", onClick: () => store.setShowAdd(true) }, "＋"),
      h("button", { className: "skc-icon-btn", title: "收起（保持轻量刷新）", onClick: () => store.closePanel() }, "—"),
    ),
    h("div", { className: "skc-body" },
      // 列表常驻挂载：详情是覆盖层 → 返回时市场/筛选/滚动全部保留（4.3）
      h("div", { className: `skc-layer${ui.view === "detail" ? " skc-layer-hidden" : ""}` },
        h(MarketList, { store, ui, business, quotes, privacy }),
        h(BackupSection, { store, business }),
      ),
      ui.view === "detail"
        ? h("div", { className: "skc-layer skc-layer-detail" },
            h(Detail, { store, ui, business, quotes, privacy }))
        : null,
    ),
    h("div", { className: "skc-footer" },
      h(CapsulePicker, { store, snapshot }),
      h("span", { className: "skc-hint" },
        `免费行情有延迟${privacy ? " · 隐私遮挡中（仅展示层，数据未加密）" : ""} · 界面偏好按浏览器保存，数据按 DSH 实例保存`),
    ),
    ui.showAdd ? h(AddDialog, { store, business, defaultMarket: ui.lastMarket, onClose: () => store.setShowAdd(false) }) : null,
    toast ? h("div", { className: "skc-toast" }, toast.text) : null,
  );
}

export { Capsule };
