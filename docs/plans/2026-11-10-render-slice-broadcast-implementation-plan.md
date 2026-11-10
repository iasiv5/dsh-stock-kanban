# 渲染切片广播 + 活区 patch 实施计划

## 目标

把客户端渲染漏斗从「每次 store 变更全量 replaceChildren 重建」改为「切片广播 + 活区 patch」：

- store 广播快照时携带**变更切片**；行情内容无实质变化时零重绘（视图按空切片跳过；poll 路径因 providers 引用每 tick 更新仍会 emit——见接口契约判定域注记）。
- detail 视图骨架一次构建，行情数字活区原位改写；图表节点仅在数据引用变化时替换。
- list 行区 keyed 复用：quotes tick 只改行内数字；增删/排序（business.rev 变化）才整区重建。
- panel chrome（header/footer/picker）按 business.rev 与面板结构键门控，不随行情 tick 重建。
- 退役 4 处「重建补偿」补丁：detail 编辑跳绘守卫、detail 光标捕获/恢复、list 焦点抢救、list 拖拽冻结（改为拖拽中仅文本 patch）。
- 构建开启 minify，注入产物减半。
- 文档同步：ADR-0004、GLOSSARY 两词条 + 快照词条修订、verification §12.17/§12.24 追记与 §12.25 实拍记录。

不在本任务范围：服务端 `getQuoteFull` 缓存/退避（第二落点，另行安排）；`restartPolling` 即时拉取防抖；add.mjs 结果区（保持现状重建）；发版（只合主干）。

## 架构快照

现状：`store.set()` 无相等性检查，每次 emit 都触发 `renderAll` 漏斗，五个视图里 list/detail 每次整段 `replaceChildren` 重建（图表 SVG ≈540+ 节点也重建），因此代码里散落 4 处补偿补丁（焦点抢救、光标恢复、编辑跳绘、拖拽冻结）。

本次方案：**变更信息随快照走，视图按切片自门控**。

- `store.set(partial)` 计算 `deriveChanged(prev, next)`；实质变化判定域 = quotes 行内容（fingerprint，剔除 fetchedAt）+ business.rev/loaded + ui 逐键 + quoteMeta.error + providers 引用 + toast。判定域全部相等 → 更新 state 但**不 emit**。
- 有实质变化 → emit，快照携带 `changed` 字段；视图读 `snapshot.changed` 自行决定重建还是 patch。
- `changed` 缺省（undefined）= 全量语义：订阅回放、语言切换直呼 `renderAll(store.getState())`、旧测试手搓快照均天然落入全量分支。
- detail/list/panel 的重建触发收敛到三条：`changed === undefined`（全量）、`changed.business === true`（结构变化）、`changed.ui` 含结构键。quotes-only tick 一律走 patch 路径。

和现有结构的衔接：ADR-0001 定的「订阅漏斗 + `{el, update(snapshot), dispose}` seam」不变，本方案是该 seam 内部的演进；capsule.mjs（原位 textContent）与 add.mjs（骨架静态化）已是目标模式的两个先例，本方案把模式推广为唯一正道。

## 全局约束

- vanilla 零框架依赖；视图 seam 形状 `{ el, update(snapshot), dispose }` 不变（ADR-0001）。
- bundle 纪律：凡触碰 `client/` 的 commit，同 commit 重建 `lib/client.js`；连续两次 `npm run build` 产物 sha256 幂等（ADR-0001）。
- 业务数据永不写 localStorage（client/store.mjs 头注释，需求 9.2）。
- `node >= 20`（package.json engines）；测试命令 `npm test`（= `node --test "tests/*.test.mjs"`）。
- 用户可见契约不变：输入框跨 tick 身份稳定（verification §12.17 的契约本体）；拖拽几何快照假设照旧守住（§12.24 定稿条款）。
- 测试红绿以 node --test 命令输出为准，文档不缓存用例数字（§12.1 口径）。
- 渲染层改动必须 cdp-shot 实拍，DOM 契约断言为准、像素截图不作准（§12.16 硬教训、§12.23 口径）。
- chrome 进程纪律：起 chrome 一律 run_in_background；build/test 前 chrome 进程数为 0；pkill 用 `[c]` 括号 trick（§12.16）。
- 分支：用户已批准直接在主干推进、不发版（grill 决议 Q9）；仓库无 CHANGELOG 文件，changelog 职能由 verification §12 承担。
- jsdom `focus()` 仅对已入文档元素生效：测试先 `document.body.append(el)`（§12.17 L279 记档）。
- 每任务 build/test 前置检查（仓库 AGENTS.md 纪律）：`test -d node_modules`，缺失先 `npm ci`——`dsh plugin add/remove` 会清掉 workspace 的 node_modules（2026-10-27、2026-11-10 两次实录）；同时确认 chrome 进程数为 0（headless chrome 残留曾把 npm test 22s 拖到 700s）。
- 本计划不新增任何 t() 用户文案键，i18n zh/en 双字典 parity 守卫测试须保持全绿（守卫存在即验证）。

