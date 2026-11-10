# 切片广播 + 活区 patch：渲染漏斗的演进（取代「update 即全量重建」惯例）

**Status**: accepted（2026-11-11，实施「渲染切片广播 + 活区 patch」改造；经三轮独立评审收敛，评审台账 `.dsh-research/render-plan-review-scratch/ledger.md`）

**Supersedes**: 无——ADR 0001 的「订阅漏斗（store.subscribe → 单一 renderAll）+ 视图簇 `{ el, update(snapshot), dispose }` seam」决定维持不变；本 ADR 是该 seam 内部的演进细化，不推翻任何既有 ADR。

## Context

- 旧惯例：`store.set()` 无相等性检查，每次 emit 触发 renderAll，list/detail 整段 `replaceChildren()` 重建——detail 视图每次 tick 白建整棵图表 SVG（K 线 180 根 ≈ 540+ 节点，数据并未变化：图表数据本身有 fetchKey 守卫不重拉，重画纯属 DOM 浪费）。
- 为此散落 4 处「重建补偿」补丁：detail 编辑跳绘守卫、detail 光标捕获/恢复、list 焦点抢救、list 拖拽冻结——各带失效模式（跳绘只认 `data-field` 输入框：确认条/周期 Tab 按钮聚焦时键盘焦点照样每 15s 丢失）。
- 同一种病已发版后实机引爆两次：detail 编辑丢软键盘（§12.17）、add 对话框同根因（§12.17 第一层）；capsule.mjs（原位 textContent）与 add.mjs（骨架静态化）已经各自发明了一遍正确模式——正确做法在库内，只是没长成模块。

## Decision

1. **切片广播契约**：快照投递携带变更切片 `changed = { quotes: Set<id>|"all", business: boolean, ui: string[]|"all", quoteMetaError: boolean }`；`changed` 只随 emit 浅拷贝投递（`l({ ...state, changed })`），**state 本体与 `getState()`/订阅回放永不携带**——缺省（undefined）即全量语义（回放、语言切换直呼 `renderAll(getState())` 天然全量）。
2. **实质变化判定域**：quotes 行指纹（JSON 序列化剔除 `fetchedAt`；`quoteTime` 计入——它是展示字段，休市/停牌指纹不变 → 静默）+ `business.rev/loaded` + ui 逐键 + `quoteMeta.error` + providers 引用 + toast 引用。全部相等 → 更新 state 但不 emit。**providers 引用是例外通道**：poll 响应每 tick 新引用 → poll 路径恒 emit（quotes 为空切片），emit 跳过只在非 poll 的 set 路径生效。
3. **视图自门控**：重建触发收敛到三条——`changed` 缺省（全量）、`changed.business`（结构变化）、`changed.ui` 含各视图结构键；quotes-only tick 一律活区 patch。detail 空态（list 视图）早退不白做。
4. **detail 骨架**：按标的一次构建（头部/报价行结构/周期 Tab/图表框/持仓表单/目标价表单/确认条插槽）；报价行与派生域（paintLive）原位写；图表仅在其数据引用变化（loadChart 完成/失败）、周期切换、resize 时重画。
5. **list keyed 行复用**：行结构按 symbol 身份跨 tick 复用，行内动态域（价格/涨跌/尾巴列双分支）原位写；`business` 或结构键变化才整区重建。拖拽中 patch-only（零节点增删/重排，几何快照假设不变；结构重建跳过标记、endDrag 补一次全量）。
6. **panel chrome 门控**：picker/header/footer 按 `business`、`quoteMetaError` 与面板结构键（panelOpen/view/showAdd/showSettings/lastMarket/capsuleSymbolId/quotaCapable/quotaMerge）门控；toast 走 `patchToast` 引用比对轻路径，不依赖全 render。
7. **四处补偿补丁退役**：detail 编辑跳绘守卫、detail 光标捕获/恢复、list 焦点抢救、list 拖拽冻结（机制替换追记见 verification §12.17/§12.24）。构建脚本版本注入断言随 minify 开启改为字面量检查（版本字面量在 + `__APP_VERSION__` 标识符不在）。

## Considered options

- **订阅侧切片选择器**（`subscribe(fn, selectors)`）：五个视图的规模下是过度设计——只有一个 adapter 的 seam 是假想 seam；快照自带切片改动面最小、测试接线不动。
- **维持全量重建 + 补丁**：同种病已引爆两次、每个新交互（确认条、新表单字段、新 Tab）都是下一个爆点；五处守卫是永续利息，修根因是一次性兑付。

## Consequences

- GLOSSARY「快照」词条扩展（可携带变更切片）并新增「变更切片」「活区」两词条。
- 图表节点替换语义明确：tick 零改动，数据引用变化/周期切换/resize 才重画——「切周期卡片弹跳」类问题的根源面进一步收窄。
- 移动端每 15s 一次的 600 节点级重建 + 布局读链消失；键盘焦点、文本选区、IME 组合在全视图受身份稳定保护（不再只护输入框）。
- 已知遗留（本 ADR 不覆盖，另行安排）：服务端 `getQuoteFull` 绕过缓存/退避（第二落点）；单市场 >60 只行情截断无提示；`detail.mjs` onWinResize 仍走骨架重建（与现状等价，编辑中 resize 行为留实拍观察）。
