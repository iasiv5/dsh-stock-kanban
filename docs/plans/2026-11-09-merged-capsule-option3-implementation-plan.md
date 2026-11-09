# 合并胶囊（方案③）实施计划：单胶囊双段·迷你条（含 qw 竞态修复与 stock 拆除通知）

## 目标

- 按 ADR 0003（`docs/adr/0003-merged-capsule-single-pill-option3.md`）把股票胶囊与额度段合并为一个宿主胶囊：左段股票、中间分隔线、右段双迷你条（GLM 上、Copilot 下）。
- 面板改为水平推出（优先右侧，放不下左侧，两侧都放不下回退垂直）；窄屏压缩股票名称；待处理兑换保留琥珀点。
- qw 只修一处竞态：外点关闭之后，同一手势内的 `open-panel` 不得重开面板（500 毫秒窗口）。
- stock 补两处：`open-panel` 锚点补 `right`、`bottom`；拆除时发送 `embed-disengage`。
- 不发版，不调用 dshm，不重启任何宿主进程。

## 架构快照

- 额度段是股票胶囊的子节点（`data-seg="quota"`），不再是 `stack` 上的独立节点。`quota-embed` 的挂载目标由 `stack` 改为胶囊本体。
- 胶囊内部分两段：`data-seg="stock"` 包裹股票内容；`data-seg="quota"` 为额度段。点击按分区分流：股票段开股票面板，额度段经 CEP 派发 `open-panel`。
- 额度段渲染由纯函数 `quotaSegmentModel` 决定（模式、条、分隔线、提示内容），DOM 渲染只负责落地。模型与 DOM 分开，便于直测。
- 面板锚点是所点分区的矩形。`placePanel` 先试水平（右侧、再左侧），再回退垂直。
- 嵌入协议（CEP v1）事件名与 detail 结构不变。变化只有：锚点多两个字段，拆除时补发 disengage。
- qw 侧只改外点关闭与 open-panel 的判定，冻结接口（ADR 0007）不动。

## 全局约束

- **sk**：冻结面零改动——`src/`、`data/`、`locale/`、`cordis.patch.yml`、`scripts/probe-markets.mjs` 不动。零运行时依赖。i18n 新键 zh/en 双侧同加，客户端源码字符串字面量禁止 CJK（`tests/i18n.test.mjs` 守卫）。`FLOAT_STYLE_TEXT` 既有逐字断言串只可追加。任何触碰 `client/` 的提交须同笔重建 `lib/client.js`，两次构建 sha256 一致。
- **qw**：ADR 0007 冻结面不动（`mountQuotaCard` options bag、dispose 契约、`./client` 导出、`inject=['slots']`）。`dependencies` 零 `@deepseek-ai/*`。动 `src/client.mjs` 的提交须同笔重建 `lib/client.js`。不改版本号（发版另行处理）。
- **外部动作门**（主人批准前不执行）：Q5 的 qw 热部署。禁止 tag、push、publish；禁止调用 dshm_* 与 plugin_manager；禁止重启宿主。
- **测试框架**：sk 为 `node:test` + `node:assert/strict`，jsdom 经 `tests/helpers/dom-harness.mjs`；qw 为 `node --test`（jsdom 与既有测试同惯例）。
- 环境：联网 npm 带 `npm_config_cache=/home/ubuntu/workspace/.npm-cache`；长命令输出 tee 到 `/home/ubuntu/workspace/.dsh-research/merged-capsule-impl/`；管道命令保留退出码（`set -o pipefail`）。

## 输入工件

- `docs/adr/0003-merged-capsule-single-pill-option3.md`（sk，已写）。
- `docs/interop/capsule-embed-protocol.md`（CEP v1，sk，待补两处说明，见 S14）。
- `docs/reports/2026-11-09-capsule-parity-matrix.md`（sk，对齐矩阵，待更新，见 S14）。
- 渲染稿：`.dsh-research/capsule-merge-design/mockup-3-4.png`（方案③与④，仅作视觉参考，不是规格；规格以 ADR 0003 为准）。
- 代码锚点（以本计划写作时的仓库为准，执行时须先核对）：
  - sk `client/capsule.mjs`：`attachFloatDrag` 第 35 行，`onTap()` 无参调用第 139 行，`createCapsule` 第 203 行，`attachFloatDrag` 绑定第 309 行。
  - sk `client/panel.mjs`：`placePanel` 第 84 行，垂直逻辑第 101–102 行，`openFrom` 第 299 行。
  - sk `client/main.mjs`：胶囊创建第 68 行，`stack.append(capsule.el)` 第 76 行，`createQuotaEmbed` 第 82 行，`renderAll` 的 `quotaEmbed.update` 第 97 行，`panel.openFrom(capsule.el.getBoundingClientRect())` 第 105 行，`quotaEmbed.dispose()` 第 135 行。
  - sk `client/quota-embed.mjs`：额度段 DOM 创建第 69–87 行，`stack.append(el)` 第 175 行，`onTapOpen` 锚点对象，`dispose` 第 288 行（当前调用 `stopEngage(false)`）。
  - qw `src/client.mjs`：`onOpenPanel` 第 839 行，`onDocPointerDown` 第 1743 行，`doc.addEventListener('pointerdown', …, true)` 第 1800 行。

