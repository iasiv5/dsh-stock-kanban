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
// 退出码：0 全绿；1 基建（CDP 不可达/胶囊未挂载）；2 面板未开；3 层泄漏；4 console error；5 bundle 指纹不匹配（页面 ≠ 本地产物）。
// 纪律：build/test 等重活前 chrome 进程数必须为 0（headless chrome 曾把整机 load 顶到 45、
//   npm test 22s→700s、esbuild 卡 D 态）；`--down` 后 `pgrep -c chrome` 复核。
// 已知边界：合成 pointer 序列在本机不稳 → 开面板走键盘 Enter（capsule keydown handler，
//   与 client-dom 测试同契约）；行点击用 MouseEvent；Enters 两次未开视为陈旧 DOM →
//   reload 后再试（chrome 会话恢复场景实录）。
// 渲染层回归判读：jsdom 不做 CSS 级联——「hidden 被作者 display 击穿」类 bug 只有实拍能
//   抓（2026-11-10 实录：列表/详情双层叠渲染存活一天才被发现）；渲染层改动必跑本脚本。
// 稳定性：headless + 重 SPA 下 Emulation/capture 偶发失联，sendRetry 单次重试兜底；
//   若 CDP HTTP 层假活（TCP 通 HTTP 不响应），唯一出路是杀掉重启（--down）。

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
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
// 截图专用重试（2026-11-10 实录：详情图表渲染后 captureScreenshot 偶发连超，单次重试不够）
const capturePng = async (params, tries = 3) => {
  let lastErr;
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await sendRetry("Page.captureScreenshot", params);
      if (r.result?.data) return r.result.data;
      lastErr = new Error("capture: empty payload");
    } catch (e) {
      lastErr = e;
    }
    await sleep(900);
  }
  throw lastErr;
};
const stamp = new Date().toISOString().slice(0, 16).replaceAll(":", "").replace("-", "");
mkdirSync(outDir, { recursive: true });
// 元素裁剪截图（README/市场用图）：只拍插件面自己，不带出宿主工作区（2026-11-10 实拍教训：
// 全屏截图把会话名/其他插件全拍进去了）。pad=元素外扩像素，scale=2 retina 采样。
const shotEl = async (name, selector, pad = 12) => {
  await sendRetry("Page.bringToFront").catch(() => {});
  const rect = await evalJS(`(() => {
    const host = document.querySelector('[data-dsh-stock-kanban-float]');
    const el = host.shadowRoot.querySelector('${selector}');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`);
  if (!rect) { console.log(`shot ${name}: ${selector} 不可得，跳过`); return null; }
  const iw = await evalJS("window.innerWidth");
  const ih = await evalJS("window.innerHeight");
  const x = Math.max(0, rect.x - pad);
  const y = Math.max(0, rect.y - pad);
  const clip = {
    x,
    y,
    width: Math.min(rect.width + pad * 2, iw - x),
    height: Math.min(rect.height + pad * 2, ih - y),
    scale: 2,
  };
  const r = await capturePng({ format: "png", clip });
  const path = `${outDir}/${stamp}-${name}.png`;
  writeFileSync(path, Buffer.from(r, "base64"));
  console.log("shot:", path);
  return path;
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
    bundleSha: window.__DSH_PLUGIN_BUNDLE_SHA__?.["dsh-stock-kanban"] ?? null,
  };
})()`);
console.log("fingerprint:", JSON.stringify(fp));
if (fp === "NO_HOST") { console.error("胶囊未挂载"); process.exit(1); }

// ①b 构建指纹硬比对（2026-11-11 retro）：页面运行的 client 必须 ≡ 本地产物。
// 背景：CSS 特征串对纯逻辑改造无判别力（渲染切片广播战役实录：首轮实拍测的是旧构建还判了全绿）。
const localSha = (readFileSync(new URL("../lib/client.js", import.meta.url), "utf8")
  .match(/__DSH_PLUGIN_BUNDLE_SHA__\]\s*=\s*"([0-9a-f]{12})"/) ?? [])[1] ?? null;
const shaMatch = fp.bundleSha != null && fp.bundleSha === localSha;
console.log("bundle-sha:", JSON.stringify({ page: fp.bundleSha, local: localSha, match: shaMatch }));
if (!shaMatch) {
  console.error("页面构建 ≠ 本地产物（bash tools 路径见 know-how 037 §5：deploy-client.sh 下发 + 硬刷新后重跑）");
  process.exit(5);
}

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
  await shotEl("panel-desktop", ".skc-panel", 14);
  await setViewport(400, 768);
  await shotEl("panel-sheet", ".skc-panel", 8);
  await setViewport(1024, 768);
  const detail = await evalJS(`(async () => {
    const host = document.querySelector('[data-dsh-stock-kanban-float]');
    // 详情行优先选无持仓标记（★）的行：实拍图可能进公开仓/市场注册，不带出真实持仓数据
    const rows = [...host.shadowRoot.querySelectorAll('.skc-row')];
    const row = rows.find((r) => !r.querySelector('.skc-pos-dot')) ?? rows[0];
    if (!row) return { row: false };
    row.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await new Promise(r => setTimeout(r, 1500));
    const layer = host.shadowRoot.querySelector('.skc-layer-detail');
    return { row: true, detailVisible: !layer.hidden, title: layer.querySelector('.skc-detail-title')?.textContent ?? null };
  })()`);
  console.log("detail:", JSON.stringify(detail));
  await shotEl("detail", ".skc-panel", 14);
  // ④ 设置页（README 用图）：footer data-action="settings" → 对话框可见即拍 → 收起回列表
  const settings = await evalJS(`(() => {
    const host = document.querySelector('[data-dsh-stock-kanban-float]');
    const btn = host.shadowRoot.querySelector('.skc-icon-btn[data-action="settings"]');
    if (!btn) return { btn: false };
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    const layer = host.shadowRoot.querySelector('.skc-dialog--settings');
    return { btn: true, visible: Boolean(layer) && !layer.hidden };
  })()`);
  console.log("settings:", JSON.stringify(settings));
  if (settings.btn && settings.visible) {
    await sleep(400);
    await shotEl("settings", ".skc-panel", 14);
    await evalJS(`(() => {
      const host = document.querySelector('[data-dsh-stock-kanban-float]');
      host.shadowRoot.querySelector('.skc-dialog--settings .skc-icon-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    })()`);
    await sleep(300);
  }
  // 收尾：Esc 关面板 + 还原视口（不留脏会话态）
  await evalJS(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))`);
  await sleep(600);
  await setViewport(1024, 768);
  // ⑤ 胶囊特写（合并态：sk 行情段 + qw 额度段）：面板关闭后按胶囊矩形裁剪，2x 采样
  const capRect = await evalJS(`(() => {
    const host = document.querySelector('[data-dsh-stock-kanban-float]');
    const r = host.shadowRoot.querySelector('.skc-capsule')?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  })()`);
  if (capRect) {
    const pad = 14;
    const clip = {
      x: Math.max(0, capRect.x - pad),
      y: Math.max(0, capRect.y - pad),
      width: Math.min(capRect.width + pad * 2, (await evalJS("window.innerWidth")) - Math.max(0, capRect.x - pad)),
      height: capRect.height + pad * 2,
      scale: 2,
    };
    const r = await sendRetry("Page.captureScreenshot", { format: "png", clip });
    const path = `${outDir}/${stamp}-capsule-closeup.png`;
    writeFileSync(path, Buffer.from(r.result.data, "base64"));
    console.log("shot:", path);
  } else {
    console.log("capsule rect 不可得，跳过特写");
  }
}

const errLines = [String(consoleErrors)];
for (const t of consoleErrorTexts) errLines.push(`  ${t}`);
console.log(`console errors: ${errLines.join("\n")}`);
ws.close();
process.exit(consoleErrors > 0 ? 4 : 0);
