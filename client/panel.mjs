/**
 * 面板框架（vanilla）：头部只留标题+计数/错误状态；关闭按钮与刷新类动作集中在
 * footer（胶囊标的 picker 保留在 footer）。列表层常驻保上下文、详情覆盖层、
 * 添加/设置对话框、toast 均在面板内渲染。
 * 弹出几何对齐 quota-watch placePanel（机制），方向轴保留 stock 域垂直弹出：
 * 锚定胶囊下方优先、空间不足翻上方；水平/顶部钳位含安全区与标题栏带；
 * ≤480px 转底部 sheet；Esc/外点关闭。面板头拖动与 panelPos 不复存在
 * （锚定即位置）。
 */

import { t } from "./i18n.mjs";
import { MARGIN, titlebarTopInset } from "./float-prefs.mjs";
import { parseInset } from "./drag.mjs";

const ZERO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 };
const WIDTH_FALLBACK = 400;
const HEIGHT_FALLBACK = 160;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function createPanel({ doc, win, store, views }) {
  let disposed = false;
  let open = false;
  let segRect = null; // S8：分区矩形（水平推出的锚定依据）
  let capsuleRect = null; // S8：胶囊矩形（顶边与垂直回退的锚定依据）
  let safeProbe = null;
  let snapshot = null;

  const el = doc.createElement("div");
  el.className = "skc-panel";
  el.setAttribute("role", "dialog");
  el.hidden = true;

  /* ---------------- insets 探针（随面板所在 root；safe-area + 标题栏带） ---------------- */

  const getSafeProbe = () => {
    if (safeProbe) return safeProbe;
    try {
      const root = el.getRootNode();
      if (root && typeof root.append === "function" && root !== doc) {
        safeProbe = doc.createElement("div");
        safeProbe.style.cssText =
          "position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
        root.append(safeProbe);
      }
    } catch {
      safeProbe = null;
    }
    return safeProbe;
  };

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

  const readInsets = () => {
    const probe = getSafeProbe();
    if (!probe) return ZERO_INSETS;
    try {
      const style = win.getComputedStyle(probe);
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

  /* ---------------- 弹出几何（垂直方向为 stock 域保留） ---------------- */

  const placePanel = () => {
    if (!open) return;
    const vw = win.innerWidth ?? 1024;
    const vh = win.innerHeight ?? 768;
    if (vw <= 480) {
      // 窄视口：底部 sheet，CSS 定位，丢弃内联锚定坐标
      el.classList.add("skc-panel--sheet");
      el.style.left = "";
      el.style.top = "";
      return;
    }
    el.classList.remove("skc-panel--sheet");
    const insets = readInsets();
    const width = el.offsetWidth || WIDTH_FALLBACK;
    const height = el.offsetHeight || HEIGHT_FALLBACK;
    const minLeft = MARGIN + insets.left;
    const maxLeft = vw - width - MARGIN - insets.right;
    const anchored = segRect != null;
    const cap = capsuleRect ?? { left: vw - width - MARGIN, top: MARGIN, width: 0, height: 0 };
    const seg = segRect ?? cap;
    // 水平推出（S8）：优先右侧 segRect.right + 8；放不下则左侧 segRect.left − width − 8
    let left = null;
    if (anchored) {
      const rightLeft = seg.left + seg.width + 8;
      const leftLeft = seg.left - width - 8;
      if (rightLeft <= maxLeft) left = rightLeft;
      else if (leftLeft >= minLeft) left = leftLeft;
    }
    let top;
    if (left !== null) {
      top = cap.top; // 顶边与胶囊对齐（capsuleRect.top），再钳位
    } else {
      // 回退（S8）：两侧都放不下 → 沿用垂直逻辑（下方优先，翻上方），锚点取 capsuleRect
      left = cap.left;
      top = cap.top + cap.height + 8; // 下方优先
      if (top + height > vh - MARGIN) top = cap.top - height - 8; // 空间不足翻上方
    }
    left = clamp(left, minLeft, maxLeft);
    top = clamp(top, MARGIN + insets.top, vh - height - MARGIN);
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  };

  const onResize = () => placePanel();

  /* ---------------- 关闭语义：Esc / 外点 ---------------- */

  const onKeydown = (event) => {
    if (!open || event.key !== "Escape") return;
    const ui = snapshot?.ui ?? {};
    if (ui.showAdd) {
      store.setShowAdd(false);
      return;
    }
    if (ui.showSettings) {
      store.setShowSettings(false);
      return;
    }
    close();
  };

  const onDocPointerDown = (event) => {
    if (!open) return;
    let path;
    try {
      path = event.composedPath();
    } catch {
      return; // 无法判定路径时不误关
    }
    if (path.includes(el)) return;
    // S6b（Q14/Q15=A）：胶囊按压不算外点，由胶囊点击完成切换；额度段按压仍是外点（不豁免）
    const onCapsule = path.some((n) => n?.dataset?.dshStockKanbanCapsule !== undefined);
    const onQuotaSeg = path.some((n) => n?.dataset?.seg === "quota");
    if (onCapsule && !onQuotaSeg) return;
    close();
  };

  doc.addEventListener("keydown", onKeydown);
  doc.addEventListener("pointerdown", onDocPointerDown);
  win.addEventListener("resize", onResize);

  /* ---------------- 结构 ---------------- */

  const header = doc.createElement("div");
  header.className = "skc-header";
  const title = doc.createElement("span");
  title.className = "skc-title";
  title.textContent = t("app.title");
  const headerMeta = doc.createElement("span");
  headerMeta.className = "skc-header-meta";
  header.append(title, headerMeta);

  const body = doc.createElement("div");
  body.className = "skc-body";
  // 列表常驻挂载：详情是覆盖层 → 返回时市场/筛选/滚动全部保留（4.3）
  const listLayer = doc.createElement("div");
  listLayer.className = "skc-layer";
  listLayer.append(views.list.el);
  const detailLayer = doc.createElement("div");
  detailLayer.className = "skc-layer skc-layer-detail";
  detailLayer.hidden = true;
  detailLayer.append(views.detail.el);
  body.append(listLayer, detailLayer);

  const footer = doc.createElement("div");
  footer.className = "skc-footer";
  const pickerLabel = doc.createElement("label");
  pickerLabel.className = "skc-capsule-picker";
  pickerLabel.append(doc.createTextNode(t("picker.label")));
  const pickerSelect = doc.createElement("select");
  pickerSelect.className = "skc-select";
  pickerSelect.addEventListener("change", () => store.setCapsuleSymbol(pickerSelect.value));
  pickerLabel.append(pickerSelect);

  const footerActions = doc.createElement("span");
  footerActions.className = "skc-spacer";
  const makeFooterButton = (action, label, titleText, onClick) => {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "skc-icon-btn";
    btn.dataset.action = action;
    btn.textContent = label;
    btn.title = titleText;
    btn.addEventListener("click", onClick);
    return btn;
  };
  const privacyBtn = makeFooterButton("privacy", "👁", "", () => {
    const next = !(snapshot?.business?.settings?.privacyMode === true);
    store.setPrivacy(next);
  });
  const addBtn = makeFooterButton("add", "＋", t("add.title"), () => store.setShowAdd(true));
  const settingsBtn = makeFooterButton("settings", "⚙", t("app.settings"), () => store.setShowSettings(true));
  const refreshBtn = makeFooterButton("refresh", "⟳", t("list.refresh"), () => store.pollQuotes());
  // 合并显示 quota 开关：仅能力在线（ui.quotaCapable）时由 render() 挂载；缺省视为开（与 store 默认一致）
  const quotaMergeBtn = makeFooterButton("quota-merge", "⊞", t("quota.merge"), () => {
    const on = snapshot?.ui?.quotaMerge !== false;
    store.setQuotaMerge(!on);
  });
  const closeBtn = makeFooterButton("close", "✕", t("app.collapse"), () => close());

  const footerHint = doc.createElement("span");
  footerHint.className = "skc-hint";
  footer.append(pickerLabel, footerActions, privacyBtn, addBtn, settingsBtn, refreshBtn, closeBtn, footerHint);

  // 对话框层（面板内渲染）
  const addLayer = doc.createElement("div");
  addLayer.className = "skc-dialog-layer";
  addLayer.hidden = true;
  addLayer.append(views.add.el);

  const settingsLayer = doc.createElement("div");
  settingsLayer.className = "skc-dialog skc-dialog--settings";
  settingsLayer.hidden = true;
  const settingsHead = doc.createElement("div");
  settingsHead.className = "skc-dialog-head";
  const settingsTitle = doc.createElement("span");
  settingsTitle.className = "skc-section-title";
  settingsTitle.textContent = t("app.settings");
  const settingsSpacer = doc.createElement("span");
  settingsSpacer.className = "skc-spacer";
  const settingsClose = doc.createElement("button");
  settingsClose.className = "skc-icon-btn";
  settingsClose.type = "button";
  settingsClose.textContent = "✕";
  settingsClose.addEventListener("click", () => store.setShowSettings(false));
  settingsHead.append(settingsTitle, settingsSpacer, settingsClose);
  settingsLayer.append(settingsHead, views.backup.el);

  const toast = doc.createElement("div");
  toast.className = "skc-toast";
  toast.hidden = true;

  el.append(header, body, footer, addLayer, settingsLayer, toast);

  /* ---------------- 渲染 ---------------- */

  const render = () => {
    if (disposed) return;
    const ui = snapshot?.ui ?? {};
    const business = snapshot?.business ?? { symbols: [], settings: {} };
    const quoteMeta = snapshot?.quoteMeta ?? {};

    el.hidden = !open;
    el.classList.toggle("skc-panel--slide", open); // S9：打开时带滑入类（动画位于减少动态效果守卫内），关闭时移除
    headerMeta.textContent = quoteMeta?.error
      ? t("app.meta.error")
      : t("app.meta", { n: business.symbols.length });

    listLayer.hidden = ui.view === "detail";
    detailLayer.hidden = ui.view !== "detail";

    // picker 选项（symbols 变化时重建；DOM 直建防注入）
    const symbols = business.symbols ?? [];
    const current = ui.capsuleSymbolId ?? "";
    pickerSelect.replaceChildren();
    if (symbols.length === 0) {
      const opt = doc.createElement("option");
      opt.value = "";
      opt.textContent = t("picker.empty");
      pickerSelect.append(opt);
    } else {
      for (const s of symbols) {
        const opt = doc.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.name} · ${t("market." + s.market)}`;
        pickerSelect.append(opt);
      }
    }
    pickerSelect.value = symbols.some((s) => s.id === current) ? current : "";

    const privacy = business.settings?.privacyMode === true;
    privacyBtn.textContent = privacy ? "🙈" : "👁";
    privacyBtn.title = privacy ? t("privacy.on") : t("privacy.off");
    privacyBtn.classList.toggle("skc-privacy-on", privacy);
    footerHint.textContent = t("app.footer", { privacy: privacy ? t("app.footer.privacy") : "" });

    // 合并显示 quota 开关：能力在线才挂载、能力消失即移除；label/active 随 ui.quotaMerge 切换
    if (ui.quotaCapable === true) {
      const quotaOn = ui.quotaMerge !== false;
      quotaMergeBtn.textContent = quotaOn ? "⊞" : "⊟";
      quotaMergeBtn.title = quotaOn ? t("quota.merge.on") : t("quota.merge.off");
      quotaMergeBtn.setAttribute("aria-label", t("quota.merge"));
      quotaMergeBtn.setAttribute("aria-pressed", quotaOn ? "true" : "false");
      quotaMergeBtn.classList.toggle("skc-quota-merge-on", quotaOn);
      if (quotaMergeBtn.parentNode !== footer) footer.insertBefore(quotaMergeBtn, closeBtn);
    } else {
      quotaMergeBtn.remove();
    }

    addLayer.hidden = !ui.showAdd;
    settingsLayer.hidden = !ui.showSettings;

    toast.hidden = !snapshot?.toast;
    if (snapshot?.toast) toast.textContent = snapshot.toast.text;

    if (open) placePanel();
  };

  /* ---------------- 对外接口 ---------------- */

  /** 开启并锚定：seg 为所点分区（水平推出），cap 为胶囊（顶边与垂直回退）；单参时两者同一（S8） */
  const openFrom = (seg, cap = seg) => {
    if (disposed) return;
    segRect = seg ?? null;
    capsuleRect = cap ?? null;
    open = true;
    render();
  };

  const close = () => {
    if (disposed) return;
    open = false;
    render();
    store.closePanel();
  };

  const isOpen = () => open;

  const update = (next) => {
    if (disposed) return;
    snapshot = next;
    // S6b（Q14）：面板可见性只由局部 open 决定；store 已收起（如胶囊切换）则同步收起
    if (next?.ui?.panelOpen === false && open) open = false;
    views.list.update(next);
    views.detail.update(next);
    if (next?.ui?.showAdd) views.add.update(next);
    if (next?.ui?.showSettings) views.backup.update(next);
    render();
  };

  const dispose = () => {
    disposed = true;
    doc.removeEventListener("keydown", onKeydown);
    doc.removeEventListener("pointerdown", onDocPointerDown);
    win.removeEventListener("resize", onResize);
    safeProbe?.remove?.();
    el.remove();
  };

  return { el, update, openFrom, close, isOpen, dispose };
}