## 输入工件

- grill-with-docs 共识：本对话 2026-11-10 十一题决议（Q1–Q11 全按推荐）。
- 事实侦察报告 2026-11-10（子代理 30d090db）：测试断言面、jsdom 先例、ADR 冲突检查（无冲突）、验证口径、发版惯例。
- `docs/adr/0001-client-vanilla-rewrite-and-body-float-shell.md`（seam 与 bundle 纪律）、`docs/adr/0003-merged-capsule-single-pill-option3.md`（ADR 文体先例）。
- `docs/verification.md` §12.16 / §12.17 / §12.23 / §12.24。
- `GLOSSARY.md`（快照词条）。
- 关键现状行段（辅助定位，非唯一契约）：
  - `client/store.mjs` set L76-84、pollQuotes L149-161、restartPolling L163-176
  - `client/list.mjs` 冻结 L369、焦点抢救 L392+L411-412、`rowsEl.replaceChildren()` L393
  - `client/detail.mjs` 光标捕获 L568-572、整段重建 L574、光标恢复 L707-715、图表 key 守卫 L743-746、编辑跳绘守卫 L751-755、paintLive L408-433
  - `client/panel.mjs` picker 重建 L365-385、render L331-408、update L430-440
  - `scripts/build-client.mjs` `minify: false` L16
  - 改漏斗会破的测试：`tests/client-round3.test.mjs:280-309`、`tests/client-restyle.test.mjs:304-334`

## 冻结契约断言面清点（B12 逐项 → 钉它的测试 → 本计划触碰方式）

| 契约 | 断言面（测试文件:位置） | 本计划触碰方式 |
|---|---|---|
| 输入框跨 tick 身份稳定（§12.17） | client-restyle.test.mjs L290（add 输入框 equal）、L325（detail 编辑中 equal）；client-detail-r6.test.mjs L267（equal） | 改写 client-restyle L304-334：保留 equal 方向，翻转 L328 notEqual 为「失焦后身份不变」；其余 equal 断言原样保留且在 patch 语义下继续成立 |
| 拖拽几何快照假设（§12.24） | client-drag.test.mjs（5 例）、client-capsule-drag-close.test.mjs（3 例） | 冻结改 patch-only；零节点增删由 client-render-identity 拖拽例钉住；手势注入夹具不动 |
| i18n zh/en parity | i18n.test.mjs（9 例，字典 parity + 键位对齐守卫） | 零新文案键，全绿即证 |
| picker 顺序契约（A-H-U-C + sort） | client-dom.test.mjs L464-492（L484 序断言） | structural 含 business → rev 变化整段重建保序；quotes-only tick 不触 render |
| bundle 两次构建 sha256 幂等（ADR-0001） | package-shape.test.mjs（5 例）+ Task 5 Step 2 显式双构建比对 | minify 改变产物但幂等性由同脚本确定性保证，双构建比对验证 |
| 浮动壳契约（GLOSSARY 执有） | client-dom.test.mjs L932-1015（mountKanban/apply 契约）+ package-shape | 本计划不动挂载结构，仅 errorGlobal 写入门控 |

## 文件结构与职责

