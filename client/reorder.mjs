/**
 * 列表拖拽排序的 DOM-free 决策核心：起拖意图、落点求值、全序合并、FLIP 反演量。
 * 模式对齐 client/drag.mjs —— 数学在此，DOM 粘合在 list.mjs，jsdom 下可单测。
 *
 * 手势语义（2026-11-10 shape 定稿）：
 *   - 鼠标/笔：位移 ≥ DRAG_SLOP 即起拖；
 *   - 触摸：长按 ≥ LONG_PRESS_MS 起拖；未满长按先位移 ≥ slop → 判定为滚动意图，放弃手势
 *     （原生滚动不受影响；起拖后由 list.mjs 的非被动 touchmove preventDefault 压制滚动）。
 */

export const DRAG_SLOP = 6;
export const LONG_PRESS_MS = 300;

/**
 * 判定一次 pointermove 是否应当「起拖」。
 * @returns {'lift' | 'wait' | 'reject'} lift=进入拖拽；wait=继续观察；reject=滚动意图（触摸），放弃手势
 */
export function liftIntent({ pointerType, movedPx, heldMs, slopPx = DRAG_SLOP, longPressMs = LONG_PRESS_MS }) {
  const mouse = pointerType !== "touch" && pointerType !== "pen";
  if (mouse) return movedPx >= slopPx ? "lift" : "wait";
  if (movedPx >= slopPx) return "reject";
  return heldMs >= longPressMs ? "lift" : "wait";
}

/**
 * 把 id 移动到终序下标 toIndex（越界钳位），返回新数组不改原数组。
 * toIndex 语义：删除后插入前的「最终数组下标」——[a,b,c,d] 把 a 移到 2 → [b,c,a,d]。
 * id 不存在或位移无效时返回原序副本。
 */
export function moveId(list, id, toIndex) {
  const from = list.indexOf(id);
  if (from === -1) return [...list];
  const clamped = Math.max(0, Math.min(list.length - 1, toIndex));
  if (clamped === from) return [...list];
  const next = list.filter((x) => x !== id);
  next.splice(clamped, 0, id);
  return next;
}

/**
 * 指针跟随下的落点槽位：视觉顶缘换算行数四舍五入（过半行即换槽），钳位 0..count-1。
 * 行高统一（列表行结构齐整）：起拖时一次性缓存 listTop/rowH，拖拽期间零布局读——顺滑的关键。
 */
export function slotIndexFromY(visualTop, listTop, rowH, count) {
  return Math.max(0, Math.min(count - 1, Math.round((visualTop - listTop) / rowH)));
}

/**
 * 可见子序 → 全序合并：可见项按新相对位置落回全序，未在过滤视图中的项保持原位。
 * （「只看持仓」开着时拖拽仍可用；无过滤时 visibleOrder 即全序，恒等返回。）
 */
export function mergeVisibleIntoFull(fullIds, visibleOrder) {
  const shownSet = new Set(visibleOrder);
  let vi = 0;
  return fullIds.map((id) => (shownSet.has(id) ? visibleOrder[vi++] : id));
}

/** FLIP 反演量：before/after 的 id→top 表 → id→dy（先瞬时平移 dy，再过渡回 0）。 */
export function flipOffsets(before, after) {
  const out = {};
  for (const [id, top] of Object.entries(before)) {
    if (id in after && after[id] !== top) out[id] = top - after[id];
  }
  return out;
}
