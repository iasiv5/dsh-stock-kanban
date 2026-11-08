# dsh-stock-kanban 客户端 vanilla 化重写（对齐 quota-watch 悬浮胶囊行为）实施计划

## 目标

- 将 dsh-stock-kanban 客户端从 React 组件树一次性全量重写为 vanilla DOM：挂载通道从 `shell.overlay` 插槽改为 `document.body` 顶层直挂 + open shadow root，行为与模式对齐 `@iasiv5/dsh-quota-watch@0.1.37` 的现行线上行为（2026-11-09 grill 共识，Round 1–4 全部锁定）。
- 位置与拖拽模型整套照搬 quota-watch：自由坐标 `{x,y}` + 实测几何钳位 + 安全区/标题栏 inset + transform/rAF 拖拽管线 + 分级 slop（6px/10px）；`snapToEdge`/`shouldDrag`/`dock` 字段退役。
- 测试面切换：stub-react 浅渲染契约测试退役，改为 jsdom DOM 级测试 + 纯函数 parity 向量测试（与 quota-watch `tests/drag.test.mjs`/`tests/prefs.test.mjs` 同规格）。
- 为计划 B（跨仓嵌入协议 + 胶囊组合并）预留结构性缝：浮动壳内 stack 容器（未来第二枚 pill 直接追加）。
- 范围外（计划 B，另立计划）：quota pill、嵌入协议（CustomEvent 握手）、quota-watch 检测、胶囊组交互；本计划不实现任何跨插件逻辑。

## 架构快照

- **挂载**（对齐 quota-watch `src/client.mjs:572-604` 挂载惯例）：`client/main.mjs` 的 `apply(ctx)` 经 `ctx.effect` 调 `mountKanban({doc, win})`；创建 `div[data-dsh-stock-kanban-float]` 追加到 `doc.body`，`attachShadow({mode:'open'})`，`:host { position:fixed; z-index:2147483000 }`。dedupe 守卫：body 或 shadow 已存在同 selector 即 noop。样式全部注入 shadow root 内（页面级 `<style>` 注入退役）。
- **浮动壳内部结构**：shadow root 内 `div.skc-stack`（纵向 flex、gap 6px——计划 B 的胶囊组缝）承载胶囊；面板 `div.skc-panel` 也在 shadow root 内。位置记忆挂 host 的 `left/top`：拖动胶囊 = 移动 host，stack 内容随动。
- **渲染架构**：React `useStore` hook → 订阅漏斗。`createStore(storage)` 返回 `{ getState, subscribe(listener), …actions }`；`main.mjs` 订阅后经单一 `renderAll(snapshot)` 漏斗调用 `capsule.update(snapshot)`、`panel.update(snapshot)`（对齐 quota-watch ADR 0007 的簇 seam 惯例：每个簇 `{ el, update, dispose }`）。
- **拖拽管线**（`client/drag.mjs` 纯函数 + 胶囊内接线）：pointerdown(button 0) 记录 grabOffset、实测 rect（回退 38×26）、rest 位置；slop 未过忽略，跨过后 `body.userSelect='none'` + `--dragging` class；pointermove 经 rAF 批处理（不可用则同步回退）写 `transform: translate3d()`；pointerup 终点 `clampFrame` 钳位 → 清 transform → 写 `left/top` → `saveFloatPosition` → `suppressNextClick`；pointercancel 复位且**不落盘**。resize 重测 insets 重钳位（仅视觉，不回写存储）。
- **面板模式**（机制对齐 quota-watch `placePanel`，弹出几何保留 stock 域垂直方向）：锚定胶囊 rect **下方优先弹出、空间不足翻上方**（翻转轴为 stock 域保留：400px 宽列表面板水平侧弹易越界，quota-watch 的水平侧弹服务于其 240px 窄栏）；水平钳位 `[MARGIN + insets.left, vw − width − MARGIN − insets.right]`、top 钳位 `[MARGIN + insets.top, vh − height − MARGIN]`（标题栏安全，对齐 quota-watch L1144-1145）；`win.innerWidth <= 480` 转底部 sheet、Esc 关、外点关（composedPath）、关闭/刷新类动作集中在 footer；面板头拖动与 `panelPos` 退役（锚定即位置）。
- **测试**：`tests/helpers/dom-harness.mjs`（jsdom 装配 + `firePointer` 合成指针辅助）供 DOM 级测试；`client/drag.mjs`/`client/float-prefs.mjs` 与旧 `tests/client-ui.test.mjs` 改写为同向量 parity 测试。

## 全局约束

- **冻结面零改动（逐文件清点，Task 17 机器断言）**：`src/` 顶层 10 文件（access/host/identity/model/portfolio/quotes/routes/sessions/store/targets 的 .mjs）+ `src/markets/` 4 文件（eastmoney/okx/search/tencent 的 .mjs）+ `data/a_stocks.json`、`data/etf_stocks.json`、`data/hk_stocks.json` + `locale/en.json`、`locale/zh.json` + `cordis.patch.yml` + `scripts/probe-markets.mjs`。断言方式：Task 1 记录 `BASE_REF`，Task 17 以 `git diff --name-only ${BASE_REF} -- src/ data/ locale/ cordis.patch.yml scripts/probe-markets.mjs` 输出为空收口。
- **行为基准逐字常量**（继承 quota-watch v0.1.37）：`DRAG_SLOP_MOUSE = 6`、`DRAG_SLOP_TOUCH = 10`、`MARGIN = 8`、测量回退 `38×26`、`:host` 与面板 `z-index: 2147483000`、默认位置右下（`x = vw − MARGIN − insets.right − size.width`，y 同理）、胶囊解剖 `height:26px; padding:0 10px; border-radius:999px; blur(10px) saturate(1.2); color-mix 86%; ::before inset:-9px; touch-action:none`、`@media print { :host { display:none !important } }`、动效全部包 `@media (prefers-reduced-motion: no-preference)`。
- **位置持久化**：新键 `dsh-stock-kanban:float-position` = `{"x":<number>,"y":<number>}`；旧 `stock-kanban:ui:v1` 的 `pos` **不迁移**（首次跳默认右下）；`ui:v1` 保留其余字段（`lastMarket/holdingsOnly/maVisible/capsuleSymbolId`）。
- **零运行时 npm 依赖**：`dependencies` 保持不存在；`jsdom@^29.1.1` 仅入 devDependencies。联网 npm 命令必须 `npm_config_cache=/home/ubuntu/workspace/.npm-cache`。
- **i18n 惯例不回退**：客户端源码禁止硬编码 CJK（`tests/i18n.test.mjs` 静态守卫继续生效）；`client/i18n.mjs`、`client/api.mjs`、`client/chartmath.mjs` 本计划不改。
- **bundle 纪律**：任何触碰 `client/` 源码的提交必须同 commit 重建 `lib/client.js`；两次构建产物逐字节一致（sha256 幂等验证）。
- **引擎**：Node >= 20（本机 v24.20.0）；测试框架 `node:test` + `node:assert/strict`；`npm test` glob `"tests/*.test.mjs"` 自动收编新测试文件，`package.json` 的 `scripts.test` 不改。
- **双仓移植署名**：`client/drag.mjs`、`client/float-prefs.mjs` 移植自同作者仓 `@iasiv5/dsh-quota-watch`（MIT），文件头注明来源锚点，`docs/reuse-mapping.md` 追加移植行。