- Create: `tests/client-store-slices.test.mjs` —— deriveChanged / emit 跳过 / changed 契约的单元测试。
- Create: `tests/client-render-identity.test.mjs` —— 跨 tick 节点身份回归（detail 图表、panel picker、detail 空转早退、拖拽中 patch-only）。
- Create: `docs/adr/0004-render-slice-broadcast-and-live-patch.md` —— 渲染漏斗演进决定。
- Modify: `client/store.mjs` —— set() 内 deriveChanged + emit 跳过；快照携带 changed。
- Modify: `client/list.mjs` —— keyed 行复用；删焦点抢救；拖拽冻结改 patch-only。
- Modify: `client/detail.mjs` —— 骨架静态化 + 活区 patch + 图表按数据引用替换；删编辑跳绘与光标恢复；detail 空转早退。
- Modify: `client/panel.mjs` —— chrome 门控（picker 按 rev 重建；quotes-only tick 跳过 chrome 与布局读）。
- Modify: `client/main.mjs` —— errorGlobal 按 quoteMetaError 分片门控（其余 renderAll 结构不动）。
- Modify: `scripts/build-client.mjs` —— `minify: true`。
- Modify: `GLOSSARY.md` —— 新增变更切片/活区两词条，修订快照词条。
- Modify: `docs/verification.md` —— §12.17/§12.24 追记机制替换；新增 §12.25（Task 7 写入实拍结果）。
- Test（改写）: `tests/client-round3.test.mjs`（list 身份语义）、`tests/client-restyle.test.mjs`（detail 身份语义）。
- Generated: `lib/client.js`（每次触碰 client/ 后 `npm run build` 重建，随同 commit）。

**接口契约（全计划唯一权威定义，各任务直接引用）**：快照新增字段

```text
snapshot.changed: {
  quotes: Set<string> | "all",  // 内容实质变化的标的 id 集合；"all" = 全量
  business: boolean,            // business.rev 或 loaded 变化
  ui: string[] | "all",         // 变化的 ui 键名数组（如 ["lastMarket","panelOpen"]）；"all" = 全量
  quoteMetaError: boolean,      // quoteMeta.error 变化
} | undefined                   // undefined = 全量（回放/语言切换/旧快照）
```

- 实质变化判定域（决定 emit 或静默）：quotes 行 fingerprint（`JSON.stringify(row` 剔除 `fetchedAt`；quoteTime **计入**——行情时间是展示字段，休市/停牌指纹不变 → 静默，盘中常变 → 正常 emit，符合「没变化就别动」意图）+ `business.rev`/`loaded` + ui 逐键 `!==` + `quoteMeta.error` + providers 引用 + toast 值。**providers 引用是例外通道**：poll 响应每 tick 携带新构造的 providers 引用（src/quotes.mjs L141 health() Object.fromEntries、routes.mjs L281/L363、client/store.mjs L157 每 poll 写入）→ poll 路径恒 emit（休市/停牌 tick 也是，quotes 为空切片），**emit 跳过只在非 poll 的 set 路径生效**——此为 B3 基线行为，例⑨钉住，实现者不得擅自改成 providers 内容比对。
- 行引用相同（本 tick 未轮询到的 id）直接判不变，不算 fingerprint。
- **changed 只随 emit 投递，不入 state**：`emit()` 对每个监听者投递浅拷贝 `l({ ...state, changed })`；`state` 本体与 `getState()` 永不携带 changed 字段。订阅即刻回放（listener(state)）与语言切换（main.mjs 直呼 `renderAll(store.getState())`）拿到的快照无 changed → 天然全量。
- emit 跳过（判定域全等）→ 更新 state、不 emit、不产生任何携带 changed 的快照。
- toast/providers/quoteMeta.fetchedAt 变化 → 照常 emit 但 quotes/business/ui 为空切片，视图据此跳过。

## 任务清单

### Task 1: client/store.mjs 切片广播（deriveChanged + emit 跳过 + changed 契约）

- 目标：store 成为唯一知道「什么变了」的模块；无实质变化零重绘（poll 路径恒 emit 空切片——providers 引用例外通道，见接口契约注记；非 poll 全等路径零 emit）。
- 涉及文件：Modify `client/store.mjs`；Create `tests/client-store-slices.test.mjs`。
- 接口契约：
  - Consumes: 现有 `createStore(storage)` 签名与 `tests/client-ui.test.mjs:112-123` 的订阅测试形态（jsdom/storage 注入先例）。
  - Produces: 「接口契约」节定义的 `snapshot.changed`（Task 2/3/4/及 main.mjs 门控消费）；`npm test` 全绿基线。
