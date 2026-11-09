# 胶囊嵌入协议落地与胶囊组合并（计划 B：qw 访客侧 + sk 宿主侧）实施计划

## 目标

- 实现 CEP v1（`docs/interop/capsule-embed-protocol.md`，规范性依据，事件名/时序/降级矩阵逐字遵守）双端：
  - **Phase G（@iasiv5/dsh-quota-watch，访客侧，先行）**：`src/client/embed.mjs` 簇（探测应答／只藏 pill 不藏 host／锚定开面板／嵌入态停轮询链／心跳丢失自恢复），测试面齐备后发版 v0.1.38（OIDC）并升级本机安装。
  - **Phase S（dsh-stock-kanban，宿主侧）**：`client/quota-embed.mjs`（DOM 探测+MutationObserver／握手／engage-heartbeat-disengage 生命周期／overview 拉取与 quota pill 渲染／降级矩阵）+ 拖拽手势共享化 + 「合并显示 quota」设置 + 双插件活体 E2E。
- 独立性保证：任一侧单独上线均安全（降级矩阵：旧版/未装 → 共存不隐藏）。

## 架构快照

- **访客侧（qw）**：新簇 `src/client/embed.mjs` 仿 `createResetCards` 有状态工厂惯例（自有状态+窄注入+直测）；接线三处最小侵入点（侦察已锚定）：① 藏 pill = `embedded` 状态位并入 `syncFloatVisibility`（`surface.hidden` 全仓唯一写入位，client.mjs:595-598）；② 停轮询 = 暂停位进 poll 再武装条件（client.mjs:1419 finally）**与** `startPolling` guard（只调 `stopPolling` 无效——在飞 GET 落地即复活链）；③ `open-panel {anchor}` → `openOverview(合成锚)`：合成对象满足 placePanel 消费面（`.isConnected` 真 + `.getBoundingClientRect()` 返回传入 rect；`anchorFromEl(el)=()=>el` 恰好兼容，client.mjs:1117/1120-1132/1137-1145）。
- **宿主侧（sk）**：新模块 `client/quota-embed.mjs`（detectGuest/握手/生命周期/拉取渲染/降级矩阵，纯客户端）；接线点 main.mjs renderAll（:81-82 旁并列 update）与 dispose（capsule.dispose :118 后）；quota pill 追加进既有 `.skc-stack`（main.mjs:41-43 缝）。**拖拽共享化**：capsule.mjs 手势段（:147-239）抽为 `attachFloatDrag({el, host, doc, win, storage, onTap})` 模块级导出——现状监听绑 pill 自身（:263），不抽取则「抓 quota pill 拖不动组」；两 pill 复用同一管线（拖=移动 host、tap=各自点击语义、drag 后 suppressNextClick）。
- **数据通道**：宿主 document-relative `getJSON` 直拉 `api/dsh-quota-watch/overview`（qw 同款拉法，<base href> 安全）；404 → 藏段+60s 慢重试；传输错误 → 保留上次渲染+30s（与访客自身「transport error 保留上次快照」语义一致，spec §5 的细化）。
- **视觉**：quota pill = `skc-capsule skc-capsule--quota`（解剖继承 + 覆写 `cursor:pointer`）；warn(>80≤95)/danger(>95) 阈值色 + pulse(>95) 动画全部净新增，pulse 必须在既有 `@media (prefers-reduced-motion: no-preference)` 守卫块内（styles.mjs:168-173）。

## 全局约束

- **qw 侧**：外部接口冻结（ADR 0007：mountQuotaCard options bag、dispose 契约、`./client` 导出不变；`inject=['slots']` 不动）；dependencies 零 `@deepseek-ai/*`；动 `src/client.mjs` 的提交同笔重建 `lib/client.js`（CI `git diff --exit-code`）；版本三处同步（package.json + package-lock 两字段）+ `chore(release): v0.1.38` 单独一笔；无 CHANGELOG（发版史走 git log）。
- **事件载荷红线（spec §8）**：detail 只含 rect/flag/版本——无凭据、无配额数据、无宿主内部信息。
- **sk 侧**：冻结面零改动（`src/`、`data/`、`locale/`、`cordis.patch.yml`、`scripts/probe-markets.mjs`——quota 拉取是客户端 fetch，**不新增任何服务端路由**）；零运行时 npm 依赖；i18n 新键 zh/en 双侧同加（DICT_KEYS deepEqual 守卫）+ 客户端禁硬编码 CJK；FLOAT_STYLE_TEXT 既有逐字断言串（client-dom.test.mjs:31-60）只可追加规则不可改动。
- **外部动作门（执行到点必须先请示主人，不得自决）**：① qw tag/push/publish（G6）；② `dshm_upgrade @iasiv5/dsh-quota-watch`（G7）；③ 任何宿主操作（禁重启；plugin manager 停/启也须请示）。
- **发版纪律**（agent-ops README「发版与 npm 轮询」+ developers.md）：tag 窗口内绝不重推；publish 绿 ≠ 上架，一律 registry 直查转正为准（`--registry=https://registry.npmjs.org`，staged 17-59 分钟，`01_docs/dsh-intall-know-how/tools/release-monitor.sh` 两阶段监视）；联网 npm 带 `npm_config_cache=/home/ubuntu/workspace/.npm-cache`；长命令 tee 必须 `set -o pipefail`；git user.email 须核准值。
- Node >= 20；node:test 框架；两仓测试基线开工亲跑记录。

