/**
 * SVG 图表（自绘，无 CDN 依赖）：分时线、K 线（含成交量与均线）。
 * 绘制思路参考 dsh-stock-watch / dsh-stock-view 的 SVG 兜底实现（MIT，见 NOTICE）。
 * 不用模拟数据填补缺口：无数据/失败/不支持分别渲染明确状态。
 */

import { createElement as h } from "react";
import { computeMa, niceBounds } from "./chartmath.mjs";
import { t } from "./i18n.mjs";

const UP = "#e5484d"; // A股惯例红涨
const DOWN = "#2bb596"; // 绿跌
const YELLOW = "#d9a514";
const MA_COLORS = { 5: "#e8e8e8", 10: "#d9a514", 20: "#a78bfa", 60: "#4ade80" };

/** 分时图：价格线 + 均价线 + 昨收虚线 + 成交量柱 */
export function MinuteChart({ points, prevClose, width = 372, height = 190, volHeight = 34, dark }) {
  if (!Array.isArray(points) || points.length < 2) {
    return h("div", { className: "skc-chart-empty" }, t("detail.chart.empty.minute"));
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
  const axisText = dark ? "rgba(255,255,255,.45)" : "rgba(15,23,42,.5)";
  const timeLabel = (t) => {
    const d = new Date(t * 1000);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const kids = [
    h("polyline", { key: "price", points: pricePts, fill: "none", stroke: up ? UP : DOWN, strokeWidth: 1.5 }),
    h("polyline", { key: "avg", points: avgPts, fill: "none", stroke: YELLOW, strokeWidth: 1 }),
    h("text", { key: "t0", x: 2, y: height - 2, fill: axisText, fontSize: 9 }, timeLabel(points[0].t)),
    h("text", { key: "t1", x: width / 2 - 16, y: height - 2, fill: axisText, fontSize: 9 }, timeLabel(points[Math.floor(points.length / 2)].t)),
    h("text", { key: "t2", x: width - 30, y: height - 2, fill: axisText, fontSize: 9 }, timeLabel(points[points.length - 1].t)),
  ];
  if (baseY != null) {
    kids.splice(2, 0, h("line", { key: "base", x1: pad, y1: baseY, x2: width - pad, y2: baseY, stroke: dark ? "rgba(255,255,255,.4)" : "rgba(15,23,42,.35)", strokeDasharray: "4 3", strokeWidth: 1 }));
  }
  points.forEach((p, i) => {
    if ((p.v ?? 0) > 0) {
      kids.push(h("rect", {
        key: `v${i}`, x: xOf(i) - 0.5, y: volYOf(p.v), width: 1.4, height: volTop + volHeight - volYOf(p.v),
        fill: up ? "rgba(229,72,77,.4)" : "rgba(43,181,150,.4)",
      }));
    }
  });
  return h("svg", { className: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` }, kids);
}

/** K 线图：蜡烛 + MA + 成交量柱 */
export function CandleChart({ candles, maVisible = {}, width = 372, height = 230, volHeight = 34, dark }) {
  if (!Array.isArray(candles) || candles.length === 0) {
    return h("div", { className: "skc-chart-empty" }, t("detail.chart.empty.candle"));
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
    kids.push(h("line", { key: `w${i}`, x1: xOf(i), x2: xOf(i), y1: yOf(c.high), y2: yOf(c.low), stroke: color, strokeWidth: 1 }));
    kids.push(h("rect", {
      key: `b${i}`, x: xOf(i) - bodyW / 2, y: yO, width: bodyW, height: Math.max(0.8, yC - yO),
      fill: up ? "transparent" : color, stroke: color, strokeWidth: 0.8,
    }));
    if ((c.volume ?? 0) > 0) {
      const yV = volTop + volHeight - (c.volume / maxVol) * volHeight;
      kids.push(h("rect", { key: `v${i}`, x: xOf(i) - bodyW / 2, y: yV, width: bodyW, height: volTop + volHeight - yV, fill: up ? "rgba(229,72,77,.35)" : "rgba(43,181,150,.35)" }));
    }
  });
  for (const [period, data] of Object.entries(mas)) {
    const pts = data.map((m) => `${xOf(m.index).toFixed(1)},${yOf(m.value).toFixed(1)}`).join(" ");
    kids.push(h("polyline", { key: `ma${period}`, points: pts, fill: "none", stroke: MA_COLORS[period] ?? "#888", strokeWidth: 1 }));
  }
  const axisText = dark ? "rgba(255,255,255,.45)" : "rgba(15,23,42,.5)";
  const labelIdx = [0, Math.floor(candles.length / 2), candles.length - 1];
  labelIdx.forEach((i, k) => {
    const text = String(candles[i]?.time ?? "").slice(5);
    kids.push(h("text", { key: `t${k}`, x: k === 0 ? 2 : k === 1 ? width / 2 - 14 : width - 34, y: height - 2, fill: axisText, fontSize: 9 }, text));
  });
  return h("svg", { className: "skc-chart", width, height, viewBox: `0 0 ${width} ${height}` }, kids);
}

/** MA 图例行 */
export function MaLegend({ maVisible, onToggle }) {
  return h("div", { className: "skc-ma-legend" },
    [5, 10, 20, 60].map((p) => h("button", {
      key: p,
      className: `skc-ma-chip${maVisible[p] === false ? " skc-ma-off" : ""}`,
      style: maVisible[p] === false ? undefined : { color: MA_COLORS[p] },
      onClick: () => onToggle(p),
    }, `MA${p}`)));
}