## 输入工件

- 2026-11-09 `/grill-with-docs` 共识（本仓会话四轮问答，用户逐项确认）：一致层次 C（vanilla 全量）、body 直挂、位置模型整套照搬、一次性重写、胶囊全对齐+面板模式对齐、新键不迁移、服务端零改动、两份计划分两阶段。
- 移植源（只读参考）：`dsh-quota-watch/src/client/drag.mjs`（33 行全文）、`dsh-quota-watch/src/client/prefs.mjs`（L1-105：clampPoint/titlebarTopInset/load/saveFloatPosition）、`dsh-quota-watch/src/client.mjs`（L572-604 挂载、L688-793 拖拽接线、L1118-1148 placePanel、L618-626 applyPosition、L629-670 insets 探针）。
- 行为基准事实：quota-watch GLOSSARY「Free-floating position memory」（edge docking 已退役）；ADR 0001（shadow DOM 隔离）、ADR 0007（内部 seam）。
- 共识配套文档（ADR ×2、对齐矩阵、协议 spec、GLOSSARY 双仓更新）为独立文档任务，不在本计划内。

## 文件结构与职责

- Create: `client/float-prefs.mjs` — DOM-free 位置偏好（键、钳位、insets、load/save）
- Create: `client/drag.mjs` — DOM-free 拖拽状态机（slop/grab/clampFrame/parseInset）
- Create: `tests/helpers/dom-harness.mjs` — jsdom 装配 + `firePointer` 合成指针辅助
- Create: `tests/client-float-prefs.test.mjs`、`tests/client-drag.test.mjs` — parity 向量测试
- Create: `tests/client-dom.test.mjs` — DOM 级契约（胶囊/面板/挂载/持久化/dispose）
- Create: `tests/package-shape.test.mjs` — 包形状与 inject lockstep 守卫
- Modify: `client/main.mjs` — vanilla 挂载 orchestrator（renderAll 漏斗、lang observer、dispose）
- Modify: `client/store.mjs` — 去 React 化（订阅接口）、pos/capsuleRect 退役
- Modify: `client/capsule.mjs` — vanilla 胶囊簇（拖拽管线、点击/键盘、alert 态）
- Modify: `client/panel.mjs` — vanilla 面板簇（锚定/sheet/Esc/外点/footer + 对话框组装）
- Modify: `client/list.mjs`、`client/detail.mjs`、`client/add.mjs`、`client/backup.mjs` — vanilla 视图渲染器
- Modify: `client/charts.mjs` — SVG 直建（createElementNS），`client/chartmath.mjs` 不动
- Modify: `client/styles.mjs` — `FLOAT_STYLE_TEXT`（shadow 内样式文本；胶囊解剖常量对齐）
- Modify: `client/fmt.mjs` — 移除 `shouldDrag`/`snapToEdge`/`clampToViewport`
- Modify: `tests/client-ui.test.mjs` — 退役符号用例改写为 `clampPoint` parity
- Modify: `scripts/build-client.mjs` — 去 react external
- Modify: `package.json`（+`package-lock.json`）— devDep jsdom；`dsh.client.inject: []`
- Modify: `GLOSSARY.md`、`README.md`、`docs/verification.md`、`docs/reuse-mapping.md`、`docs/tech-notes.md`
- Modify（构建产物，非手编）: `lib/client.js`
- Delete: `tests/helpers/react-stub.mjs`、`tests/helpers/react-resolve-hook.mjs`、`tests/helpers/client-env.mjs`、`tests/helpers/contract-harness.mjs`、`tests/client-contract.test.mjs`
- 不动：`client/i18n.mjs`、`client/api.mjs`、`client/fmt.mjs` 的格式化函数（fmtPrice/fmtPct/trendClass）、`client/chartmath.mjs`、`src/**`、`data/**`、`locale/**`、`cordis.patch.yml`、`NOTICE.md`、`LICENSE`

## 任务清单

### Task 1: 重写基线确认

- 目标：记录重写前的全量测试基线，确认依赖在位。
- 涉及文件：无改动。
- 接口契约：
  - Consumes: 无。
  - Produces: 基线用例数 `BASELINE_PASS`（后续任务引用）。
- 验证范围：`npm test` 全绿且记录 pass 数。

- [ ] Step 1: 检查依赖与测试基线
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && test -d node_modules && npm test 2>&1 | tail -4`
  - Expected: `fail 0`；记下 `pass N`（当前应为 94）作为 `BASELINE_PASS`。若 `node_modules` 缺失，先按锁文件恢复再继续。
- [ ] Step 2: 记录冻结面基线引用
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && mkdir -p /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl && git rev-parse HEAD | tee /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref.txt`
  - Expected: 输出 40 位 commit SHA，记为 `BASE_REF`（Task 17 冻结面机器断言用；落 workspace 持久 scratch 目录，防 /tmp 周期清理）。

### Task 2: jsdom devDep + DOM 测试基建

- 目标：引入 jsdom 并建立 DOM 级测试装配层，供后续所有 DOM 测试复用。
- 涉及文件：Create `tests/helpers/dom-harness.mjs`、`tests/client-dom.test.mjs`（首个最小用例）；Modify `package.json`、`package-lock.json`。
- 接口契约：
  - Consumes: 无。
  - Produces: `tests/helpers/dom-harness.mjs` 导出 `createDomHarness()` → `{ window, document, localStorage, cleanup, firePointer, setViewport }`；`firePointer(el, type, { x, y, pointerType = "mouse", button = 0, pointerId = 1, isPrimary = true })` 派发合成指针事件——**主路径用原生 `PointerEvent` 构造器**（jsdom 29.1.1 实测支持 bubbles/button/clientX/clientY/pointerType/pointerId/isPrimary 全字段），构造器或 init 字段缺失时回退 `Event` + `Object.defineProperty` 挂 `clientX/clientY/button/pointerType/pointerId`，返回已派发标志；`setViewport(win, width, height)` 经 `Object.defineProperty` 强写 `innerWidth/innerHeight`（jsdom 只读，直接赋值无效）。jsdom 实例 `pretendToBeVisual: true`（提供 rAF）、`url: "https://dsh.local/"`。