## 文件结构与职责

**qw（/home/ubuntu/workspace/dsh-quota-watch）**
- Modify: `src/client.mjs` — `onDocPointerDown` 记录关闭时间；`onOpenPanel` 在窗口内忽略。
- Modify: `tests/client.test.mjs` — 竞态用例（新增）。
- Modify（构建产物）: `lib/client.js`。

**sk（/home/ubuntu/workspace/dsh-stock-kanban）**
- Create: `client/quota-segment.mjs` — 额度段纯模型 `quotaSegmentModel`。
- Create: `tests/client-quota-segment.test.mjs` — 模型直测。
- Modify: `client/quota-embed.mjs` — 挂载目标改为胶囊；段 DOM 渲染；锚点补字段；拆除补发 disengage；过期与待处理。
- Modify: `client/capsule.mjs` — 胶囊分段（`data-seg`）；`onTap(event)` 分流；`onTogglePanel(anchorRect)` 传分区矩形；窄屏类。
- Modify: `client/panel.mjs` — `placePanel` 水平优先、垂直回退；滑入类。
- Modify: `client/main.mjs` — 股票点击锚点；额度段装配（挂载目标与回调）。
- Modify: `client/styles.mjs` — 仅追加：段样式、分隔线、迷你条、悬停提示、窄屏、滑入动效（守卫内）。
- Modify: `client/i18n.mjs` — 新键 `quota.outcome`（zh/en）。
- Modify: `tests/client-quota-embed.test.mjs`、`tests/client-quota-integration.test.mjs`、`tests/client-dom.test.mjs`（胶囊、面板水平用例改写）。
- Modify（文档）: `docs/interop/capsule-embed-protocol.md`、`docs/reports/2026-11-09-capsule-parity-matrix.md`、`GLOSSARY.md`、`README.md`、`docs/verification.md`（§12.12）、`docs/adr/0003-*`（如有修订）。
- Modify（构建产物）: `lib/client.js`。

## 任务清单

### Phase Q：qw 竞态修复

#### Task Q1：qw 基线

- 目标：记录访客侧测试基线。
- 涉及文件：无改动。
- 接口契约：Consumes 无。Produces `QW_BASE_PASS`（预期 264）。
- 验证范围：`npm test` 全绿。

- [ ] Step 1：基线
  - Run: `mkdir -p /home/ubuntu/workspace/.dsh-research/merged-capsule-impl && cd /home/ubuntu/workspace/dsh-quota-watch && git status --porcelain && set -o pipefail && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/qw-q1-baseline.log | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 工作树干净；`fail 0`；`pass` 为 `QW_BASE_PASS`（预期 264）。

#### Task Q2：竞态用例（先红）

- 目标：用测试钉死「外点关闭后，同一手势的 open-panel 不得重开」。
- 涉及文件：Modify `tests/client.test.mjs`。
- 接口契约：Consumes 既有 mount 测试夹具（`mounted()`、`dom()`，见 `tests/client.test.mjs` 约 60–90 行）。Produces 一条失败用例。
- 验证范围：新用例在当前代码下失败。

- [ ] Step 1：写用例（三段）
  - Change: 在 `tests/client.test.mjs` 追加用例「外点关闭后同一手势的 open-panel 不重开」。流程：(a) 挂载并使面板打开（派发 `open-panel` 或点击胶囊）；(b) 在 `document.body` 上派发 `pointerdown`（目标为面板外的元素，`composedPath` 不含面板）→ 面板应关闭；(c) 用 `mock.method(Date, 'now', …)` 将时间推进 100 毫秒，派发 `window` 上的 `dsh-quota-watch:open-panel` CustomEvent（detail `{v:1, anchor:{left:100,top:200,width:150,height:26}}`）→ 期望 `panel.hidden === true`；(d) 再把时间推进到距 (b) 超过 500 毫秒后派发一次 `open-panel` → 期望 `panel.hidden === false`。
- [ ] Step 2：确认红
  - Run: `set -o pipefail && node --test --test-name-pattern="同一手势" tests/client.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败于 (c) 的断言（当前代码会重开，`panel.hidden === false`）。