## 输入工件

- `docs/interop/capsule-embed-protocol.md`（CEP v1，本仓）——事件表/时序/降级矩阵/版本策略的单一事实源。
- `docs/adr/0002-quota-embed-host-side-capsule-group.md`（sk）、`dsh-quota-watch/docs/adr/0008-capsule-embed-protocol.md`（qw）。
- 双仓侦察报告（2026-11-09，锚点已录入本计划各任务）：qw 接线三最小侵入点+发版仪式；sk 终态锚点+测试样板。

## 文件结构与职责

**Phase G（/home/ubuntu/workspace/dsh-quota-watch）**
- Create: `src/client/embed.mjs` — 访客侧协议簇（事件监听/心跳超时/嵌入状态机）
- Create: `tests/client-embed.test.mjs` — 簇直测（fake win/dispatch/timer 注入）+ 真实 mount 集成
- Modify: `src/client.mjs` — 三处接线（syncFloatVisibility 暂停位、poll 再武装/startPolling guard、openOverview 合成锚）+ 装配/ dispose（resetCards.dispose L1770 旁）
- Modify: `tests/client.test.mjs` — 集成组（CustomEvent 首开模式）
- Modify: `tests/package-shape.test.mjs` — EMBED_GUEST_VERSION 与 package.json version 同步断言
- Modify: `package.json`、`package-lock.json`、`lib/client.js`（发版三处同步+重建，G5/G6）

**Phase S（/home/ubuntu/workspace/dsh-stock-kanban）**
- Create: `client/quota-embed.mjs` — 宿主侧模块（检测/握手/生命周期/拉取渲染/降级矩阵）
- Modify: `client/capsule.mjs` — 手势段抽为 `attachFloatDrag` 共享导出（行为不变）
- Modify: `client/main.mjs` — quotaEmbed 装配（renderAll 并列/dispose 挂点）
- Modify: `client/panel.mjs` — footer「合并显示 quota」按钮（makeFooterButton，仅能力检测到时渲染）
- Modify: `client/store.mjs` — quotaMerge 四件套（DEFAULT_UI/UI_PERSIST_KEYS/setQuotaMerge/导出）
- Modify: `client/i18n.mjs` — quota.* 新键 zh/en
- Modify: `client/styles.mjs` — `--quota` 覆写/warn/danger 色/pulse（守卫块内）
- Create/Modify: `tests/client-dom.test.mjs`（quota-embed 组+组拖拽组）或新文件 `tests/client-quota-embed.test.mjs`
- Modify: `GLOSSARY.md`、`README.md`、`docs/verification.md`（§12.11）、`docs/reports/2026-11-09-capsule-parity-matrix.md`（联动预留节转已实现）

## 任务清单

### Task G1: qw 基线确认

- 目标：记录访客侧测试基线与工作树状态。
- 接口契约：Consumes 无；Produces `QW_BASELINE_PASS`。
- 验证范围：npm test 全绿记录。