- 验证范围：新增 1 用例绿；全量回归绿。

- [ ] Step 1: 安装 jsdom（联网 npm，缓存指向 workspace）
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && npm_config_cache=/home/ubuntu/workspace/.npm-cache npm install --save-dev jsdom@^29.1.1`
  - Expected: exit 0；`package.json` devDependencies 出现 jsdom。
- [ ] Step 2: 创建测试文件（先红：harness 尚不存在）
  - Change: 创建 `tests/client-dom.test.mjs`（import `createDomHarness` + 用例「dom-harness · window/localStorage/body 可用」：断言 `document.body` 存在、`localStorage.setItem/getItem` 往返成功）。
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
  - Expected: 失败于模块解析（`Cannot find module './helpers/dom-harness.mjs'`——测试文件已在、harness 未建）。
- [ ] Step 3: 实现 harness
  - Change: 创建 `tests/helpers/dom-harness.mjs`（按 Produces 契约；`cleanup()` 关 window；`firePointer` 主路径原生 PointerEvent、回退 Event+defineProperty）。
- [ ] Step 4: 确认通过并回归
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: 新用例 `pass 1`；全量 `fail 0`（pass = `BASELINE_PASS + 1`）。

### Task 3: client/float-prefs.mjs 移植 + parity 测试

- 目标：移植 quota-watch 位置偏好纯逻辑，键名换本仓前缀。
- 涉及文件：Create `client/float-prefs.mjs`、`tests/client-float-prefs.test.mjs`。
- 接口契约：
  - Consumes: `dsh-quota-watch/src/client/prefs.mjs`（L1-105，只读移植源）。
  - Produces: `client/float-prefs.mjs` 导出 `FLOAT_POSITION_KEY = "dsh-stock-kanban:float-position"`、`MARGIN = 8`、`clampPoint(point, viewport, size = 0, insets = {left:0,right:0,top:0,bottom:0})`、`titlebarTopInset({ titlebar = false, fullscreen = false, height } = {})`、`loadFloatPosition(storage)`、`saveFloatPosition(storage, point)`。**不移植** `SURFACE_FLAGS_KEY`/`loadSurfaceFlags`/`saveSurfaceFlags`（本插件无侧栏卡片）。`saveFloatPosition` 非法输入抛 `TypeError`、写失败静默（session-only）。
- 验证范围：parity 用例绿；全量回归绿。

- [ ] Step 1: 写 parity 测试（先红）
  - Change: `tests/client-float-prefs.test.mjs` 用例：① `FLOAT_POSITION_KEY` 字面量等于 `"dsh-stock-kanban:float-position"`；② `clampPoint` 与 quota-watch 同向量（如 viewport 1024×768、size {width:150,height:26}、insets 全 0：点 (0,0)→(8,8)；点 (2000,2000)→(866,734)；insets {left:0,top:32,right:0,bottom:0} 时 y 下限 40）；③ 退化视口（viewport 50×40 < size）钳位不越界（x ≥ minX）；④ `titlebarTopInset({titlebar:true,height:"36px"})` = 36、fullscreen=true → 0、非有限 → 0；⑤ `loadFloatPosition`：合法 `{"x":1,"y":2}` → `{x:1,y:2}`；缺键/损坏 JSON/非有限 → null；⑥ `saveFloatPosition`：写入后 `localStorage.getItem` 等于 `JSON.stringify({x:1,y:2})`；`{x:NaN,y:2}` 抛 TypeError；`setItem` 抛错时不冒泡。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-float-prefs.test.mjs 2>&1 | tail -3`
  - Expected: 模块不存在导致失败。
- [ ] Step 3: 移植实现
  - Change: 创建 `client/float-prefs.mjs`：逐段移植 `dsh-quota-watch/src/client/prefs.mjs` L1-105 对应逻辑（normalizeSize/clampPoint/titlebarTopInset/loadFloatPosition/saveFloatPosition），键名换前缀，文件头注释 `// 移植自 @iasiv5/dsh-quota-watch src/client/prefs.mjs（同作者双仓，MIT）`。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-float-prefs.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: 新文件用例全过、`fail 0`。

### Task 4: client/drag.mjs 移植 + parity 测试

- 目标：移植 quota-watch DOM-free 拖拽状态机。
- 涉及文件：Create `client/drag.mjs`、`tests/client-drag.test.mjs`。
- 接口契约：
  - Consumes: Task 3 的 `clampPoint`（`client/float-prefs.mjs`）。
  - Produces: `client/drag.mjs` 导出 `DRAG_SLOP_MOUSE = 6`、`DRAG_SLOP_TOUCH = 10`、`dragSlop(pointerType)`（touch/pen → 10）、`grabOffset(point, rect)`、`clampFrame(point, grab, size, viewport, insets)`、`parseInset(computedValue)`（"20px"→20；""/“auto”/NaN→0）。
- 验证范围：parity 用例绿；全量回归绿。