#### Task Q3：实现窗口判定

- 目标：外点关闭时记录时间；窗口内的 open-panel 视为关闭，不重开。
- 涉及文件：Modify `src/client.mjs`（`onDocPointerDown` 第 1743 行附近、`onOpenPanel` 第 839 行附近）。
- 接口契约：Consumes Q2 用例。Produces 行为：窗口常量 `OUTSIDE_CLOSE_GESTURE_MS = 500`；不改 options bag 与导出。
- 验证范围：Q2 用例转绿；全量回归绿；`git diff` 仅涉及 `src/client.mjs` 与测试。

- [ ] Step 1：实现
  - Change: 模块级 `let lastOutsideCloseAt = 0`。在 `onDocPointerDown` 真正关闭面板的分支（即 `openKey = undefined` 之前）记录 `lastOutsideCloseAt = Date.now()`。在 `onOpenPanel(rect)` 开头、`suppressNextClick` 判断之后加入：`if (lastOutsideCloseAt !== 0 && Date.now() - lastOutsideCloseAt < OUTSIDE_CLOSE_GESTURE_MS) { lastOutsideCloseAt = 0; return }`。
- [ ] Step 2：确认绿
  - Run: `set -o pipefail && node --test --test-name-pattern="同一手势" tests/client.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/qw-q3-full.log | grep -E "^ℹ (pass|fail)"`
  - Expected: 新用例 `pass 1`；全量 `fail 0`，`pass` = `QW_BASE_PASS + 1`。

#### Task Q4：构建、幂等、提交

- 目标：bundle 同笔重建并幂等；提交修复。
- 接口契约：Consumes Q3。Produces 提交与 `QW_BUNDLE_SHA`。
- 验证范围：两次构建 sha256 一致；`lib/client.js` 同笔入库。

- [ ] Step 1：两次构建
  - Run: `cd /home/ubuntu/workspace/dsh-quota-watch && npm run build >/dev/null && sha256sum lib/client.js && npm run build >/dev/null && sha256sum lib/client.js`
  - Expected: 两行 sha256 完全相同，记为 `QW_BUNDLE_SHA`。
- [ ] Step 2：提交
  - Run: `git add src/client.mjs tests/client.test.mjs lib/client.js && git commit -m "fix(client): 外点关闭后同一手势的 open-panel 不重开（500ms 窗口），修复 stock 额度段再点关闭" && git status --porcelain`
  - Expected: 提交成功；`git status --porcelain` 为空。

#### Task Q5：🚪 热部署（需主人批准）

- 目标：把修复后的 bundle 热部署到线上 profile，不重启、不发版。
- 接口契约：Consumes Q4 的 `QW_BUNDLE_SHA`。Produces 线上 bundle 的 sha 与备份路径。
- 验证范围：备份可回滚；pnpm 存储未被污染（与 2026-11-09 热部署相同的原子替换方法）。

- [ ] Step 1：🚪 向主人请示热部署；未批准则停止。
- [ ] Step 2：备份线上当前文件（新 inode）；写入同目录临时文件；校验哈希等于 `QW_BUNDLE_SHA`；原子 `mv` 替换；校验 pnpm 存储副本未变。
  - Expected: 备份文件哈希与替换前一致；线上哈希等于 `QW_BUNDLE_SHA`；存储副本哈希不变。

### Phase S：stock 合并胶囊

#### Task S1：基线与冻结面基准

- 目标：记录 sk 基线与冻结面基准。
- 涉及文件：无改动。
- 接口契约：Produces `SK_BASE_PASS`（预期 148）与 `BASE_REF_C`。
- 验证范围：工作树干净；`npm test` 全绿。

