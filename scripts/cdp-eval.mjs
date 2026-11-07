#!/usr/bin/env node
// CDP 助手 v2：node scripts/cdp-eval.mjs '<expr>' [width] [height] [mobile|desktop]
// 支持 Emulation.setDeviceMetricsOverride（视口仿真）+ 页内 evaluate。
const listRes = await fetch("http://127.0.0.1:9223/json");
const tabs = await listRes.json();
const tab = tabs.find((t) => t.type === "page" && (t.url ?? "").includes("127.0.0.1:3080"));
if (!tab) { console.error("NO_DSH_TAB"); process.exit(1); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
const expression = process.argv[2] ?? "1+1";
const width = process.argv[3] ? Number(process.argv[3]) : null;
const height = process.argv[4] ? Number(process.argv[4]) : null;
const mobile = process.argv[5] === "mobile";
const locale = process.argv[6] || null;
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("cdp timeout 30s")), 30000);
  let id = 0;
  const pending = new Map();
  const send = (method, params) => {
    id += 1;
    const rid = id;
    const p = new Promise((res) => pending.set(rid, res));
    ws.send(JSON.stringify({ id: rid, method, params }));
    return p;
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const res = pending.get(msg.id);
      pending.delete(msg.id);
      res(msg);
    }
  };
  ws.onopen = async () => {
    try {
      if (width) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 3, mobile });
        await new Promise((r) => setTimeout(r, 800));
      }
      if (locale) {
        await send("Emulation.setLocaleOverride", { locale });
        await new Promise((r) => setTimeout(r, 300));
      }
      const msg = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      clearTimeout(timer);
      resolve(msg.result);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  };
  ws.onerror = () => { clearTimeout(timer); reject(new Error("ws error")); };
});
ws.close();
if (result.exceptionDetails) {
  console.error("EXCEPTION:", JSON.stringify(result.exceptionDetails).slice(0, 300));
  process.exit(1);
}
console.log(JSON.stringify(result.result?.value ?? result.result, null, 1));
