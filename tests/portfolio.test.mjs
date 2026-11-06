import test from "node:test";
import assert from "node:assert/strict";
import { positionMetrics, aggregateByCurrency } from "../src/portfolio.mjs";

test("持仓市值/盈亏/比例（12.1）", () => {
  const m = positionMetrics({ quantity: 100, avgCost: 10 }, 12.5);
  assert.equal(m.cost, 1000);
  assert.equal(m.marketValue, 1250);
  assert.equal(m.pnl, 250);
  assert.equal(m.pnlPct, 25);
});

test("零成本：不产出伪 0% 也不产出 Infinity/NaN（12.1）", () => {
  const m = positionMetrics({ quantity: 100, avgCost: 0 }, 12.5);
  assert.equal(m.flags.zeroCost, true);
  assert.equal(m.cost, null);
  assert.equal(m.pnl, null);
  assert.equal(m.pnlPct, null);
  assert.ok(!Number.isNaN(m.pnl) && m.pnl !== Infinity && m.pnl !== -Infinity);
  const negative = positionMetrics({ quantity: 100, avgCost: -5 }, 12.5);
  assert.equal(negative.flags.zeroCost, true); // 非正成本同样视为成本口径缺失
});

test("缺失价格：不得把价格当 0 显示虚假全额亏损（12.1）", () => {
  const m = positionMetrics({ quantity: 100, avgCost: 10 }, null);
  assert.equal(m.flags.missingPrice, true);
  assert.equal(m.cost, 1000);
  assert.equal(m.marketValue, null);
  assert.equal(m.pnl, null);
  assert.equal(m.pnlPct, null);
  const zeroPrice = positionMetrics({ quantity: 100, avgCost: 10 }, 0);
  assert.equal(zeroPrice.flags.missingPrice, true);
});

test("非法输入与无持仓", () => {
  assert.equal(positionMetrics({ quantity: NaN, avgCost: 10 }, 10).hasPosition, false);
  assert.equal(positionMetrics({ quantity: -1, avgCost: 10 }, 10).hasPosition, false);
  assert.equal(positionMetrics({}, 10).hasPosition, false);
  assert.equal(positionMetrics(null, 10).hasPosition, false);
  assert.equal(positionMetrics({ quantity: "12", avgCost: 10 }, 10).hasPosition, false); // 字符串数量无效
});

test("小数数量与价格精度（加密货币）（12.1）", () => {
  const m = positionMetrics({ quantity: 0.12345678, avgCost: 30000.5 }, 31500.25);
  assert.ok(Math.abs(m.cost - 0.12345678 * 30000.5) < 1e-6);
  assert.ok(Math.abs(m.marketValue - 0.12345678 * 31500.25) < 1e-6);
  assert.ok(Math.abs(m.pnlPct - ((31500.25 / 30000.5 - 1) * 100)) < 1e-9);
});

test("按币种分别汇总：USD 与 USDT 不合并（12.1）", () => {
  const rows = [
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 10, avgCost: 200 }, 220) },
    { symbol: { quoteCurrency: "USDT" }, metrics: positionMetrics({ quantity: 1, avgCost: 60000 }, 65000) },
    { symbol: { quoteCurrency: "CNY" }, metrics: positionMetrics({ quantity: 100, avgCost: 1500 }, 1450) },
  ];
  const agg = aggregateByCurrency(rows);
  assert.deepEqual(Object.keys(agg).sort(), ["CNY", "USD", "USDT"]);
  assert.equal(agg.USD.marketValue, 2200);
  assert.equal(agg.USDT.marketValue, 65000);
  assert.equal(agg.CNY.pnl, -5000);
});

test("汇总盈亏比例按汇总成本计算，不得简单平均（12.1）", () => {
  const rows = [
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 100, avgCost: 10 }, 20) }, // +100%
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 1000, avgCost: 10 }, 11) }, // +10%
  ];
  const agg = aggregateByCurrency(rows);
  // Σmv=12000+11000? no: 100*20=2000, 1000*11=11000 → 13000; Σcost=1000+10000=11000 → 18.18%
  assert.ok(Math.abs(agg.USD.pnlPct - ((13000 - 11000) / 11000) * 100) < 1e-9);
});

test("部分持仓缺行情：汇总显式 partial，不冒充完整（12.1）", () => {
  const rows = [
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 10, avgCost: 100 }, 120) },
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 5, avgCost: 100 }, null) }, // 缺行情
  ];
  const agg = aggregateByCurrency(rows);
  assert.equal(agg.USD.partial, true);
  assert.equal(agg.USD.missingPriceCount, 1);
  assert.equal(agg.USD.marketValue, 1200); // 只有有行情部分
  assert.equal(agg.USD.pnl, 200); // pnl 只在双有效子集上算
});

test("零成本持仓计入 partial 且不污染 pnl", () => {
  const rows = [
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 10, avgCost: 100 }, 120) },
    { symbol: { quoteCurrency: "USD" }, metrics: positionMetrics({ quantity: 1, avgCost: null }, 50) }, // 零成本但有价
  ];
  const agg = aggregateByCurrency(rows);
  assert.equal(agg.USD.partial, true);
  assert.equal(agg.USD.zeroCostCount, 1);
  assert.equal(agg.USD.cost, 1000);
  assert.equal(agg.USD.pnl, 200); // 零成本持仓不进 pnl
});

test("浮点误差：汇总保留 8 位小数精度（12.1）", () => {
  const rows = [
    { symbol: { quoteCurrency: "USDT" }, metrics: positionMetrics({ quantity: 0.1, avgCost: 3 }, 3.1) },
    { symbol: { quoteCurrency: "USDT" }, metrics: positionMetrics({ quantity: 0.2, avgCost: 3 }, 3.1) },
  ];
  const agg = aggregateByCurrency(rows);
  assert.equal(agg.USDT.cost, 0.9);
  assert.equal(agg.USDT.marketValue, 0.93);
  assert.equal(agg.USDT.pnl, 0.03);
});
