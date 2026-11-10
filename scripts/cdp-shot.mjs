#!/usr/bin/env node
// CDP 实拍探针（2026-11-10 retro 收编，取代 /tmp 即兴重写）：开面板 → 列表 / 窄屏 sheet /
// 详情三轮截图 + 构建指纹探针 + 双层叠渲染哨兵 + console error 计数。
//
// 前置：headless Chrome 已起（CDP 9223，带登录态 profile）。启动纪律（know-how 012/037）：
//   bash ~/workspace/.tools/bsk/start-headless-chrome.sh   # 一律 run_in_background 起跑，
//                                                          # 行内 & 会吊挂输出管道（037 同类实录）
// 用法：
//   node scripts/cdp-shot.mjs              # 三轮截图到 /tmp/skc-shots/（可用 --out 改）
//   node scripts/cdp-shot.mjs --check      # 只做指纹 + 面板状态 + 哨兵，不截图
//   node scripts/cdp-shot.mjs --down       # 杀 headless chrome（括号 trick 防 pkill 自匹配，
//                                          #   忘加曾 SIGTERM 自杀——know-how 012）
// 退出码：0 全绿；1 基建（CDP 不可达/胶囊未挂载）；2 面板未开；3 层泄漏；4 console error。
// 纪律：build/test 等重活前 chrome 进程数必须为 0（headless chrome 曾把整机 load 顶到 45、
//   npm test 22s→700s、esbuild 卡 D 态）；`--down` 后 `pgrep -c chrome` 复核。
// 已知边界：合成 pointer 序列在本机不稳 → 开面板走键盘 Enter（capsule keydown handler，
//   与 client-dom 测试同契约）；行点击用 MouseEvent；Enters 两次未开视为陈旧 DOM →
//   reload 后再试（chrome 会话恢复场景实录）。
// 渲染层回归判读：jsdom 不做 CSS 级联——「hidden 被作者 display 击穿」类 bug 只有实拍能
//   抓（2026-11-10 实录：列表/详情双层叠渲染存活一天才被发现）；渲染层改动必跑本脚本。
// 稳定性：headless + 重 SPA 下 Emulation/capture 偶发失联，sendRetry 单次重试兜底；
//   若 CDP HTTP 层假活（TCP 通 HTTP 不响应），唯一出路是杀掉重启（--down）。

import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const CDP_HTTP = "http://127.0.0.1:9223";
const OUT_DEFAULT = "/tmp/skc-shots";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : OUT_DEFAULT;
const checkOnly = args.includes("--check");
const down = args.includes("--down");

if (down) {
  // 括号 trick：[c]hrome 正则匹配 chrome 字面，但不匹配模式串自身（012 §pkill 自匹配）
  try { execSync("pkill -f '[c]hrome-cft'"); } catch { /* 已死即成功 */ }
  try { execSync("pkill -f '[c]hrome-home'"); } catch { /* 同上 */ }
  await new Promise((r) => setTimeout(r, 2500));
  let count = "0";
  try { count = execSync("pgrep -c chrome || true").toString().trim(); } catch { /* pgrep 无匹配 */ }
  console.log(`chrome processes: ${count}`);
  process.exit(count === "0" ? 0 : 1);
}

const listRes = await fetch(`${CDP_HTTP}/json`).catch(() => null);
if (!listRes?.ok) {
  console.error("CDP_HTTP_UNREACHABLE（先按头注纪律起 chrome；TCP 通 HTTP 不应答=假活，--down 重启）");
  process.exit(1);
}
const tabs = (await listRes.json()).filter((t) => t.type === "page" && (t.url ?? "").includes("127.0.0.1:3080"));
const tab = tabs[0];
if (!tab) { console.error("NO_DSH_TAB"); process.exit(1); }

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
let consoleErrors = 0;
const consoleErrorTexts = [];
const send = (method, params = {}) => new Promise((res, rej) => {
  const rid = ++id;
  pending.set(rid, res);
  ws.send(JSON.stringify({ id: rid, method, params }));
  setTimeout(() => rej(new Error(`cdp timeout: ${method}`)), 15000);
});
const sendRetry = async (method, params = {}) => {
  try {
    return await send(method, params);
  } catch (e) {
    if (String(e).includes("cdp timeout")) return send(method, params);
    throw e;
  }
};
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Log.entryAdded" && m.params?.entry?.level === "error") {
    consoleErrors += 1;
    if (consoleErrorTexts.length < 5) {
      consoleErrorTexts.push(String(m.params.entry.text ?? "").slice(0, 200));
    }
  }
};
await new Promise((r) => { ws.onopen = r; });
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const evalJS = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) {
    throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  }
  return r.result?.result?.value;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = new Date().toISOString().slice(0, 16).replaceAll(":", "").replace("-", "");