- [ ] Step 1: 写 parity 测试（先红）
  - Change: `tests/client-drag.test.mjs` 用例：① 常量 6/10 字面量；② `dragSlop("mouse")`=6、`("touch")`=10、`("pen")`=10；③ `grabOffset({x:100,y:50},{left:80,top:40})` → `{dx:20,dy:10}`；④ `clampFrame`：point {x:150,y:60}、grab {dx:20,dy:10}、size {width:150,height:26}、viewport 1024×768 → {x:130,y:50}（150−20, 60−10，均在界内）；越界点钳到 [8, …] 边界；⑤ `parseInset("20px")`=20、`parseInset("")`=0、`parseInset("auto")`=0。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-drag.test.mjs 2>&1 | tail -3`
  - Expected: 模块不存在导致失败。
- [ ] Step 3: 移植实现
  - Change: 创建 `client/drag.mjs`：逐行移植 `dsh-quota-watch/src/client/drag.mjs` 全文（import 路径改为 `./float-prefs.mjs`），文件头注明移植来源。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-drag.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: 新文件用例全过、`fail 0`。

### Task 5: FLOAT_STYLE_TEXT 样式文本（shadow 内）

- 目标：产出浮动壳样式文本常量，胶囊解剖与隔离规则对齐 quota-watch；旧页面级注入暂不动（React 树过渡期仍用）。
- 涉及文件：Modify `client/styles.mjs`（追加导出）；Modify `tests/client-dom.test.mjs`（追加断言用例）。
- 接口契约：
  - Consumes: Task 2 的 dom-harness。
  - Produces: `client/styles.mjs` 新增导出 `export const FLOAT_STYLE_TEXT`（模板字符串）。关键规则（测试断言锚点）：`:host { position: fixed; z-index: 2147483000; }`、`.skc-capsule { … height:26px; padding:0 10px; border-radius:999px; touch-action:none; cursor:grab; }`、`.skc-capsule::before { content:""; position:absolute; inset:-9px; }`、`.skc-capsule:focus-visible` 有 outline、`.skc-panel { position:fixed; z-index:2147483000; }`、`@media print { :host { display:none !important } }`、动效段包 `@media (prefers-reduced-motion: no-preference)`、`.skc-stack { display:flex; flex-direction:column; gap:6px; }`。既有 `CSS_TEXT`/`injectStyles` 导出保留（Task 14 清理）。
- 验证范围：样式常量断言用例绿；全量回归绿。

- [ ] Step 1: 写断言用例（先红）
  - Change: `tests/client-dom.test.mjs` 追加用例「FLOAT_STYLE_TEXT · 关键常量在位」：import `FLOAT_STYLE_TEXT`，断言上述 8 条锚点子串逐一 `includes`。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
  - Expected: 新用例失败（导出不存在）。
- [ ] Step 3: 写样式文本
  - Change: `client/styles.mjs` 追加 `FLOAT_STYLE_TEXT`：以现有 `CSS_TEXT` 的 token 用法（`var(--dsw-alias-*, 硬编码回退)`、相对色语法地板）为基础迁移，胶囊段按 quota-watch `FLOAT_STYLE_TEXT` 解剖重写（26px pill、blur(10px) saturate(1.2)、`color-mix(in srgb, var(--dsw-alias-bg-elevated, …) 86%, transparent)`、`::before` 命中区外扩、dragging 态 `transition:none` + `scale(1.04)`）；新增 `.skc-stack`、`@media print` 隐藏、reduced-motion 守卫、面板 sheet 态 `.skc-panel--sheet`（`left:8px; right:8px; top:auto; bottom:calc(8px + env(safe-area-inset-bottom, 0px))`）。stock 域内容样式（列表/图表/涨跌色 `#e5484d`/`#2bb596`）语义保留。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: 全部用例 `fail 0`。

### Task 6: stub-react 契约面退役

- 目标：删除 React 专用测试基建，为 vanilla 覆写扫清测试面（此后 `npm test` 不再触碰 React 树）。
- 涉及文件：Delete `tests/helpers/react-stub.mjs`、`tests/helpers/react-resolve-hook.mjs`、`tests/helpers/client-env.mjs`、`tests/helpers/contract-harness.mjs`、`tests/client-contract.test.mjs`。
- 接口契约：
  - Consumes: Task 1 基线。
  - Produces: 测试基线变为 `BASELINE_PASS − 9`（9 个契约用例移除）；`tests/helpers/` 只剩 `dom-harness.mjs`。
- 验证范围：删除后全量绿。

- [ ] Step 1: 删除前确认无其他引用
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && grep -rn "react-stub\|react-resolve-hook\|contract-harness\|client-env" tests/ client/ scripts/ --include="*.mjs" | grep -v "tests/helpers/\|tests/client-contract"`
  - Expected: 无输出（引用只在被删文件内部）。
- [ ] Step 2: 删除五个文件
  - Change: `rm tests/helpers/react-stub.mjs tests/helpers/react-resolve-hook.mjs tests/helpers/client-env.mjs tests/helpers/contract-harness.mjs tests/client-contract.test.mjs`
- [ ] Step 3: 全量回归并记录新基线
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `fail 0`；pass = `BASELINE_PASS − 9 + 13`（新增：Task 2 用例 1 + Task 3 用例 6 + Task 4 用例 5 + Task 5 用例 1）。将实际 pass 数记为 `VANILLA_BASELINE`（后续任务引用）。

### Task 7: client/store.mjs 去 React 化

- 目标：store 改为纯订阅接口，pos/capsuleRect 职责移出，轮询语义不变。
- 涉及文件：Modify `client/store.mjs`；Modify `tests/client-ui.test.mjs`（store 相关用例改写）。
- 接口契约：
  - Consumes: `client/api.mjs`（不变）。
  - Produces: `createStore(storage = window.localStorage)` 返回对象，方法名与现版 `client/store.mjs` L229-235 导出集逐字一致（不改名），三清单：
    - **保留（语义不变）**：`getState`、`subscribe(listener) → unsubscribe`（新增行为：subscribe 即刻回放当前快照一次）、`refreshState`、`mutate`（内部函数）、`addSymbol`、`updateSymbol`、`removeSymbol`、`setPrivacy`、`importBackup`、`pollQuotes`、`restartPolling`、`openPanel`、`closePanel`、`togglePanel`、`openDetail`、`backToList`、`setLastMarket`、`setHoldingsOnly`、`setMaVisible`、`setCapsuleSymbol`、`setToast`、`setShowAdd`、`setShowSettings`、`handleVisibility`。
    - **退役（职责去向）**：`useStore` hook（React）；`setCapsulePos`/`setCapsuleRect`/`getCapsuleRect`（位置归 float-prefs + 胶囊 DOM；面板锚定改由 Task 12 `openFrom(anchorRect)` 直读胶囊 `getBoundingClientRect()`）；`setPanelPos`（锚定即位置）；`handleResize`（依赖 `pos` + `snapToEdge`，职责移 Task 8 ⑤ 胶囊 resize 重钳位）——随退役一并删除 `import { snapToEdge } from "./fmt.mjs"`（store.mjs L12）。
    - **新增**：`dispose()`（清 `pollTimer` + listeners，供 Task 13 dispose 契约）。
    快照形状不变（business/quotes/quoteMeta/ui/toast/providers）；`ui` 不再含 `pos`/`panelPos`（`DEFAULT_UI` 去两键；persist 字段集 = `lastMarket/holdingsOnly/maVisible/capsuleSymbolId`，读旧 `ui:v1` 时忽略 `pos` 键）。轮询节奏（面板关 30s/开 15s、document.hidden 跳过、visibilitychange 立即重拉）逐语义保留。
- 验证范围：改写后的 store 用例绿；全量回归绿。

- [ ] Step 1: 改写 store 用例（先红）
  - Change: `tests/client-ui.test.mjs` 中引用 `useStore`/`pos`/`setCapsulePos`/`setCapsuleRect` 的用例改为：① `createStore(storage).getState().ui` 无 `pos`/`panelPos` 字段；② persist 写入后 `storage.getItem("stock-kanban:ui:v1")` 解析不含 `pos`；③ 旧存储含 `pos` 时 loadUi 忽略之不抛错；④ `subscribe(fn)` 后调 `store.setHoldingsOnly(true)`（经导出动作走同一通知漏斗，`setUi` 是内部函数不可直调）触发 fn 收到新快照、返回的 unsubscribe 后不再触发。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-ui.test.mjs 2>&1 | tail -3`
  - Expected: 新用例失败（useStore 仍在/pos 仍在）。
