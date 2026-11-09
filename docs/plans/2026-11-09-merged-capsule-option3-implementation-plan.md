# 合并胶囊（方案③）实施计划 v4：单胶囊双段·迷你条（含 qw 竞态修复与 stock 拆除通知）

## 目标

- 按 ADR 0003（`docs/adr/0003-merged-capsule-single-pill-option3.md`）把股票胶囊与额度段合并为一个宿主胶囊：左段股票，中间 1px 分隔线，右段双迷你条（GLM 上、Copilot 下）。
- 面板水平推出（优先右侧，放不下左侧，两侧都放不下回退垂直），顶边与胶囊对齐；窄屏压缩股票名称；待处理兑换时额度段保留琥珀点。
- qw 只修一处竞态：外点关闭之后，同一手势内的 `open-panel` 不重开（500 毫秒窗口，B32）。
- stock 补两处：`open-panel` 锚点补 `right`、`bottom`；拆除时补发 `embed-disengage`。
- stock 修一处现存缺陷：面板开着时再点股票胶囊，最终关闭（Q14，已由主人确认）。
- 不发版，不调用 dshm，不重启任何宿主进程。

## 架构快照

- 额度段是股票胶囊的子节点（`div[data-seg="quota"]`），不是 `stack` 上的独立节点。`quota-embed` 的挂载目标是胶囊元素。
- 胶囊内部两段：`div[data-seg="stock"]` 包裹股票内容；`div[data-seg="quota"]` 为额度段。
- 指针分流：胶囊的 `pointerdown` 记录 `event.target`；未拖动的 `pointerup` 只读这个记录值，不读 `pointerup` 自己的 target（捕获与 open shadow root 会改写后者，已实测）。
- 额度段的显示由纯函数 `quotaSegmentModel` 决定，DOM 只负责落地。
- 待处理判定与 qw 同规则：`manualOutcome !== undefined || manualOutcomeError !== undefined`。待处理时琥珀点始终显示，与条共存。
- stale 输入：provider 条目的 `status === 'stale'`（qw 保留上次良好数据，host.mjs 约 338、364 行）。
- 面板水平定位取所点分区的左右边，顶边取胶囊顶边，再钳位到视口内（ADR 第 5 条）。
- 嵌入协议（CEP v1）事件名与 detail 结构不变；锚点多两个字段；拆除时补发 disengage。
- 面板可见性只由局部 `open` 决定，因此 `update` 必须把 store 的 `panelOpen === false` 同步到 `open`（S6b）。

## 全局约束

- **sk**：冻结面零改动——`src/`、`data/`、`locale/`、`cordis.patch.yml`、`scripts/probe-markets.mjs` 不动。零运行时依赖。i18n 新键 zh/en 双侧同加；客户端源码字符串字面量禁止 CJK（`tests/i18n.test.mjs` 守卫）。
- **显式断言改动（B26、B37 授权）**：`client/styles.mjs` 的 `FLOAT_STYLE_TEXT` 只追加，唯一例外是危险色规则（`tests/client-dom.test.mjs` 约第 81 行整条替换，见 S4b）；列表与详情的 Ⓑ/Ⓢ 文本按 S4b 改为 B/S；`quota.merge.on/off` 的「胶囊组」文案按 S11 改为「合并胶囊」；`tests/i18n.test.mjs` 的 quota 键列表显式加入 `quota.outcome`（S11）。其余既有逐字断言串不动。
- **qw**：ADR 0007 冻结面不动（`mountQuotaCard` options bag、dispose 契约、`./client` 导出、`inject=['slots']`）。`dependencies` 零 `@deepseek-ai/*`。动 `src/client.mjs` 的提交须同笔重建 `lib/client.js`。不改版本号。
- **红灯判据纪律（P-30）**：每个红步写明精确用例名与精确计数。计数不符即停下报告，不以「fail 0」代替。
- **外部动作门**（主人批准前不执行）：Q5（qw 热部署）、S14（活体复核）、豁免粒度（Q15）。禁止 tag、push、publish；禁止 dshm_* 与 plugin_manager；禁止重启宿主。
- **输出目录**：所有 tee 日志写入 `/home/ubuntu/workspace/.dsh-research/merged-capsule-impl/`，每个命令前 `mkdir -p`。管道命令一律 `set -o pipefail`，判据统一用 `grep -E "^ℹ (tests|pass|fail)"`，禁用 `tail -4`。
- **测试命令形式**：选项在前、文件在后：`node --test --test-name-pattern="…" tests/x.test.mjs`。

## 输入工件