- [ ] Step 1：基线
  - Run: `mkdir -p /home/ubuntu/workspace/.dsh-research/merged-capsule-impl && cd /home/ubuntu/workspace/dsh-stock-kanban && git status --porcelain && set -o pipefail && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/sk-s1-baseline.log | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 工作树干净（ADR 0003 与本计划已由 Lead 在评审前提交）；`fail 0`。
- [ ] Step 2：记录基准
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && git rev-parse HEAD | tee /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref-plan-c.txt`
  - Expected: 输出 40 位 SHA，记为 `BASE_REF_C`（S12 冻结面断言用）。

#### Task S2：锚点补字段与拆除补发 disengage（先红）

- 目标：open-panel 锚点含 `right`、`bottom`；拆除时补发一次 disengage。
- 涉及文件：Modify `tests/client-quota-embed.test.mjs`；Modify `client/quota-embed.mjs`（`onTapOpen` 锚点对象；`dispose` 第 288 行）。
- 接口契约：Consumes 既有 `createQuotaEmbed`。Produces `open-panel.detail.anchor = {left, top, width, height, right, bottom}`；`dispose()` 在已 engaged 时恰好派发一次 `embed-disengage`。
- 验证范围：两个用例先红后绿。

- [ ] Step 1：写两个用例（先红）
  - Change: (a) 用 fake guest 完成握手并 engage，触发 tap，断言 `anchor.right === left + width`、`anchor.bottom === top + height`；(b) engage 后调用 `dispose()`，断言收到恰好一次 `embed-disengage`。
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 两条失败（字段缺失；dispose 未派发）。
- [ ] Step 2：实现
  - Change: `onTapOpen` 锚点对象补 `right: left + width`、`bottom: top + height`。`dispose` 中 `stopEngage(false)` 改为 `stopEngage(true)`（`dispatch` 无 `disposed` 守卫，`stopEngage` 内部亦无，已核实）。
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S3：额度段纯模型（先红）

- 目标：把「显示什么」的规则收敛为纯函数，直测覆盖 ADR 0003 第 3 条。
- 涉及文件：Create `client/quota-segment.mjs`；Create `tests/client-quota-segment.test.mjs`。
- 接口契约：Consumes 无。Produces `export function quotaSegmentModel({ glm, copilot, outcomePending })`，输入 `glm`/`copilot` 为 `null` 或 `{percent, stale}`，返回 `{ mode, bars, divider, tooltip }`：
  - `mode`：`'bars'`（至少一条有数）｜`'dot'`（两条都无数且 `outcomePending`）｜`'hidden'`（其余）。
  - `bars`：仅含有数的条，顺序 GLM 在前；每条 `{ key, label:'G'|'C', percent, tone, stale }`；`tone`：`percent > 95` → `'danger'`，`> 80` → `'warn'`，否则 `'normal'`。
  - `divider`：`bars.length === 2`。
  - `tooltip`：与 `bars` 一一对应的 `{label, percent}` 列表。
  - "有数"：`percent` 为有限数字（与 qw `paint` 规则一致），`null` 或非有限值视为无数。
- 验证范围：直测全绿。

- [ ] Step 1：写直测（先红）
  - Change: 覆盖 8 组：只有 GLM；只有 Copilot（单条居中由 DOM 处理，模型只需单条）；两条都有（GLM 在前、`divider === true`）；两条都无且无待处理（`hidden`）；两条都无但有待处理（`dot`）；过期（`stale: true` 保留到 `bars[i].stale`）；阈值边界（80 为 normal，81 为 warn，95 为 warn，96 为 danger）；非有限值（`NaN` 视为无数）。
  - Run: `set -o pipefail && node --test tests/client-quota-segment.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 模块不存在导致失败。
- [ ] Step 2：实现模型
  - Change: 按上面的接口实现 `client/quota-segment.mjs`，纯函数，无 DOM 依赖。
  - Run: `set -o pipefail && node --test tests/client-quota-segment.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S4：段的 DOM 渲染（替换文本版）

- 目标：段内渲染双迷你条、单条居中、分隔线、悬停提示、待处理小点、过期变暗。
- 涉及文件：Modify `client/quota-embed.mjs`（删除 `glmSpan`/`copilotSpan`/`sepSpan` 文本段，第 77–87 行与对应更新逻辑）；Modify `tests/client-quota-embed.test.mjs`（改写文本断言）。
- 接口契约：Consumes S3 的 `quotaSegmentModel`。Produces 段 DOM：`div.skc-qseg[data-seg="quota"]`，内含 `div.skc-qseg-bars`（每条 `div.skc-qbar > i.skc-qbar-fill[data-tone][data-key]`，单条时加 `.skc-qseg-single` 居中）、`span.skc-qseg-divider`（`hidden` 由 `divider` 决定）、`span.skc-qdot`（`mode === 'dot'`）、`div.skc-qseg-tip`（悬停内容：`tooltip` 列表，分隔符仅两条时显示）。过期：条 `opacity: .5`，段 `title` 为 `t('quota.stale')`。
- 验证范围：改写后的直测全绿。