- [ ] Step 3: 重写 store
  - Change: `client/store.mjs` 按 Produces 契约重写：删 react import（含 `useStore`）与 snapToEdge import；listeners Set + 通知漏斗；DEFAULT_UI/persist 集合调整；保留清单方法迁移原实现（不改名），退役清单方法不迁移。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-ui.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: `fail 0`。

### Task 8: client/capsule.mjs vanilla 重写（拖拽管线 + 键盘 + 点击）

- 目标：胶囊簇 vanilla 化：DOM 构建、拖拽管线接线、点击/键盘 toggle、alert 态。
- 涉及文件：Modify `client/capsule.mjs`；Modify `tests/client-dom.test.mjs`（胶囊用例组）。
- 接口契约：
  - Consumes: Task 3 `float-prefs`（clampPoint/loadFloatPosition/saveFloatPosition/MARGIN）、Task 4 `drag`（dragSlop/grabOffset/clampFrame/parseInset）、Task 5 `FLOAT_STYLE_TEXT` 常量、Task 7 `createStore` 快照形状。
  - Produces: `createCapsule({ doc, win, storage, shadow, store, onTogglePanel })` → `{ el, update(snapshot), dispose() }`。行为规格：① `el` = `div.skc-capsule[data-dsh-stock-kanban-capsule]`，`role="button"`、`tabIndex=0`、`aria-haspopup="dialog"`、`aria-expanded` 随面板开合（update 接收 `ui.panelOpen`）；子结构 `span.skc-capsule-mark(.skc-mark-buy|.skc-mark-sell)` + `.skc-capsule-name/-price/-pct`（内容语义与现版一致：Ⓑ/Ⓢ 仅新鲜数据、名称回退链、"—"/stale 文案、涨跌色类）；② 初始位置：`loadFloatPosition(storage)` 命中则钳位应用，否则默认右下（`vw − MARGIN − insets.right − width`，`vh − MARGIN − insets.bottom − height`）；③ 拖拽按架构快照管线（grab 保留、slop 分级、rAF 批 transform、释放钳位写 left/top + saveFloatPosition + suppressNextClick、cancel 复位不落盘）；④ 点击（未拖动的 pointerup）与 Enter/Space → `onTogglePanel()`；⑤ resize → 重测 insets 重钳位（仅视觉）；⑥ insets 探针：shadow 内 probe div（`padding: env(safe-area-inset-*)`）+ `titlebarTopInset`（`html[data-windows-titlebar]` 且无 `data-fullscreen` 时读 `--dsh-windows-titlebar-height`），`top = max(safeTop, titlebar)`；⑦ 测量回退 38×26。
- 验证范围：胶囊 DOM 用例组绿；全量回归绿。

- [ ] Step 1: 写胶囊用例组（先红）
  - Change: `tests/client-dom.test.mjs` 追加用例组「capsule」：① 创建后 el 有 `role="button"`/`tabIndex=0`/`data-dsh-stock-kanban-capsule`；② 无存储时默认位置 = 视口右下角减 MARGIN 减尺寸（断言 `el.style.left/top` 数值）；③ `firePointer` 序列：pointerdown(100,100) → move(120,100)（超 slop 6）→ up(120,100)：胶囊位移 +20px，`localStorage` 出现 `dsh-stock-kanban:float-position` 且值 = 终点钳位坐标；④ pointerdown → move(103,100)（未过 slop）→ up(103,100)：`onTogglePanel` 被调用一次、位置不落盘；⑤ pointerdown → move(120,100) → pointercancel：`onTogglePanel` 不被调用、无新落盘；⑥ Enter keydown → `onTogglePanel` 调用。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
  - Expected: 新用例组失败。
- [ ] Step 3: 重写胶囊
  - Change: `client/capsule.mjs` 按 Produces 规格重写（vanilla，无 react import）；拖拽接线参照 `dsh-quota-watch/src/client.mjs` L688-793 的手势绑定（手势期间才绑 doc 级 move/up/cancel）。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: `fail 0`。

### Task 9: client/list.mjs vanilla 视图

- 目标：列表视图渲染器 vanilla 化。
- 涉及文件：Modify `client/list.mjs`；Modify `tests/client-dom.test.mjs`。
- 接口契约：
  - Consumes: Task 7 快照形状（business.symbols、quotes、ui.lastMarket/holdingsOnly、providers）。
  - Produces: `createList({ store })` → `{ el, update(snapshot), dispose() }`。行为语义与现版一致：市场分组导航、行（名称/现价/涨跌幅/持仓标记/触价标记）点击 → `store.openDetail(id)`、隐私模式遮蔽、loading/error 行；`holdingsOnly` 过滤；空态文案走 `t()`。
- 验证范围：列表用例绿；全量回归绿。

- [ ] Step 1: 写列表用例（先红）
  - Change: `tests/client-dom.test.mjs` 追加「list」用例组：快照 fixture（两标的、一持仓、一触价）渲染后 el 含 2 行、行点击触发 openDetail；隐私模式下行文本被遮蔽类。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
  - Expected: 「list」用例组失败（现文件导出 React 组件，新接口不存在）。
- [ ] Step 3: 重写 `client/list.mjs`（DOM 构建 + update 重绘：整段重建或节点 diff 由实现定，测试只断言行为）。
  - Change: 删 react import，按 Produces 契约实现。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: `fail 0`。

### Task 10: client/detail.mjs + client/charts.mjs vanilla（SVG 直建）

- 目标：详情视图与图表 vanilla 化，SVG 用 createElementNS 直建。
- 涉及文件：Modify `client/detail.mjs`、`client/charts.mjs`；Modify `tests/client-dom.test.mjs`。
- 接口契约：
  - Consumes: `client/chartmath.mjs`（不动：MA/坐标计算纯函数）、Task 7 快照形状。
  - Produces: `createDetail({ store })` → `{ el, update(snapshot), dispose() }`；`client/charts.mjs` 导出 `buildMinuteChart(svgData, opts)` / `buildCandleChart(klineData, opts)` → SVG `Element`（namespace `http://www.w3.org/2000/svg`，含价格线/均价线/昨收虚线/成交量柱/MA 线，视觉语义与现版一致，`maVisible` 过滤生效）。
