#!/usr/bin/env node
// 直连 CDP 的页内 evaluate 助手（自建验证通道，替代 bsk_interact）。
// 用法：node skc-cdp.mjs '<expression>'  —— 表达式在 DSH 标签页内异步执行并打印 JSON 结果。
const listRes = await fetch("http://127.0.0.1:9223/json");
const tabs = await listRes.json();
const tab = tabs.find((t) => t.type === "page" && (t.url ?? "").includes("127.0.0.1:3080"));
if (!tab) {
  console.error("NO_DSH_TAB", tabs.map((t) => t.url).join(" ; "));
  process.exit(1);
}
const ws = new WebSocket(tab.webSocketDebuggerUrl);
const expression = process.argv[2] ?? "1+1";
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("cdp timeout 30s")), 30000);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id === 1) {
      clearTimeout(timer);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  };
  ws.onerror = () => { clearTimeout(timer); reject(new Error("ws error")); };
});
ws.close();
if (result.exceptionDetails) {
  console.error("EXCEPTION:", JSON.stringify(result.exceptionDetails, null, 1).slice(0, 800));
  process.exit(1);
}
console.log(JSON.stringify(result.result?.value ?? result.result, null, 1));