- `docs/adr/0003-merged-capsule-single-pill-option3.md`（sk，第 9 条含 Q14 的取舍，待 S6b 同步更新）。
- `docs/interop/capsule-embed-protocol.md`（CEP v1，待 S13 更新）。
- 代码锚点（执行时先亲核，行号以 HEAD 为准）：
  - sk `client/capsule.mjs`：attachFloatDrag 第 35 行；pointerdown 绑定约 107 行；未拖动 pointerup 调用 onTap 约 138–140 行；suppressNextClick 约 149 行；createCapsule 第 203 行；胶囊根属性 `data-dsh-stock-kanban-capsule` 第 213 行；标记 Ⓑ/Ⓢ 第 220、223 行；attachFloatDrag 绑定 onTap 第 309 行；键盘 toggle 约 311–316 行。
  - sk `client/panel.mjs`：外点关闭 `onDocPointerDown` 第 127–135 行（composedPath 判定第 130 行）；render 中 `el.hidden = !open` 第 242 行；openFrom 约 299–303 行；close 约 308 行；isOpen 第 313 行；update 第 315 行，`snapshot = next` 第 317 行，`render()` 第 322 行。
  - sk `client/quota-embed.mjs`：dispatch 第 89 行；额度段 DOM 创建第 69–87 行；stack.append(el) 第 175 行；stopEngage 第 182 行（无 disposed 守卫）；dispose 第 288 行（当前 stopEngage(false)）；attachFloatDrag(onTap: onTapOpen) 第 286 行；dragCtl.dispose() 第 294 行。
  - sk `client/main.mjs`：capsule 创建第 68 行；stack.append(capsule.el) 第 76 行；createQuotaEmbed 第 82 行；renderAll 的 quotaEmbed.update 第 97 行；panel.openFrom 第 105 行；quotaEmbed.dispose() 第 135 行。
  - qw `src/client.mjs`：onOpenPanel 第 839 行；onDocPointerDown 第 1743 行；`doc.addEventListener('pointerdown', …, true)` 第 1800 行；`pendingOutcome` 判定第 1231 行；有限数判定第 1240 行；placePanel 水平分支约 1155–1180 行。
  - qw `src/host.mjs`：providers 条目总是含 glm 与 copilot 两条（约 212 行）；`manualOutcomeView()` 有待处理记录时注入 manualOutcome（约 572 行）；stale 保留上次良好数据（约 338、364 行）。

## 文件结构与职责

**qw（/home/ubuntu/workspace/dsh-quota-watch）**
- Modify: `src/client.mjs`（外点关闭记录时间；`onOpenPanel` 窗口内忽略）。
- Modify: `tests/client.test.mjs`（竞态用例）。
- Modify（构建产物）: `lib/client.js`。

**sk（/home/ubuntu/workspace/dsh-stock-kanban）**
- Create: `client/quota-segment.mjs`（额度段纯模型）；`tests/client-quota-segment.test.mjs`。
- Modify: `client/quota-embed.mjs`（挂载目标、段 DOM、锚点构造、拆除、待处理与 stale 输入、分流回调）。
- Modify: `client/capsule.mjs`（数据段属性、downTarget 分流、键盘锚点）。
- Modify: `client/panel.mjs`（外点豁免、`update` 同步、水平定位与顶边对齐、滑入类）。
- Modify: `client/main.mjs`（装配、锚点传递）。
- Modify: `client/styles.mjs`（仅追加；危险色例外）。
- Modify: `client/i18n.mjs`（`quota.outcome`）。
- Modify: `tests/client-dom.test.mjs`、`tests/client-quota-embed.test.mjs`、`tests/client-quota-integration.test.mjs`、`tests/i18n.test.mjs`。
- Modify（文档）: `docs/interop/capsule-embed-protocol.md`、`GLOSSARY.md`、`README.md`、`docs/tech-notes.md`、`docs/reports/2026-11-09-capsule-parity-matrix.md`、`docs/verification.md`（§12.12）、`docs/adr/0003-*`。
- Modify（构建产物）: `lib/client.js`。

## 任务清单

### Phase Q：qw 竞态修复

#### Task Q1：qw 基线

- 目标：记录访客侧测试基线。
- 接口契约：Produces `QW_BASE_PASS`（预期 264，以实测为准）。
- 验证范围：工作树干净；全量全绿。

- [ ] Step 1：基线
  - Run: `mkdir -p /home/ubuntu/workspace/.dsh-research/merged-capsule-impl && cd /home/ubuntu/workspace/dsh-quota-watch && git status --porcelain && set -o pipefail && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/qw-q1-baseline.log | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 工作树无输出；`ℹ fail 0`；`ℹ pass 264`。

#### Task Q2：竞态用例（先红）

- 目标：钉死「外点关闭后同一手势的 open-panel 不重开」。
- 涉及文件：Modify `tests/client.test.mjs`。
- 接口契约：Consumes 既有 mount 夹具。Produces 一条精确命名的失败用例。

- [ ] Step 1：写用例
  - Change: 新增单条用例，名字精确为「同一手势：外点关闭后的 open-panel 不重开」。流程：(a) 打开面板；(b) 在 `document.body` 上派发 pointerdown（目标为面板外元素）→ 面板关闭；(c) `mock.method(Date, 'now')` 推进 100 毫秒后派发 `open-panel` → 期望 `panel.hidden === true`；(d) 推进到距 (b) 超过 500 毫秒后再派发 → 期望 `panel.hidden === false`。
  - Run: `set -o pipefail && node --test --test-name-pattern="同一手势" tests/client.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 1`、`ℹ pass 0`、`ℹ fail 1`（断言 (c) 失败：当前实现重开面板）。

#### Task Q3：实现窗口判定

- 目标：外点关闭时记录时间；窗口内的 open-panel 视为关闭，不重开。
- 涉及文件：Modify `src/client.mjs`（`onDocPointerDown` 约第 1743 行；`onOpenPanel` 第 839 行）。
- 接口契约：常量 `OUTSIDE_CLOSE_GESTURE_MS = 500`；不改 options bag 与导出。

- [ ] Step 1：实现
  - Change: 模块级 `let lastOutsideCloseAt = 0`。在 `onDocPointerDown` 真正关闭面板的分支记录 `lastOutsideCloseAt = Date.now()`。在 `onOpenPanel(rect)` 开头、`suppressNextClick` 判断之后加入：若 `lastOutsideCloseAt !== 0 && Date.now() - lastOutsideCloseAt < OUTSIDE_CLOSE_GESTURE_MS`，则清零并返回。
- [ ] Step 2：转绿
  - Run: `set -o pipefail && node --test --test-name-pattern="同一手势" tests/client.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/qw-q3-full.log | grep -E "^ℹ (pass|fail)"`
  - Expected: 精确 `ℹ tests 1`、`ℹ pass 1`、`ℹ fail 0`；全量 `ℹ fail 0`，`ℹ pass 265`。

#### Task Q4：构建、幂等、提交

- 目标：bundle 同笔重建并幂等；提交修复。
- 接口契约：Produces `QW_BUNDLE_SHA`。

- [ ] Step 1：两次构建
  - Run: `cd /home/ubuntu/workspace/dsh-quota-watch && npm run build >/dev/null && sha256sum lib/client.js && npm run build >/dev/null && sha256sum lib/client.js`
  - Expected: 两行 sha256 完全相同，记为 `QW_BUNDLE_SHA`。
- [ ] Step 2：提交
  - Run: `git add src/client.mjs tests/client.test.mjs lib/client.js && git commit -m "fix(client): 外点关闭后同一手势的 open-panel 不重开（500ms 窗口），修复 stock 额度段再点关闭" && git status --porcelain`
  - Expected: 提交成功；工作树无输出。

#### Task Q5：🚪 热部署（需主人批准）

- 目标：把修复后的 bundle 热部署到线上 profile，不重启、不发版。
- 接口契约：Consumes `QW_BUNDLE_SHA`；Produces 备份路径与线上哈希。

- [ ] Step 1：🚪 向主人请示；未批准则停止。
- [ ] Step 2：备份线上当前文件（新 inode）；写入同目录临时文件；校验哈希等于 `QW_BUNDLE_SHA`；原子 `mv` 替换；校验 pnpm 存储副本未变（与 2026-11-09 热部署相同方法）。
  - Expected: 备份哈希与替换前一致；线上哈希等于 `QW_BUNDLE_SHA`；存储副本哈希不变。

### Phase S：stock 合并胶囊

#### Task S1：基线与冻结面基准

- 目标：记录 sk 基线与冻结面基准。
- 接口契约：Produces `SK_BASE_PASS`（预期 148）与 `BASE_REF_C`（实现开始时的 HEAD）。

- [ ] Step 1：基线
  - Run: `mkdir -p /home/ubuntu/workspace/.dsh-research/merged-capsule-impl && cd /home/ubuntu/workspace/dsh-stock-kanban && git status --porcelain && set -o pipefail && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/sk-s1-baseline.log | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 工作树无输出；`ℹ fail 0`；`ℹ pass 148`。
