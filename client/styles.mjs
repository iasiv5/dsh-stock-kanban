/**
 * 浮动壳样式文本（vanilla，唯一导出）：注入 shadow root 内的 <style>。
 *
 * 设计系统（全案见 docs/ui-redesign.md；第三轮 2026-11-10 紧凑化/排版见其 §8）：
 * 方向 =「克制金融终端 × DSH 表面阶梯」。全部取 --dsw-alias-* 设计令牌
 * （令牌定义在 <body>，body 直挂的浮动壳可继承；皮肤切换实时生效），
 * 先收敛为 :host 级 --skc-* 局部别名再使用，每处带独立 fallback。
 *
 * 第三轮排版约定（2026-11-10）：
 *   - 面板宽 320px（原 400px，列表信息挤在两端留白过大）；页内统一 12px 槽线（gutter）。
 *   - 字号阶梯：正文/控件 13px、辅助说明 12px、徽章/数量 11px，不再出现 10px；
 *     辅助文案用 label-secondary（≥4.5:1），不用 caption/tertiary 承载正文（对比度不足）。
 *   - 对话框（添加/设置）改为流内布局：打开时面板只显示对话框，面板高度随内容自适应，
 *     不再以列表高度为窗口而被压扁（添加对话框的 Tab 截半即由此而来）。
 * 层级表面（面板/对话框/toast）一律「令牌叠涂地板 + backdrop blur」：
 *   玻璃皮肤令牌多为半透明（如 bg-layer-2=rgba(…,0.55)），color-mix 会按比例
 *   保留原 alpha，单层涂在覆盖面上会被稀释到看不清字——叠涂两层 + blur 是无豁免地板。
 * 动效只做 chrome（面板/对话框/toast 入场 + 额度脉冲），数据行不做动画
 * （轮询重渲染不闪）。动效全部包 prefers-reduced-motion 守卫。
 * 胶囊解剖对齐 quota-watch FLOAT_STYLE_TEXT（26px pill、blur(10px)
 * saturate(1.2)、color-mix 86% 底、::before 命中区外扩 -9px、dragging 态
 * transition:none + scale(1.04)）；位置记忆挂 host 的 left/top，胶囊自身
 * position:relative（随 stack 流动）。
 */