- 验证范围：详情/图表用例绿；全量回归绿。

- [ ] Step 1: 写用例（先红）
  - Change: `tests/client-dom.test.mjs` 追加「detail/charts」用例组：fixture 分时数据 → `buildMinuteChart` 返回 `createElementNS` 产物（tagName `svg`，含 `polyline` 与昨收 `line`）；`maVisible` 关 5 时无 MA5 线；`createDetail` 空标的走「无此标的」回退文案。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
  - Expected: 「detail/charts」用例组失败。
- [ ] Step 3: 重写两文件
  - Change: `client/detail.mjs`、`client/charts.mjs` 按 Produces 契约重写（React h() 调用全部换 DOM/SVG 直建；chartmath 输入输出契约不变）。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: `fail 0`。

### Task 11: client/add.mjs + client/backup.mjs vanilla

- 目标：添加标的与备份导入导出对话框 vanilla 化。
- 涉及文件：Modify `client/add.mjs`、`client/backup.mjs`；Modify `tests/client-dom.test.mjs`。
- 接口契约：
  - Consumes: `client/api.mjs`（search/add/import/export）、Task 7 快照形状。
  - Produces: `createAdd({ store })` → `{ el, update, dispose }`（搜索输入、结果列表、选中即 `store` 提交添加）；`createBackup({ store })` → `{ el, update, dispose }`（导出下载链接 + 导入文件选择与确认，错误走 toast）。
- 验证范围：两视图用例绿；全量回归绿。

- [ ] Step 1: 写用例（先红）
  - Change: `tests/client-dom.test.mjs` 追加「add/backup」用例组：add 视图输入触发搜索 stub（fetch 桩）渲染结果行、点击行调用提交；backup 视图含导出 href（`exportUrl`）与文件 input。
- [ ] Step 2: 确认红
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
  - Expected: 「add/backup」用例组失败。
- [ ] Step 3: 重写两文件
  - Change: `client/add.mjs`、`client/backup.mjs` 按 Produces 契约重写。
- [ ] Step 4: 确认绿并回归
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`
  - Expected: `fail 0`。

### Task 12: client/panel.mjs vanilla（锚定/sheet/Esc/外点/footer）

- 目标：面板簇 vanilla 化，交互模式对齐 quota-watch placePanel。
- 涉及文件：Modify `client/panel.mjs`；Modify `tests/client-dom.test.mjs`。
- 接口契约：
  - Consumes: Task 9/10/11 视图簇接口；Task 7 store；Task 3 MARGIN/insets。
  - Produces: `createPanel({ doc, win, store, views })` → `{ el, update(snapshot), openFrom(anchorRect), close(), isOpen(), dispose() }`。行为规格：① `div.skc-panel[role="dialog"]`，header 只留标题+计数/错误状态；关闭按钮与刷新类动作集中在 footer（胶囊标的 picker 保留在 footer）；② 锚定（垂直弹出为 stock 域保留，理由见架构快照）：`left = anchorRect.left`、`top = anchorRect.top + anchorRect.height + 8`；下方空间不足翻转到 `anchorRect.top − height − 8`；水平钳位 `[MARGIN + insets.left, vw − width − MARGIN − insets.right]`，top 钳位 `[MARGIN + insets.top, vh − height − MARGIN]`（标题栏安全）；`win.innerWidth <= 480` 加 `.skc-panel--sheet`；③ Esc 关闭（keydown）；外点关闭（doc pointerdown 且 `composedPath()` 不含面板）；④ 视图组装：list 常驻层 + detail 覆盖层（保留滚动/过滤状态语义）；AddDialog/SettingsDialog/toast 在面板内渲染；⑤ 面板头拖动与 `panelPos` 不复存在。
- 验证范围：面板用例组绿；全量回归绿。

- [ ] Step 1: 写面板用例组（先红）：① `openFrom({left:100, top:200, width:150, height:26})` 后 `el.style.top` = "234px"（200+26+8）；视口矮时翻转到上方；② 经 dom-harness 的 `setViewport(win, 400, 700)` 后 el 有 `skc-panel--sheet` 类；③ doc pointerdown 于面板外 → `isOpen()` false；Esc keydown 同；④ footer 含关闭按钮且点击 → close。
- [ ] Step 2: 确认红。
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
- [ ] Step 3: 重写 `client/panel.mjs`（弹出+翻转+钳位+top 标题栏安全钳位+sheet+Esc/外点语义对齐 `dsh-quota-watch/src/client.mjs` L1118-1148 placePanel；翻转轴保留 stock 域垂直方向，理由与公式见本任务 ② 与架构快照）。
- [ ] Step 4: 确认绿并回归。
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4`

### Task 13: client/main.mjs vanilla orchestrator（body shadow host + renderAll 漏斗）

- 目标：入口切换为 vanilla 挂载：body 直挂 + open shadow root + 单一 renderAll 漏斗 + dispose 契约。**React 自此完全退场。**
- 涉及文件：Modify `client/main.mjs`；Modify `tests/client-dom.test.mjs`（挂载级用例组）。
- 接口契约：
  - Consumes: Task 5 `FLOAT_STYLE_TEXT`、Task 7 store、Task 8 capsule、Task 9/10/11 views、Task 12 panel、`client/i18n.mjs`（`t` 不变）。
  - Produces: `client/main.mjs` 导出 `export const inject = []` 与 `export function apply(ctx)`；内部 `mountKanban({ doc, win, storage })` → dispose 函数。行为规格：① `apply(ctx)` = `ctx.effect(() => mountKanban({ doc: ctx.document ?? globalThis.document, win: …, storage: … }), "dsh-stock-kanban: float shell")`（ctx 无 effect 时直接调用并透传 dispose，供测试）；② `doc.body` 缺失或 `[data-dsh-stock-kanban-float]` 已存在 → noop；③ host = `div[data-dsh-stock-kanban-float]` → `doc.body`，`attachShadow({mode:"open"})`，`<style>` 注入 `FLOAT_STYLE_TEXT`；shadow 内 `div.skc-stack` 装胶囊（**计划 B 缝：stack 未来追加 quota pill**）、面板同 root；④ store 实例 + `subscribe(renderAll)`；`renderAll(snapshot)` = capsule.update + panel.update；⑤ lang 跟随：`documentElement[lang]` MutationObserver + `win.addEventListener("languagechange")` → renderAll；⑥ dispose：store.dispose、capsule/panel/views dispose、断 observer/listener、移除 host；HMR 重挂载从 localStorage 恢复位置（经 loadFloatPosition）。
- 验证范围：挂载级用例组绿；`client/` 无 react 引用；全量回归绿。

