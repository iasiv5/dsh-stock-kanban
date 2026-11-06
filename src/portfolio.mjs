/**
 * 持仓与汇总计算 —— 纯函数，无 IO，重测试。
 *
 * 口径（数量与报价单位一致的前提下）：
 *   持仓成本   = 数量 × 平均成本
 *   当前市值   = 数量 × 当前价格
 *   浮动盈亏   = 当前市值 − 持仓成本
 *   浮动盈亏%  = 浮动盈亏 ÷ 持仓成本 × 100
 *
 * 防御规则：
 *   - 数量缺失/≤0/非法 → 无持仓
 *   - 成本缺失/≤0/非法 → 成本口径缺失（不产出任何伪 0 值；显式 flags.zeroCost）
 *   - 价格缺失/≤0/非法 → 市值口径缺失（不得把价格当 0 显示虚假全额亏损）
 *   - 输出中未知一律为 null，绝不产生 Infinity/NaN/伪造 0%
 */

const finitePositive = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * 单标的持仓指标。
 * @returns {{ hasPosition: boolean, quantity: number|null, avgCost: number|null, price: number|null,
 *             cost: number|null, marketValue: number|null, pnl: number|null, pnlPct: number|null,
 *             flags: { zeroCost: boolean, missingPrice: boolean } }}
 */
export function positionMetrics(symbol, price) {
  const quantity = symbol?.quantity;
  const avgCost = symbol?.avgCost;
  const hasPosition = finitePositive(quantity);
  if (!hasPosition) {
    return {
      hasPosition: false, quantity: null, avgCost: null, price: null,
      cost: null, marketValue: null, pnl: null, pnlPct: null,
      flags: { zeroCost: false, missingPrice: false },
    };
  }
  const zeroCost = !finitePositive(avgCost);
  const missingPrice = !finitePositive(price);
  const cost = zeroCost ? null : quantity * avgCost;
  const marketValue = missingPrice ? null : quantity * price;
  let pnl = null;
  let pnlPct = null;
  if (!zeroCost && !missingPrice) {
    pnl = marketValue - cost;
    pnlPct = cost > 0 ? (pnl / cost) * 100 : null;
  }
  return {
    hasPosition: true,
    quantity,
    avgCost: zeroCost ? null : avgCost,
    price: missingPrice ? null : price,
    cost, marketValue, pnl, pnlPct,
    flags: { zeroCost, missingPrice },
  };
}

/**
 * 按报价币种分别汇总（不做跨币种换算；USD 与 USDT 天然是两个桶）。
 *
 * 仅对 hasPosition 的标的计入。三个口径各自独立累计：
 *   cost        = Σ 有效成本（数量×成本）
 *   marketValue = Σ 有效市值（数量×价格）
 *   pnl / pnlPct= 只在「成本与市值双有效」的子集上计算（pnl 基数 = 该子集的 Σcost）
 * 任一口径未覆盖全部持仓 → partial: true（missingPriceCount / zeroCostCount 计数），
 * 不得把不完整汇总冒充完整总额。
 *
 * @param {Array<{symbol: object, metrics: object}>} rows positionMetrics 的调用结果
 */
export function aggregateByCurrency(rows) {
  const byCcy = new Map();
  const bucketOf = (ccy) => {
    let bucket = byCcy.get(ccy);
    if (!bucket) {
      bucket = {
        cost: null, marketValue: null, pnl: null, pnlPct: null,
        positionCount: 0, missingPriceCount: 0, zeroCostCount: 0, partial: false,
      };
      byCcy.set(ccy, bucket);
    }
    return bucket;
  };
  const add = (acc, v) => Math.round(((acc ?? 0) + v) * 1e8) / 1e8;

  for (const { symbol, metrics } of rows) {
    if (!metrics?.hasPosition) continue;
    const ccy = symbol?.quoteCurrency;
    if (!ccy) continue;
    const bucket = bucketOf(ccy);
    bucket.positionCount += 1;
    const hasCost = metrics.cost != null;
    const hasMv = metrics.marketValue != null;
    if (hasCost) bucket.cost = add(bucket.cost, metrics.cost);
    else { bucket.zeroCostCount += 1; bucket.partial = true; }
    if (hasMv) bucket.marketValue = add(bucket.marketValue, metrics.marketValue);
    else { bucket.missingPriceCount += 1; bucket.partial = true; }
    if (hasCost && hasMv) {
      bucket.pnl = add(bucket.pnl, metrics.pnl);
      bucket.pnlCost = add(bucket.pnlCost, metrics.cost);
    }
  }
  for (const bucket of byCcy.values()) {
    if (bucket.pnlCost != null && bucket.pnlCost > 0) {
      bucket.pnlPct = (bucket.pnl / bucket.pnlCost) * 100;
    }
    delete bucket.pnlCost;
  }
  return Object.fromEntries(byCcy);
}