- 验证范围：`npm test` 全绿（新文件用例 + 既有用例无回归；基线总数以命令输出为准，2026-11-10 实测 272/272/0）。

- [ ] Step 1: 写失败测试 `tests/client-store-slices.test.mjs`，覆盖九例：①相同 quotes 内容但 fetchedAt 变化 → 不 emit；②单 id price 变化 → emit 且 `changed.quotes` 为含该 id 的 Set；③`setUi({lastMarket:"hk"})` → `changed.ui` 含 "lastMarket"；④rev 变化 → `changed.business === true`；⑤quoteMeta.error 变化 → `changed.quoteMetaError === true`；⑥先驱动至少一次带切片的 emit（改价），再新建第二个订阅 → 回放快照 `changed === undefined`（钉住 changed 不残留于回放路径）；⑦仅 toast 变化 → emit 但 quotes 为空 Set、business false、ui 空数组；⑧任意带切片的 emit 之后 `store.getState()` 不含 changed 字段（钉住 state 纯净）；⑨providers 引用变化、其余判定域全等 → 照常 emit 且 quotes 为空 Set、business false、ui 空数组（钉住 poll 恒 emit 的 B3 基线，防实现擅自改成 providers 内容比对）。注入形态抄 `tests/client-ui.test.mjs` 的 store 夹具（显式 storage 或 globalThis）。
- Run: `npm test`
- Expected: 新文件用例全红（现状 set 无 changed、无跳过——快照上读不到 changed 字段，断言 undefined/不 emit 的用例失败）。
- [ ] Step 2: 运行确认失败信号如上。
- Run: `npm test 2>&1 | tail -20`
- Expected: `client-store-slices` 各例 fail，其余 pass。
- [ ] Step 3: 最小实现 `client/store.mjs`：`deriveChanged(prev, next)`（按「接口契约」判定域；rowFingerprint = 剔除 fetchedAt 的 JSON.stringify，引用相同短路）；`set()` 换 state、算 changed；判定域全等 → 直接 return（不 emit）；否则 `emit(changed)`——emit 改为对每个监听者投递浅拷贝 `l({ ...state, changed })`，**state 本体与 getState() 不挂 changed**；`subscribe` 回放传 state 本体（无 changed → 全量）。不改 pollQuotes/restartPolling。
- [ ] Step 4: 运行确认通过。
- Run: `npm test`
- Expected: 全绿 0 fail（既有用例数以命令输出为准）。
- [ ] Step 5: checkpoint commit（含重建 bundle）：`npm run build && git add client/store.mjs tests/client-store-slices.test.mjs lib/client.js && git commit -m "feat(client): store 切片广播——emit 携带变更切片，无实质变化跳过重绘"`

### Task 2: client/list.mjs keyed 行复用 + 焦点抢救/拖拽冻结退役

- 目标：quotes tick 行节点身份不变、行内数字原位改写；结构变化（business/ui 结构键）才整区重建；拖拽中 patch-only；删两处补偿补丁。
- 涉及文件：Modify `client/list.mjs`；Modify `tests/client-round3.test.mjs`（280-309 用例改写）；Create 用例并入 `tests/client-render-identity.test.mjs`（拖拽 patch-only 例）。
- 接口契约：
  - Consumes: `snapshot.changed`（Task 1）；`tests/helpers/dom-harness.mjs` 的 `createDomHarness`/`firePointer`；`tests/client-drag.test.mjs` 的拖拽手势注入先例；jsdom focus 需先入文档（§12.17）。
  - Produces: list 视图 patch 语义（Task 4 的 panel.update 转发依赖其自门控行为）。
- 验证范围：`npm test` 全绿；被改写用例从「断言被替换」翻转为「断言身份不变」。

