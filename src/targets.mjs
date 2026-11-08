/**
 * 目标价状态机 —— 纯函数，无 IO。
 *
 * 规则（需求第六章）：
 *   当前价 ≤ 买入目标价 → buy 触价；当前价 ≥ 卖出目标价 → sell 触价；
 *   两条件同时成立（阈值配置重叠）→ 'both'，两个标记同时显示（不静默覆盖）；
 *   未设置目标价 → 'no-targets'；无有效行情或行情过期 → 'no-data'/'stale'（不得伪装成有效触价）。
 *
 * 行情有效性门（触发判断只能基于实际取得的有效行情）：
 *   - price 必须为有限正数；
 *   - quoteTime/fetchedAt 距 now 超过 maxAgeMs → 'stale'。
 */

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000; // 免费行情延迟前提下统一 30 分钟有效窗（加密市场同口径，记录于文档）
const finitePositive = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * @param {object} p
 * @param {number|null} p.price 当前价
 * @param {number|null} [p.quoteTime] 行情自身时间（ms epoch，可空）
 * @param {number|null} [p.fetchedAt] 本次取得时间（ms epoch，可空）
 * @param {number} p.now 当前时间（ms epoch）
 * @param {number|null} p.buyTarget
 * @param {number|null} p.sellTarget
 * @param {number} [p.maxAgeMs]
 * @returns {{status: 'no-targets'|'wait'|'buy'|'sell'|'both'|'no-data'|'stale',
 *            buyTriggered: boolean, sellTriggered: boolean, priceValid: boolean}}
 */
export function targetState({ price, quoteTime = null, fetchedAt = null, now, buyTarget, sellTarget, maxAgeMs = DEFAULT_MAX_AGE_MS }) {
  const hasTargets = finitePositive(buyTarget) || finitePositive(sellTarget);
  const priceValid = finitePositive(price);
  if (!hasTargets) {
    return { status: "no-targets", buyTriggered: false, sellTriggered: false, priceValid };
  }
  if (!priceValid) {
    return { status: "no-data", buyTriggered: false, sellTriggered: false, priceValid: false };
  }
  const referenceTime = Number.isFinite(quoteTime) && quoteTime > 0 ? quoteTime : fetchedAt;
  if (!(Number.isFinite(referenceTime) && referenceTime > 0)) {
    // 有价但完全没有时间戳：保守按过期处理（不伪装成实时状态）
    return { status: "stale", buyTriggered: false, sellTriggered: false, priceValid: true };
  }
  if (now - referenceTime > maxAgeMs) {
    return { status: "stale", buyTriggered: false, sellTriggered: false, priceValid: true };
  }
  const buyTriggered = finitePositive(buyTarget) && price <= buyTarget;
  const sellTriggered = finitePositive(sellTarget) && price >= sellTarget;
  let status;
  if (buyTriggered && sellTriggered) status = "both";
  else if (buyTriggered) status = "buy";
  else if (sellTriggered) status = "sell";
  else status = "wait";
  return { status, buyTriggered, sellTriggered, priceValid: true };
}

/**
 * 保存前的目标价数值校验。
 * @returns {{ok: boolean, buyTarget: number|null, sellTarget: number|null, errors: string[], overlap: boolean}}
 *   errors 为稳定代码（invalid-buy-target / invalid-sell-target），文案由客户端 i18n 本地化。
 */
export function validateTargets(rawBuy, rawSell) {
  const errors = [];
  const clean = (raw, code) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (!Number.isFinite(n) || n <= 0) {
      errors.push(code);
      return null;
    }
    return n;
  };
  const buyTarget = clean(rawBuy, "invalid-buy-target");
  const sellTarget = clean(rawSell, "invalid-sell-target");
  const overlap = buyTarget != null && sellTarget != null && buyTarget >= sellTarget;
  return { ok: errors.length === 0, buyTarget, sellTarget, errors, overlap };
}