mkdirSync(outDir, { recursive: true });
const shot = async (name) => {
  await sendRetry("Page.bringToFront").catch(() => {});
  const r = await sendRetry("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  const path = `${outDir}/${stamp}-${name}.png`;
  writeFileSync(path, Buffer.from(r.result.data, "base64"));
  console.log("shot:", path);
};
const setViewport = async (w, h) => {
  await sendRetry("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false });
  await sleep(900);
};
const reloadAndSettle = async () => {
  await sendRetry("Page.reload").catch(() => {});
  await sleep(3500); // 重 SPA（DSH 全家桶）加载 + 插件 mount；事件等待在 headless 偶发丢帧，盲等更稳
  await setViewport(1024, 768);
};

await sendRetry("Page.bringToFront").catch(() => {});
await setViewport(1024, 768);

// ① 构建指纹：页面跑的是哪个构建（know-how 037 §5；新串在 / 旧串不在 = 新构建已下发）
const fp = await evalJS(`(() => {
  const host = document.querySelector('[data-dsh-stock-kanban-float]');
  if (!host || !host.shadowRoot) return 'NO_HOST';
  const css = [...host.shadowRoot.querySelectorAll('style')].map(s => s.textContent).join('');
  return {
    capsule: !!host.shadowRoot.querySelector('.skc-capsule'),
    hiddenGuard: css.includes(':host [hidden]{display:none !important}'),
    footerMain: css.includes('.skc-footer-main'),
    deadToken: css.includes('--dsw-alias-bg-elevated'),
  };
})()`);
console.log("fingerprint:", JSON.stringify(fp));
if (fp === "NO_HOST") { console.error("胶囊未挂载"); process.exit(1); }

// ② 开面板：键盘 Enter 两次未开 → 疑似陈旧 DOM（会话恢复/重载窗口期实录）→ reload 后再试两轮
const tryOpen = `async () => {
  const attempt = async () => {
    const host = document.querySelector('[data-dsh-stock-kanban-float]');
    const capsule = host?.shadowRoot?.querySelector('.skc-capsule');
    if (!capsule) return { mounted: false, hidden: true };
    capsule.focus();
    capsule.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await new Promise(r => setTimeout(r, 1100));
    const panel = host.shadowRoot.querySelector('.skc-panel');
    return { mounted: true, hidden: panel.hidden, w: panel.offsetWidth, h: panel.offsetHeight };
  };
  let r = await attempt();
  if (!(r.mounted && !r.hidden)) r = await attempt();
  return r;
}`;
let open = await evalJS(`(${tryOpen})()`);
if (!(open.mounted && !open.hidden)) {
  console.log("面板未开（疑陈旧 DOM）→ reload 重试");
  await reloadAndSettle();
  open = await evalJS(`(${tryOpen})()`);
}
console.log("panel:", JSON.stringify(open));
if (!(open.mounted && !open.hidden)) { console.error("PANEL_NOT_OPEN"); process.exit(2); }

// ③ 双层叠渲染哨兵（hidden 击穿类 bug 的直接观测面）：列表视图下详情层必须 display:none
const layering = await evalJS(`(() => {
  const host = document.querySelector('[data-dsh-stock-kanban-float]');
  const detail = host.shadowRoot.querySelector('.skc-layer-detail');
  return { hiddenAttr: detail.hidden, displayNone: getComputedStyle(detail).display === 'none' };
})()`);
console.log("layering:", JSON.stringify(layering));
if (!layering.displayNone) { console.error("LAYER_LEAK: 详情层在列表视图可见（hidden 被击穿）"); process.exit(3); }

if (!checkOnly) {
  await shot("panel-desktop");
  await setViewport(400, 768);
  await shot("panel-sheet");
  await setViewport(1024, 768);
  const detail = await evalJS(`(async () => {
    const host = document.querySelector('[data-dsh-stock-kanban-float]');
    const row = host.shadowRoot.querySelector('.skc-row');
    if (!row) return { row: false };
    row.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await new Promise(r => setTimeout(r, 1500));
    const layer = host.shadowRoot.querySelector('.skc-layer-detail');
    return { row: true, detailVisible: !layer.hidden, title: layer.querySelector('.skc-detail-title')?.textContent ?? null };
  })()`);
  console.log("detail:", JSON.stringify(detail));
  await shot("detail");
  // 收尾：Esc 关面板 + 还原视口（不留脏会话态）
  await evalJS(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))`);
  await setViewport(1024, 768);
}

const errLines = [String(consoleErrors)];
for (const t of consoleErrorTexts) errLines.push(`  ${t}`);
console.log(`console errors: ${errLines.join("\n")}`);
ws.close();
process.exit(consoleErrors > 0 ? 4 : 0);