export const FLOAT_STYLE_TEXT = `
:host { position: fixed; z-index: 2147483000; }
:host {
  /* ---- 局部设计令牌（收敛 DSH alias，便于统一调性） ---- */
  --skc-surface: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #1f1f1f)); /* 层二面（胶囊/面板地板） */
  --skc-surface-deep: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-base, #1f1f1f)); /* 层三面（选中段/嵌入面） */
  --skc-base: var(--dsw-alias-bg-base, #1f1f1f);
  --skc-hairline: var(--dsw-alias-border-l2, rgba(128,128,128,.24)); /* 常规细线 */
  --skc-hairline-soft: var(--dsw-alias-border-l1, rgba(128,128,128,.14)); /* 弱分隔（区块分割线） */
  --skc-hairline-strong: var(--dsw-alias-border-l3, rgba(128,128,128,.34)); /* 输入框/hover 边 */
  --skc-text: var(--dsw-alias-label-primary, inherit);
  --skc-text-2: var(--dsw-alias-label-secondary, rgba(128,128,128,.9)); /* 辅助说明/代码/元信息（正文级对比） */
  --skc-text-3: var(--dsw-alias-label-tertiary, rgba(128,128,128,.72)); /* 仅用于弱化的装饰性次要信息 */
  --skc-cap: var(--dsw-alias-label-caption, rgba(128,128,128,.6)); /* 装饰线/占位底纹等非正文用途 */
  --skc-accent: var(--dsw-alias-brand-primary, #5b8def); /* DSH 强调（浅色≈墨黑、深色≈近白） */
  --skc-hover: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12));
  --skc-pressed: var(--dsw-alias-interactive-bg-active, rgba(128,128,128,.18));
  --skc-danger: var(--dsw-alias-state-error-primary, #e5484d);
  --skc-warn: var(--dsw-alias-state-warn-label, #d29922);
  --skc-up: #e5484d; /* A股惯例红涨 */
  --skc-down: #2bb596; /* 绿跌 */
  --skc-shadow-lift: 0 18px 48px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.12);
  --skc-ease: cubic-bezier(.2,.8,.2,1);

  font: inherit; font-size: 13px; line-height: 1.45; color: var(--skc-text);
}
:host *, :host *::before, :host *::after { box-sizing: border-box; }
/* hidden 属性全局守卫：作者 display 规则（.skc-layer 的 flex 等）会击穿 UA 的
   [hidden]{display:none}，导致详情/列表双层叠渲染（2026-11-10 实拍抓获）。
   !important 仅此一处：只作用于带 hidden 属性的元素，不碰常态布局。 */
:host [hidden]{display:none !important}
/* 浏览器原生面随主题（craft-floor：selection/caret 是最便宜的「被设计过」信号） */
:host ::selection{background:color-mix(in srgb,var(--skc-accent) 24%,transparent);color:var(--skc-text)}
.skc-input{caret-color:var(--skc-accent)}

/* 合并胶囊 stack（计划 B 缝：未来第二枚 pill 直接追加） */
.skc-stack { display:flex; flex-direction:column; gap:6px; }
.skc-stack{align-items:flex-start} /* 胶囊按内容全宽渲染，不随宿主被视口剩余空间压窄（2026-11-10 溢出修复） */

/* 胶囊（对齐 quota-watch 解剖：26px pill、命中区外扩、grab 光标、touch-action:none） */
.skc-capsule { display:inline-flex; align-items:center; gap:7px; height:26px; padding:0 10px; border-radius:999px; touch-action:none; cursor:grab; border:1px solid var(--skc-hairline); background:var(--skc-surface); background:color-mix(in srgb,var(--skc-surface) 86%,transparent); -webkit-backdrop-filter:blur(10px) saturate(1.2); backdrop-filter:blur(10px) saturate(1.2); box-shadow:0 1px 2px rgba(0,0,0,.08), 0 4px 14px rgba(0,0,0,.18); color:var(--skc-text); font-size:12px; line-height:24px; user-select:none; white-space:nowrap; position:relative; -webkit-tap-highlight-color:transparent; -webkit-touch-callout:none; }
.skc-capsule::before { content:""; position:absolute; inset:-9px; }
.skc-capsule:hover{border-color:var(--skc-hairline-strong);box-shadow:0 1px 2px rgba(0,0,0,.08), 0 6px 18px rgba(0,0,0,.24)}
.skc-capsule:active{transform:scale(.98)}
.skc-capsule:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#5b8def);outline-offset:2px}
.skc-capsule[hidden]{display:none}
.skc-capsule [hidden]{display:none}
.skc-capsule--dragging { cursor:grabbing; -webkit-backdrop-filter:none; backdrop-filter:none; background:var(--skc-surface); box-shadow:0 2px 6px rgba(0,0,0,.14), 0 10px 28px rgba(0,0,0,.3); transform:scale(1.04); transition:none; }
.skc-capsule-name{font-weight:600;max-width:16vw;overflow:hidden;text-overflow:ellipsis}
.skc-capsule-price{font-weight:600;font-variant-numeric:tabular-nums}
.skc-capsule-pct{font-weight:500;font-variant-numeric:tabular-nums}
.skc-capsule-mark{font-weight:500}
/* B/S 触价标记：字母 + 微药丸底（呼应列表徽章） */
.skc-mark-buy,.skc-mark-sell{display:inline-block;min-width:15px;padding:0 4px;text-align:center;border-radius:999px;font-size:11px;line-height:14px;vertical-align:middle}
.skc-mark-buy{color:var(--skc-up);background:color-mix(in srgb,var(--skc-up) 14%,transparent)}
.skc-mark-sell{color:var(--skc-down);background:color-mix(in srgb,var(--skc-down) 14%,transparent)}
.skc-up{color:var(--skc-up)}
.skc-down{color:var(--skc-down)}
.skc-flat{color:var(--skc-text-2)}

/* 面板（锚定胶囊弹出；≤480px 转底部 sheet；头不再拖动）
   宽 320px（第三轮紧凑化）；高度由内容决定，对话框打开时只显示对话框。
   毛玻璃配方对齐 qw .dqw-panel：bg-base 86% 单层 + blur(14px) saturate(1.3)，
   不支持 backdrop-filter 时回落实底——真实半透明毛玻璃（2026-11-10 主人要求复刻） */
.skc-panel { position:fixed; z-index:2147483000; }
.skc-panel{width:min(320px,calc(100vw - 16px));max-height:calc(100dvh - 24px);display:flex;flex-direction:column;border-radius:10px;border:1px solid var(--skc-hairline);background:var(--skc-surface);background:color-mix(in srgb,var(--skc-base) 86%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:0 8px 24px rgba(0,0,0,.25);color:var(--skc-text);font:inherit;overflow:hidden}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .skc-panel{background:var(--skc-surface)}
}
.skc-panel[hidden]{display:none}
.skc-panel--sheet { left:8px; right:8px; top:auto; bottom:calc(8px + env(safe-area-inset-bottom, 0px)); width:auto; max-height:calc(100dvh - 24px); }

/* 头部：标题 + 计数（辅助色）+ 关闭钮，无分隔线单行 */
.skc-header{display:flex;align-items:center;gap:8px;padding:12px 12px 10px}
.skc-title{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:14px;line-height:20px;letter-spacing:0;color:var(--skc-text);white-space:nowrap}
.skc-title::before{content:"";width:7px;height:7px;border-radius:999px;background:var(--skc-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--skc-accent) 14%,transparent);transition:background .2s var(--skc-ease), box-shadow .2s var(--skc-ease)}
.skc-quote-error .skc-title::before{background:var(--skc-danger);box-shadow:0 0 0 3px color-mix(in srgb,var(--skc-danger) 16%,transparent)}
.skc-header-meta{color:var(--skc-text-2);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;min-width:0}
.skc-spacer{flex:1}
.skc-body{position:relative;flex:1 1 auto;min-height:150px;overflow:hidden;display:flex;flex-direction:column}
.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
.skc-layer-hidden{display:none}

/* footer：胶囊显示标的（左，弹性宽）+ 功能钮 dock（右，26px 图标钮）；关闭钮已迁 header 右上 */
.skc-footer{display:flex;flex-direction:column;gap:6px;padding:8px 12px 10px;border-top:1px solid var(--skc-hairline-soft);color:var(--skc-text-2)}
.skc-footer-main{display:flex;align-items:center;gap:6px;min-height:28px}
.skc-hint{color:var(--skc-text-2);font-size:12px;line-height:18px}

/* 分段 Tab（DSH 分段控件语言：嵌入式底 + 浮起选中段） */
.skc-tabs{flex:none;display:flex;gap:2px;margin:0 12px 8px;padding:2px;border-radius:9px;background:var(--skc-hover);overflow-x:auto;scrollbar-width:none}
.skc-tabs::-webkit-scrollbar{display:none}
.skc-tab{flex:1 1 0;min-width:0;padding:5px 4px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--skc-text-2);cursor:pointer;font:inherit;font-size:12px;line-height:16px;letter-spacing:0;text-align:center;white-space:nowrap;transition:color .12s var(--skc-ease), background .12s var(--skc-ease), border-color .12s var(--skc-ease)}
.skc-tab:hover{color:var(--skc-text)}
.skc-tab:active{transform:scale(.97)}
.skc-tab-active{background:var(--skc-surface-deep);border-color:var(--skc-hairline);color:var(--skc-text);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.skc-tab-count{margin-left:3px;font-size:11px;line-height:16px;font-weight:500;font-variant-numeric:tabular-nums}

/* 列表（终端密度：紧行距 + hairline 分隔 + hover/active 反馈；行内容与 Tab 同列对齐） */
.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
.skc-rows{overflow-y:auto;flex:1;padding:0 4px 6px;scrollbar-width:thin;scrollbar-color:var(--skc-hairline-strong) transparent}
.skc-rows::-webkit-scrollbar{width:8px}
.skc-rows::-webkit-scrollbar-thumb{background:var(--skc-hairline-strong);border-radius:999px;border:2px solid transparent;background-clip:content-box}
.skc-rows::-webkit-scrollbar-track{background:transparent}
.skc-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:9px;cursor:pointer;transition:background .1s var(--skc-ease)}
.skc-row:hover{background:var(--skc-hover)}
.skc-row:active{background:var(--skc-pressed)}
.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0;gap:2px}
.skc-name-text{font-size:13px;line-height:18px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-code{color:var(--skc-text-2);font-size:12px;line-height:16px;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.skc-pos-dot{color:var(--skc-accent)}
.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:68px;font-variant-numeric:tabular-nums;gap:2px}
.skc-row-price > span:first-child{font-size:13px;line-height:18px;font-weight:600}
.skc-pct{font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:84px;font-variant-numeric:tabular-nums;gap:2px}
.skc-pnl-amt,.skc-pnl-pct{font-size:12px;line-height:16px}
.skc-row-target{display:flex;gap:4px;flex:none;min-width:36px;justify-content:flex-end}

/* 徽章（触价 B/S / 休旧无）：药丸 + 同色 12% 底 */
.skc-badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;line-height:16px;border:1px solid var(--skc-hairline);color:var(--skc-text-2);white-space:nowrap}
.skc-badge-buy{color:var(--skc-up);border-color:color-mix(in srgb,var(--skc-up) 38%,transparent);background:color-mix(in srgb,var(--skc-up) 10%,transparent)}
.skc-badge-sell{color:var(--skc-down);border-color:color-mix(in srgb,var(--skc-down) 38%,transparent);background:color-mix(in srgb,var(--skc-down) 10%,transparent)}
.skc-badge-stale{color:var(--skc-text-2);border-color:var(--skc-hairline)}
/* 空态（教学式：图形 + 文案，operate.md「empty states teach」） */
.skc-empty{padding:28px 16px;text-align:center;color:var(--skc-text-2);font-size:12px;line-height:18px;letter-spacing:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.skc-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;border:1px dashed var(--skc-hairline-strong);color:var(--skc-text-2)}

/* 图表加载骨架（operate.md：skeleton 而非内容区 spinner；shimmer 在 reduced-motion 守卫内） */
.skc-chart-loading{width:100%;padding:8px 2px 2px;display:flex;flex-direction:column;gap:8px;align-items:center}
.skc-skeleton{width:100%;border-radius:6px;background:linear-gradient(100deg,var(--skc-hover) 40%,color-mix(in srgb,var(--skc-hover) 35%,transparent) 50%,var(--skc-hover) 60%);background-size:220% 100%;background-position:120% 0}
.skc-skeleton-price{height:86px}
.skc-skeleton-vol{height:22px;width:58%}
.skc-skeleton-caption{font-size:12px;line-height:16px;color:var(--skc-text-2)}

/* 详情（覆盖列表的二级视图；与列表同 12px 槽线） */
.skc-layer-detail{overflow-y:auto;padding:12px 12px 14px;scrollbar-width:thin;scrollbar-color:var(--skc-hairline-strong) transparent}
.skc-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skc-detail-title{font-weight:700;font-size:15px;line-height:20px;letter-spacing:0}
.skc-quote-line{display:flex;align-items:baseline;gap:10px;margin:10px 0 12px;flex-wrap:wrap}
.skc-quote-price{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:-.01em}
.skc-quote-pct{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
.skc-quote-meta{color:var(--skc-text-2);font-size:12px;line-height:16px;display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;font-variant-numeric:tabular-nums}
.skc-period-tabs{display:flex;align-items:center;gap:4px;margin-bottom:8px;flex-wrap:wrap}
.skc-period{padding:3px 10px;font-size:12px}
.skc-adjust{color:var(--skc-text-2);font-size:12px;margin-left:6px}
.skc-chartbox{border:1px solid var(--skc-hairline);border-radius:8px;padding:6px;min-height:140px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--skc-surface-deep) 45%,transparent)}
.skc-chart{display:block;max-width:100%;height:auto}
.skc-chart-empty{color:var(--skc-text-2);padding:20px;text-align:center}
.skc-chart-error{color:var(--skc-danger)}
.skc-ma-legend{display:flex;gap:4px;margin-left:6px;flex-wrap:wrap}
.skc-ma-chip{border:1px solid var(--skc-hairline);background:transparent;border-radius:999px;font-size:11px;line-height:16px;padding:1px 8px;cursor:pointer;color:var(--skc-text-2);font-variant-numeric:tabular-nums}
.skc-ma-chip:hover{border-color:var(--skc-hairline-strong)}
.skc-ma-off{opacity:.35}
/* 区块标题（详情的「持仓/目标价」与对话框的分组标题共用）：辅助色 + 600，不做大写 */
.skc-section-title{font-weight:600;font-size:12px;line-height:16px;letter-spacing:0;color:var(--skc-text-2);margin:14px 0 8px;display:flex;align-items:center;gap:8px}
.skc-section-meta{color:var(--skc-text-2);font-size:12px;font-weight:500;letter-spacing:0;font-variant-numeric:tabular-nums}
.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.skc-form-grid label{display:flex;flex-direction:column;gap:5px;font-size:12px;line-height:16px;color:var(--skc-text-2)}
.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
/* 输入框（13px 控件字号；高 34px 与按钮齐平） */
.skc-input{background:transparent;border:1px solid var(--skc-hairline-strong);border-radius:8px;color:var(--skc-text);padding:0 10px;min-height:34px;font:inherit;font-size:13px;line-height:18px;font-variant-numeric:tabular-nums;width:100%;min-width:0;transition:border-color .12s var(--skc-ease), box-shadow .12s var(--skc-ease)}
.skc-input::placeholder{color:var(--skc-text-2)} /* 占位符满不透明辅助色（≥4.5:1；0.85 透明度会落到 ~4.2:1） */
.skc-input:focus{outline:none;border-color:var(--skc-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--skc-accent) 20%,transparent)}
.skc-select{background:var(--skc-surface-deep);border:1px solid var(--skc-hairline);border-radius:8px;color:var(--skc-text-2);padding:0 8px;height:28px;font:inherit;font-size:12px;min-width:0;max-width:100%;cursor:pointer;transition:border-color .12s var(--skc-ease)}
.skc-select:hover{border-color:var(--skc-hairline-strong);color:var(--skc-text)}
.skc-select:focus{outline:none;border-color:var(--skc-accent)}

/* 按钮（对齐 qw .dqw-panel-action：透明底 + hairline 边 + hover 交互面；ghost / soft-primary / danger）
   控件字号 13px，最小高 32px（与输入框 34px 同族）；ghost 不再靠 opacity 降亮，文字即全亮 */
.skc-btn{background:transparent;border:1px solid var(--skc-hairline-strong);border-radius:8px;color:var(--skc-text);padding:0 12px;min-height:32px;cursor:pointer;font:inherit;font-size:13px;line-height:18px;font-weight:500;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;transition:background .12s var(--skc-ease), border-color .12s var(--skc-ease), color .12s var(--skc-ease)}
.skc-btn:hover{background:var(--skc-hover)}
.skc-btn:active{transform:scale(.97)}
.skc-btn:disabled{opacity:.45;cursor:default;background:transparent;transform:none}
.skc-btn-primary:disabled{background:color-mix(in srgb,var(--skc-accent) 10%,transparent)}
.skc-btn-danger:disabled{background:color-mix(in srgb,var(--skc-danger) 9%,transparent)}
.skc-btn-primary{border-color:color-mix(in srgb,var(--skc-accent) 40%,transparent);background:color-mix(in srgb,var(--skc-accent) 10%,transparent);color:var(--skc-accent);font-weight:600}
.skc-btn-primary:hover{background:color-mix(in srgb,var(--skc-accent) 17%,transparent)}
.skc-btn-danger{border-color:color-mix(in srgb,var(--skc-danger) 40%,transparent);background:color-mix(in srgb,var(--skc-danger) 9%,transparent);color:var(--skc-danger);font-weight:600}
.skc-btn-danger:hover{background:color-mix(in srgb,var(--skc-danger) 17%,transparent);border-color:var(--skc-danger)}
.skc-btn-ghost{border-color:transparent}
.skc-btn-ghost:hover{background:var(--skc-hover)}
.skc-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;background:transparent;border:none;color:var(--skc-text-2);cursor:pointer;padding:0;border-radius:6px;font-family:inherit;transition:background .12s var(--skc-ease), color .12s var(--skc-ease)}
.skc-icon-btn:hover{color:var(--skc-text);background:var(--skc-hover)}
.skc-icon-btn:active{transform:scale(.94)}
.skc-icon-btn svg{display:block}
.skc-toggle-on{color:var(--skc-accent)}
.skc-btn:focus-visible,.skc-icon-btn:focus-visible,.skc-tab:focus-visible,.skc-ma-chip:focus-visible,.skc-add-row:focus-visible{outline:2px solid color-mix(in srgb,var(--skc-accent) 55%,transparent);outline-offset:1px}
.skc-row:focus-visible{outline:2px solid color-mix(in srgb,var(--skc-accent) 55%,transparent);outline-offset:-1px}
.skc-error{color:var(--skc-danger);font-size:12px;line-height:18px;margin-top:4px}
.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:var(--skc-danger);font-size:12px;line-height:18px;z-index:10000;background:var(--skc-base);background:rgb(from var(--skc-base) r g b / 1);border:1px solid color-mix(in srgb,var(--skc-danger) 35%,transparent);border-radius:8px;padding:3px 9px;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.skc-targets{margin-top:12px;border-top:1px solid var(--skc-hairline-soft);padding-top:2px}
.skc-holdings{margin-top:4px}

/* 设置体（方案 B 行式设置列表，2026-11-11 主人拍板；第三轮 2026-11-10 收紧间距与字号）：
   每条设置一行（左标签 + 副行说明，右控件），区块间细实线分隔；开关为 DSH switch 语言 */
.skc-settings-body{display:flex;flex-direction:column;gap:12px;min-height:0}
.skc-settings-body > * + *{border-top:1px solid var(--skc-hairline-soft);padding-top:12px}
.skc-setting-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:28px;cursor:pointer;font-size:13px;line-height:18px;color:var(--skc-text)}
.skc-setting-label{font-weight:500}
.skc-setting-sub{font-size:12px;line-height:18px;color:var(--skc-text-2);margin:4px 0 0}
.skc-setting-notes{display:flex;flex-direction:column;gap:4px}
.skc-setting-footnote{font-size:12px;line-height:18px;color:var(--skc-text-2)}
.skc-backup{display:flex;flex-direction:column;gap:8px}
.skc-backup-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.skc-backup-actions .skc-btn{justify-content:center;width:100%}
.skc-backup-row{display:flex;gap:8px}
.skc-confirm{border:1px solid color-mix(in srgb,var(--skc-danger) 36%,transparent);background:color-mix(in srgb,var(--skc-danger) 7%,transparent);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:18px}
.skc-confirm .skc-hint{font-size:12px;line-height:18px}
.skc-warn-text{color:var(--skc-warn);font-size:12px;line-height:18px}
.skc-switch{appearance:none;-webkit-appearance:none;flex:none;width:34px;height:20px;border-radius:999px;background:var(--skc-hairline-strong);position:relative;cursor:pointer;margin:0;transition:background .15s var(--skc-ease)}
.skc-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:999px;background:var(--dsw-alias-switch-thumb,#fff);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s var(--skc-ease)}
.skc-switch:checked{background:var(--dsw-alias-brand-primary,#5b8def)}
.skc-switch:checked::after{transform:translateX(14px)}
.skc-switch:focus-visible{outline:2px solid color-mix(in srgb,var(--skc-accent) 55%,transparent);outline-offset:2px}
.skc-quota-merge-on{color:var(--dsw-alias-brand-primary,#5b8def);font-weight:600}

/* 对话框（添加/设置）：流内布局——打开时面板只显示对话框（见 .skc-panel--dialog），高度随内容。
   不透明地板（12.8/12.21 教训）：覆盖层盖在自家列表文字上，qw 玻璃配方（86% 单层）会让下层
   文字透出。地板取 surface 全实底（相对颜色语法强制 alpha=1），blur 只做深度不做可读性依赖。 */
.skc-dialog{position:relative;z-index:5;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:12px;padding:12px;overflow-y:auto;background:color-mix(in srgb,var(--skc-surface) 97%,transparent);background:linear-gradient(var(--skc-surface),var(--skc-surface)),rgb(from var(--skc-base) r g b / 1);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 8%,transparent);scrollbar-width:thin;scrollbar-color:var(--skc-hairline-strong) transparent}
.skc-dialog[hidden]{display:none}
.skc-dialog-layer{display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.skc-panel--dialog > .skc-header,.skc-panel--dialog > .skc-body,.skc-panel--dialog > .skc-footer{display:none}
.skc-dialog-head{display:flex;align-items:center;gap:8px;min-height:24px}
.skc-dialog-title{margin:0;font-size:14px;line-height:20px;font-weight:600;color:var(--skc-text)}
.skc-dialog--pinned{overflow:hidden}
.skc-dialog--pinned > .skc-tabs{margin:0} /* 对话框内 Tab 与标题/搜索框同用对话框的 12px 块间距 */
.skc-dialog-scroll{flex:1 1 auto;min-height:112px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin;scrollbar-color:var(--skc-hairline-strong) transparent}
/* 结果区教学空态（未搜索时给示例，文案即引导；无匹配/错误时同一位置给出恢复路径） */
.skc-guide{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:1 1 auto;padding:16px 12px;text-align:center;color:var(--skc-text-2);font-size:12px;line-height:18px}
.skc-guide-example{color:var(--skc-text);font-weight:500}
.skc-add-results{display:flex;flex-direction:column;gap:4px}
.skc-add-row{display:flex;align-items:center;gap:10px;width:100%;background:transparent;border:1px solid var(--skc-hairline);border-radius:10px;color:var(--skc-text);padding:8px 10px;min-height:44px;cursor:pointer;font:inherit;text-align:left;transition:border-color .12s var(--skc-ease), background .12s var(--skc-ease)}
.skc-add-row:hover:not(:disabled){border-color:color-mix(in srgb,var(--skc-accent) 45%,transparent);background:var(--skc-hover)}
.skc-add-row:disabled{opacity:.5;cursor:default}
.skc-add-main{display:flex;align-items:baseline;gap:8px;flex:1 1 auto;min-width:0}
.skc-add-name{font-size:13px;line-height:18px;font-weight:600;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skc-add-row .skc-code{flex:none;font-size:12px}
.skc-add-action{display:inline-flex;align-items:center;flex:none;color:var(--skc-accent)}
.skc-direct{flex:none;display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--skc-hairline-soft)}
.skc-direct-row{display:flex;gap:8px;align-items:center}
.skc-direct-row .skc-input{flex:1 1 auto;min-width:0}
.skc-direct-row .skc-btn{flex:none;min-width:64px;min-height:34px}
.skc-direct .skc-error{margin-top:0}
.skc-direct > .skc-section-title{margin:0}

/* 胶囊标的 picker / toast */
.skc-capsule-picker{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--skc-text-2);min-width:0;flex:1 1 auto;white-space:nowrap}
.skc-capsule-picker .skc-select{flex:1 1 auto;min-width:0}
.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:color-mix(in srgb,var(--skc-base) 90%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);border:1px solid var(--skc-hairline);border-radius:10px;padding:8px 14px;box-shadow:0 8px 24px rgba(0,0,0,.25);pointer-events:none;max-width:80vw;font-size:12px;line-height:18px;color:var(--skc-text)}
.skc-toast[hidden]{display:none}

/* 窄屏（手机）：头部计数让位给列表；表单两列改单列 */
@media (max-width:520px){
  .skc-header-meta{display:none}
  .skc-form-grid{grid-template-columns:1fr}
  .skc-capsule{max-width:none}
  .skc-capsule-name{max-width:16vw}
}

/* 动效只对允许运动的用户生效（chrome 动效；数据行不做动画） */
@media (prefers-reduced-motion: no-preference) {
  .skc-capsule { transition: border-color .12s var(--skc-ease), box-shadow .12s var(--skc-ease); }
  .skc-panel { animation: skc-panel-in .15s var(--skc-ease); }
  .skc-dialog { animation: skc-dialog-in .15s var(--skc-ease); }
  .skc-toast { animation: skc-toast-in .16s var(--skc-ease); }
  .skc-skeleton { animation: skc-shimmer 1.4s ease-in-out infinite; }
  .skc-qpulse{animation:skc-qpulse 1.6s ease-in-out infinite}
  @keyframes skc-qpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  @keyframes skc-shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
}
@keyframes skc-panel-in{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}
@keyframes skc-dialog-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes skc-toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%)}}

@media print { :host { display:none !important } }

/* 额度嵌入（CEP v1 宿主侧，ADR 0002）：quota pill 继承胶囊解剖并覆写 cursor；数值段 tabular-nums；阈值色与 qw 同名回退值一致；pulse 见动效守卫块 */
.skc-capsule--quota{cursor:pointer}
.skc-qval{font-variant-numeric:tabular-nums}
.skc-qwarn{color:var(--dsw-alias-label-warning,#d29922)}
.skc-qdanger{color:var(--dsw-alias-label-warning,#d29922)}
.skc-quota-merge-on{color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-qseg{display:inline-flex;align-items:center;gap:6px}
.skc-qseg[hidden]{display:none}
.skc-qsep{color:var(--skc-text-2)}
.skc-qseg-divider{display:inline-block;width:1px;height:14px;background:var(--skc-hairline-strong);border-radius:1px}
.skc-qdot{display:inline-block;width:6px;height:6px;border-radius:999px;background:var(--skc-warn)}
.skc-capsule [data-seg="stock"]{display:inline-flex;align-items:center;gap:6px}
[data-seg="quota"]{cursor:pointer}
.skc-capsule [data-seg]{flex-shrink:0} /* 分区不参与 flex 压缩：文案宽度恒为内容宽（2026-11-10 溢出修复） */
.skc-capsule{width:max-content} /* 胶囊永不窄于内容：宿主 shrink-to-fit 被视口剩余空间钳住时，由 ResizeObserver 重钳位左移（2026-11-10 溢出修复） */
/* ≤520 的 52vw 钳制会把文案版（较宽）挤出胶囊背景（2026-11-10 实录：420 视口 seg 右缘超出胶囊 4px）——
   放开为内容全宽，防出屏交给既有位置钳位（ResizeObserver 重钳位）；≤480 另有 compact 隐藏名称降级 */
@media (prefers-reduced-motion: no-preference) {
@keyframes skc-panel-slide{from{transform:translateX(12px);opacity:0}to{transform:translateX(0);opacity:1}}
.skc-panel--slide{animation:skc-panel-slide 150ms ease-out}
}
.skc-compact .skc-stock-name{display:none}
[data-seg="quota"]{position:relative;align-self:stretch}
[data-seg="quota"]::before{content:"";position:absolute;inset:-10px}
`;