- [ ] Step 2：记录基准
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && git rev-parse HEAD | tee /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref-plan-c.txt`
  - Expected: 输出 40 位 SHA，记为 `BASE_REF_C`（S12 冻结面断言用）。

#### Task S2：锚点构造与拆除补发 disengage（先红）

- 目标：统一的锚点构造函数产出 `right`、`bottom`；拆除时补发一次 disengage。
- 涉及文件：Modify `client/quota-embed.mjs`（导出 `buildAnchorRect`；`onTapOpen` 改用之；`dispose` 第 288 行改为 `stopEngage(true)`）；Modify `tests/client-quota-embed.test.mjs`。
- 接口契约：Produces `export function buildAnchorRect({left, top, width, height})` → `{left, top, width, height, right: left+width, bottom: top+height}`。`dispose()` 在已 engaged 时恰好派发一次 `embed-disengage`。
- 验证范围：两条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 两条用例，名字精确为「锚点：buildAnchorRect 产出 right 与 bottom」与「拆除：engage 后 dispose 恰好派发一次 embed-disengage」。导入形式：测试文件须以命名空间导入 `import * as qe from "../client/quota-embed.mjs"`，并在用例体内调用 `qe.buildAnchorRect`。不得使用具名导入 `buildAnchorRect`：HEAD 上该导出不存在，会在链接期 SyntaxError，两条用例都不执行，计数变为 1/0/1（已由评审方实测）。
  - Run: `set -o pipefail && node --test --test-name-pattern="锚点：buildAnchorRect|拆除：engage" tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 2`、`ℹ pass 0`、`ℹ fail 2`。
- [ ] Step 2：实现并转绿
  - Change: 导出 `buildAnchorRect`；`onTapOpen` 改用之；`dispose` 中 `stopEngage(false)` 改为 `stopEngage(true)`（`dispatch` 与 `stopEngage` 均无 disposed 守卫，已核实）。
  - Run: 同 Step 1。
  - Expected: `ℹ tests 2`、`ℹ pass 2`、`ℹ fail 0`。

#### Task S3：额度段纯模型（先红）

- 目标：把「显示什么」收敛为纯函数，直测覆盖 ADR 0003 第 3 条。
- 涉及文件：Create `client/quota-segment.mjs`；Create `tests/client-quota-segment.test.mjs`。
- 接口契约：Produces `export function quotaSegmentModel({ glm, copilot, outcomePending })`。输入 `glm`/`copilot` 为 `null` 或 `{percent, stale}`。返回 `{ segment, dot, divider, bars, tooltip }`：
  - `bars`：仅含有数的条，GLM 在前；每条 `{ key, label:'G'|'C', percent, tone, stale }`；`tone`：`percent > 95` 为 `'danger'`，`> 80` 为 `'warn'`，否则 `'normal'`。
  - `dot`：等于 `outcomePending === true`（待处理即显示，与条共存）。
  - `segment`：`bars.length > 0 || dot`。
  - `divider`：等于 `segment`（分隔线随额度段显示，与条数无关）。
  - `tooltip`：与 `bars` 对应的 `{label, percent}` 列表。
  - 「有数」：`percent` 为有限数字；`null` 或非有限值视为无数。
- 验证范围：九条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 九条，名字精确为：「额度模型：只有 GLM 有数，只出一条」、「额度模型：只有 Copilot 有数，只出一条」、「额度模型：两条都有，GLM 在前且有分隔线」、「额度模型：两条都无且无待处理，段不显示」、「额度模型：两条都无但有待处理，段仅含琥珀点」、「额度模型：有数且待处理时琥珀点与条共存」、「额度模型：过期标记保留到条」、「额度模型：阈值 80/81/95/96 的语气边界」、「额度模型：非有限值视为无数」。
  - Run: `set -o pipefail && node --test --test-name-pattern="额度模型：" tests/client-quota-segment.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 模块未建，文件级失败：`ℹ fail 1`，输出含 `Cannot find module`。这是合法红灯来源（模块不存在，非断言级）。
