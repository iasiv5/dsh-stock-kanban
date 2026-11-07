/** 样式注入（单例）。深浅色跟随系统 prefers-color-scheme。 */

let injected = false;

export function injectStyles() {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.id = "stock-kanban-styles";
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}

const CSS_TEXT = `
.skc-root{position:fixed;inset:0;pointer-events:none;z-index:9998;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,'Courier New',monospace}
.skc-root *{box-sizing:border-box}

@media (prefers-color-scheme: dark){
  .skc-root{--skc-bg:rgba(13,17,26,.96);--skc-border:rgba(255,255,255,.16);--skc-border-soft:rgba(255,255,255,.08);--skc-text:#e5e7eb;--skc-dim:#9ca3af;--skc-muted:#6b7280;--skc-hover:rgba(255,255,255,.06);--skc-accent:#22d3ee;--skc-accent-soft:rgba(34,211,238,.14);--skc-shadow:0 8px 32px rgba(0,0,0,.5)}
}
@media (prefers-color-scheme: light){
  .skc-root{--skc-bg:rgba(255,255,255,.97);--skc-border:rgba(15,23,42,.16);--skc-border-soft:rgba(15,23,42,.08);--skc-text:#1f2937;--skc-dim:#4b5563;--skc-muted:#9ca3af;--skc-hover:rgba(15,23,42,.05);--skc-accent:#0891b2;--skc-accent-soft:rgba(8,145,178,.1);--skc-shadow:0 8px 32px rgba(15,23,42,.18)}
}
.skc-up{color:#e5484d}
.skc-down{color:#2bb596}
.skc-flat{color:var(--skc-dim)}
.skc-mono{font-variant-numeric:tabular-nums}

/* 胶囊 */
.skc-capsule{position:fixed;display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:var(--skc-bg);border:1px solid var(--skc-border);color:var(--skc-text);cursor:pointer;user-select:none;touch-action:none;box-shadow:0 4px 18px rgba(0,0,0,.3);backdrop-filter:blur(8px);pointer-events:auto;z-index:9999;white-space:nowrap}
.skc-capsule:hover{border-color:var(--skc-accent)}
.skc-capsule-dragging{opacity:.9;box-shadow:0 10px 28px rgba(0,0,0,.4)}
.skc-capsule-name{font-weight:700;max-width:110px;overflow:hidden;text-overflow:ellipsis}
.skc-capsule-price{font-weight:700}
.skc-capsule-pct{font-weight:600}
.skc-capsule-mark{font-weight:700}
.skc-mark-buy{color:#e5484d}
.skc-mark-sell{color:#2bb596}

/* 面板 */
.skc-panel{position:fixed;width:min(400px,calc(100vw - 16px));max-height:min(80vh,calc(100dvh - 16px));display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:var(--skc-bg);border:1px solid var(--skc-border);color:var(--skc-text);box-shadow:var(--skc-shadow);backdrop-filter:blur(10px);pointer-events:auto;z-index:9999}
@media (max-width:520px){
  .skc-header-meta{display:none}
  .skc-form-grid{grid-template-columns:1fr}
  .skc-direct-row{flex-wrap:wrap}
  .skc-direct-row .skc-input{flex:1 1 100%}
  .skc-direct-row .skc-btn{flex:1 1 auto}
  .skc-capsule{max-width:52vw}
  .skc-capsule-name{max-width:16vw}
}
.skc-header{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--skc-border-soft);cursor:move;touch-action:none}
.skc-title{font-weight:700;color:var(--skc-accent);white-space:nowrap}
.skc-header-meta{color:var(--skc-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-spacer{flex:1}
.skc-body{position:relative;flex:1 1 auto;min-height:220px;overflow:hidden;display:flex;flex-direction:column}
.skc-layer{display:flex;flex-direction:column;min-height:0;flex:1;overflow:hidden}
.skc-layer-hidden{display:none}
.skc-footer{padding:4px 10px;border-top:1px solid var(--skc-border-soft)}

/* 列表 */
.skc-listwrap{display:flex;flex-direction:column;min-height:0;flex:1}
.skc-tabs{display:flex;gap:4px;padding:6px 8px 0;overflow-x:auto;scrollbar-width:none}
.skc-tabs::-webkit-scrollbar{display:none}
.skc-tab{flex:none;padding:3px 10px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--skc-muted);cursor:pointer;font:inherit}
.skc-tab:hover{color:var(--skc-text)}
.skc-tab-active{background:var(--skc-accent-soft);color:var(--skc-accent);border-color:var(--skc-accent)}
.skc-filterbar{display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid var(--skc-border-soft)}
.skc-filter{display:flex;align-items:center;gap:5px;color:var(--skc-dim);cursor:pointer}
.skc-rows{overflow-y:auto;flex:1;padding:4px 6px 8px}
.skc-row{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px;cursor:pointer}
.skc-row:hover{background:var(--skc-hover)}
.skc-row-name{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
.skc-name-text{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skc-code{color:var(--skc-muted);font-size:11px}
.skc-pos-dot{color:var(--skc-accent)}
.skc-row-price{display:flex;flex-direction:column;align-items:flex-end;flex:none}
.skc-pct{font-size:11px}
.skc-row-pnl{display:flex;flex-direction:column;align-items:flex-end;flex:none;min-width:86px}
.skc-pnl-amt,.skc-pnl-pct{font-size:11px}
.skc-row-target{display:flex;gap:3px;flex:none;min-width:40px;justify-content:flex-end}
.skc-badge{display:inline-block;padding:0 5px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--skc-border)}
.skc-badge-buy{color:#e5484d;border-color:rgba(229,72,77,.5)}
.skc-badge-sell{color:#2bb596;border-color:rgba(43,181,150,.5)}
.skc-badge-stale{color:var(--skc-dim);border-color:var(--skc-border)}
.skc-empty{padding:24px 12px;text-align:center;color:var(--skc-muted)}

/* 详情 */
.skc-layer-detail{overflow-y:auto;padding:8px 10px}
.skc-detail-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skc-detail-title{font-weight:700;font-size:14px}
.skc-quote-line{display:flex;align-items:baseline;gap:10px;margin:8px 0;flex-wrap:wrap}
.skc-quote-price{font-size:18px;font-weight:700}
.skc-quote-pct{font-weight:600}
.skc-quote-meta{color:var(--skc-muted);font-size:10px;display:inline-flex;gap:6px;align-items:center}
.skc-period-tabs{display:flex;align-items:center;gap:4px;margin-bottom:4px}
.skc-period{padding:2px 9px}
.skc-adjust{color:var(--skc-muted);font-size:10px;margin-left:6px}
.skc-chartbox{border:1px solid var(--skc-border-soft);border-radius:8px;padding:4px;min-height:140px;display:flex;align-items:center;justify-content:center}
.skc-chart{display:block;max-width:100%}
.skc-chart-empty{color:var(--skc-muted);padding:20px;text-align:center}
.skc-chart-error{color:#e5484d}
.skc-ma-legend{display:flex;gap:2px;margin-left:6px}
.skc-ma-chip{border:1px solid var(--skc-border);background:transparent;border-radius:999px;font-size:10px;padding:0 6px;cursor:pointer;color:inherit}
.skc-ma-off{opacity:.35}
.skc-section-title{font-weight:700;margin:10px 0 4px;display:flex;align-items:center;gap:8px}
.skc-section-meta{color:var(--skc-dim);font-size:11px;font-weight:400}
.skc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.skc-form-grid label{display:flex;flex-direction:column;gap:3px;color:var(--skc-dim);font-size:11px}
.skc-form-actions{grid-column:1 / -1;display:flex;gap:8px}
.skc-input{background:transparent;border:1px solid var(--skc-border);border-radius:6px;color:var(--skc-text);padding:4px 8px;font:inherit;width:100%}
.skc-input:focus{outline:none;border-color:var(--skc-accent)}
.skc-select{background:var(--skc-bg);border:1px solid var(--skc-border);border-radius:6px;color:var(--skc-text);padding:2px 6px;font:inherit;max-width:180px}
.skc-btn{background:transparent;border:1px solid var(--skc-border);border-radius:6px;color:var(--skc-text);padding:3px 10px;cursor:pointer;font:inherit;text-decoration:none;display:inline-block}
.skc-btn:hover{border-color:var(--skc-accent);color:var(--skc-accent)}
.skc-btn-primary{border-color:var(--skc-accent);color:var(--skc-accent)}
.skc-btn-danger{border-color:rgba(229,72,77,.5);color:#e5484d}
.skc-btn-ghost{border-color:transparent}
.skc-icon-btn{background:transparent;border:none;color:var(--skc-muted);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;font-family:inherit}
.skc-icon-btn:hover{color:var(--skc-text);background:var(--skc-hover)}
.skc-privacy-on{color:var(--skc-accent)}
.skc-hint{color:var(--skc-muted);font-size:10px;margin-top:4px}
.skc-error{color:#e5484d;font-size:11px;margin-top:4px}
.skc-error-global{position:fixed;bottom:8px;left:8px;pointer-events:none;color:#e5484d;font-size:11px;z-index:10000;background:var(--skc-bg);border:1px solid var(--skc-border);border-radius:6px;padding:2px 8px}
.skc-masked-hint{color:var(--skc-muted);font-size:10px}
.skc-targets,.skc-holdings{margin-top:4px}
.skc-backup{margin-top:10px;border-top:1px solid var(--skc-border-soft);padding:6px 2px}
.skc-backup-row{display:flex;gap:8px;margin:6px 0}
.skc-confirm{border:1px solid rgba(229,72,77,.4);border-radius:8px;padding:8px;margin:6px 0}

/* 添加对话框 */
.skc-dialog{position:absolute;inset:0;background:var(--skc-bg);z-index:5;display:flex;flex-direction:column;gap:8px;padding:10px;overflow-y:auto}
.skc-dialog-head{display:flex;align-items:center;gap:8px}
.skc-add-results{display:flex;flex-direction:column;gap:2px;max-height:180px;overflow-y:auto}
.skc-add-row{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid var(--skc-border-soft);border-radius:8px;color:var(--skc-text);padding:5px 8px;cursor:pointer;font:inherit;text-align:left}
.skc-add-row:hover:not(:disabled){border-color:var(--skc-accent)}
.skc-add-row:disabled{opacity:.5;cursor:default}
.skc-add-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skc-direct{border-top:1px solid var(--skc-border-soft);padding-top:8px}
.skc-direct-row{display:flex;gap:8px;margin-top:4px}

/* 胶囊选择器 / toast */
.skc-capsule-picker{display:flex;align-items:center;gap:6px;color:var(--skc-dim);font-size:11px}
.skc-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10001;background:var(--skc-bg);border:1px solid var(--skc-border);border-radius:8px;padding:6px 14px;color:var(--skc-text);box-shadow:var(--skc-shadow);pointer-events:none;max-width:80vw}
`;