- [ ] Step 1: 写挂载用例组（先红）：用例经 `Object.assign(globalThis, { document: h.document, window: h.window, localStorage: h.localStorage })` 注入环境后 `await import(new URL("../client/main.mjs?case=" + tag, import.meta.url).href)`（查询串隔离模块实例；URL 构造沿旧 contract-harness L35 惯例——`pathToFileURL` 二次编码会产畸形 URL）再调 `mountKanban`/`apply`。断言：① `mountKanban` 后 `document.body.querySelector("[data-dsh-stock-kanban-float]")` 存在且 `shadowRoot` 非 null；② 重复调用第二次 noop（body 仍只有 1 个 host）；③ shadow 内 `style` 文本含 `2147483000`；④ dispose 后 host 移除、listeners 清（window resize 不再报错）；⑤ `client/` 目录 `grep -l '"react"' client/*.mjs` 无输出。
- [ ] Step 2: 确认红。
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3`
- [ ] Step 3: 重写 `client/main.mjs`（删 App/useStore 全树，按 Produces 规格；视图簇 wiring：list/detail 常驻 + add/backup/settings 对话框）。
- [ ] Step 4: 确认绿并回归。
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | tail -4 && grep -rn '"react"' client/ ; echo "grep exit=$?"`
  - Expected: 测试 `fail 0`；grep 无命中（exit 1）。

### Task 14: fmt.mjs/styles.mjs 退役符号清理 + client-ui 测试收口

- 目标：移除贴边吸附与页面级样式注入遗物，parity 断言统一由 clampPoint 接棒。
- 涉及文件：Modify `client/fmt.mjs`（删 `shouldDrag`/`snapToEdge`/`clampToViewport` 与 `DRAG_THRESHOLD_PX`/`EDGE_MARGIN_PX` 常量）、`client/styles.mjs`（删过渡期保留的 `CSS_TEXT`/`injectStyles` 旧导出，只留 `FLOAT_STYLE_TEXT`）；Modify `tests/client-ui.test.mjs`（对应用例删除，保留 fmtPrice/fmtPct/trendClass 用例）。
- 接口契约：
  - Consumes: Task 3/4/13（新管线已在位，旧 React 树已不存在）。
  - Produces: `client/fmt.mjs` 仅余格式化纯函数；`client/styles.mjs` 仅导出 `FLOAT_STYLE_TEXT`；`tests/client-ui.test.mjs` 无退役符号引用。
- 验证范围：全量回归绿；grep 无残留。

- [ ] Step 1: 残留扫描
  - Run: `grep -rn "snapToEdge\|shouldDrag\|clampToViewport\|DRAG_THRESHOLD_PX\|EDGE_MARGIN_PX\|setCapsulePos\|setCapsuleRect\|injectStyles\|CSS_TEXT" client/ tests/ scripts/`
  - Expected: 仅 `client/fmt.mjs`、`client/styles.mjs`、`tests/client-ui.test.mjs` 命中（`FLOAT_STYLE_TEXT` 字面量不含 `CSS_TEXT` 子串，无假阳性）。
- [ ] Step 2: 清理并改写
  - Change: 删 `fmt.mjs` 退役导出与 `styles.mjs` 的 `CSS_TEXT`/`injectStyles`；`client-ui.test.mjs` 删对应用例（viewport 钳位语义已由 Task 3 `clampPoint` parity 覆盖）。
- [ ] Step 3: 全量回归
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `fail 0`。

### Task 15: 构建去 react external + package 形状 + 重建 bundle

- 目标：构建脚本与包声明随 vanilla 化收口，重建 `lib/client.js` 并验证幂等。
- 涉及文件：Modify `scripts/build-client.mjs`、`package.json`（`dsh.client.inject: []`）；Create `tests/package-shape.test.mjs`；Modify `lib/client.js`（构建产出）。
- 接口契约：
  - Consumes: Task 13（client 入口不再引 react）。
  - Produces: ① `scripts/build-client.mjs` 无 react external 配置，产物 wrapper `window.__ModuleLoader__.load({id:"dsh-stock-kanban", …})` 不变；② `package.json` `dsh.client.inject` = `[]` 且与 `client/main.mjs` 导出的 `inject` lockstep；③ `tests/package-shape.test.mjs` 断言：exports 形状（`./client` → `./lib/client.js` 等 5 项）、`dsh.client.platform === "web"`、inject lockstep、`dependencies` 字段不存在或为空对象、devDependencies 含 jsdom。
- 验证范围：package-shape 用例绿；两次构建 sha256 一致；bundle 无 react require；全量回归绿。

- [ ] Step 1: 写 package-shape 用例（先红）
  - Change: `tests/package-shape.test.mjs` 按 Produces ③ 断言（读 package.json 与 `client/main.mjs` 的 inject 导出比对）。
- [ ] Step 2: 确认红（当前 inject 仍为 `["slots"]`）
  - Run: `node --test tests/package-shape.test.mjs 2>&1 | tail -3`
- [ ] Step 3: 改构建脚本与 package.json、重建
  - Change: `scripts/build-client.mjs` 移除 react external 段；`package.json` `dsh.client.inject` 改 `[]`；`npm run build` 重建 `lib/client.js`。
- [ ] Step 4: 幂等与内容断言
  - Run: `npm run build && sha256sum lib/client.js && npm run build && sha256sum lib/client.js && grep -c 'require("react")' lib/client.js; echo "grep exit=$?"`
  - Expected: 两次指纹一致；`grep -c` 输出 `0` 且其 exit code 为 1（grep 无匹配的正常语义，非失败信号）。
- [ ] Step 5: 全量回归
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `fail 0`。
- [ ] Step 6: checkpoint commit
  - Run: `git add -A && git commit -m "feat(client): vanilla 重写完成——body 直挂 shadow host + quota-watch 行为对齐 + bundle 重建"`

### Task 16: 文档收口

