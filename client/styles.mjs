/**
 * 浮动壳样式文本（vanilla，唯一导出）：注入 shadow root 内的 <style>。
 * 配色跟随 DSH 主题/皮肤：全部取 --dsw-alias-* 设计令牌（令牌定义在 <body>，
 * body 直挂的浮动壳可继承；皮肤切换实时生效），每处带独立 fallback，
 * 令牌缺失时不至于不可读。
 * 视觉基准：金融终端式克制密度——紧凑节奏 + hairline 分隔 + 等宽数字；
 * 层级表面（面板/对话框/toast）一律「令牌叠涂地板 + backdrop blur」：
 *   玻璃皮肤令牌多为半透明（如 bg-base=rgba(…,0.55)），color-mix 会按比例保留
 *   原 alpha，单层涂在覆盖面上会被稀释到看不清字——叠涂两层 + blur 是无豁免地板。
 * 运动只做 chrome（面板/对话框/toast 入场），数据行不做动画（轮询重渲染不闪）。
 * 胶囊解剖对齐 quota-watch FLOAT_STYLE_TEXT（26px pill、blur(10px)
 * saturate(1.2)、color-mix 86% 底、::before 命中区外扩 -9px、dragging 态
 * transition:none + scale(1.04)）；位置记忆挂 host 的 left/top，胶囊自身
 * position:relative（随 stack 流动）。动效全部包 prefers-reduced-motion 守卫。
 */