- [ ] Step 2：实现并转绿
  - Change: 按接口实现，纯函数，无 DOM 依赖。
  - Run: 同 Step 1。
  - Expected: `ℹ tests 9`、`ℹ pass 9`、`ℹ fail 0`。

#### Task S4：段的 DOM 渲染（替换文本版）

- 目标：段内渲染双迷你条、单条居中、分隔线、待处理琥珀点、悬停提示、过期变暗。
- 涉及文件：Modify `client/quota-embed.mjs`（删除 `glmSpan`/`copilotSpan`/`sepSpan` 文本段，第 77–87 行及其更新逻辑）；Modify `tests/client-quota-embed.test.mjs`。
- 接口契约：Consumes S3。Produces 段 DOM：`div.skc-qseg[data-seg="quota"]`（`hidden` 由 `segment` 决定）；内含：
  - `div.skc-qseg-bars`，每条 `div.skc-qbar > i.skc-qbar-fill[data-tone][data-key]`，单条时加 `.skc-qseg-single` 居中；
  - `span.skc-qseg-divider`（`hidden` 由 `divider` 决定）；
  - `span.skc-qdot`（`hidden` 由 `dot` 决定，与条共存）；
  - `div.skc-qseg-tip`（悬停文本：一条无分隔符，两条有分隔符）。
  - 过期：有过期条时条 `opacity: .5`，段 `title` 为 `t('quota.stale')`。
- 验证范围：五条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 五条，名字精确为：「段渲染：两条时双条并有分隔线」、「段渲染：单条时带 skc-qseg-single 居中」、「段渲染：只有待处理时仅显示琥珀点」、「段渲染：两条无且无待处理时段隐藏」、「段渲染：过期条变暗并带 title」。段隐藏条的断言写法：`const seg = el.querySelector('[data-seg="quota"]'); assert.ok(!seg || seg.hidden)`（HEAD 上无 data-seg，节点缺席即满足，故该条在 HEAD 上为绿，与 Expected 一致）。
  - Run: `set -o pipefail && node --test --test-name-pattern="段渲染：" tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 5`、`ℹ fail 4`、`ℹ pass 1`（第「段隐藏」条旧版即隐藏，既有行为保持为绿，属预期）。
- [ ] Step 2：实现并转绿
  - Change: `renderSegment(segEl, model)` 只负责落地 DOM，不做判断。
  - Run: 同 Step 1。
  - Expected: `ℹ tests 5`、`ℹ pass 5`、`ℹ fail 0`。

#### Task S4b：字形与颜色规则（B26，先红）

- 目标：额度危险态改琥珀；所有用户可见的圆圈字母 Ⓑ/Ⓢ（胶囊、列表、详情）统一为拉丁 B/S；涨跌色只作用于股价与涨跌幅。
- 涉及文件：Modify `client/styles.mjs`（`.skc-qdanger` 颜色改为 `var(--dsw-alias-label-warning,#d29922)`，危险态以 S9 守卫内的脉冲区分）；Modify `client/capsule.mjs`（第 220、223 行 Ⓑ/Ⓢ 改为 B/S，字重 500）；Modify `client/list.mjs`（第 25、29 行徽章文本 "Ⓑ"、"Ⓢ" 改为 "B"、"S"）；Modify `client/i18n.mjs`（第 84、85 行与 228、229 行的 `detail.buy-target`、`detail.sell-target`：zh「买入目标价（≤ 触发 B，{ccy}）」「卖出目标价（≥ 触发 S，{ccy}）」；en「Buy target (≤ fires B, {ccy})」「Sell target (≥ fires S, {ccy})」；i18n.mjs 豁免 CJK 守卫）；Modify `tests/i18n.test.mjs`（新增用例 5）；Modify `tests/client-dom.test.mjs`（危险色断言整条替换，见下；列表徽章用例位于此文件；其余对 Ⓑ/Ⓢ 的既有断言先 `grep -n "Ⓑ\|Ⓢ" tests/*.mjs` 定位后同步改写）。
- 验证范围：五条精确命名用例；危险色断言整条替换如下（只改数值会失败，必须包括变量名 `label-warning`）：`assert.ok(s.includes(".skc-qdanger{color:var(--dsw-alias-label-warning,#d29922)}"), "danger 色已改琥珀（B26，与 qw 警告色同名回退值）");`，替换原第 81 行 `label-danger,#c93c3c` 断言。

- [ ] Step 1：写用例（先红）
  - Change: 五条，名字精确为：「字形：额度危险态为琥珀（B26）」、「字形：股票标记为拉丁 B/S（B26）」、「字形：涨跌色只作用于股价与涨跌幅（B26）」（第三条为不变量，现状即绿）、「字形：列表买卖徽章为拉丁 B/S（B26）」（tests/client-dom.test.mjs）、「字形：详情目标价文案为拉丁 B/S，zh/en 双侧（B26）」（tests/i18n.test.mjs）。
  - Run: `set -o pipefail && node --test --test-name-pattern="字形：" tests/client-dom.test.mjs tests/i18n.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 5`、`ℹ pass 1`、`ℹ fail 4`（第三条为不变量现即绿；其余四条在 HEAD 上红）。
