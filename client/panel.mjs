/**
 * 面板框架：头部（标题/隐私开关/添加/关闭）、列表层（常驻保上下文）、详情覆盖层、
 * 添加对话框、备份区、toast。面板位置可拖动并按访问端记忆。
 */

import { createElement as h, useCallback, useEffect, useRef } from "react";
import { MarketList } from "./list.mjs";
import { Detail } from "./detail.mjs";
import { AddDialog } from "./add.mjs";
import { BackupSection } from "./backup.mjs";
import { Capsule } from "./capsule.mjs";
import { shouldDrag } from "./fmt.mjs";
import { t } from "./i18n.mjs";

/** 胶囊标的切换器（面板底部；按访问端记忆） */
function CapsulePicker({ store, snapshot }) {
  const { ui, business } = snapshot;
  return h("label", { className: "skc-capsule-picker" },
    t("picker.label"),
    h("select", {
      className: "skc-select",
      value: ui.capsuleSymbolId ?? "",
      onChange: (e) => store.setCapsuleSymbol(e.target.value),
    },
      business.symbols.length === 0 ? h("option", { value: "" }, t("picker.empty")) : null,
      business.symbols.map((s) => h("option", { key: s.id, value: s.id }, `${s.name} · ${t("market." + s.market)}`)),
    ));
}

/** 设置对话框：收纳备份与迁移（后续设置项在此扩展）；会话态，不落盘 */
function SettingsDialog({ store, business, onClose }) {
  return h("div", { className: "skc-dialog" },
    h("div", { className: "skc-dialog-head" },
      h("span", { className: "skc-section-title" }, t("app.settings")),
      h("span", { className: "skc-spacer" }),
      h("button", { className: "skc-icon-btn", onClick: onClose }, "✕")),
    h(BackupSection, { store, business }),
  );
}

export function Panel({ store, snapshot }) {
  const { ui, business, quotes, quoteMeta, toast } = snapshot;
  const privacy = business.settings.privacyMode === true;
  const dragRef = useRef(null);
  const panelRef = useRef(null);

  // 视口变化（手机旋转等）：已存面板位置重新钳回可视区，保证收起按钮始终可达
  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(Math.round(rect.left), 8), Math.max(8, window.innerWidth - rect.width - 8));
      const y = Math.min(Math.max(Math.round(rect.top), 8), Math.max(8, window.innerHeight - rect.height - 8));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      store.setPanelPos({ x, y });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [store]);

    // 弹出位置锚定胶囊附近（下方优先，放不下放上方；水平随胶囊），任何视口钳回屏幕内。
  // 不再跨会话记忆面板位置：胶囊即锚点，位置可预期（用户反馈：卡片离胶囊太远）。
  const panelWidth = Math.min(400, window.innerWidth - 16);
  const clampPanel = (p) => ({
    x: Math.min(Math.max(p.x, 8), Math.max(8, window.innerWidth - panelWidth - 8)),
    y: Math.min(Math.max(p.y, 8), Math.max(8, window.innerHeight - 120)),
  });
  const anchor = store.getCapsuleRect?.() ?? null;
  const pos = clampPanel(anchor
    ? {
        x: anchor.left,
        y: anchor.top + anchor.height + 8 + 220 > window.innerHeight
          ? Math.max(8, anchor.top - 240)
          : anchor.top + anchor.height + 8,
      }
    : { x: window.innerWidth - panelWidth - 16, y: 14 });

  const onHeaderPointerDown = useCallback((e) => {
    if (e.target.closest("button, input, label")) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false, id: e.pointerId };
    try { el.setPointerCapture?.(e.pointerId); } catch { /* 合成事件/无活动指针时捕获不可用 */ }
  }, []);

  const onHeaderPointerMove = useCallback((e) => {
    const d = dragRef.current;
    const el = panelRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && shouldDrag(dx, dy)) { d.moved = true; el.classList.add("skc-panel--dragging"); }
    if (d.moved) {
      // 实时钳位：面板整体不出视口（窄屏下面板近全宽，水平拖动自然受限）
      const maxX = Math.max(8, window.innerWidth - el.offsetWidth - 8);
      const maxY = Math.max(8, window.innerHeight - Math.min(el.offsetHeight, window.innerHeight - 16) - 8);
      el.style.left = `${Math.min(Math.max(d.baseX + dx, 8), maxX)}px`;
      el.style.top = `${Math.min(Math.max(d.baseY + dy, 8), maxY)}px`;
    }
  }, []);

  const onHeaderPointerUp = useCallback(() => {
    const d = dragRef.current;
    const el = panelRef.current;
    dragRef.current = null;
    el?.classList.remove("skc-panel--dragging");
    if (d?.moved && el) {
      const rect = el.getBoundingClientRect();
      store.setPanelPos(clampPanel({ x: Math.round(rect.left), y: Math.round(rect.top) }));
    }
  }, [store]);

  return h("div", {
    ref: panelRef,
    className: "skc-panel",
    style: { left: pos.x, top: pos.y },
  },
    h("div", { className: "skc-header", onPointerDown: onHeaderPointerDown, onPointerMove: onHeaderPointerMove, onPointerUp: onHeaderPointerUp },
      h("span", { className: "skc-title" }, t("app.title")),
      h("span", { className: "skc-header-meta" }, quoteMeta?.error ? t("app.meta.error") : t("app.meta", { n: business.symbols.length })),
      h("span", { className: "skc-spacer" }),
      h("button", {
        className: `skc-icon-btn${privacy ? " skc-privacy-on" : ""}`,
        title: privacy ? t("privacy.on") : t("privacy.off"),
        onClick: () => store.setPrivacy(!privacy),
      }, privacy ? "🙈" : "👁"),
      h("button", { className: "skc-icon-btn", title: t("add.title"), onClick: () => store.setShowAdd(true) }, "＋"),
      h("button", { className: "skc-icon-btn", title: t("app.settings"), onClick: () => store.setShowSettings(true) }, "⚙"),
      h("button", { className: "skc-icon-btn", title: t("app.collapse"), onClick: () => store.closePanel() }, "—"),
    ),
    h("div", { className: "skc-body" },
      // 列表常驻挂载：详情是覆盖层 → 返回时市场/筛选/滚动全部保留（4.3）
      h("div", { className: `skc-layer${ui.view === "detail" ? " skc-layer-hidden" : ""}` },
        h(MarketList, { store, ui, business, quotes, privacy }),
      ),
      ui.view === "detail"
        ? h("div", { className: "skc-layer skc-layer-detail" },
            h(Detail, { store, ui, business, quotes, privacy }))
        : null,
    ),
    h("div", { className: "skc-footer" },
      h(CapsulePicker, { store, snapshot }),
      h("span", { className: "skc-hint" },
        t("app.footer", { privacy: privacy ? t("app.footer.privacy") : "" })),
    ),
    ui.showAdd ? h(AddDialog, { store, business, defaultMarket: ui.lastMarket, onClose: () => store.setShowAdd(false) }) : null,
    ui.showSettings ? h(SettingsDialog, { store, business, onClose: () => store.setShowSettings(false) }) : null,
    toast ? h("div", { className: "skc-toast" }, toast.text) : null,
  );
}

export { Capsule };
