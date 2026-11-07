/**
 * 展示格式化与隐私遮挡 —— 纯函数（可在 node 测试）。
 * 隐私遮挡只是界面遮挡（4.6）：所有敏感金额类展示值统一走 maskIf，遮挡为 '••••'；
 * 行情与图表不受影响。比例字段同样遮挡（保守默认，记录于文档）。
 */

export const MASK = "••••";

/** 隐私模式下遮挡任意值 */
export function maskIf(privacy, value) {
  return privacy ? MASK : value;
}

/** 价格：按量级自适应精度（千分位） */
export function fmtPrice(p) {
  if (p == null || !Number.isFinite(p)) return "—";
  const abs = Math.abs(p);
  let digits;
  if (abs >= 1000) digits = 2;
  else if (abs >= 1) digits = 2;
  else if (abs >= 0.01) digits = 4;
  else digits = 6;
  return p.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 百分比（已乘 100 的值） */
export function fmtPct(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

/** 金额（千分位，2 位小数；null → —） */
export function fmtAmount(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 数量：小数（加密货币可 8 位）去尾零 */
export function fmtQty(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = v.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return s.length === 0 ? "0" : s;
}

/** 涨跌颜色类名（A股红涨绿跌惯例） */
export function trendClass(v) {
  if (v == null || !Number.isFinite(v) || v === 0) return "sk-flat";
  return v > 0 ? "sk-up" : "sk-down";
}

/** epoch ms → 当地 HH:mm（行情时间展示） */
export function fmtClock(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function fmtClockSec(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function fmtDate(ms) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 数值输入解析：空 → null（清除）；非法 → undefined（错误）；合法 → 正数。
 */
export function parsePositiveInput(text) {
  const raw = String(text ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/**
 * 胶囊拖动辅助（纯函数，可测）：
 * - 位移超过阈值判为拖动（防误触点击）
 * - 释放时吸附到最近屏幕边缘（8px 边距），并钳位在视口内
 */
export const DRAG_THRESHOLD_PX = 4;
export const EDGE_MARGIN_PX = 8;

export function shouldDrag(dx, dy) {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
}

export function clampToViewport(x, y, w, h, vw, vh) {
  const maxX = Math.max(EDGE_MARGIN_PX, vw - w - EDGE_MARGIN_PX);
  const maxY = Math.max(EDGE_MARGIN_PX, vh - h - EDGE_MARGIN_PX);
  return {
    x: Math.min(Math.max(x, EDGE_MARGIN_PX), maxX),
    y: Math.min(Math.max(y, EDGE_MARGIN_PX), maxY),
  };
}

/** 吸附到最近边缘：返回 {x, y, dock} dock ∈ left|right|top|bottom */
export function snapToEdge(x, y, w, h, vw, vh) {
  const c = clampToViewport(x, y, w, h, vw, vh);
  const dists = {
    left: c.x,
    right: vw - c.x - w,
    top: c.y,
    bottom: vh - c.y - h,
  };
  const entries = Object.entries(dists).sort((a, b) => a[1] - b[1]);
  const edge = entries[0][0];
  const inset = EDGE_MARGIN_PX;
  if (edge === "left") return { x: inset, y: c.y, dock: "left" };
  if (edge === "right") return { x: vw - w - inset, y: c.y, dock: "right" };
  if (edge === "top") return { x: c.x, y: inset, dock: "top" };
  return { x: c.x, y: vh - h - inset, dock: "bottom" };
}