- [ ] Step 2：实现并转绿
  - Run: 同 Step 1。
  - Expected: `ℹ tests 5`、`ℹ pass 5`、`ℹ fail 0`。

#### Task S5：额度段并入胶囊（挂载目标改为胶囊）

- 目标：额度段成为胶囊子节点；撤除段内的第二个 drag 控制器。
- 涉及文件：
  - Modify `client/quota-embed.mjs`：参数 `stack` 改为 `target`；第 175 行 `stack.append(el)` 改为 `target.append(seg)`；拆除时移除段而非整个 pill；**撤除第 286 行 `attachFloatDrag(onTap: onTapOpen)` 绑定，并删除第 294 行 `dragCtl.dispose()`**（否则 dispose 引用已删变量）。
  - Modify `client/capsule.mjs`：股票内容包进 `div[data-seg="stock"]`；胶囊根属性 `data-dsh-stock-kanban-capsule` 保留（第 213 行）。
  - Modify `client/main.mjs`：第 82 行装配传 `target: capsule.el`，删除 `stack`。
  - Modify `tests/client-quota-embed.test.mjs`：setup 的 `stack`（约 70–74 行）改为 `target`；约 13 处 `.skc-capsule--quota` 选择器改为 `[data-seg="quota"]`；embed 的 tap/drag 用例（约 265、292 行）仅改选择器，行为由 S6 覆盖。
  - Modify `tests/client-quota-integration.test.mjs`：约 2 处选择器。
- 验证范围：两条精确命名用例；全量回归。

- [ ] Step 1：写用例（先红）
  - Change: 两条，名字精确为「合并：额度段为胶囊子节点（父为胶囊根）」、「合并：stack 上无独立额度节点」。
  - Run: `set -o pipefail && node --test --test-name-pattern="合并：" tests/client-quota-integration.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 2`、`ℹ pass 0`、`ℹ fail 2`。
- [ ] Step 2：实现与迁移
  - Change: 按上面的修改清单执行。
  - Run: `set -o pipefail && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/sk-s5-full.log | grep -E "^ℹ (pass|fail)"`
  - Expected: `ℹ fail 0`；`ℹ pass` 等于前一步全量（迁移不增减用例）。

#### Task S6：分区分流、指针记录、键盘锚点、onQuotaTap 锚点（先红）

- 目标：段内轻点按所按下的分区分流；pointerup 的 target 不再参与判定；键盘路径带股票段锚点；额度段的 open-panel 锚点与 S2 同一构造函数。
- 涉及文件：Modify `client/capsule.mjs`（pointerdown 记录 `event.target` 为 `downTarget`；未拖动 pointerup 调用 `onTap(downTarget)`；键盘 toggle 约 311–316 行传股票段矩形）；Modify `client/quota-embed.mjs`（提供 `onQuotaTap()`，派发 `open-panel`，锚点由 `buildAnchorRect(segRect)` 构造）；Modify `client/main.mjs`（`onTogglePanel(segRect, capsuleRect)`）；Modify `tests/client-dom.test.mjs`、`tests/client-quota-embed.test.mjs`。
- 接口契约：Consumes S2、S5。Produces `onTap(target)`：`target.closest('[data-seg="quota"]')` 命中时调用 `onQuotaTap()`，否则调用股票 toggle 并传入 `[data-seg="stock"]` 的矩形。
- 验证范围：六条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 六条，名字精确为：「分区：额度段轻点 → 股票 toggle 0 次、open-panel 1 次」、「分区：股票段轻点 → 股票 toggle 1 次且带股票段矩形、open-panel 0 次」、「分区：pointerdown 在额度段、pointerup 在胶囊根 → 仍按额度段处理」、「分区：拖拽释放 → 不触发任何 tap」、「分区：键盘 Enter 开股票面板时带股票段矩形」、「锚点：onQuotaTap 与 onTapOpen 同一构造函数（含 right/bottom）」。第 6 条与 S2 同属 tests/client-quota-embed.test.mjs，同样使用命名空间导入 `qe`，不得具名导入 `buildAnchorRect`。
  - Run: `set -o pipefail && node --test --test-name-pattern="分区：|锚点：onQuotaTap" tests/client-dom.test.mjs tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 6`、`ℹ pass 1`、`ℹ fail 5`。红灯为第 1、2、3、5、6 条（第 2 条断言「带股票段矩形」：HEAD 上 onTogglePanel() 不带参数，必红）；绿灯仅第 4 条（拖拽释放不触发任何 tap）。若实测不符，停下报告。
- [ ] Step 2：实现并转绿
  - Run: 同 Step 1；再 `npm test` 全量。
  - Expected: `ℹ tests 6`、`ℹ pass 6`、`ℹ fail 0`；全量 `ℹ fail 0`。

#### Task S6b：面板开着时再点胶囊 → 最终关闭（Q14，已由主人确认）

- 目标：股票面板开着时点股票胶囊，面板最终关闭，而不是被外点关闭后又被 tap 重开。
- 涉及文件：Modify `client/panel.mjs`（外点判定第 127–135 行；`update` 第 315–322 行）；Modify `tests/client-dom.test.mjs`。
- 接口契约：Consumes S6。Produces 行为：外点关闭忽略满足豁免条件的 pointerdown；面板局部 `open` 与 store 的 `panelOpen` 同步。
- 豁免粒度（Q15，**待主人决定**）：下文按推荐写法（路径含胶囊根且不含额度段）。若主人选整胶囊豁免，删去「且不含额度段」条件，额度段按压将不关闭股票面板（评审探针 P13 已证实该差异）。