export const FLOAT_STYLE_TEXT = `
:host { position: fixed; z-index: 2147483000; }
:host { font: inherit; font-size: 12px; line-height: 1.45; color: var(--dsw-alias-label-primary,inherit); }
:host *, :host *::before, :host *::after { box-sizing: border-box; }

/* 胶囊组 stack（计划 B 缝：未来第二枚 pill 直接追加） */
.skc-stack { display:flex; flex-direction:column; gap:6px; }

/* 胶囊（对齐 quota-watch 解剖：26px pill、命中区外扩、grab 光标、touch-action:none） */
.skc-capsule { display:inline-flex; align-items:center; gap:6px; height:26px; padding:0 10px; border-radius:999px; touch-action:none; cursor:grab; border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35)); background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)); background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 86%,transparent); -webkit-backdrop-filter:blur(10px) saturate(1.2); backdrop-filter:blur(10px) saturate(1.2); box-shadow:0 4px 14px rgba(0,0,0,.22); color:var(--dsw-alias-label-primary,inherit); font-size:11px; line-height:24px; user-select:none; white-space:nowrap; position:relative; -webkit-tap-highlight-color:transparent; -webkit-touch-callout:none; }
.skc-capsule::before { content:""; position:absolute; inset:-9px; }
.skc-capsule:hover{border-color:var(--dsw-alias-border-primary,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)));box-shadow:0 6px 18px rgba(0,0,0,.28)}
.skc-capsule:active{transform:scale(.98)}
.skc-capsule:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#5b8def);outline-offset:2px}
.skc-capsule[hidden]{display:none}
.skc-capsule [hidden]{display:none}
.skc-capsule--dragging { cursor:grabbing; -webkit-backdrop-filter:none; backdrop-filter:none; background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)); box-shadow:0 8px 24px rgba(0,0,0,.35); transform:scale(1.04); transition:none; }
.skc-capsule-name{font-weight:600;max-width:16vw;overflow:hidden;text-overflow:ellipsis}
.skc-capsule-price{font-weight:600;font-variant-numeric:tabular-nums}
.skc-capsule-pct{font-weight:500;font-variant-numeric:tabular-nums}
.skc-capsule-mark{font-weight:700}
.skc-mark-buy{color:#e5484d}
.skc-mark-sell{color:#2bb596}
.skc-up{color:#e5484d}
.skc-down{color:#2bb596}
.skc-flat{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}

/* 面板（锚定胶囊弹出；≤480px 转底部 sheet；头不再拖动） */
.skc-panel { position:fixed; z-index:2147483000; }
.skc-panel{width:min(400px,calc(100vw - 16px));max-height:min(80vh,calc(100dvh - 16px));display:flex;flex-direction:column;border-radius:12px;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 94%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(14px) saturate(1.15);backdrop-filter:blur(14px) saturate(1.15);box-shadow:0 12px 36px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary,inherit);font:inherit;overflow:hidden}
.skc-panel[hidden]{display:none}
.skc-panel--sheet { left:8px; right:8px; top:auto; bottom:calc(8px + env(safe-area-inset-bottom, 0px)); width:auto; max-height:calc(100dvh - 24px); }
.skc-header{display:flex;align-items:center;gap:8px;padding:7px 10px 6px;border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35))}
.skc-title{font-weight:700;font-size:13px;letter-spacing:.02em;color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));white-space:nowrap}
.skc-header-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-spacer{flex:1}
.skc-body{position:relative;flex:1 1 auto;min-height:200px;overflow:hidden;display:flex;flex-direction:column}
.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
.skc-layer-hidden{display:none}
.skc-footer{padding:3px 10px 4px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}

/* 列表（终端密度：分段 Tab + 紧行距 + hover/active 反馈） */
.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
.skc-tabs{display:flex;gap:2px;padding:6px 8px 4px;overflow-x:auto;scrollbar-width:none}
.skc-tabs::-webkit-scrollbar{display:none}
.skc-tab{flex:none;padding:3px 9px;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font:inherit}
.skc-tab:hover{color:var(--dsw-alias-label-primary,inherit)}
.skc-tab:active{transform:scale(.97)}
.skc-tab-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def)) 16%,transparent);color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 45%,transparent)}
.skc-tab-count{opacity:.6;font-size:10px;margin-left:3px;font-weight:400;font-variant-numeric:tabular-nums}
.skc-filterbar{display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent)}
.skc-filter{display:flex;align-items:center;gap:5px;cursor:pointer}
.skc-filter input{accent-color:var(--dsw-alias-brand-primary,#5b8def);margin:0}
.skc-rows{overflow-y:auto;flex:1;padding:2px 6px 6px;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 60%,transparent) transparent}
.skc-rows::-webkit-scrollbar{width:8px}
.skc-rows::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 60%,transparent);border-radius:999px}
.skc-rows::-webkit-scrollbar-track{background:transparent}
.skc-row{display:flex;align-items:center;gap:10px;padding:5px 7px;border-radius:7px;cursor:pointer}
.skc-row:hover{background:var(--dsw-alias-bg-hover,color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 30%,transparent))}
.skc-row:active{background:color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 45%,transparent)}
.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
.skc-name-text{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-code{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;letter-spacing:.02em}
.skc-pos-dot{color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none;font-variant-numeric:tabular-nums}
.skc-row-price > span:first-child{font-weight:600}
.skc-pct{font-size:11px;font-variant-numeric:tabular-nums}
.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:86px;font-variant-numeric:tabular-nums}
.skc-pnl-amt,.skc-pnl-pct{font-size:11px}
.skc-row-target{display:flex;gap:3px;flex:none;min-width:40px;justify-content:flex-end}
.skc-badge{display:inline-block;padding:0 5px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35))}
.skc-badge-buy{color:#e5484d;border-color:color-mix(in srgb,#e5484d 45%,transparent)}
.skc-badge-sell{color:#2bb596;border-color:color-mix(in srgb,#2bb596 45%,transparent)}
.skc-badge-stale{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}
.skc-empty{padding:26px 12px;text-align:center;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px;letter-spacing:.02em}

/* 详情 */
.skc-layer-detail{overflow-y:auto;padding:8px 10px;scrollbar-width:thin}
.skc-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skc-detail-title{font-weight:700;font-size:14px}
.skc-quote-line{display:flex;align-items:baseline;gap:10px;margin:6px 0 8px;flex-wrap:wrap}
.skc-quote-price{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}
.skc-quote-pct{font-weight:600}
.skc-quote-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;display:inline-flex;gap:6px;align-items:center;font-variant-numeric:tabular-nums}
.skc-period-tabs{display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:wrap}
.skc-period{padding:2px 9px}
.skc-adjust{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;margin-left:6px}
.skc-chartbox{border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;padding:5px;min-height:140px;display:flex;align-items:center;justify-content:center}
.skc-chart{display:block;max-width:100%}
.skc-chart-empty{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));padding:20px;text-align:center}
.skc-chart-error{color:#e5484d}
.skc-ma-legend{display:flex;gap:2px;margin-left:6px}
.skc-ma-chip{border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:transparent;border-radius:999px;font-size:10px;padding:0 6px;cursor:pointer;color:inherit}
.skc-ma-off{opacity:.35}
.skc-section-title{font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));margin:10px 0 4px;display:flex;align-items:center;gap:8px}
.skc-section-meta{color:var(--dsw-alias-label-primary,inherit);font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}
.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.skc-form-grid label{display:flex;flex-direction:column;gap:3px;font-size:11px}
.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
.skc-input{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:4px 8px;font:inherit;width:100%}
.skc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#5b8def);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 22%,transparent)}
.skc-select{background:var(--dsw-alias-bg-base,#1f1f1f);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:2px 6px;font:inherit;max-width:180px}
.skc-btn{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:7px;color:var(--dsw-alias-label-primary,inherit);padding:4px 11px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}
.skc-btn:hover{border-color:var(--dsw-alias-brand-primary,#5b8def);color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-btn:active{transform:scale(.97)}
.skc-btn-primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 16%,transparent);color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));font-weight:600}
.skc-btn-primary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 26%,transparent)}
.skc-btn-danger{border-color:color-mix(in srgb,#e5484d 45%,transparent);background:color-mix(in srgb,#e5484d 12%,transparent);color:#e5484d;font-weight:600}
.skc-btn-danger:hover{background:color-mix(in srgb,#e5484d 22%,transparent);border-color:#e5484d}
.skc-btn-ghost{border-color:transparent}
.skc-icon-btn{background:transparent;border:none;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font-size:13px;padding:3px 7px;border-radius:7px;font-family:inherit}
.skc-icon-btn:hover{color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-hover,color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 30%,transparent))}
.skc-icon-btn:active{transform:scale(.94)}
.skc-privacy-on{color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-btn:focus-visible,.skc-icon-btn:focus-visible,.skc-tab:focus-visible,.skc-ma-chip:focus-visible,.skc-add-row:focus-visible{outline:2px solid color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 55%,transparent);outline-offset:1px}
.skc-hint{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;margin-top:4px}
.skc-error{color:#e5484d;font-size:11px;margin-top:4px}
.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:#e5484d;font-size:11px;z-index:10000;background:var(--dsw-alias-bg-base,#1f1f1f);background:rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:6px;padding:2px 8px}
.skc-targets,.skc-holdings{margin-top:4px}
.skc-backup{margin-top:2px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding:8px 2px 2px}
.skc-backup-row{display:flex;gap:8px;margin:6px 0}
.skc-confirm{border:1px solid color-mix(in srgb,#e5484d 40%,transparent);background:color-mix(in srgb,#e5484d 7%,transparent);border-radius:8px;padding:8px;margin:6px 0}

/* 对话框（覆盖层 = 令牌叠涂地板 + blur：玻璃皮肤令牌半透明也不破可读性） */
.skc-dialog{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;gap:10px;padding:12px;overflow-y:auto;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 97%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(20px) saturate(1.2);backdrop-filter:blur(20px) saturate(1.2);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 40%,transparent);scrollbar-width:thin}
.skc-dialog[hidden]{display:none}
.skc-dialog-head{display:flex;align-items:center;gap:8px;padding-bottom:2px}
.skc-add-results{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto;scrollbar-width:thin}
.skc-add-row{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;color:var(--dsw-alias-label-primary,inherit);padding:5px 8px;cursor:pointer;font:inherit;text-align:left}
.skc-add-row:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-add-row:disabled{opacity:.5;cursor:default}
.skc-add-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skc-direct{border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding-top:8px}
.skc-direct-row{display:flex;gap:8px;margin-top:4px}

/* 胶囊选择器 / toast */
.skc-capsule-picker{display:flex;align-items:center;gap:6px;font-size:11px}
.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 96%,transparent);background:linear-gradient(var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)),var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f))),rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:8px;padding:6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none;max-width:80vw}
.skc-toast[hidden]{display:none}

/* 窄屏 */
@media (max-width:520px){
  .skc-header-meta{display:none}
  .skc-form-grid{grid-template-columns:1fr}
  .skc-direct-row{flex-wrap:wrap}
  .skc-direct-row .skc-input{flex:1 1 100%}
  .skc-direct-row .skc-btn{flex:1 1 auto}
  .skc-capsule{max-width:52vw}
  .skc-capsule-name{max-width:16vw}
}

/* 动效只对允许运动的用户生效（chrome 动效；数据行不做动画） */
@media (prefers-reduced-motion: no-preference) {
  .skc-capsule { transition: border-color .12s ease-out, box-shadow .12s ease-out; }
  .skc-panel { animation: skc-panel-in .14s ease-out; }
  .skc-dialog { animation: skc-dialog-in .14s ease-out; }
  .skc-toast { animation: skc-toast-in .16s ease-out; }
  .skc-qpulse{animation:skc-qpulse 1.6s ease-in-out infinite}
  @keyframes skc-qpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
}
@keyframes skc-panel-in{from{opacity:0;transform:translateY(4px) scale(.985)}to{opacity:1;transform:none}}
@keyframes skc-dialog-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes skc-toast-in{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%)}}

@media print { :host { display:none !important } }

/* 额度嵌入（CEP v1 宿主侧，ADR 0002）：quota pill 继承胶囊解剖并覆写 cursor；数值段 tabular-nums；阈值色与 qw 同名回退值一致；pulse 见动效守卫块 */
.skc-capsule--quota{cursor:pointer}
.skc-qval{font-variant-numeric:tabular-nums}
.skc-qwarn{color:var(--dsw-alias-label-warning,#d29922)}
.skc-qdanger{color:var(--dsw-alias-label-danger,#c93c3c)}
.skc-quota-merge-on{color:var(--dsw-alias-brand-primary,#5b8def)}
`;
