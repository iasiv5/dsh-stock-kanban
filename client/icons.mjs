/**
 * 线性图标系统（2026-11-10 优雅化重构）：14×14 viewBox、currentColor 描边、
 * stroke 1.6 圆帽圆角，与 DSH 线性图标语言一致。替换原 footer 的 emoji 字形
 * （U+1F441/U+1F648/U+FF0B/U+2699/U+27F3/U+229E/U+229F/U+2715），跨平台渲染一致。
 * DOM 直建（createElementNS），不用 innerHTML（jsdom SVG 解析兼容）。
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** path/line/circle/rect 元素属性表；tag 缺省 path */
const ICONS = {
  /* 添加 */
  plus: [
    { d: "M7 2.6v8.8" },
    { d: "M2.6 7h8.8" },
  ],
  /* 设置：三行滑杆（横向 sliders） */
  settings: [
    { d: "M2 3.8h4.9" }, { tag: "circle", cx: 8.6, cy: 3.8, r: 1.5 }, { d: "M10.1 3.8H12" },
    { d: "M2 7h.9" }, { tag: "circle", cx: 4.6, cy: 7, r: 1.5 }, { d: "M6.1 7H12" },
    { d: "M2 10.2h3.9" }, { tag: "circle", cx: 7.6, cy: 10.2, r: 1.5 }, { d: "M9.1 10.2H12" },
  ],
  /* 刷新：双箭头环形（lucide refresh-cw 14px 缩放） */
  refresh: [
    { d: "M1.8 7a5.3 5.3 0 0 1 5.3-5.3 5.7 5.7 0 0 1 3.9 1.6l1.3 1.4" },
    { d: "M12.3 1.8v2.9h-2.9" },
    { d: "M12.3 7a5.3 5.3 0 0 1-5.3 5.3 5.7 5.7 0 0 1-3.9-1.6L1.8 9.3" },
    { d: "M4.7 9.3H1.8v2.9" },
  ],
  close: [
    { d: "M3.6 3.6l6.8 6.8" },
    { d: "M10.4 3.6l-6.8 6.8" },
  ],
  /* quota 合并开：单胶囊 + 中缝分隔 */
  "quota-on": [
    { tag: "rect", x: 2.2, y: 4.6, width: 9.6, height: 4.8, rx: 2.4 },
    { d: "M7 4.6v4.8" },
  ],
  /* quota 合并关：两枚分离胶囊 */
  "quota-off": [
    { tag: "rect", x: 1.8, y: 4.6, width: 4.7, height: 4.8, rx: 2.35 },
    { tag: "rect", x: 7.5, y: 4.6, width: 4.7, height: 4.8, rx: 2.35 },
  ],
  /* 返回 */
  back: [{ d: "M8.8 3.2L5 7l3.8 3.8" }],
  /* 持仓（公文包：只看持仓开关） */
  wallet: [
    { d: "M5.3 4.4V3.3a1.1 1.1 0 0 1 1.1-1.1h1.2a1.1 1.1 0 0 1 1.1 1.1v1.1" },
    { tag: "rect", x: 2.2, y: 4.4, width: 9.6, height: 6.6, rx: 1.4 },
    { d: "M2.2 7.3h3.6" },
    { d: "M9.2 7.3h2.6" },
  ],
  /* 删除 */
  trash: [
    { d: "M2.8 4.2h8.4" },
    { d: "M5.3 4.2V3.1a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v1.1" },
    { d: "M4.1 4.2l.5 6.4a1.2 1.2 0 0 0 1.2 1.1h2.4a1.2 1.2 0 0 0 1.2-1.1l.5-6.4" },
    { d: "M5.9 6.5v3.2" },
    { d: "M8.1 6.5v3.2" },
  ],
};

/**
 * 构建图标元素。未知名称抛错（构建期拼写错误尽早暴露）。
 * @param {Document} doc
 * @param {keyof typeof ICONS} name
 * @param {{size?: number, strokeWidth?: number}} [opts]
 * @returns {SVGSVGElement}
 */
export function iconEl(doc, name, opts = {}) {
  const spec = ICONS[name];
  if (!spec) throw new Error(`unknown icon: ${name}`);
  const size = opts.size ?? 14;
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 14 14");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(opts.strokeWidth ?? 1.6));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const part of spec) {
    const el = doc.createElementNS(SVG_NS, part.tag ?? "path");
    for (const [k, v] of Object.entries(part)) {
      if (k === "tag") continue;
      el.setAttribute(k, String(v));
    }
    svg.append(el);
  }
  return svg;
}
