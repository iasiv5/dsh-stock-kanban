/**
 * 客户端诊断上报（P1-6，2026-11-13）：批量、静默失败、页面隐藏时 sendBeacon 兜底。
 * 只上事件与消息片段，不含任何业务数据；宿主侧 /stock-kanban/diag 再按 diagLevel 过滤
 * （errors 档只留 *.fail 等）。失败迁移上报：同一条错误消息持续失败期间不重复发。
 * 拆卸（dispose）：冲掉队列、摘除 visibilitychange 监听；之后 add 不再入队（评审轮3）。
 */
export function createDiagReporter({ win } = {}) {
  const w = win ?? (typeof window !== "undefined" ? window : null);
  const queue = [];
  let timer = 0;
  let lastFailMsg = null;
  let disposed = false;

  const post = (rows) => {
    if (!w || rows.length === 0) return;
    const body = JSON.stringify({ rows });
    try {
      if (typeof w.navigator?.sendBeacon === "function") {
        w.navigator.sendBeacon("/stock-kanban/diag", new Blob([body], { type: "application/json" }));
        return;
      }
    } catch {
      /* 走 fetch 兜底 */
    }
    void fetch("/stock-kanban/diag", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body,
    }).catch(() => {
      /* 诊断失败静默 */
    });
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    if (queue.length === 0) return;
    post(queue.splice(0, 40));
  };

  const add = (ev, data) => {
    if (disposed) return; // 拆卸后不再入队（评审轮3：拆卸后空跑）
    if (ev === "panel.quotes.ok") {
      lastFailMsg = null; // 恢复：只重置去重态，不产生行（恢复不是错误）
      return;
    }
    if (ev === "panel.quotes.fail") {
      const msg = String(data?.message ?? "");
      if (msg === lastFailMsg) return; // 同一错误持续失败期间不重复上报
      lastFailMsg = msg;
    }
    queue.push({ ev, ...(data ?? {}) });
    if (queue.length >= 40) flush();
    else if (!timer && w) timer = w.setTimeout(flush, 2000);
  };

  const onVisibility = () => {
    if (w?.document?.hidden) flush(); // 隐藏即冲队列（sendBeacon 优先）
  };
  if (w?.document) w.document.addEventListener("visibilitychange", onVisibility);

  /** 拆卸：冲掉队列并摘除监听；幂等 */
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { flush(); } catch { /* 拆卸期诊断不得抛 */ }
    try { w?.document?.removeEventListener?.("visibilitychange", onVisibility); } catch { /* 同上 */ }
  };

  return { add, flush, dispose };
}
