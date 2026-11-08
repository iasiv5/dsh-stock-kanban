/**
 * 样式（单例注入）。配色跟随 DSH 主题/皮肤：全部取 --dsw-alias-* 设计令牌
 * （令牌定义在 <body>，槽位内容在应用树内可继承；皮肤切换实时生效），
 * 每处带独立 fallback，令牌缺失时不至于不可读。
 * 视觉基准参考 dsh-quota-watch 胶囊（MIT，见 NOTICE）：紧凑 pill + blur + 命中区外扩。
 */

let injected = false;

export function injectStyles() {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.id = "stock-kanban-styles";
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}

export const CSS_TEXT = `
.skc-root{position:fixed;inset:0;pointer-events:none;z-index:9998;font:inherit;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary,inherit)}
.skc-root *{box-sizing:border-box}
.skc-mono{font-variant-numeric:tabular-nums}
.skc-up{color:#e5484d}
.skc-down{color:#2bb596}
.skc-flat{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}

/* 胶囊（对齐 quota-watch：26px pill、blur、命中区外扩、grab 光标） */
.skc-capsule{position:fixed;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 86%,transparent);-webkit-backdrop-filter:blur(10px) saturate(1.2);backdrop-filter:blur(10px) saturate(1.2);box-shadow:0 4px 14px rgba(0,0,0,.22);color:var(--dsw-alias-label-primary,inherit);font-size:11px;line-height:24px;cursor:grab;pointer-events:auto;user-select:none;white-space:nowrap;position:fixed;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:9999}
.skc-capsule::before{content:'';position:absolute;inset:-9px}
.skc-capsule:hover{border-color:var(--dsw-alias-border-primary,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)));box-shadow:0 6px 18px rgba(0,0,0,.28)}
.skc-capsule:active{transform:scale(.98)}
.skc-capsule--dragging{cursor:grabbing;-webkit-backdrop-filter:none;backdrop-filter:none;background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f));box-shadow:0 8px 24px rgba(0,0,0,.35);transform:scale(1.04)}
.skc-capsule-name{font-weight:600;max-width:16vw;overflow:hidden;text-overflow:ellipsis}
.skc-capsule-price{font-weight:600;font-variant-numeric:tabular-nums}
.skc-capsule-pct{font-weight:500;font-variant-numeric:tabular-nums}
.skc-capsule-mark{font-weight:700}
.skc-mark-buy{color:#e5484d}
.skc-mark-sell{color:#2bb596}

/* 面板（近胶囊弹出；宽度自适应视口） */
.skc-panel{position:fixed;width:min(400px,calc(100vw - 16px));max-height:min(80vh,calc(100dvh - 16px));display:flex;flex-direction:column;border-radius:12px;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 94%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.15);backdrop-filter:blur(14px) saturate(1.15);box-shadow:0 12px 36px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary,inherit);pointer-events:auto;z-index:9999}
.skc-panel--dragging{cursor:grabbing;user-select:none}
.skc-header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));cursor:grab;touch-action:none}
.skc-header:active{cursor:grabbing}
.skc-title{font-weight:700;color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));white-space:nowrap}
.skc-header-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-spacer{flex:1}
.skc-body{position:relative;flex:1 1 auto;min-height:200px;overflow:hidden;display:flex;flex-direction:column}
.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
.skc-layer-hidden{display:none}
.skc-footer{padding:4px 10px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}

/* 列表 */
.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
.skc-tabs{display:flex;gap:4px;padding:6px 8px 0;overflow-x:auto;scrollbar-width:none}
.skc-tabs::-webkit-scrollbar{display:none}
.skc-tab{flex:none;padding:3px 10px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font:inherit}
.skc-tab:hover{color:var(--dsw-alias-label-primary,inherit)}
.skc-tab-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def)) 14%,transparent);color:var(--dsw-alias-brand-primary,var(--dsw-alias-button-primary-fill,#5b8def));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#5b8def) 45%,transparent)}
.skc-filterbar{display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent)}
.skc-filter{display:flex;align-items:center;gap:5px;cursor:pointer}
.skc-rows{overflow-y:auto;flex:1;padding:4px 6px 8px}
.skc-row{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px;cursor:pointer}
.skc-row:hover{background:var(--dsw-alias-bg-hover,rgba(128,128,128,.12))}
.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
.skc-name-text{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-code{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px}
.skc-pos-dot{color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none;font-variant-numeric:tabular-nums}
.skc-pct{font-size:11px}
.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:86px;font-variant-numeric:tabular-nums}
.skc-pnl-amt,.skc-pnl-pct{font-size:11px}
.skc-row-target{display:flex;gap:3px;flex:none;min-width:40px;justify-content:flex-end}
.skc-badge{display:inline-block;padding:0 5px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35))}
.skc-badge-buy{color:#e5484d;border-color:color-mix(in srgb,#e5484d 45%,transparent)}
.skc-badge-sell{color:#2bb596;border-color:color-mix(in srgb,#2bb596 45%,transparent)}
.skc-badge-stale{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}
.skc-empty{padding:24px 12px;text-align:center;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9))}

/* 详情 */
.skc-layer-detail{overflow-y:auto;padding:8px 10px}
.skc-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skc-detail-title{font-weight:700;font-size:14px}
.skc-quote-line{display:flex;align-items:baseline;gap:10px;margin:8px 0;flex-wrap:wrap}
.skc-quote-price{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}
.skc-quote-pct{font-weight:600}
.skc-quote-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;display:inline-flex;gap:6px;align-items:center;font-variant-numeric:tabular-nums}
.skc-period-tabs{display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:wrap}
.skc-period{padding:2px 9px}
.skc-adjust{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;margin-left:6px}
.skc-chartbox{border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;padding:4px;min-height:140px;display:flex;align-items:center;justify-content:center}
.skc-chart{display:block;max-width:100%}
.skc-chart-empty{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));padding:20px;text-align:center}
.skc-chart-error{color:#e5484d}
.skc-ma-legend{display:flex;gap:2px;margin-left:6px}
.skc-ma-chip{border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));background:transparent;border-radius:999px;font-size:10px;padding:0 6px;cursor:pointer;color:inherit}
.skc-ma-off{opacity:.35}
.skc-section-title{font-weight:700;margin:10px 0 4px;display:flex;align-items:center;gap:8px}
.skc-section-meta{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:11px;font-weight:400;font-variant-numeric:tabular-nums}
.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.skc-form-grid label{display:flex;flex-direction:column;gap:3px;font-size:11px}
.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
.skc-input{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:6px;color:var(--dsw-alias-label-primary,inherit);padding:4px 8px;font:inherit;width:100%}
.skc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-select{background:var(--dsw-alias-bg-base,#1f1f1f);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:6px;color:var(--dsw-alias-label-primary,inherit);padding:2px 6px;font:inherit;max-width:180px}
.skc-btn{background:transparent;border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:6px;color:var(--dsw-alias-label-primary,inherit);padding:3px 10px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}
.skc-btn:hover{border-color:var(--dsw-alias-brand-primary,#5b8def);color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-btn-primary{border-color:var(--dsw-alias-brand-primary,#5b8def);color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-btn-danger{border-color:color-mix(in srgb,#e5484d 45%,transparent);color:#e5484d}
.skc-btn-ghost{border-color:transparent}
.skc-icon-btn{background:transparent;border:none;color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;font-family:inherit}
.skc-icon-btn:hover{color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-hover,rgba(128,128,128,.12))}
.skc-privacy-on{color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-hint{color:var(--dsw-alias-label-secondary,rgba(128,128,128,.9));font-size:10px;margin-top:4px}
.skc-error{color:#e5484d;font-size:11px;margin-top:4px}
.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:#e5484d;font-size:11px;z-index:10000;background:color-mix(in srgb,var(--dsw-alias-bg-base,#1f1f1f) 92%,transparent);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:6px;padding:2px 8px}
.skc-targets,.skc-holdings{margin-top:4px}
.skc-backup{margin-top:10px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding:6px 2px}
.skc-backup-row{display:flex;gap:8px;margin:6px 0}
.skc-confirm{border:1px solid color-mix(in srgb,#e5484d 40%,transparent);border-radius:8px;padding:8px;margin:6px 0}

/* 添加对话框 */
.skc-dialog{position:absolute;inset:0;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 97%,transparent);z-index:5;display:flex;flex-direction:column;gap:8px;padding:10px;overflow-y:auto}
.skc-dialog-head{display:flex;align-items:center;gap:8px}
.skc-add-results{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto}
.skc-add-row{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);border-radius:8px;color:var(--dsw-alias-label-primary,inherit);padding:5px 8px;cursor:pointer;font:inherit;text-align:left}
.skc-add-row:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#5b8def)}
.skc-add-row:disabled{opacity:.5;cursor:default}
.skc-add-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skc-direct{border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-secondary,rgba(128,128,128,.35)) 55%,transparent);padding-top:8px}
.skc-direct-row{display:flex;gap:8px;margin-top:4px}

/* 胶囊选择器 / toast */
.skc-capsule-picker{display:flex;align-items:center;gap:6px;font-size:11px}
.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:color-mix(in srgb,var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base,#1f1f1f)) 96%,transparent);border:1px solid var(--dsw-alias-border-secondary,rgba(128,128,128,.35));border-radius:8px;padding:6px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none;max-width:80vw}

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
`;