- 目标：术语与文档随新架构更新，修复既有 doc drift，登记移植来源。
- 涉及文件：Modify `GLOSSARY.md`、`README.md`、`docs/verification.md`、`docs/reuse-mapping.md`、`docs/tech-notes.md`。
- 接口契约：
  - Consumes: Task 13/15 的最终架构。
  - Produces: ① `GLOSSARY.md`：胶囊/浮动壳/位置记忆/胶囊组/嵌入协议五术语已在共识文档阶段建档（2026-11-09，含「计划 B 落地」「vanilla 重写落地后生效」过渡标注）——本任务只做：删「插槽（Slot）/插槽契约（Slot Contract）」退役条目、新增「浮动壳契约（Float Shell Contract：由 `tests/client-dom.test.mjs` + `tests/package-shape.test.mjs` 执有）」、去除「浮动壳」条目的过渡标注；「快照（Snapshot）」保留；② `README.md`：存储键表更新（新 float-position 键、pos 退役、panelPos 说法修正为「面板锚定胶囊，无独立位置记忆」）；③ `docs/verification.md` 新增「§12.10 客户端 vanilla 化（2026-11-09）」记录测试面切换与本计划验证证据；④ `docs/reuse-mapping.md` 追加行「悬浮胶囊二代（自由坐标+钳位+transform 拖拽管线+body shadow 挂载）| dsh-quota-watch `src/client/{drag,prefs}.mjs`、`src/client.mjs` L572-793/L1118-1148 | `client/{drag,float-prefs,capsule,panel,main}.mjs` | 同作者双仓移植（MIT）；slop 6/10、MARGIN 8、键格式与 v0.1.37 逐字对齐，parity 测试同向量」；⑤ `docs/tech-notes.md` 追加「§11 客户端 vanilla 化决策」一段（插槽→body 直挂的理由与 quota-watch 基准引用，指向 ADR 0001 与对齐矩阵 docs/reports/2026-11-09-capsule-parity-matrix.md）。
- 验证范围：grep 断言文档更新在位；全量测试绿。

- [ ] Step 1: 逐项更新五份文档（按 Produces ①–⑤）。
- [ ] Step 2: 验证
  - Run: `grep -c "浮动壳" GLOSSARY.md && grep -c "float-position" README.md && grep -c "12.10" docs/verification.md && npm test 2>&1 | tail -4`
  - Expected: 各 grep 计数 ≥ 1；测试 `fail 0`。

### Task 17: 最终验证与活体冒烟

- 目标：全量收口验证 + 活体（本机 DSH Web symlink 安装）冒烟取证。
- 涉及文件：Modify `docs/verification.md`（补冒烟证据）。
- 接口契约：
  - Consumes: Task 15/16 全部产物。
  - Produces: 最终绿基线 + 活体证据记录。
- 验证范围：下列全部通过。

- [ ] Step 1: 全量测试与构建幂等
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && npm test 2>&1 | tail -4 && npm run build && sha256sum lib/client.js && npm run build && sha256sum lib/client.js`
  - Expected: `fail 0`；两次指纹一致。
- [ ] Step 2: 静态断言
  - Run: `grep -rn '"react"' client/ ; grep -c 'require("react")' lib/client.js ; grep -c "dsh-stock-kanban:float-position" client/float-prefs.mjs lib/client.js`
  - Expected: client/ 无 react 引用；bundle 计数 0；键字面量在源与 bundle 各 ≥ 1（`grep -c` 计 0 时 exit 1，三段以 `;` 分隔已避开 && 链语义）。
- [ ] Step 3: 冻结面机器断言（冻结面约束收口）
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && BASE_REF=$(cat /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref.txt) && test -z "$(git diff --name-only "${BASE_REF:?}" -- src/ data/ locale/ cordis.patch.yml scripts/probe-markets.mjs)" && echo FROZEN_CLEAN`
  - Expected: 输出 `FROZEN_CLEAN`（空串测试无 grep 退出码歧义；`sk-base-ref.txt` 缺失或 `BASE_REF` 为空时 `${VAR:?}` 显式报错而非静默通过）。
- [ ] Step 4: 活体冒烟（symlink 安装，client-only 变更经 HMR/刷新生效；流程参照 `docs/verification.md` 既有 CDP 取证小节，命令以 `scripts/cdp-eval.mjs` 文件头注释为准）
  - Expected 观察条件：刷新 DSH Web 后胶囊出现在视口右下；拖拽松手后位置保持、`localStorage["dsh-stock-kanban:float-position"]` 形如 `{"x":…,"y":…}`；点击胶囊开面板（列表视图）、Esc/外点关闭；窗口缩到 ≤480px 面板转底部 sheet；旧 `stock-kanban:ui:v1` 的 `pos` 被忽略；无页面级 `<style id="stock-kanban-styles">`（样式已入 shadow root）。逐条记入 `docs/verification.md` §12.10。
- [ ] Step 5: 修改摘要
  - Run: `git status --porcelain && git diff --stat HEAD`
  - Expected: 改动集与计划文件结构一致，无计划外文件。
- [ ] Step 6: docs-only 收尾提交
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && git add docs/ GLOSSARY.md README.md && git commit -m "docs: vanilla 重写验证证据（§12.10）与术语/文档收口" && git status --porcelain`
  - Expected: commit 成功；`git status --porcelain` 输出为空（唯一提交点 Task 15 Step 6 之后的文档改动在此收尾，工作树真正干净）。

## 执行纪律

- 开始实现前，先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务顺序执行，不无声跳步、不合并步、不改变任务目标；每完成一个任务运行该任务的验证。
- Task 6 之后、Task 13 完成之前是**重写窗口期**：工作树上 React 入口与 vanilla 模块并存，客户端 UI 在本机活体上短暂不可用属预期（测试面已隔离，`npm test` 始终全绿是唯一门禁）；期间不重建/不发布 bundle。
- 遇阻塞、重复失败或计划与仓库现实不符（如 jsdom 指针事件构造差异、esbuild 配置细节）：立即停下说明，不猜。
- 当前在 `main` 分支：提交策略为**重写窗口期（Task 6 后至 Task 13 完成）零提交 + 单点提交**——首个提交在 Task 15 Step 6（bundle 已重建、package-shape 守卫已绿后）；开始实现前须用户确认。
- 涉及 `client/` 源码的提交必须同 commit 重建 `lib/client.js`；窗口期内的中间态不进 git（无中间提交即无 bundle 漂移窗口）。
- 全部任务完成后运行最终验证并输出修改摘要。

## 最终验证

- `npm test` 全绿（`fail 0`），用例数 = `VANILLA_BASELINE + 新增用例`（client-dom/client-drag/client-float-prefs/package-shape）。
- `npm run build` 两次 sha256 一致；`lib/client.js` 无 `require("react")`。
- `client/` 目录零 react import；`dsh-stock-kanban:float-position` 键字面量在源与 bundle 在位。
- 冻结面机器断言输出 `FROZEN_CLEAN`（Task 1 记录的 `BASE_REF` 对照 `src/`、`data/`、`locale/`、`cordis.patch.yml`、`scripts/probe-markets.mjs` 零改动）。
- 活体冒烟六项观察条件全部命中并记录于 `docs/verification.md` §12.10。
- `git status` 干净（Task 17 Step 6 docs-only 收尾提交后 `git status --porcelain` 输出为空）。

## 审阅 Checkpoint

- 计划正文结束。审阅通过前不进入实现。