- [ ] Step 1：写用例（先红）
  - Change: 三条，名字精确为：「再点胶囊：面板开着时点股票胶囊最终关闭」（(a) 打开面板；(b) 胶囊上 pointerdown → 仍开；(c) 未拖动 pointerup → `isOpen() === false`）、「再点胶囊：点面板外普通元素仍关闭」、「再点胶囊：额度段按压 → 股票面板关闭」。
  - Run: `set -o pipefail && node --test --test-name-pattern="再点胶囊" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 3`、`ℹ pass 2`、`ℹ fail 1`。第 1 条红在断言 (b)「胶囊 pointerdown 后面板仍开」：HEAD 的外点关闭在 pointerdown 时已关闭面板，(c) 不会执行到；第 2、3 条现即绿。
- [ ] Step 2：实现并转绿
  - Change: (i) 第 130 行之后加入：若 `composedPath` 含 `dataset.dshStockKanbanCapsule !== undefined` 且不含 `dataset.seg === "quota"`，则直接返回（豁免粒度见上，Q15）；(ii) `update` 中 `snapshot = next;` 之后、`render()` 之前加入：`if (next?.ui?.panelOpen === false && open) open = false;`（面板可见性只由局部 `open` 决定，第 242 行 `el.hidden = !open`，不读 store；仅改 (i) 时胶囊 toggle 已把 store 关闭，面板仍显示，评审副本已证实）。**阻塞声明**：S6b 整体阻塞于 Q15。Q15 未批准前，Step 2 的 (i) 与 (ii) 均不执行，三条用例保持红；(i) 与 (ii) 必须同时执行（评审方已实测：只加 (i) 时 (c) 仍红）。
  - Run: `set -o pipefail && node --test --test-name-pattern="再点胶囊" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: `ℹ tests 3`、`ℹ pass 3`、`ℹ fail 0`；全量 `ℹ fail 0`。

#### Task S7：悬停数字（先红）

- 目标：悬停额度段，浮出只列有数据的条；两条都有时才显示分隔符。
- 涉及文件：Modify `client/styles.mjs`（仅追加 `.skc-qseg-tip` 与 `:hover` 规则）；Modify `client/quota-embed.mjs`（填充 `div.skc-qseg-tip`）；Modify `tests/client-quota-embed.test.mjs`。
- 接口契约：Consumes S3 的 `tooltip`。Produces 文本：单条为 `"GLM 100%"`，两条为 `"GLM 100% · Copilot 47%"`。
- 验证范围：两条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 两条，名字精确为「提示：单条只列一条且无分隔符」、「提示：两条含分隔符」。
  - Run: `set -o pipefail && node --test --test-name-pattern="提示：" tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 2`、`ℹ pass 0`、`ℹ fail 2`。
- [ ] Step 2：实现并转绿
  - Run: 同 Step 1。
  - Expected: `ℹ pass 2`、`ℹ fail 0`。

#### Task S8：面板水平推出（先红）

- 目标：面板从所点分区水平推出；顶边与胶囊对齐；两侧都放不下回退垂直。
- 涉及文件：Modify `client/panel.mjs`（`openFrom(segRect, capsuleRect)`，定位逻辑约第 84–107 行）；Modify `client/main.mjs`（`openFrom` 调用传两个矩形）；Modify `tests/client-dom.test.mjs`（既有「下方优先、翻上方」用例改写为下列用例）。
- 接口契约：Produces `openFrom(segRect, capsuleRect)`：
  - 水平：`left = segRect.right + 8`；超出视口则 `left = segRect.left − width − 8`；
  - 顶边：`top = capsuleRect.top`，再钳位到 `[MARGIN + insets.top, vh − height − MARGIN]`；
  - 回退：两侧都放不下时沿用垂直逻辑（下方优先，翻上方），锚点取 `capsuleRect`；
  - ≤480px：底部 sheet 不变。
- 验证范围：五条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 五条，名字精确为：「水平推出：优先右侧」、「水平推出：放不下则左侧」、「垂直回退：两侧都放不下时下方优先」、「水平推出：顶边与胶囊对齐并贴底钳位」、「sheet：视口不超过 480px 为底部 sheet」。
  - Run: `set -o pipefail && node --test --test-name-pattern="水平推出|垂直回退|sheet：" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 5`、`ℹ pass 1`、`ℹ fail 4`（第 5 条为既有行为，现即绿）。
- [ ] Step 2：实现并转绿
  - Run: 同 Step 1。
  - Expected: `ℹ pass 5`、`ℹ fail 0`。

#### Task S9：滑入动效（先红）

- 目标：面板打开时水平滑入约 150 毫秒；减少动态效果时直接显示。
- 涉及文件：Modify `client/panel.mjs`（打开时加 `skc-panel--slide`，关闭时移除）；Modify `client/styles.mjs`（仅追加 `@keyframes skc-panel-slide` 与 `.skc-panel--slide`，置于 `prefers-reduced-motion: no-preference` 守卫内）；Modify `tests/client-dom.test.mjs`。
- 验证范围：三条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 三条，名字精确为：「滑入：打开时带 skc-panel--slide，关闭后移除该类」（同一用例内先断言打开时带类，再断言关闭后不带类；HEAD 上打开即不带类，必红）、「滑入：样式位于减少动态效果守卫内」、「滑入：时长约 150 毫秒（CSS 含 150ms）」。
  - Run: `set -o pipefail && node --test --test-name-pattern="滑入：" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 3`、`ℹ pass 0`、`ℹ fail 3`。
- [ ] Step 2：实现并转绿
  - Run: 同 Step 1。
  - Expected: `ℹ pass 3`、`ℹ fail 0`。

#### Task S10：窄屏降级（先红）

- 目标：视口不超过 480px 时隐藏股票名称；额度段热区扩到 44px；面板仍为底部 sheet。
- 涉及文件：Modify `client/capsule.mjs`（resize 监听切换胶囊类 `.skc-compact`；股票名称节点带 `skc-stock-name`）；Modify `client/styles.mjs`（仅追加 `.skc-compact .skc-stock-name{display:none}` 与额度段热区扩展）；Modify `tests/client-dom.test.mjs`。
- 验证范围：三条精确命名用例。

- [ ] Step 1：写用例（先红）
  - Change: 三条，名字精确为：「窄屏：视口 400 时胶囊带 skc-compact」、「窄屏：视口 800 时胶囊不带 skc-compact」、「窄屏：额度段热区扩到 44px」。
  - Run: `set -o pipefail && node --test --test-name-pattern="窄屏：" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 3`、`ℹ pass 1`、`ℹ fail 2`（第 2 条现即满足，为不变量）。
- [ ] Step 2：实现并转绿
  - Run: 同 Step 1。
  - Expected: `ℹ pass 3`、`ℹ fail 0`。

#### Task S11：待处理提醒与 i18n（先红）

- 目标：`manualOutcome` 或 `manualOutcomeError` 存在时视为待处理；待处理琥珀点与条共存；点击派发 open-panel。
- 涉及文件：Modify `client/quota-embed.mjs`（`outcomePending = manualOutcome !== undefined || manualOutcomeError !== undefined`，与 qw client.mjs 第 1231 行同规则）；Modify `client/i18n.mjs`（新增 `quota.outcome`：zh「待处理兑换结果」，en「Pending redemption result」；并把 `quota.merge.on/off` 的「胶囊组」文案改为「合并胶囊」：zh 第 138–139 行「quota 已并入合并胶囊（点击拆分）」「quota 独立显示（点击并入合并胶囊）」，en 第 282 行「quota merged into the merged capsule (click to split)」）；Modify `tests/i18n.test.mjs`（quota 键列表约第 46–50 行显式加入 `quota.outcome`，这是本任务的显式断言改动；红灯来源即此）。
- 接口契约：Consumes S3、S4、S6。Produces `quota.outcome` 键（zh/en 双侧）。
- 验证范围：两条新用例；i18n 列表测试转绿。

- [ ] Step 1：写用例（先红）
  - Change: 两条新用例（tests/client-quota-embed.test.mjs），名字精确为「待处理：manualOutcome 存在且无数，段仅含琥珀点，点击派发 open-panel」、「待处理：manualOutcomeError 同样视为待处理」。i18n 两处（tests/i18n.test.mjs）：（a）显式断言改动：quota 键列表测试「quota.* 文案（合并开关 / 过期）：zh 与 en 双侧均有译文，非键名回退」加入 `quota.outcome`；（b）新增用例「文案：合并开关的 quota.merge.on/off 使用「合并胶囊」，zh/en 双侧一致（B37）」。红灯来源即此两处；其精确名先执行 `grep -n "^test(" tests/i18n.test.mjs` 取得，并写入日志。其精确名先执行 `grep -n "^test(" tests/i18n.test.mjs` 取得，并写入日志。
  - Run: `set -o pipefail && node --test --test-name-pattern="待处理：" tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ tests 2`、`ℹ pass 0`、`ℹ fail 2`。另运行 `set -o pipefail && node --test --test-name-pattern="合并开关 / 过期|文案：合并开关" tests/i18n.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`，期望 `ℹ tests 2`、`ℹ pass 0`、`ℹ fail 2`（列表已加入 quota.outcome 而 DICT 尚未加入，且文案仍含「胶囊组」，两条均为断言级红灯，非恒真）。
- [ ] Step 2：实现并转绿
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs tests/i18n.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `ℹ fail 0`。

#### Task S12：全量、构建、冻结面、提交

- 目标：全量全绿；bundle 同笔重建并幂等；冻结面零改动；提交实现。
- 验证范围：两次构建 sha 一致；`FROZEN_CLEAN`。

- [ ] Step 1：全量与构建
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && set -o pipefail && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/sk-s12-full.log | grep -E "^ℹ (tests|pass|fail)" && npm run build >/dev/null && sha256sum lib/client.js && npm run build >/dev/null && sha256sum lib/client.js`
  - Expected: `ℹ fail 0`；全量 `ℹ pass` 按阶段绝对数核对（偏差即停）：基线 S1 为 148；S2 +2 → 150；S3 +9 → 159；S4 +5 → 164；S4b +5 → 169；S5 +2 → 171；S6 +6 → 177；S6b +3 → 180；S7 +2 → 182；S8 净增 +3（新增 5、删除 HEAD 既有两条被改写的用例）→ 185；S9 +3 → 188；S10 +3 → 191；S11 +3（待处理 2、文案 1）→ 194。最终：`ℹ tests 194`、`ℹ pass 194`、`ℹ fail 0`。S6b 阻塞于 Q15：未批准前最终计数无法达到 194。两次构建 sha256 相同，记为 `SK_BUNDLE_SHA`。
