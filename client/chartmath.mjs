/** 图表纯计算（无 React 依赖，可单测）。 */

/** 简单移动平均：按收盘价，前 period-1 根无值 */
export function computeMa(candles, period) {
  const data = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) data.push({ index: i, value: sum / period });
  }
  return data;
}

/** 图表纵轴范围（退化时给单位区间，避免除零） */
export function niceBounds(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}