- [ ] Step 1：改写直测（先红）
  - Change: 断言 `mode === 'bars'` 时存在条与对应 `data-tone`；单条时带 `.skc-qseg-single`；两条时无该类；`mode === 'dot'` 时存在 `.skc-qdot` 且无条；`mode === 'hidden'` 时段 `hidden === true`；过期时段有 `title`。
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 新断言失败。
- [ ] Step 2：实现渲染
  - Change: `renderSegment(segEl, model)` 只负责落地 DOM，不做判断。
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S5：额度段并入胶囊（挂载目标改为胶囊）

- 目标：额度段成为股票胶囊的子节点，不再是 `stack` 上的独立节点。
- 涉及文件：Modify `client/quota-embed.mjs`（参数 `stack` 改为 `target`，第 175 行 `stack.append(el)` 改为 `target.append(seg)`；拆除时移除段而非整个 pill）；Modify `client/capsule.mjs`（胶囊分段 `data-seg="stock"` 包裹股票内容，第 35 行起的 DOM 构造）；Modify `client/main.mjs`（第 82 行装配）；Modify `tests/client-quota-integration.test.mjs`（选择器更新）。
- 接口契约：Consumes S4。Produces `createQuotaEmbed({ …, target })`，`target` 为胶囊元素；胶囊 DOM 中 `[data-seg="stock"]` 与 `[data-seg="quota"]` 为其直接子节点。
- 验证范围：集成组全绿；胶囊既有拖拽用例（`client-dom`）零改动全绿。

- [ ] Step 1：改写集成断言（先红）：额度段选择器从 `.skc-capsule--quota` 改为 `[data-seg="quota"]`，且父节点为胶囊。
  - Run: `set -o pipefail && node --test tests/client-quota-integration.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 选择器相关用例失败。
- [ ] Step 2：实现挂载与分段
  - Change: 按接口改 `quota-embed` 参数与挂载；`capsule` 把股票内容包进 `data-seg="stock"`；`main` 装配时传 `target: capsule.el`。撤除 `quota-embed` 对段元素的 `attachFloatDrag` 绑定（约第 286 行，`attachFloatDrag(onTap: onTapOpen)`）：段的指针交互只由胶囊的 `attachFloatDrag` 经 `onTap(event)` 分流（见 S6），不得保留第二个 drag 控制器（否则一次轻点触发两个 tap 处理器，已由探针证实）。
  - Run: `npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/sk-s5-full.log | grep -E "^ℹ (pass|fail)"`
  - Expected: `fail 0`。

#### Task S6：分区点击分流

- 目标：点股票段开股票面板，点额度段派发 `open-panel`；拖拽仍整组移动。
- 涉及文件：Modify `client/capsule.mjs`（`attachFloatDrag` 第 139 行 `onTap()` 改为 `onTap(event)`；`createCapsule` 的 `toggle` 接受分区矩形）；Modify `client/quota-embed.mjs`（提供 `onQuotaTap(segRect)`，内部派发 `open-panel`）；Modify `client/main.mjs`（`onTogglePanel(anchorRect)` 写入 `lastStockAnchor`）；Modify `tests/client-dom.test.mjs`（分区点击用例）。
- 接口契约：Consumes S5。Produces `onTap(event)`：`event.target.closest('[data-seg="quota"]')` 命中时调用 `onQuotaTap`，否则调用股票 toggle 并传入 `[data-seg="stock"]` 的矩形。
- 验证范围：点额度段不触发股票 toggle；点股票段触发 toggle 且带股票段矩形；拖拽后不触发任何 tap。

- [ ] Step 1：写分流用例（先红）
  - Change: 用例名均含「分区」：(a)「分区：额度段轻点 → 股票 toggle 调用 0 次，open-panel 派发 1 次」；(b)「分区：股票段轻点 → 股票 toggle 调用 1 次且带股票段矩形，open-panel 派发 0 次」；(c)「分区：拖拽释放 → 不触发任何 tap」。注意 (a) 必须断言 toggle 次数为 0，这正是 P-01 的缺陷。
  - Run: `set -o pipefail && node --test --test-name-pattern="分区" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败（当前无分流；段内轻点会同时触发两个 tap 处理器，toggle 次数为 1 而非 0）。