- [ ] Step 1: 基线
  - Run: `cd /home/ubuntu/workspace/dsh-quota-watch && git status --porcelain && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 工作树空；`fail 0`，记录 pass 数为 `QW_BASELINE_PASS`。

### Task G2: embed.mjs 簇 + 直测

- 目标：访客侧协议状态机独立成簇，直测全绿。
- 接口契约：
  - Consumes: 无（纯新簇）。
  - Produces: `src/client/embed.mjs` 导出 `EMBED_PROTOCOL_VERSION = 1`、`EMBED_CAPABILITIES = ["hide-pill", "anchored-panel", "poll-pause"]`、`EMBED_GUEST_VERSION = "<与 package.json 同步>"`、`createEmbed({ win, onEmbeddedChange, onOpenPanel, heartbeatTimeoutMs = 15000 })` → `{ dispose(), isEmbedded() }`。行为：① 监听 win **五**事件（composed 冒泡 namespace `dsh-quota-watch:*`）：`embed-probe`、`embed-engage`、`embed-heartbeat`、`embed-disengage`、`open-panel`；② probe → 同步派发 `embed-capabilities`（detail `{v:1, capabilities, guestVersion}`）；③ engage → 置 embedded、`onEmbeddedChange(true)`、起心跳看门狗（每收到 heartbeat 重置；`heartbeatTimeoutMs` 无 heartbeat 即 `onEmbeddedChange(false)` 自恢复+清状态）；④ disengage → 立即 `onEmbeddedChange(false)`；⑤ open-panel(detail.anchor) → `onOpenPanel(anchor)`（原样透传 rect 对象）；⑥ dispose → 移除全部监听+清看门狗。
- 验证范围：`tests/client-embed.test.mjs` 直测全绿；全量回归绿。

- [ ] Step 1: 写直测（先红）：probe→capabilities 应答（断言 detail 三字段）；engage→onEmbeddedChange(true)；heartbeat 后 heartbeatTimeoutMs 内不恢复、超时后 onEmbeddedChange(false)（参数注入缩短到 50ms）；disengage 立即恢复；open-panel 透传 rect；dispose 后事件全不应答；isEmbedded 状态读数。
- [ ] Step 2: 确认红。Run: `node --test tests/client-embed.test.mjs 2>&1 | tail -3`
- [ ] Step 3: 实现簇（纯 win 注入，无 DOM 依赖；CustomEvent 构造用 `win.CustomEvent`）。
- [ ] Step 4: 确认绿+全量回归。Run: `node --test tests/client-embed.test.mjs 2>&1 | tail -3 && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

### Task G3: mountQuotaCard 三处接线

- 目标：embed 簇接入真实挂载，外部接口零变化。
- 接口契约：
  - Consumes: Task G2 簇接口；client.mjs 既有锚点（syncFloatVisibility :595-598、poll finally :1413-1425、startPolling :1621-1624、openOverview :1640-1645、装配带 :809-818、dispose 带 :1767-1793）。
  - Produces: ① `embedded` 状态并入 `syncFloatVisibility`（`surface.hidden = dataHidden || embedded`；floatHost.hidden 仍只随 dataHidden——**host 永不因 embed 隐藏**）；② poll 再武装条件与 startPolling guard 增 `&& !embedded`（嵌入态停链）；③ `onOpenPanel(rect)` → **复刻 `onSurfaceClick` 的 toggle 语义**（client.mjs:1244-1252）：`openKey !== undefined && !panel.hidden` → 关面板（`openKey = undefined; syncPop()`）；否则 → `openOverview(合成锚)`（`const a = { isConnected: true, getBoundingClientRect: () => rect }`，经既有 `anchorFromEl(a)` 装入 lastAnchor）——spec §4「panel open → the same click path closes it」；④ `onEmbeddedChange` 翻转时：true → 停链（stopPolling）+ 立即 `syncFloatVisibility()`；false → `syncFloatVisibility()` + `startPolling()`（可见时）；⑤ 装配于 resetCards 旁、dispose 于 `resetCards.dispose()` 行旁（清 win 监听+看门狗）。
- 验证范围：新增集成组绿；全量回归绿；`git diff --stat` 确认 options bag/导出面零改动。

- [ ] Step 1: 写集成组（先红，tests/client.test.mjs 追加或 client-embed.test.mjs 集成段，走真实 mount + fetch 桩）：probe → capabilities；engage → `.dqw-capsule` hidden 而 `[data-dsh-quota-watch-float]` host 非 hidden；嵌入态下 fetch 桩不再收到 overview 请求（可见性 hidden 同款驱动法，client.test.mjs:2028-2050 模式）；open-panel {left:100,top:200,width:150,height:26} → `panel.hidden === false`；**再派发一次 open-panel → `panel.hidden === true`（toggle 语义：已开则关）**；disengage → surface 恢复可见 + 轮询恢复。
- [ ] Step 2: 确认红。Run: `node --test tests/client-embed.test.mjs 2>&1 | tail -3`
- [ ] Step 3: 三处接线实现（锚点行号为准，最小侵入）。
- [ ] Step 4: 确认绿+全量回归+外部接口零变化检查
  - Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)" && git diff --stat`
  - Expected: `fail 0`；diff 仅涉及 `src/client.mjs`、`src/client/embed.mjs`、`tests/`、`lib/client.js`——mountQuotaCard options bag 与模块导出面（name/inject/COPY/mountQuotaCard/apply）零改动。