- [ ] Step 2：冻结面
  - Run: `BASE_REF=$(cat /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref-plan-c.txt) && test -z "$(git diff --name-only "${BASE_REF:?}" -- src/ data/ locale/ cordis.patch.yml scripts/probe-markets.mjs)" && echo FROZEN_CLEAN`
  - Expected: 输出 `FROZEN_CLEAN`。
- [ ] Step 3：提交
  - Run: `git add client tests lib/client.js && git commit -m "feat(client): 合并胶囊方案③——单胶囊双段·迷你条、水平推出、窄屏降级、待处理提醒（ADR 0003）" && git status --porcelain`
  - Expected: 提交成功；工作树无输出。

#### Task S13：文档收口（docs-only，先取基线防恒真）

- 目标：CEP 规范、术语、对齐矩阵、README、验证记录同步；清零范围限定在活动文档。
- 活动文档：`GLOSSARY.md`、`README.md`、`docs/tech-notes.md`、`docs/reports/2026-11-09-capsule-parity-matrix.md`、`docs/interop/capsule-embed-protocol.md`、`docs/verification.md`。历史 ADR 0001/0002 与旧计划保留「胶囊组」原文，属于历史记录，不计入清零。
- 涉及文件：Modify 上述活动文档；Modify `docs/adr/0003-*`（如有修订）。

