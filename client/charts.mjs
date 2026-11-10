/**
 * SVG 图表（vanilla 直建，无 CDN 依赖）：分时线、K 线（含成交量与均线）。
 * 绘制思路参考 dsh-stock-watch / dsh-stock-view 的 SVG 兜底实现（MIT，见 NOTICE）。
 * 不用模拟数据填补缺口：无数据/失败/不支持分别渲染明确状态。
 * vanilla 重写（Task 10）：React h() → createElementNS 直建；
 * chartmath 输入输出契约不变。
 */

import { computeMa, niceBounds } from "./chartmath.mjs";
import { t } from "./i18n.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const UP = "#e5484d"; // A股惯例红涨
const DOWN = "#2bb596"; // 绿跌
const YELLOW = "#d9a514";
/** MA 线色：MA5 由 #e8e8e8（深底遗产，浅色面板不可读）改中性灰蓝（2026-11-10 UI 重构） */
const MA_COLORS = { 5: "#94a3b8", 10: "#d9a514", 20: "#a78bfa", 60: "#4ade80" };
/** 主题跟随的轴文字/参考线：SVG 表现属性吃不到 var()，走 style 属性（跟随 DSH 主题/皮肤） */
const AXIS_TEXT_STYLE = "fill:var(--dsw-alias-label-tertiary,rgba(127,127,127,.62))";
const BASELINE_STYLE = "stroke:var(--dsw-alias-border-l4,rgba(127,127,127,.35))";

function svgEl(tag, attrs, textContent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs ?? {})) el.setAttribute(k, String(v));
  if (textContent != null) el.textContent = textContent;
  return el;
}

function emptyState(key) {
  const el = document.createElement("div");
  el.className = "skc-chart-empty";
  el.textContent = t(key);
  return el;
}

/**
 * 分时图：价格线 + 均价线 + 昨收虚线 + 成交量柱。
 * @param {{points?: Array<{t:number,p:number,v?:number}>, prevClose?: number|null}} svgData
 * @param {{width?:number,height?:number,volHeight?:number,dark?:boolean}} [opts]
 * @returns {Element} SVG 根（数据不足时为 .skc-chart-empty div）
 */
export function buildMinuteChart(svgData, opts = {}) {
  const points = svgData?.points ?? [];
  const prevClose = svgData?.prevClose ?? null;
  const { width = 372, height = 190, volHeight = 34, dark = false } = opts;
  if (!Array.isArray(points) || points.length < 2) {
    return emptyState("detail.chart.empty.minute");
  }
  const pad = 6;
  const priceH = height - volHeight - pad * 2;
  const withBase = points.map((p) => p.p).concat(Number.isFinite(prevClose) && prevClose > 0 ? [prevClose] : []);
  const [min, max] = niceBounds(Math.min(...withBase), Math.max(...withBase));
  const innerW = width - pad * 2;
  const xOf = (i) => pad + (i / (points.length - 1)) * innerW;
  const yOf = (v) => pad + priceH - ((v - min) / (max - min)) * priceH;
  const maxVol = Math.max(...points.map((p) => p.v ?? 0), 1);
  const volTop = pad + priceH + pad;
  const volYOf = (v) => volTop + volHeight - (v / maxVol) * volHeight;

  const pricePts = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.p).toFixed(1)}`).join(" ");
  let cumV = 0;
  let cumA = 0;
  const avgPts = points.map((p, i) => {
    cumV += p.v ?? 0;
    cumA += p.p * (p.v ?? 0);
    const avg = cumV > 0 ? cumA / cumV : p.p;
    return `${xOf(i).toFixed(1)},${yOf(avg).toFixed(1)}`;
  }).join(" ");
  const up = Number.isFinite(prevClose) && prevClose > 0 ? points[points.length - 1].p >= prevClose : true;
  const baseY = Number.isFinite(prevClose) && prevClose > 0 ? yOf(prevClose) : null;
  void dark; // 轴色已改主题令牌（AXIS_TEXT_STYLE），dark 参数保留 API 兼容
  const timeLabel = (ts) => {
    const d = new Date(ts * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const kids = [
    svgEl("polyline", { points: pricePts, fill: "none", stroke: up ? UP : DOWN, "stroke-width": 1.5 }),
    svgEl("polyline", { points: avgPts, fill: "none", stroke: YELLOW, "stroke-width": 1 }),
    svgEl("text", { x: 2, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 9 }, timeLabel(points[0].t)),
    svgEl("text", { x: width / 2 - 16, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 9 }, timeLabel(points[Math.floor(points.length / 2)].t)),
    svgEl("text", { x: width - 30, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 9 }, timeLabel(points[points.length - 1].t)),
  ];
  if (baseY != null) {
    kids.splice(2, 0, svgEl("line", {
      x1: pad,
      y1: baseY,
      x2: width - pad,
      y2: baseY,
      style: BASELINE_STYLE,
      "stroke-dasharray": "4 3",
      "stroke-width": 1,
    }));
  }
  points.forEach((p, i) => {
    if ((p.v ?? 0) > 0) {
      kids.push(svgEl("rect", {
        x: xOf(i) - 0.5,
        y: volYOf(p.v),
        width: 1.4,
        height: volTop + volHeight - volYOf(p.v),
        fill: up ? "rgba(229,72,77,.4)" : "rgba(43,181,150,.4)",
      }));
    }
  });

  const svg = svgEl("svg", { class: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` });
  svg.append(...kids);
  return svg;
}