- [ ] Step 2：实现分流并转绿
  - Run: `set -o pipefail && node --test --test-name-pattern="分区" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: 分区用例通过；全量 `fail 0`。

#### Task S6b：面板开着时再点胶囊 → 最终关闭（Q14，已由主人确认）

- 目标：股票面板开着时点击股票胶囊，面板最终关闭，而不是被外点关闭后又被 tap 重开。
- 涉及文件：Modify `client/panel.mjs`（外点关闭的 `onDocPointerDown`，第 127–135 行）；Modify `tests/client-dom.test.mjs`。
- 接口契约：Consumes S6（胶囊 `onTap` 分流，股票段 toggle）。Produces 行为：外点关闭忽略 `composedPath` 中带 `data-dsh-stock-kanban-capsule` 的 pointerdown；胶囊的 pointerup → onTap → toggle 完成关闭。既有外点关闭（点面板外的普通元素）不变。
- 验证范围：「再点胶囊」用例与既有「外点关闭」用例同时绿。

- [ ] Step 1：写用例（先红）
  - Change: 用例名含「再点胶囊」：(a) 打开面板；(b) 在股票胶囊上派发 `pointerdown`（composedPath 含胶囊）→ 面板仍打开；(c) 同一胶囊上派发未拖动的 `pointerup` → 面板最终关闭（`isOpen() === false`）；(d) 对照：面板外的普通元素上派发 `pointerdown` → 面板关闭（既有行为不变）。
  - Run: `set -o pipefail && node --test --test-name-pattern="再点胶囊" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败（当前外点关闭先关面板，随后 tap 重开，断言 (c) 不成立，最终态为打开）。
- [ ] Step 2：实现
  - Change: `client/panel.mjs` 第 130 行之后加入：`if (event.composedPath().some((n) => n?.dataset?.dshStockKanbanCapsule !== undefined)) return;`（与第 130 行的面板自身判定并列；`composedPath` 抛错时仍走第 131–132 行的「不误关」分支）。
  - Run: `set -o pipefail && node --test --test-name-pattern="再点胶囊|外点" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`（既有「panel · 外点关闭与 Esc 关闭」用例仍绿）。

#### Task S7：悬停数字

- 目标：悬停额度段，浮出只列有数据的条；分隔符仅两条都有时显示。
- 涉及文件：Modify `client/styles.mjs`（仅追加 `.skc-qseg-tip` 与 `:hover` 规则）；Modify `client/quota-embed.mjs`（填充 `div.skc-qseg-tip`）；Modify `tests/client-quota-embed.test.mjs`。
- 接口契约：Consumes S4 的 `tooltip`。Produces 提示文本：单条为 `"GLM 100%"` 形式，两条为 `"GLM 100% · Copilot 47%"`。
- 验证范围：文本断言；样式断言（新规则追加，既有串未动）。

- [ ] Step 1：写断言（先红）：单条只含一个标签、无分隔符；两条含分隔符。
  - Run: `set -o pipefail && node --test --test-name-pattern="提示" tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败。
- [ ] Step 2：实现并转绿
  - Run: `set -o pipefail && node --test --test-name-pattern="提示" tests/client-quota-embed.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S8：面板水平推出（先红）

- 目标：面板从所点分区推出，优先右侧，放不下左侧，两侧都放不下回退垂直。
- 涉及文件：Modify `tests/client-dom.test.mjs`（改写「下方优先、翻上方」用例，新增水平与回退用例）；Modify `client/panel.mjs`（`placePanel` 第 84–107 行）。
- 接口契约：Consumes 分区矩形（S6）。Produces `openFrom(anchorRect)` 行为：
  - 水平：`left = rect.right + 8`；超出视口则 `left = rect.left − width − 8`；`top = rect.top`，再钳位到 `[MARGIN + insets.top, vh − height − MARGIN]`。
  - 回退：两侧都放不下（水平 left 仍越界）时，沿用现有垂直逻辑（下方优先，翻上方）。
  - ≤480px：底部 sheet 不变。
- 验证范围：水平用例、回退用例、sheet 用例全绿。