### Task G4: package-shape 版本同步断言 + 构建重建 + 提交

- 目标：EMBED_GUEST_VERSION 防漂移断言；bundle 同笔重建；访客侧代码提交。
- 接口契约：Consumes G2/G3；Produces 提交点（含重建 lib/client.js）。
- 验证范围：package-shape 绿；两次构建一致；全量绿。

- [ ] Step 1: package-shape 追加断言（先红）：`EMBED_GUEST_VERSION === package.json version`。
- [ ] Step 2: 实现（若 G2 用了字面量，改为断言驱动的同步——以 package.json 为准源）。
- [ ] Step 3: `npm run build` 两次 sha256 一致；`npm test` 全绿。
- [ ] Step 4: 提交 `feat(client): CEP v1 访客侧——嵌入协议簇与三处接线（ADR 0008）`。

### Task G5: 版本同步与 release 提交（**外部动作门前最后一步**）

- 目标：v0.1.38 三处同步 + chore(release) 提交；tag/push/publish 留待主人批准。
- 验证范围：三处版本一致；CI 本地等价检查绿。

- [ ] Step 1: 版本三处同步（package.json + package-lock 两字段）。
- [ ] Step 2: `npm test && npm run build && git diff --exit-code lib/client.js && npm run security:check`（本地等价 CI）。
- [ ] Step 3: 提交 `chore(release): v0.1.38`。
- [ ] Step 4: 🚪 **停：向主人请示 tag/push/publish**（批准则：CI 等绿——`gh run list --branch main`，gh 不可用/未登录时备选判据：GitHub Actions web 状态页绿或 release-monitor.sh 的 run 状态输出 → `git tag v0.1.38 && git push origin main && git push origin v0.1.38` → publish.yml OIDC → release-monitor.sh 轮询 registry 转正 → 🚪再次请示后 dshm_upgrade 本机升级 + 活体独立行为回归）。

### Task S1: sk 基线确认

- [ ] Step 1: Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && git status --porcelain && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: 树空；125 pass / 0 fail（若不符先停下报告）。
- [ ] Step 2: 记录冻结面基线引用
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && git rev-parse HEAD | tee /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref-plan-b.txt`
  - Expected: 40 位 SHA，记为 `BASE_REF_B`（S7 冻结面断言用；沿计划 A Task 1 Step 2 模式落 workspace 持久 scratch）。

### Task S2: client/quota-embed.mjs 宿主模块 + 直测

- 目标：检测/握手/生命周期/拉取渲染/降级矩阵独立成模块。
- 接口契约：
  - Consumes: `client/api.mjs` 的 fetch 风格（但不复用 getJSON 抛错路径——404 语义特殊）；`client/i18n.mjs` t()。
  - Produces: `createQuotaEmbed({ doc, win, storage, stack, host, fetchImpl = fetch, probeTimeoutMs = 500, pollMs = 30000, retryMs = 60000, onCapabilityChange })` → `{ el, update(snapshot), setEnabled(bool), dispose() }`。行为：① 初始 `detectGuest()`（`doc.querySelector('[data-dsh-quota-watch-float]')`）+ body `MutationObserver({childList:true})` 监听出现/消失；② 元素出现 → 派发 `embed-probe`（detail `{v:1, host:"dsh-stock-kanban"}`）等回复 `probeTimeoutMs`：收到 capabilities ⊇ {hide-pill, anchored-panel} → `onCapabilityChange(true)`；无回复 → 共存不隐藏（降级矩阵行 2）；③ 能力在 + `ui.quotaMerge` → 派发 `engage`、起 5s heartbeat、开始拉 overview（document-relative）；④ 拉取循环：ok → 渲染（含 warn/danger/pulse 类）；404 → 藏 pill + `retryMs` 慢重试；传输错误 → 保留上次渲染 + `pollMs`；⑤ pill 点击（tap，非拖）→ 派发 `open-panel`，anchor = quota pill 自身 `getBoundingClientRect()`（零值时 fallback host rect）；⑥ `setEnabled(false)` → disengage + 移除 pill + 停 heartbeat；再 true → 重新握手；⑦ guest 元素消失（禁用/HMR）→ 同 disengage；⑧ dispose 全清（observer/timers/listeners/pill）。
- 验证范围：直测全绿（fake win dispatch + fetch 桩样板 client-dom.test.mjs:385-398）；全量回归绿。

- [ ] Step 1: 写直测（先红）覆盖降级矩阵五行 + 404/传输错误分支 + open-panel anchor 透传 + setEnabled 往返。
- [ ] Step 2: 确认红。Run: `node --test tests/client-quota-embed.test.mjs 2>&1 | tail -3`
- [ ] Step 3: 实现模块（新文件 tests/client-quota-embed.test.mjs；渲染用 `skc-capsule skc-capsule--quota` + `skc-qwarn`/`skc-qdanger`/`skc-qpulse` 类；**数值段沿用胶囊解剖的 tabular-nums**——spec §9「tabular numerals」，复用既有 .skc-capsule 数值排版或 `--quota` 下显式声明）。
- [ ] Step 4: 确认绿+全量回归。

### Task S3: 拖拽手势共享化（capsule.mjs 行为不变重构）

- 目标：`attachFloatDrag` 导出，两 pill 复用；「抓任一 pill 拖动整组」成立。
- 接口契约：
  - Consumes: capsule.mjs 手势段（:147-239 现状锚点）。
  - Produces: capsule.mjs 新导出 `attachFloatDrag({ el, host, doc, win, storage, onTap })` → `{ dispose() }`——行为与现 capsule 拖拽逐语义一致（slop/grab/transform/释放钳位落盘/cancel 复位/suppressNextClick），`onTap` 仅在非拖动 tap 时回调；createCapsule 内部改调它（**既有胶囊拖拽用例逐字不改须全绿**）。
- 验证范围：全量回归绿（capsule 组零改绿）；手动确认 quota pill 绑定同款。

- [ ] Step 1: 抽取重构（先跑既有用例确认基线绿）
  - Run: `npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: `fail 0`（重构前基线）。