- [ ] Step 1: 改写 `tests/client-round3.test.mjs:280-309`：原 `assert.notEqual(again, second, "行节点已被替换")`（L303）翻转为 `assert.equal(again, second, "行情 tick 行节点身份不变")`，焦点断言改为原行仍持焦（不再有「归还新行」）；同文件 L304 焦点归还描述文案同步。先跑：此时实现仍是整段重建，equal 断言红。
- Run: `npm test 2>&1 | tail -20`
- Expected: `list · 轮询…焦点` 用例红（现状重建导致 again !== second）。
- [ ] Step 2: 实现 keyed 行复用：`rowsEl` 子节点按 `dataset.id` 建 Map 缓存；`update(snapshot)` 判序——`changed === undefined` 或 `changed.business` 或 `changed.ui` 含 `lastMarket/holdingsOnly` → 整区 `replaceChildren` 重建（保留现 buildRow 路径）；否则对 `changed.quotes ∩ 当前行集` 逐行原位写**行内动态域**：价格/涨跌 span + tailCol 双分支——holdingsOnly 且有持仓行的 `skc-row-pnl`（pnl/pnlPct，list.mjs L337-353），否则 `skc-row-target` 列（L333-358）——复用行内既有 span 引用，不增删节点。detail 视图（`ui.view !== "list"`）且无 business 变化 → 直接 return（不白做）。新鲜度注记：detail 期间不 patch 列表行**不会**造成切回 stale——backToList（store.mjs L196-198）即经 restartPolling（L163-176）触发即时 pollQuotes（L175），最新数与现状同样来自该次 emit；且 detail 期间 poll 只 merge 被轮询 id（L155-156），state.quotes 对列表行本就未变，重建与跳过展示内容逐 emit 相同（唯一例外：detailId 行自身在 detail 期间被 merge 过新值，backToList 的 emit#1 至 poll 响应落地间存在 ≤1 个 poll RTT 的首屏显示差异窗口，仅一行、数字本就滞后一个轮询周期，已接受此窗口——勿以「防 stale」为由给判序加 view 触发重建）。
- [ ] Step 3: 删 L392 与 L411-412 焦点抢救；L369 `dragActive` 早退改为「拖拽中仅执行文本 patch 分支、跳过一切节点增删/重排」（几何快照假设不变）。
- [ ] Step 4: `tests/client-render-identity.test.mjs` 新增拖拽 patch-only 例：firePointer 起 grip 长按拖拽 → 注入一次 quotes 变化快照 → 断言 `rowsEl.children.length` 不变、目标行价格文本已更新、行节点引用不变；endDrag 后 reorder mutate → 整区重建语义正常。jsdom 环境注意先 `document.body.append` 面板层。
- Run: `npm test`
- Expected: 全绿 0 fail。
- [ ] Step 5: checkpoint commit：`npm run build && git add client/list.mjs tests/client-round3.test.mjs tests/client-render-identity.test.mjs lib/client.js && git commit -m "feat(client): list keyed 行复用——quotes tick 原位 patch，焦点抢救/拖拽冻结退役"`

### Task 3: client/detail.mjs 骨架静态化 + 活区 patch + 图表按数据引用替换；跳绘/光标补丁退役

- 目标：detail 视图骨架一次构建；行情数字活区原位写；图表节点仅在 `chart.data` 引用变化时替换；删两处补偿补丁。
- 涉及文件：Modify `client/detail.mjs`；Modify `tests/client-restyle.test.mjs`（304-334 改写）；Modify `tests/client-render-identity.test.mjs`（新增 detail 例）。
- 接口契约：
  - Consumes: `snapshot.changed`（Task 1）；现有 `paintLive`（detail.mjs L408-433）、`buildChartBox`（L299-333）、`loadChart` key 守卫（L743-746）、`chart` 状态对象；add.mjs 骨架静态化先例（client/add.mjs L131-223）；jsdom focus 先入文档纪律。
  - Produces: detail 视图 patch 语义；`tests/client-render-identity.test.mjs` 中 detail 用例（Task 7 实拍的场景③对应物）。
- 验证范围：`npm test` 全绿；`client-detail-r6`（13 例）与 `client-detail-fit`（10 例）无回归。