/**
 * K 线图：蜡烛 + MA + 成交量柱。
 * @param {Array<{time:string,open:number,close:number,high:number,low:number,volume?:number}>} klineData
 * @param {{maVisible?:Object,width?:number,height?:number,volHeight?:number,dark?:boolean}} [opts]
 * @returns {Element} SVG 根（无数据时为 .skc-chart-empty div）
 */
export function buildCandleChart(klineData, opts = {}) {
  const candles = klineData ?? [];
  const { maVisible = {}, width = 372, height = 230, volHeight = 34, dark = false } = opts;
  if (!Array.isArray(candles) || candles.length === 0) {
    return emptyState("detail.chart.empty.candle");
  }
  const pad = 6;
  const priceH = height - volHeight - pad * 2;
  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const mas = {};
  for (const period of [5, 10, 20, 60]) {
    if (maVisible[period] !== false) mas[period] = computeMa(candles, period);
  }
  const maValues = Object.values(mas).flat().map((m) => m.value);
  const [min, max] = niceBounds(Math.min(...lows, ...(maValues.length ? maValues : lows)), Math.max(...highs, ...(maValues.length ? maValues : highs)));
  const innerW = width - pad * 2;
  const step = innerW / candles.length;
  const bodyW = Math.max(1.2, Math.min(6, step * 0.6));
  const xOf = (i) => pad + i * step + step / 2;
  const yOf = (v) => pad + priceH - ((v - min) / (max - min)) * priceH;
  const maxVol = Math.max(...candles.map((c) => c.volume ?? 0), 1);
  const volTop = pad + priceH + pad;
  const kids = [];
  candles.forEach((c, i) => {
    const up = c.close >= c.open;
    const color = up ? UP : DOWN;
    const yO = yOf(Math.max(c.open, c.close));
    const yC = yOf(Math.min(c.open, c.close));
    kids.push(svgEl("line", { x1: xOf(i), x2: xOf(i), y1: yOf(c.high), y2: yOf(c.low), stroke: color, "stroke-width": 1 }));
    kids.push(svgEl("rect", {
      x: xOf(i) - bodyW / 2,
      y: yO,
      width: bodyW,
      height: Math.max(0.8, yC - yO),
      fill: up ? "transparent" : color,
      stroke: color,
      "stroke-width": 0.8,
    }));
    if ((c.volume ?? 0) > 0) {
      const yV = volTop + volHeight - (c.volume / maxVol) * volHeight;
      kids.push(svgEl("rect", {
        x: xOf(i) - bodyW / 2,
        y: yV,
        width: bodyW,
        height: volTop + volHeight - yV,
        fill: up ? "rgba(229,72,77,.35)" : "rgba(43,181,150,.35)",
      }));
    }
  });
  for (const [period, data] of Object.entries(mas)) {
    const pts = data.map((m) => `${xOf(m.index).toFixed(1)},${yOf(m.value).toFixed(1)}`).join(" ");
    kids.push(svgEl("polyline", { points: pts, fill: "none", stroke: MA_COLORS[period] ?? "#888", "stroke-width": 1 }));
  }
  void dark; // 轴色已改主题令牌（AXIS_TEXT_STYLE），dark 参数保留 API 兼容
  const labelIdx = [0, Math.floor(candles.length / 2), candles.length - 1];
  labelIdx.forEach((i, k) => {
    const text = String(candles[i]?.time ?? "").slice(5);
    kids.push(svgEl("text", { x: k === 0 ? 2 : k === 1 ? width / 2 - 14 : width - 34, y: height - 2, style: AXIS_TEXT_STYLE, "font-size": 9 }, text));
  });

  const svg = svgEl("svg", { class: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` });
  svg.append(...kids);
  return svg;
}

/** MA 图例（色点按钮行）；onToggle(period) */
export function buildMaLegend(maVisible, onToggle) {
  const wrap = document.createElement("div");
  wrap.className = "skc-ma-legend";
  for (const p of [5, 10, 20, 60]) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `skc-ma-chip${maVisible?.[p] === false ? " skc-ma-off" : ""}`;
    chip.textContent = `MA${p}`;
    if (maVisible?.[p] !== false) chip.style.color = MA_COLORS[p];
    chip.addEventListener("click", () => onToggle?.(p));
    wrap.append(chip);
  }
  return wrap;
}