- [ ] Step 1：写用例（先红）：宽视口、分区在视口中部 → 面板 `left === rect.right + 8`；分区贴右缘 → 面板 `left === rect.left − width − 8`；两侧都放不下的窄视口 → 面板 `top` 为垂直回退值；分区靠近底部 → `top` 贴底钳位。
  - Run: `set -o pipefail && node --test --test-name-pattern="水平推出|垂直回退" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败。
- [ ] Step 2：实现并转绿
  - Run: `set -o pipefail && node --test --test-name-pattern="水平推出|垂直回退|sheet" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: 全绿。

#### Task S9：滑入动效

- 目标：面板打开时水平滑入约 150 毫秒；减少动态效果时直接显示。
- 涉及文件：Modify `client/panel.mjs`（打开时加 `skc-panel--slide`，关闭时移除）；Modify `client/styles.mjs`（仅追加 `@keyframes skc-panel-slide` 与 `.skc-panel--slide`，置于 `prefers-reduced-motion: no-preference` 守卫内）；Modify `tests/client-dom.test.mjs`。
- 接口契约：Consumes S8。Produces 类名与守卫内的样式规则。
- 验证范围：类名断言；守卫位置断言（规则文本位于守卫块内，与既有 `skc-qpulse` 同惯例）。

- [ ] Step 1：写断言（先红）：打开后面板带 `skc-panel--slide`；关闭后移除；样式规则在守卫内。
  - Run: `set -o pipefail && node --test --test-name-pattern="滑入" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败。
- [ ] Step 2：实现并转绿
  - Run: `set -o pipefail && node --test --test-name-pattern="滑入" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S10：窄屏降级

- 目标：视口不超过 480px 时隐藏股票名称；额度段热区扩到 44px；面板仍为底部 sheet。
- 涉及文件：Modify `client/capsule.mjs`（resize 监听切换 `.skc-compact`）；Modify `client/styles.mjs`（仅追加 `.skc-compact .skc-stock-name{display:none}` 与额度段 `::before` 扩展）；Modify `tests/client-dom.test.mjs`。
- 接口契约：Consumes `setViewport`（`dom-harness`）。Produces 胶囊类 `.skc-compact`；股票名称节点带 `skc-stock-name` 类。
- 验证范围：视口 400 时类存在；视口 800 时类不存在；额度段热区伪元素规则存在。

- [ ] Step 1：写用例（先红）
  - Run: `set -o pipefail && node --test --test-name-pattern="窄屏" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败。
- [ ] Step 2：实现并转绿
  - Run: `set -o pipefail && node --test --test-name-pattern="窄屏" tests/client-dom.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S11：待处理提醒与 i18n

- 目标：`overview.manualOutcome` 存在且额度无数时，显示琥珀点，点击开 qw 面板。
- 涉及文件：Modify `client/quota-embed.mjs`（读取 `manualOutcome`，传 `outcomePending` 给模型）；Modify `client/i18n.mjs`（新增 `quota.outcome` 的 zh 与 en）；Modify `tests/client-quota-embed.test.mjs`、`tests/i18n.test.mjs` 不改断言逻辑，只依赖其 DICT 对齐守卫。
- 接口契约：Consumes S3、S4、S6。Produces `quota.outcome` 键（zh：待处理兑换结果；en：Pending redemption result）。
- 验证范围：`dot` 模式的集成用例；`tests/i18n.test.mjs` 全绿（DICT 对齐）。

- [ ] Step 1：写用例（先红）：`overview` 返回 `manualOutcome` 且两家无数 → 段为 dot，点击派发 `open-panel`；`tests/i18n.test.mjs` 的 DICT 对齐因新键未加而失败。
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs tests/i18n.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: 失败。
- [ ] Step 2：实现并转绿
  - Run: `set -o pipefail && node --test tests/client-quota-embed.test.mjs tests/i18n.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
  - Expected: `fail 0`。

#### Task S12：全量、构建、提交

- 目标：全量绿；bundle 同笔重建并幂等；提交实现。
- 验证范围：两次构建 sha 一致；`FROZEN_CLEAN`。

- [ ] Step 1：全量与构建
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && npm test 2>&1 | tee /home/ubuntu/workspace/.dsh-research/merged-capsule-impl/sk-s12-full.log | grep -E "^ℹ (pass|fail)" && npm run build >/dev/null && sha256sum lib/client.js && npm run build >/dev/null && sha256sum lib/client.js`
  - Expected: `fail 0`；两行 sha256 相同，记为 `SK_BUNDLE_SHA`。