- [ ] Step 1: 改写 `tests/client-restyle.test.mjs:304-334`：L328 `assert.notEqual(..., "失焦后恢复重绘")` 翻转为「失焦后 tick，输入框节点身份不变、行情文本已原位更新」；L325「编辑中同一节点」保留（patch 下继续成立）；用例名去掉「恢复重绘」旧机制措辞。先跑确认红（现状失焦后整段重建换节点）。
- Run: `npm test 2>&1 | tail -20`
- Expected: 该用例红。
- [ ] Step 2: `tests/client-render-identity.test.mjs` 新增三例：①图表 SVG 根节点跨 quotes tick 身份不变且 `chart.data` 未变；②`store.openDetail(其他 id)` → detail 层骨架重建（节点引用变化），旧输入框不残留；③list 视图下 quotes tick → detail 层 DOM 不动（早退）。jsdom 注入形态抄 `tests/client-dom.test.mjs:348-369` setupList 的 globalThis 路径。
- Run: `npm test 2>&1 | tail -20`
- Expected: 三例红（现状每 tick 整段重建）。
- [ ] Step 3: 实现骨架 + 活区：`render()` 拆为 `mountSkeleton(symbol)`（head/报价行结构/周期 Tab/图表框/持仓表单/目标价表单/确认条插槽一次构建，事件监听挂骨架）+ `patchLive(snapshot)`（活区清单：价格、涨跌幅、行情时间/quoteTime 行、`paintLive` 现有派生域——距现价、市值盈亏、target 提示文案与 title、stale/no-data 提示、保存按钮 disabled 态、unsaved 标记）。重建触发：`changed === undefined`、`changed.business`、`changed.ui` 含 `view/detailId`、或 `symbolOf()` 变化；quotes-only tick → 仅 `patchLive`。图表：`loadChart` 完成（`chart.data` 引用变化）→ `chartBox.replaceChildren(buildChartBox(...))`；tick 且 data 未变 → 图表零改动。输入框 value 仍由 draft 状态持有（现行为不变）。
- [ ] Step 4: 删编辑跳绘守卫（现 L751-755 的 `active.dataset?.field` 早退分支——patchLive 已不销毁输入框，守卫失去存在理由）与光标捕获/恢复（现 L568-572、L707-715）。
- Run: `npm test`
- Expected: 全绿 0 fail。
- [ ] Step 5: checkpoint commit：`npm run build && git add client/detail.mjs tests/client-restyle.test.mjs tests/client-render-identity.test.mjs lib/client.js && git commit -m "feat(client): detail 骨架静态化+活区 patch——图表按数据引用替换，跳绘/光标补丁退役"`

### Task 4: client/panel.mjs chrome 门控 + main.mjs errorGlobal 门控

- 目标：picker/header/footer 等 chrome 不随 quotes tick 重建；quotes-only tick 跳过 `placePanel`/`refreshScrollCues` 布局读链；errorGlobal 按 quoteMetaError 分片门控。
- 涉及文件：Modify `client/panel.mjs`、`client/main.mjs`；Modify `tests/client-render-identity.test.mjs`（新增 picker 例）。
- 接口契约：
  - Consumes: `snapshot.changed`（Task 1）；`client-dom.test.mjs:464-492` picker 顺序契约（A-H-U-C 组序 + sort 序，必须继续全绿）；`mountKanban` 夹具（`tests/client-dom.test.mjs:932-966` 先例）。
  - Produces: panel chrome 门控语义（Task 7 实拍场景⑤的双层叠哨兵依赖其稳定）。
- 验证范围：`npm test` 全绿（含 picker 顺序契约 464-492）。

- [ ] Step 1: `tests/client-render-identity.test.mjs` 新增三例：①面板开 list 视图，注入 quotes-only tick → `pickerSelect` 全部 option 节点引用不变；②注入 `business` 变化（如增删标的的 rev bump）→ picker 重建且 option 序 = A-H-U-C + sort（与 client-dom:484 同构断言）；③仅 toast 变化（store.setToast → set({toast:null}) 两步驱动，不等 4s 定时器）→ toast 节点原位显示后隐藏，且全程 picker option 节点引用不变（钉住 toast 轻路径不走全 render）。
- Run: `npm test 2>&1 | tail -20`
- Expected: 例①③红（现状每 render 重建 picker，panel.mjs L365；toast 写点在 render() 内 L403-404，空切片下不刷新）。
- [ ] Step 2: 实现 chrome 门控：`panel.update(next)` 维护模块内 `prevToast` 引用，每次 update 先比对 `snapshot.toast`——变化 → 仅原位写 toast 节点（现 render() 内 toast 写点 L403-404 抽为 `patchToast(snapshot)`，structural render 路径复用它）；`structural = changed === undefined || changed.business || changed.quoteMetaError || changed.ui 含 panelOpen/view/showAdd/showSettings/lastMarket/capsuleSymbolId/quotaCapable/quotaMerge`（quoteMetaError 入列：header 的 skc-quote-error 状态类与 headerMeta 文案随 error 切换，panel.mjs L352-355，现有测试钉着）；structural 才执行现 `render()`（含 picker 重建、placePanel、refreshScrollCues）；`views.list.update` / `views.detail.update` 无条件转发（两视图已自门控）。`client/main.mjs` errorGlobal 块（L107-109）改为仅 `changed === undefined || changed.quoteMetaError` 时写。
- Run: `npm test`
- Expected: 全绿 0 fail。
- [ ] Step 3: checkpoint commit：`npm run build && git add client/panel.mjs client/main.mjs tests/client-render-identity.test.mjs lib/client.js && git commit -m "feat(client): panel chrome 按 rev 门控——picker 不随行情 tick 重建"`

