/** 同源 API 封装。全部相对路径；失败抛错由调用方转 toast。 */

async function getJSON(path) {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(body?.error ?? `HTTP ${res.status}`);
    e.status = res.status;
    e.body = body;
    throw e;
  }
  return body;
}

async function postJSON(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(body?.error ?? `HTTP ${res.status}`);
    e.status = res.status;
    e.body = body;
    throw e;
  }
  return body;
}

export const api = {
  state: () => getJSON("/stock-kanban/state"),
  search: (market, q) => getJSON(`/stock-kanban/search?market=${encodeURIComponent(market)}&q=${encodeURIComponent(q)}`),
  quotes: (ids, full = false) => getJSON(`/stock-kanban/quotes?ids=${encodeURIComponent(ids.join(","))}${full ? "&full=1" : ""}`),
  kline: (id, period) => getJSON(`/stock-kanban/kline?id=${encodeURIComponent(id)}&period=${encodeURIComponent(period)}`),
  minute: (id) => getJSON(`/stock-kanban/minute?id=${encodeURIComponent(id)}`),
  add: (market, code, patch, ifRev) => postJSON("/stock-kanban/symbols/add", { market, code, patch, ifRev }),
  update: (id, patch, ifRev) => postJSON("/stock-kanban/symbols/update", { id, patch, ifRev }),
  reorder: (market, orderedIds, ifRev) => postJSON("/stock-kanban/symbols/reorder", { market, orderedIds, ifRev }),
  remove: (id, ifRev) => postJSON("/stock-kanban/symbols/remove", { id, ifRev }),
  setSettings: (patch, ifRev) => postJSON("/stock-kanban/settings", { ...patch, ifRev }),
  importBackup: (payload, ifRev) => postJSON("/stock-kanban/import", { payload, ifRev }),
  exportUrl: "/stock-kanban/export",
};