- [ ] Step 2: 手势段抽为 `attachFloatDrag`，createCapsule 内部改调，capsule 既有拖拽用例零改动
  - Run: `node --test tests/client-dom.test.mjs 2>&1 | tail -3 && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: capsule 拖拽用例未改动且全绿；全量 `fail 0`。
- [ ] Step 3: quota pill 绑定 `attachFloatDrag`（onTap=派发 open-panel；拖动移动 host 落同一位置记忆键）
  - Run: `node --test tests/client-quota-embed.test.mjs 2>&1 | tail -3`
  - Expected: 组拖动用例（firePointer 于 quota pill → host 位移）绿。

### Task S4: store 四件套 + footer 开关 + i18n + 样式

- 目标：「合并显示 quota」设置闭环 + 视觉净新增。
- 接口契约：
  - Consumes: S2 `onCapabilityChange`；store 模式（holdingsOnly 四件套）；footer `makeFooterButton`（panel.mjs:176-185）。
  - Produces: ① store：`DEFAULT_UI.quotaMerge = true` + `UI_PERSIST_KEYS` 加 `quotaMerge` + `setQuotaMerge(v)` + 导出；② panel footer 按钮 `dataset.action="quota-merge"`，**仅 `onCapabilityChange(true)` 后渲染**（能力消失时移除），label 随状态（active 态样式类）；③ i18n 键：`quota.merge`、`quota.merge.on`、`quota.merge.off`、`quota.stale`（zh/en 双侧）；④ styles：`.skc-capsule--quota{cursor:pointer}`、`.skc-qwarn`/`.skc-qdanger`（`var(--dsw-alias-label-warning, #d29922)`/`var(--dsw-alias-label-danger, #c93c3c)`，对齐 qw 同名回退值）、`@keyframes skc-qpulse` + `.skc-qpulse` **置于既有 reduced-motion 守卫块内**；只追加不改既有断言串。
- 验证范围：i18n 守卫绿；全量回归绿；样式断言（新组：--quota cursor、pulse 在守卫块内、warn/danger 色）。

- [ ] Step 1: 写用例（先红）：store persist 白名单含 quotaMerge；footer 按钮随能力出现/消失；t("quota.merge") zh/en 均非键名回退。
- [ ] Step 2: 实现四件（i18n 双侧、样式追加）。
- [ ] Step 3: 确认绿+全量回归（含 i18n.test.mjs DICT_KEYS 对齐）。

### Task S5: main.mjs 装配 + jsdom 集成组

- 目标：宿主侧全链在真实 mount 下可测。
- 接口契约：
  - Consumes: S2/S3/S4 全部接口；main.mjs 锚点（renderAll :80-92、装配 :57-75、dispose :115-125）。
  - Produces: main.mjs 装配 `quotaEmbed = createQuotaEmbed({…stack, host…})`；renderAll 并列 `quotaEmbed.update(snapshot)`（quotaMerge 经 snapshot.ui 传递生效）；dispose 挂 capsule.dispose 后。
- 验证范围：集成组绿；全量回归绿。

- [ ] Step 1: 写集成组（先红）：模拟 guest（h.window CustomEvent 派发 capabilities 回复）→ stack 内出现 quota pill + heartbeat 派发可见（spy window.dispatchEvent 计数）；disengage → pill 移除；quotaMerge off（seed ui:v1）→ 不 engage；firePointer 拖 quota pill → host 位移（组拖动）。
- [ ] Step 2: 装配实现。
- [ ] Step 3: 确认绿+全量回归；提交 `feat(client): CEP v1 宿主侧——quota 嵌入与胶囊组（ADR 0002）`（bundle 同笔重建）。

### Task S6: 文档收口

- [ ] GLOSSARY：胶囊组/嵌入协议条目去「计划 B 落地」过渡标注、浮动壳标注清理；
- [ ] README：联动节（合并行为/设置/降级说明/兼容性「quota-watch ≥0.1.38」）；
- [ ] verification.md §12.11（协议双端测试与 E2E 证据）；
- [ ] 对齐矩阵「联动预留」节改「已实现」并指证据。
- [ ] 验证：grep 各锚点 ≥1 + npm test 全绿；docs-only 提交。

### Task S7: 双插件活体 E2E + 终验

- 前置：G5 的 publish 与 dshm_upgrade 均已获主人批准并完成（qw 0.1.38 在本机生效）。
- [ ] Step 1: CDP 活体（沿 §12.10 流程）：合并组双 pill 渲染真实 GLM/Copilot 数据（warn/danger 阈值类）；点击 quota pill → qw 面板锚定组旁打开、再点关；拖 stock pill 与拖 quota pill 均移动整组且位置记忆同一键；footer 开关 off → qw 胶囊恢复独立显示 + 组内 quota pill 消失；on → 重新合并；dshm_toggle 停 qw（🚪请示后）→ quota pill 消失（MutationObserver 路径）；**恢复：🚪再次请示 → dshm_toggle 启 qw → 独立胶囊/面板/侧栏卡回归正常 + 重新握手合并**。
- [ ] Step 2: 终验四件：全量 npm test、两次构建指纹一致、冻结面 FROZEN_CLEAN（`BASE_REF_B`，S1 Step 2 落盘的 sk-base-ref-plan-b.txt，断言命令沿计划 A Task 17 Step 3 模式）、`git status` 干净。
- [ ] Step 3: 汇总证据入 §12.11；向 Lead 交最终汇报（Lead 终审后向主人交总账）。

## 执行纪律

- 开始前批判性复查计划；逐任务验证；遇阻立即停报告，不改 spec 不猜（spec 变更须回 Lead 裁决并同步 CEP 文档）。
- **两个外部动作门（G5 Step 4 的 tag/push/publish 与 dshm_upgrade、S7 Step 1 的 dshm_toggle）必须主人批准**；窗口外提交纪律：G 阶段按 qw 惯例（bundle 同笔），S 阶段每任务簇自然提交点。
- qw 侧改动严守 ADR 0007 冻结面（options bag/导出/dispose 契约）；sk 侧冻结面零改动。
- 事件 detail 只含 rect/flag/版本；不新增服务端路由；不碰宿主。
- 全部一次性探针输出 tee 落盘（`set -o pipefail`）。

## 最终验证

- qw：`npm test` 全绿（含 client-embed 直测+集成、package-shape 版本同步断言）；CI 等价链绿；v0.1.38 registry 转正；本机 dsh-quota-watch 升级后独立行为回归（胶囊/面板/侧栏卡如常）。
- sk：`npm test` 全绿；构建幂等；FROZEN_CLEAN；活体 E2E 六观察点（合并渲染/分区点击/双路组拖动/开关往返/停用消失）全中并取证 §12.11。
- 双端事件名/detail/时序与 CEP v1 逐字一致（评审将抽查）。

## 审阅 Checkpoint

- 计划正文结束。审阅通过前不进入实现。