### Task 5: 构建开启 minify + 指纹探针核查

- 目标：注入产物减半；确保 cdp-shot 指纹探针在 minify 产物下仍有效。
- 涉及文件：Modify `scripts/build-client.mjs`；Generated `lib/client.js`。
- 接口契约：
  - Consumes: bundle 幂等纪律（ADR-0001）；`scripts/cdp-shot.mjs` 指纹探针（§12.16）。
  - Produces: minified `lib/client.js`（Task 7 实拍的对象）。
- 验证范围：两次构建 sha256 一致；体积 < 130KB；`npm test` 全绿。

- [ ] Step 1: `scripts/build-client.mjs` L16 `minify: false` → `minify: true`。
- [ ] Step 2: 幂等与体积验证：连续两次构建比对 sha256；产物字节数落区间。
- Run: `npm run build && shasum -a 256 lib/client.js && npm run build && shasum -a 256 lib/client.js && wc -c lib/client.js`
- Expected: 两次哈希一致；字节数 < 130000（预期约 90000-110000）。
- [ ] Step 3: 核查 `scripts/cdp-shot.mjs` 指纹串来源：若探针依赖非字符串字面量（注释、代码格式），改用运行时可见字符串（VERSION_LABEL 或专用 marker 常量）；改动同 commit。
- [ ] Step 4: 全量测试确认 package-shape 等不受影响。
- Run: `npm test`
- Expected: 全绿 0 fail。
- [ ] Step 5: checkpoint commit：`git add scripts/build-client.mjs scripts/cdp-shot.mjs lib/client.js && git commit -m "build: minify 开启——注入产物减半，指纹探针串核查适配"`

### Task 6: 文档收口（ADR-0004 + GLOSSARY + verification 追记）

- 目标：决定与术语随代码落盘，未来探索者不再重新提议全量重建。
- 涉及文件：Create `docs/adr/0004-render-slice-broadcast-and-live-patch.md`；Modify `GLOSSARY.md`、`docs/verification.md`。
- 接口契约：
  - Consumes: 本计划「架构快照」节；ADR-0003 文体（Status/Supersedes/Context/Decision/Considered options/Consequences）；GLOSSARY 现有词条格式（词条 + _Avoid_）。
  - Produces: ADR-0004（后续架构评审引用）；GLOSSARY「变更切片」「活区」词条。
- 验证范围：三项文档交叉引用一致；无行号级依赖写死。

- [ ] Step 1: 写 ADR-0004：Context（全量重建的两起实机事故与 4 处补偿补丁、每 tick 白建整棵图表 SVG——K 线 180 根 ≈ 540+ 节点，与架构快照同口径）；Decision（切片广播契约 = 快照携带 changed、判定域、视图自门控三条重建触发、4 处补丁退役、拖拽 patch-only 约束）；Considered options（订阅侧切片选择器、全量重建 + 补丁维持现状）；Consequences（快照词条扩展、图表替换语义、quotes-only tick 静默语义）。标注：不推翻 ADR-0001 的漏斗 seam，是其内部演进。
- [ ] Step 2: GLOSSARY 新增「变更切片（Changed Slices）」「活区（Live Region）」两词条；「快照」词条补一句「快照可携带变更切片，缺省视为全量」。Avoid 行按现有格式给中式反义词（如 diff、脏检查；热区、动态区）。
- [ ] Step 3: verification §12.17 追记「机制替换」段（跳绘守卫退役，patch 保身份承接软键盘契约，回归钉改指 identity 测试）；§12.24 同样追记（拖拽冻结 → patch-only，几何快照假设不变）。
- Run: 通读三文件核对词条名/ADR 编号/§ 号一致
- Expected: 无占位、无前后矛盾。
- [ ] Step 4: checkpoint commit：`git add docs/adr/0004-render-slice-broadcast-and-live-patch.md GLOSSARY.md docs/verification.md && git commit -m "docs: ADR-0004 切片广播+活区 patch——GLOSSARY 两词条与 §12.17/§12.24 追记"`