- [ ] Step 1：基线（在改动前取数）
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && for m in "拆除时补发" "锚点补 right、bottom" "待处理提醒" "合并胶囊"; do printf "%s: " "$m"; grep -c "$m" docs/interop/capsule-embed-protocol.md GLOSSARY.md | tr '\n' ' '; echo; done`
  - Expected: 四个标记在 CEP 与 GLOSSARY 中计数均为 0；若非 0，先停下核对，不得继续。
- [ ] Step 2：更新文档
  - Change: CEP 规范——§1（双 pill stack → 单胶囊双段）、§2（补 seg 说明）、§4（锚点补 right、bottom；拆除时补发 `embed-disengage`）、§9（额度段在胶囊内，不在 `.skc-stack`）；GLOSSARY——「胶囊组」改为「合并胶囊」，新增「待处理提醒」；README、tech-notes、对齐矩阵同步术语与形态；`docs/verification.md` 新增 §12.12。代码注释同步（不影响判据）：`client/main.mjs` 第 41 行、`client/styles.mjs` 第 21 行、`tests/client-dom.test.mjs` 第 55 行的「胶囊组」注释改为「合并胶囊」。合并开关（footer「合并显示 quota」）保留：它是用户拆分/合并额度段的唯一入口；ADR 0003 后果节同步记载。
- [ ] Step 3：验证
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && for m in "拆除时补发" "锚点补 right、bottom" "待处理提醒" "合并胶囊"; do printf "%s: " "$m"; grep -c "$m" docs/interop/capsule-embed-protocol.md GLOSSARY.md | tr '\n' ' '; echo; done && for f in GLOSSARY.md README.md docs/tech-notes.md docs/reports/2026-11-09-capsule-parity-matrix.md docs/interop/capsule-embed-protocol.md docs/verification.md; do printf "%s 胶囊组: " "$f"; grep -c "胶囊组" "$f"; done`
  - Expected: Step 1 的四个标记每个 ≥1；活动文档中「胶囊组」计数全部为 0。
- [ ] Step 4：提交
  - Run: `git add docs GLOSSARY.md README.md && git commit -m "docs: 合并胶囊方案③收口（CEP 锚点与拆除补充、术语、验证记录 §12.12）" && git status --porcelain`
  - Expected: 提交成功；工作树无输出。

#### Task S14：🚪 活体只读复核（需主人确认）

- 目标：在临时 profile 中只读复核合并胶囊的线上效果；指针动作须为真实指针（CDP `Input.dispatchMouseEvent`），不得用合成派发代替。
- 前置：Q5 已批准并完成；sk 为符号链接安装，客户端变更刷新页面即可，无需重启。
- 判据（逐条落盘，未达不计为达）：
  - P1 额度段是胶囊子节点（`[data-seg="quota"]` 的父节点为胶囊根）；
  - P2 双条：两家有数时两条；只一家有数时一条且居中；
  - P3 额度段真实指针轻点 → qw 面板水平出现在分区旁；再真实指针点击 → 关闭；
  - P4 股票段真实指针轻点 → 股票面板水平推出；面板开着时再点股票胶囊 → 最终关闭（S6b）；
  - P5 控制台无 error；
  - P6 停用 stock 后 qw 胶囊立即恢复（主人目视，拆除即 disengage）；
  - P7 整组拖动，位置记忆键 `dsh-stock-kanban:float-position` 不变；
  - P8 B26：额度危险态为琥珀 `#d29922`；股票标记为 B/S；
  - P9 B27 五态：两家有数、仅 GLM、仅 Copilot、两家无且无待处理（段隐藏）、仅待处理（琥珀点）；
  - P10 B29：水平推出的翻转与贴底钳位；
  - P11 B30：视口 480 以下隐藏股票名称、额度热区不小于 44px、面板为底部 sheet；
  - P12 滑入约 150ms（读取计算样式的 animation-duration）。

## 执行纪律

- 开始前批判性复查整份计划；发现缺项、矛盾或锚点与仓库现实不符，先停下报告，不改 ADR 0003 的规格。
- 每任务先红后绿；每步汇报一次；计数不符即停。
- Q5、S14 与豁免粒度（Q15）为外部动作门，未经主人批准不执行。
- 两仓提交都必须全绿，红测试不入库；触碰 `client/` 或 `src/client.mjs` 的提交同笔带重建的 bundle。

## 最终验证

- qw：`npm test` 全绿，`pass` = `QW_BASE_PASS + 1`；两次构建 sha 一致；竞态用例通过。
- sk：`npm test` 全绿；两次构建 sha 一致；`FROZEN_CLEAN`；S13 的活动文档清零；S14 的 P1–P12 逐条有结论。
- 面板开着时再点股票胶囊：最终关闭（S6b 的「再点胶囊」三条全绿）。
- 停用 stock 后 qw 胶囊的恢复：拆除即发 disengage，应立即恢复（主人目视确认）。

## 审阅 Checkpoint

- 计划正文结束。审阅通过前不进入实现。
