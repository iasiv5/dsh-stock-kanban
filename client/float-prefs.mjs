// 移植自 @iasiv5/dsh-quota-watch src/client/prefs.mjs（同作者双仓，MIT）。
// Float-shell preferences for dsh-stock-kanban.
// Pure logic: no DOM. `storage` is a localStorage-like object (getItem/setItem).
// 不移植 SURFACE_FLAGS_KEY/loadSurfaceFlags/saveSurfaceFlags（本插件无侧栏卡片）。

export const FLOAT_POSITION_KEY = 'dsh-stock-kanban:float-position'

export const MARGIN = 8

const ZERO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 }

function normalizeSize(size) {
  if (typeof size === 'number') return { width: size, height: size }
  const width = typeof size?.width === 'number' ? size.width : 0
  const height = typeof size?.height === 'number' ? size.height : 0
  return { width, height }
}

export function clampPoint(point, viewport, size = 0, insets = ZERO_INSETS) {
  const { width, height } = normalizeSize(size)
  const insetLeft = Number.isFinite(insets?.left) ? insets.left : 0
  const insetRight = Number.isFinite(insets?.right) ? insets.right : 0
  const insetTop = Number.isFinite(insets?.top) ? insets.top : 0
  const insetBottom = Number.isFinite(insets?.bottom) ? insets.bottom : 0
  const minX = MARGIN + insetLeft
  const minY = MARGIN + insetTop
  const maxX = Math.max(minX, viewport.width - insetRight - MARGIN - width)
  const maxY = Math.max(minY, viewport.height - insetBottom - MARGIN - height)
  return {
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.min(Math.max(point.y, minY), maxY),
  }
}

// Windows Desktop shell titlebar contract（对齐 quota-watch 0.1.20 起）：
// shell 走 `titleBarStyle:hidden + titleBarOverlay`，窗口顶部整条 drag band
// 会吞掉指针输入——胶囊停进去就再也抓不到。shell 用 <html> 上的
// `data-windows-titlebar` + `--dsh-windows-titlebar-height` 标记该带，
// `data-fullscreen` 时清除；自身浮动体钳位到恰好这个值。其余环境
// （DSH Web、浏览器、jsdom）一律返回 0——零漂移。
export function titlebarTopInset({ titlebar = false, fullscreen = false, height } = {}) {
  if (!titlebar || fullscreen) return 0
  const value = Number.parseFloat(height)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function loadFloatPosition(storage) {
  try {
    const raw = storage.getItem(FLOAT_POSITION_KEY)
    if (typeof raw !== 'string' || raw === '') return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Number.isFinite(parsed.x) ||
      !Number.isFinite(parsed.y)
    ) {
      return null
    }
    return { x: parsed.x, y: parsed.y }
  } catch {
    return null
  }
}

export function saveFloatPosition(storage, point) {
  if (
    typeof point !== 'object' ||
    point === null ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw new TypeError(`invalid float position: ${JSON.stringify(point)}`)
  }
  try {
    storage.setItem(FLOAT_POSITION_KEY, JSON.stringify({ x: point.x, y: point.y }))
  } catch {
    /* storage unavailable; position stays session-only */
  }
}