- [ ] Step 2：冻结面
  - Run: `BASE_REF=$(cat /home/ubuntu/workspace/.dsh-research/stock-kanban-vanilla-impl/sk-base-ref-plan-c.txt) && test -z "$(git diff --name-only "${BASE_REF:?}" -- src/ data/ locale/ cordis.patch.yml scripts/probe-markets.mjs)" && echo FROZEN_CLEAN`
  - Expected: `FROZEN_CLEAN`。
- [ ] Step 3：提交
  - Run: `git add client tests lib/client.js && git commit -m "feat(client): 合并胶囊方案③——单胶囊双段·迷你条、水平推出、窄屏降级、待处理提醒（ADR 0003）" && git status --porcelain`
  - Expected: 提交成功；工作树干净。

#### Task S13：文档收口（docs-only）

- 目标：协议规范、对齐矩阵、术语、README、验证记录同步。
- 涉及文件：Modify `docs/interop/capsule-embed-protocol.md`（§4 锚点补 `right`、`bottom`；拆除时补发 disengage）；Modify `docs/reports/2026-11-09-capsule-parity-matrix.md`（联动一节改为方案③已实现，附指针）；Modify `GLOSSARY.md`（「胶囊组」改为「合并胶囊」，新增「待处理提醒」）；Modify `README.md`（联动节与窄屏、待处理提醒说明）；Modify `docs/verification.md`（新增 §12.12）。
- 验证范围：grep 锚点在位；`npm test` 全绿。

- [ ] Step 1：更新五份文档。
- [ ] Step 2：验证
  - Run: `grep -c "right.*bottom\|disengage" docs/interop/capsule-embed-protocol.md && grep -c "合并胶囊" GLOSSARY.md && grep -c "12.12" docs/verification.md && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
  - Expected: 三个计数均 ≥1；`fail 0`。
- [ ] Step 3：提交
  - Run: `git add docs GLOSSARY.md README.md && git commit -m "docs: 合并胶囊方案③收口（CEP 锚点与拆除补充、术语、验证记录 §12.12）" && git status --porcelain`
  - Expected: 提交成功；工作树干净。

#### Task S14：🚪 活体只读复核（需主人确认）

- 目标：在临时 profile 中只读复核合并胶囊的线上效果；由主人目视确认。
- 前置：Q5 热部署已批准并完成（qw 修复在线）。sk 为符号链接安装，客户端变更刷新页面即可，无需重启。
- 验证范围：判据 P1–P7（见下），逐条落盘。

- [ ] Step 1：🚪 向主人确认执行只读复核。
- [ ] Step 2：临时 profile 只读复核，判据：
  - P1 股票段与额度段同在一个胶囊内（`[data-seg="quota"]` 的父节点为 `[data-dsh-stock-kanban-capsule]` 所在胶囊）；
  - P2 双迷你条（两家有数时两条；只一家有数时一条且居中）；
  - P3 额度段点击派发 `open-panel`，qw 面板水平出现在分区旁；再点一次关闭（这一条验证 Q3 修复）；
  - P4 股票段点击打开股票面板，且水平推出；
  - P5 控制台无 error；
  - P6 拆除后 qw 立即恢复（主人停用 stock 时观察，不由 Agent 操作）；
  - P7 整组拖动，位置记忆键 `dsh-stock-kanban:float-position` 不变。
  - Expected: 每条落盘结论；未达的不计为达。

## 执行纪律

- 开始前批判性复查整份计划；发现缺项、矛盾或锚点与仓库现实不符，先停下报告，不改 ADR 0003 的规格。
- 每任务先红后绿；每步汇报一次；遇阻停止。
- Q5 与 S14 是外部动作门，未经主人批准不执行。
- 两仓提交都必须全绿，红测试不入库；触碰 `client/` 或 `src/client.mjs` 的提交同笔带重建的 bundle。

## 最终验证

- qw：`npm test` 全绿，`pass` = `QW_BASE_PASS + 1`；两次构建 sha 一致；竞态用例通过。
- sk：`npm test` 全绿；两次构建 sha 一致；`FROZEN_CLEAN`；S14 的 P1–P7 逐条有结论。
- 面板开着时再点股票胶囊：最终关闭（S6b，用例「再点胶囊」绿）。
- 停用 stock 后 qw 胶囊的恢复时间：拆除即发 disengage，应立即恢复（主人目视确认）。

## 审阅 Checkpoint

- 计划正文结束。审阅通过前不进入实现。