### Task 7: 最终验证与 §12.25 实拍记录

- 目标：全量回归 + 活体实拍六场景，结果写入 verification §12.25。
- 涉及文件：Modify `docs/verification.md`（新增 §12.25）。
- 接口契约：
  - Consumes: Task 1-5 全部产出；`scripts/cdp-shot.mjs`；chrome 进程纪律（§12.16）。
  - Produces: §12.25 实拍记录（含用例总数、六场景结果、bundle 指纹）。
- 验证范围：本任务自身即最终验证。

- [ ] Step 1: 环境前提核查：`test -d node_modules`（缺失按锁文件恢复）；chrome 进程数为 0。
- [ ] Step 2: 全量测试 + 构建幂等复跑。
- Run: `npm test && npm run build && shasum -a 256 lib/client.js`
- Expected: 全绿 0 fail；哈希与 Task 5 一致。
- [ ] Step 3: cdp-shot 六场景实拍（纪律见 scripts/cdp-shot.mjs 头注：chrome 一律后台起跑、假活 `--down` 重启、重活前进程清零、用完 pkill `[c]` trick）：①列表 tick 数字原位刷新（DOM 断言行节点身份跨 tick）；②拖拽中 tick（零节点增删）；③详情编辑中 tick（焦点/光标不断、输入框身份稳定）；④增删标的后 picker 序 = A-H-U-C + sort；⑤三视口截图（桌面面板/窄屏 sheet/详情）+ 双层叠渲染哨兵（列表视图下详情层 display none）；⑥console error 计数 0。指纹探针（新串在/死串不在）+ HMR/指纹下发 rev 比对两轮。
- [ ] Step 4: §12.25 写入实拍结果：日期、改动摘要、用例总数（以命令输出为准）、六场景逐条证据、bundle sha256、遗留观察项（如 minify 后首屏加载对比）；若有环境受限未跑的场景，如实记入「未验证项与降级」——未验证不冒充已验证（§12.x 追记式纪律）。
- [ ] Step 5: 最终 commit：`git add docs/verification.md && git commit -m "docs: verification §12.25 切片广播改造实拍记录"`

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务顺序执行，不无声跳步、合并步或改变任务目标；每任务完成即跑该任务的验证。
- Task 2/3 先改测试跑红、再实现跑绿——红是身份语义翻转存在的证明，不许跳过红灯步。
- 遇阻塞、重复失败或计划与仓库现实不符（行段漂移、测试基线变化），立即停下说明，不猜。
- 每个 Task 的 checkpoint commit 必须含重建后的 `lib/client.js`（凡触碰 client/ 的 commit；Task 6/7 纯文档除外）。
- 长命令（build/cdp-shot/chrome）一律 run_in_background 起跑，经日志取结果；前台序列一次一条。
- 全部任务完成后输出修改摘要（文件清单 + 用例数变化 + 实拍结论）。

## 最终验证

- `npm test` 全绿 0 fail（用例总数以命令输出为准，§12.1 口径）。
- `npm run build` 连续两次 sha256 幂等，`lib/client.js` < 130KB。
- cdp-shot 六场景全过：指纹在/死串不在、双层叠哨兵、console 0、三视口截图正常。
- `git log` 复核：7 个 checkpoint commit 各含其声明的文件；4 处补丁删除无残留（detail 跳绘/光标恢复、list 焦点抢救已不在源码；list 拖拽冻结已改 patch-only）。
- verification §12.25 记录完整（含未验证项——如有）。
- 本计划不 push；push 前确认 `git config core.hooksPath .githooks` 已配置（pre-push 全量测试门禁，红灯不得落进远端历史）。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。
- 审阅通过后，默认执行方为普通编码 agent 或人工执行者，按任务顺序消费本计划。
