# 测试与验证记录（12.x）

## 12.1 核心逻辑（自动化，全部通过）

`npm test` → node --test 93 用例 / 93 通过 / 0 失败（Node v24.20.0，2026-11-09；含类名缝守卫与设置态渲染新增 4 用例，见 12.6/12.7）。

| 覆盖点 | 用例位置 |
|---|---|
| 持仓市值/浮动盈亏/比例 | tests/portfolio.test.mjs |
| 零成本/缺失价格/非法输入（不产出伪 0%/NaN/Infinity；价格缺失不显示虚假全额亏损） | tests/portfolio.test.mjs |
| 小数数量与价格精度（加密 8 位小数） | tests/portfolio.test.mjs |
| 按币种汇总（USD≠USDT 不合并、汇总盈亏比例按汇总成本、部分缺行情 partial 显式标注） | tests/portfolio.test.mjs |
| 目标价边界等于即触发/离开消失/未设置/both 重叠/过期不伪装/无时间戳保守 stale | tests/targets.test.mjs |
| 备份导出导入校验（结构/kind/schemaVersion/单条非法 rejected 不中断/重复 rejected/身份一致性） | tests/model.test.mjs |
| 标的身份（市场/代码/报价币种三元组、裸代码补前缀、号段白名单、名称不作键） | tests/identity.test.mjs |
| 存储（CRUD 推 rev、损坏文件隔离保字节、写链串行并发不丢失、导入覆盖与回滚、失败不删数据） | tests/store.test.mjs |
| 行情服务（TTL 合并、失败退避不打上游、退避回退陈旧缓存、每标的独立判错） | tests/quotes-service.test.mjs |
| 路由（同源 403、CAS 409 带最新态、重复 409、无效代码 422、搜索失败明确报错、导出导入往返、health 无业务数据） | tests/routes.test.mjs |
| 腾讯解析（批量快照字段/时间戳→epoch、K线列序与 qfq/none 口径、分时点过滤、prevClose 推导、smartbox 类型过滤） | tests/providers-tencent.test.mjs |
| 客户端纯函数（隐私遮挡、价格自适应精度、拖动阈值、视口钳位、边缘吸附、涨跌色类名语义、均线计算） | tests/client-ui.test.mjs |

测试夹具（上游响应采样文本）仅存在于 tests/ 内，不进入生产行情路径；单测不依赖外网（fetch 全 mock）。

## 12.2 / 12.3 交互与生命周期（真实浏览器端到端，2026-11-07 04:30–04:40）

环境：本机 Linux（Ubuntu，DSH 0.2.2-rc.1 web 实例 = deepseek-harness.service）+ Chrome for Testing 152 headless（BrowserSkill 扩展 + 自建 CDP evaluate 通道 `scripts/cdp-eval.mjs`）。本机场景即「Linux 浏览器访问（远端）DSH」使用方式。

| 验证点 | 结果 | 证据 |
|---|---|---|
| 插件在真实宿主激活、路由可达 | ✅ `GET /stock-kanban/health` → `{"driver":"dsh-storage",...}`（DSH 原生存储驱动，非回退） | curl + 页内 fetch |
| 胶囊挂载与显示（名称/现价/涨跌幅） | ✅ `.skc-capsule` = "贵州茅台 1,453.00 +0.07%" | CDP DOM 断言 |
| 点击展开面板 | ✅ 指针事件序列 → `.skc-panel` 出现 | CDP |
| 面板固定四市场分组 | ✅ Tabs = A 股/港股/美股/加密货币 | CDP |
| 搜索添加 + 去重标记 | ✅ 搜"茅台"→点击→"已添加"徽标 + disabled；重复请求 409 duplicate | CDP + 路由测试 |
| 直连代码添加（三市场） | ✅ 00700/aapl/BTC-USDT 全部过行情校验入库 | CDP toast |
| 直连无效代码拒绝 | ✅ cn 999999 → 422（不入库） | 路由测试（mock）+ 冒烟（真网） |
| 四市场实时行情上屏 | ✅ 1,453.00/+0.07% · 419.80/-2.46% · 343.71/-0.13% · 75,875.40/-0.24% | CDP |
| 详情结构与时间标注 | ✅ 行情 16:14 · 拉取 04:37:36（区分展示）；名称/代码/市场/报价币种 | CDP |
| 分时图渲染 | ✅ SVG 269 元素（价格线+均价线+量柱）；港股时间轴含午休段 | CDP |
| 日K + 复权标注 + 均线 | ✅ "前复权"（A股）；港股周/月K 如实标注"不复权"；MA5/10/20/60 显隐 | CDP |
| 持仓保存与计算 | ✅ 100@1500@1453 → 市值 145,300.00 CNY · 盈亏 -4,700.00（-3.13%） | CDP |
| 目标价保存 | ✅ 1400/1800 保存成功回显 | CDP |
| 阈值重叠显式校验 | ✅ 1900>1800 → confirm 明确解释，取消不保存 | CDP（覆盖 window.confirm 捕获文案） |
| 隐私开关遮挡 | ✅ 盈亏列 → ••••；footer 标注"仅展示层，数据未加密"；实例级开关（服务端 settings） | CDP |
| 只看持仓筛选 | ✅ 过滤无持仓标的 + 盈亏列出现 + ★ 标记；重开浏览器后筛选被记住（访问端） | CDP |
| 详情返回保留上下文 | ✅ 返回后市场 Tab 保持激活（列表不卸载，滚动/筛选天然保留） | CDP |
| 快速切换标的防串数据 | ✅ 茅台详情未就绪即切腾讯 → 慢响应被 fetchKey 丢弃，最终显示腾讯图表 | CDP |
| 触价降级（过期行情） | ✅ 行情时间 16:14 已过期 → 胶囊 title"行情已过期或不可用：触价标记暂停显示"、0 个标记 | CDP |
| 胶囊拖动/吸附/记忆/防误触 | ✅ 拖到左缘 → 吸附 (8,195)、dock=left、localStorage 记忆、未误触展开 | CDP |
| 重载持久化（实例 vs 访问端边界） | ✅ 业务数据（rev=8、四标的、持仓、目标价）来自服务端实例存储；localStorage 仅存界面偏好键（pos/panelPos/lastMarket/holdingsOnly/maVisible/capsuleSymbolId），无业务数据 | CDP |
| 页面关闭停止刷新 | ✅ 设计即页面内定时器（无服务端常驻任务）；服务端缓存为惰性 TTL | 代码结构 + health |

## 12.4 环境验证

| 场景 | 状态 | 说明 |
|---|---|---|
| 3. Linux 浏览器访问（远端）DSH | **已验证** | 即本次端到端环境：Chrome for Testing 152（headless）访问 DSH 0.2.2-rc.1 web 实例。DSH 版本 0.2.2-rc.1、OS Ubuntu (VM)、Chrome 152.0.7977.82。 |
| 2. Windows 浏览器访问远端 DSH | **未验证**（代码路径同场景 3：同一份服务端 + 同一份客户端 bundle，浏览器端无平台分支代码） | 复现步骤：任意 Windows 浏览器（Edge/Chrome）访问 `https://<远端DSH地址>/`，确认右下角胶囊出现 → 点击展开 → 添加/持仓/图表。需注意远端入口若经认证网关，插件路由同源原则不受影响。 |
| 1. Windows 本机 desktop profile | **未验证** | 本机无 Windows 环境。插件已声明 `dsh.engines.dsh >=0.2.2-rc.1`，不依赖 webRuntime（0.2.1-rc.2 起移除项）；存储优先走 DSH storage hub，desktop 若无该服务自动回退文件驱动（health.driver 可查）。复现步骤：desktop 安装包后 `dsh plugin --profile desktop add <tarball>`，重启 desktop，确认胶囊与健康路由。 |

## 12.5 客户端契约测试（2026-11-08）

插槽契约（GLOSSARY「插槽契约」：bundle 挂载并完整渲染零未解析引用、转发 props 与快照形状一致）由 `tests/client-contract.test.mjs` 执有，9 用例全绿（全量 93/93）。机制：fake-slots 走真实 `apply()` 接缝取渲染函数，react 经 node:module resolve 钩子映射假实现（零新依赖、零 DOM harness），四态 UI 经 localStorage 种子走生产 `loadUi` 真实路径。

| 用例 | 拦截的事故类 |
|---|---|
| list / detail / add / settings 四态全树渲染零抛错 | 渲染期自由标识符 ReferenceError → 插槽整体卸载（MARKET_LABELS、quoteMeta 两次历史事故的整类）；settings 态另守「区块挪进对话框时组合点漏改」类（12.7） |
| 形状断言（undefined 且快照同名 prop = 违规） | 「快照改名字段、转发点静默失联」类 |
| 命中面（.skc-capsule / .skc-panel 显式 `pointer-events:auto`） | 父层 `.skc-root` 为 none、继承即对真实指针全免疫——0d950f3 样式重写曾丢失该声明，胶囊拖动/点击全失效（线上实录，04c1993 修复） |
| langObserver 生命周期（observe 被调、setup 不 disconnect、cleanup 才断） | effect 接线错位类（本次红案例：main.mjs 杂散 `langObserver.disconnect()` 使「跟随 DSH 界面语言」静默失效，红→绿修复留档） |
| 类名缝渲染态（三态种子渲染树 className token ⊆ CSS 定义） | trendClass 前缀错配整类：JS 产出 `sk-up/sk-down/sk-flat` vs 样式表 `.skc-up/.skc-down/.skc-flat`，涨跌配色自首版起从未生效（2026-11-09 架构走查暴露，见 12.6） |
| 类名缝源码全集（className/classList 静态扫描 + 动态生产者注册表，无豁免清单） | 死类/漂移整类：类名拼错、样式改名后 JSX 残留（修复时仓内并存 4 个死类，已删） |

守卫有效性自证：向 `client/capsule.mjs` 渲染路径回灌自由标识符 → 契约测试 4 用例即红（`__contractProbeFreeIdentifier is not defined`）→ 还原转绿。构建期 `FORBIDDEN` 符号黑名单已退役，契约测试为泄漏类唯一守卫；`npm test` 为发布门。类名缝守卫同法自证（2026-11-09）：回灌 `sk-up/sk-down` 前缀 → 源码全集用例即红（`类名缝漂移：sk-up（生产者产出）、sk-down（生产者产出）`）+ trendClass 语义单测红 → 还原转绿。

lifecycle 用例进程收尾多等约 4 秒属预期：effect 内 `refreshState()` 对相对 URL fetch 返回 rejected Promise → `.catch` → setToast → toast 自动消失定时器（≈4000ms）恰调度 1 次。

## 12.6 类名缝修复与守卫（2026-11-09，架构走查发现 → 已修复并验证）

事故：`trendClass` 产出 `sk-up/sk-down/sk-flat`，样式表定义的却是 `.skc-up/.skc-down/.skc-flat`——前缀差一字符，红涨绿跌自 20736d7（v0.1.0 首版）起从未生效；capsule/list/detail 全部消费点无色（A股语境红涨绿跌即核心信息编码）。
为何 89 用例没抓住：`trendClass` 不在任何测试面（client-ui.test.mjs 连 import 都没有），契约测试只对 CSS 文本做「规则存在」正则，从不校验「JS 产出的类名落在 CSS 里」——类名缝（CSS↔JSX）零对齐面。同缝此前已有一起事故（0d950f3 样式重写丢 pointer-events，04c1993 修复时也只补了 CSS 正则这一半守卫）：两次事故同缝，缝的形状错了，不是手滑。

修复：
1. `fmt.mjs` trendClass 前缀统一为 `skc-*`；
2. 删除 4 个无规则死类（守卫零豁免通过的前提）：`skc-dock-*`（capsule.mjs）、`skc-add-tabs`/`skc-add-known`（add.mjs）、裸 `skc-detail`（detail.mjs 容器；`.skc-detail-head`/`.skc-detail-title` 为真类不受影响）。四者均无 JS 钩子（client 内唯一 class 查询是 panel.mjs 的 `closest("button, input, label")`）。

守卫（tests/client-contract.test.mjs 新增 2 用例，双层、无豁免清单）：
- **渲染态**：三态种子经真实 `apply()` 接缝渲染，walkTree 收集全部 className token ⊆ `CSS_TEXT` 类名集（精确匹配，非前缀——前缀会漏放裸 `skc-detail` 这类）；
- **源码全集**：提取 client/*.mjs 全部 className 字面量/模板片段/classList 调用；模板 `${}` 内只收三元备选（`cond ? " a" : " b"` 惯用法），比较操作数不收——守卫首个红案例即 `ui.view === "detail"` 被误当类名，修正提取语义后转绿；className 位置的非字面量表达式必须在**动态生产者注册表**登记（现仅 trendClass），未注册即红；
- 单向断言（JS→CSS）：反向会被伪类/复合选择器打爆，不做。

验证：npm test 92/92（含 trendClass 语义单测 1 用例 + 类名缝守卫 2 用例）；CDP 真机目检（Chrome headless，同 12.2 环境）——红涨 `+0.07%/+0.14%` → `rgb(229,72,77)`、绿跌 `-1.98%/-2.46%/-0.12%` → `rgb(43,181,150)`、平盘 `—` → `skc-flat` 命中主题次级标签色 `rgb(159,180,189)`，截图人眼复核通过。修复经 profile 软链直达本机 DSH 实例，页面刷新即生效（无需重装插件）。

## 12.7 设置二级菜单（2026-11-09，用户需求 → 已实现并验证）

需求：备份与迁移区块从列表层收进二级菜单，由设置按钮唤出。
实现：面板头部新增 ⚙ 按钮（👁 ＋ ⚙ — 序）→ `ui.showSettings` 会话态（不落盘，`openPanel`/`closePanel` 双路复位）→ 复用 `skc-dialog` 全覆盖对话框（添加标的同款）承载 `BackupSection`；列表层不再常驻备份区，视觉减负。i18n 补 `app.settings` 双语（i18n.test 字典对齐守卫覆盖）。
验证：npm test 93/93（settings 态渲染零抛错新用例 + 类名缝渲染态守卫扩为四态种子）；CDP 真机——头部按钮序正确、列表层确认无备份区、点 ⚙ 弹出「设置（备份与迁移）」对话框（内含导出/导入）、✕ 关闭与重开回路通过，截图人眼复核通过。

## 12.8 对话框可读性地板 + 视觉密度修订（2026-11-09，用户实测反馈 → 已修复并验证）

**根因（CDP 取证实锤）**：用户激活的玻璃皮肤将 `--dsw-alias-bg-base` 定义为 `rgba(12,26,38,0.55)` 且 `--dsw-alias-bg-elevated` 未定义——覆盖层的 `color-mix(…97%,transparent)` 会按比例**保留原 alpha**，对话框实际不透明度仅 ≈53%，又无 backdrop-filter，下层行文字清晰透出（「根本看不清楚字」）。面板同 alpha 但有 blur(14px) 故可用。
**修法（三层表面统一）**：面板/对话框/toast/全局错误条改用「**相对颜色语法地板**」——`rgb(from var(--dsw-alias-bg-base,#1f1f1f) r g b / 1)` 取令牌色相、强制 alpha=1（主题自适应，浅色皮肤同样成立），前一行保留旧声明作老浏览器回落；保留 blur 做深度而非可读性依赖。
**视觉密度修订**（金融终端式克制密度，全部在 `--dsw-alias-*` 令牌体系内）：分段式市场 Tab（active 填充 + 独立计数徽标 `.skc-tab-count`）、行距/内边距全面收紧、等宽数字对齐、主/危险按钮改填充式、输入框 focus ring、hover/active 120ms 过渡、`:focus-visible` 可达性轮廓、细滚动条、面板/对话框/toast 入场动画（只动 chrome，数据行不动画）、面板 `overflow:hidden` 裁齐圆角。
**验证**：npm test 93/93（pointer-events 契约与类名缝守卫均完好，`.skc-tab-count` 纳入源码全集扫描）；CDP 真机三态截图（列表/设置对话框/添加对话框）——对话框与面板均为实底深色表面、零透底、文字清晰，人眼复核通过。

## 12.9 语言缝清理与守卫（2026-11-09，用户反馈「中英文混乱」→ 已修复并验证）

泄漏全量（node 字面量级 CJK 扫描取证）：
1. `charts.mjs:18/71` 硬编码「暂无分时数据/暂无K线数据」——`detail.chart.empty.*` key 早已定义却从未被调用（词典死键）；改走 `t()`。
2. `detail.mjs:152` 硬编码「市值…盈亏…」——`detail.holdings.meta` key 同样是死键；改走 `t()`（en: `Value {v} {ccy} · PnL {p} ({pct})`）。
3. `targets.mjs:66-72` 中文错误串直通 422 `body.error` → 客户端 `tErr` 查无此码原样透出；改稳定代码 `invalid-buy-target`/`invalid-sell-target` + i18n `err.*` 双语 + `tErr` 升级为逗号多码逐段本地化。
4. `identity.mjs` `MARKET_LABELS`（688454a 事故纪念品，零调用方）删除；`checkTargetRelation.message`（无 UI 消费的中文字段）移除，重叠文案归客户端 `t("detail.confirm.overlap")`（测试同步更新）。

守卫：`tests/i18n.test.mjs` 新增**语言缝静态守卫**——扫描 client/*.mjs（除 i18n.mjs）全部字符串字面量，命中 CJK 即红（面向用户的文案必须全部经 i18n 字典，硬编码文案整类封死）。自证：回灌硬编码中文 → 即红 `charts.mjs:19 "暂无分时数据"` → 还原转绿（94/94）。

验证：npm test 94/94；CDP 真机 en 模式（`document.documentElement.lang=en` 触发实时切换）——面板全树 58 个文本节点 + title/placeholder 属性零 UI 中文（残余 CJK 仅为标的名＝行情数据本名，任何语言保持原样）；en 版市值行实测 `Value 63,422.00 CNY · PnL -342.00 (-0.54%)`；UI chrome 全英（Watchlist / Position / Targets / A-shares）。

## 12.10 客户端 vanilla 化（2026-11-09，实施计划 docs/plans/2026-11-09-client-vanilla-rewrite-implementation-plan.md → 已实现并验证）

**测试面切换**：stub-react 浅渲染契约面退役（`tests/helpers/{react-stub,react-resolve-hook,client-env,contract-harness}.mjs` + `tests/client-contract.test.mjs`，−9 用例），改为 jsdom DOM 级测试（`tests/client-dom.test.mjs` + `tests/helpers/dom-harness.mjs`，原生 PointerEvent 主路径 + Event 回退、setViewport 强写）与纯函数 parity 向量（`tests/client-drag.test.mjs`/`tests/client-float-prefs.test.mjs`，与 quota-watch 同向量）；包形状守卫 `tests/package-shape.test.mjs` 执有 exports 5 项、`dsh.client.platform=web`、inject lockstep（package.json ↔ client/main.mjs 均 `[]`）、零运行时依赖、devDep jsdom。

**验证证据**（Task 1–15，commit f35e05c）：
- npm test 124/124（`fail 0`；基线 94 → 窗口期后 VANILLA_BASELINE 98 → 最终 124）；
- `npm run build` 两次 sha256 一致：`92299b3f1d9803647fecc16b590e6194df99ae27745088f977250f3994a9cd0f`；
- `lib/client.js` 零 `require("react")`；`client/` 目录 `grep '"react'` 零命中；
- 冻结面机器断言 `FROZEN_CLEAN`（BASE_REF 4680bdb 对照 `src/`、`data/`、`locale/`、`cordis.patch.yml`、`scripts/probe-markets.mjs` 零改动）；
- `dsh-stock-kanban:float-position` 键字面量在源（client/float-prefs.mjs）与 bundle 各 ≥1。

**测试几何修正记录（Task 8 ③）**：默认右下位 (978,734) 本身已贴右钳位缘——`maxX = vw − MARGIN − insets.right − width = 1024 − 8 − 0 − 38(FALLBACK) = 978`，拖拽 +20 后 topLeft x=998 必越过 maxX 被钳回 978，「host 相对初始值 +20px」在默认起始位**几何上不可观测**（纯函数插桩证实非实现 bug）。处置：该用例预置 seed 位置 (300,300)，+20 → (320,300) 落在界内可观测；断言语义（相对初始值 +20 + 落盘终点钳位坐标 {x:320,y:300}）不变。

**活体冒烟（Task 17 Step 4，2026-11-09，CDP：Chrome for Testing 152 headless @9223 → 127.0.0.1:3080，symlink 安装，六项观察条件全命中）**：
1. 刷新后胶囊出现在视口右下并渲染真实行情：`ⒷⓈ贵州茅台 1,442.17 −0.75%`（open shadow host、`.skc-stack` 装胶囊）；
2. 合成拖拽 (1234,623)→(956,460)：transform 清零、`localStorage["dsh-stock-kanban:float-position"] = {"x":956.15625,"y":460}`（形如 {"x":…,"y":…}）；
3. 轻点胶囊开面板：列表视图（`.skc-listwrap` + 四市场 Tab + 计数）、`role="dialog"`、锚定下方不足翻上方生效（top=95px）；Esc 关闭、面板外 pointerdown 关闭均验证；
4. 视口 400×700（≤480px）：面板转 `.skc-panel--sheet` 且内联 left/top 清除（CSS 定位底部 sheet）；
5. 预置旧 `ui:v1`（含 `pos:{x:50,y:50,dock:"left"}`）+ 清 float-position 后 reload：胶囊落默认右下（非 50,50），`pos` 被忽略；`ui:v1` 持久化字段集无 pos（白名单落盘）；
6. 无页面级 `<style id="stock-kanban-styles">`：样式全部在 shadow root 内 `<style>`（含 `2147483000` z-index 锚点）。

**活体暂态记录（宿主内存档案，非本仓缺陷）**：每次冷 reload 控制台报一条 `web boot: 1 entry did not activate — dsh-stock-kanban: failed` 且 UI 横幅闪现；根因＝宿主进程（跨 Task 15 存活、未重启）boot manifest 的 graphRows 仍是旧插件档案 `inject:["slots"]`，与新模块 `inject:[]` 不匹配→首激活失败→同页 graph reconcile 按新内容哈希重试接活（fiber active、`fiberInject=[]`——**`inject:[]` 语义经 active fiber 实证受支持**）；宿主下次重启重读 package.json 后该暂态彻底消失。修复提交后复核：宿主按文件哈希已下发新 bundle（rev 漂变至 5f8f3d8b…）。

**首挂定位回退缺陷与修复（commit aef094b）**：现象＝冒烟 ①② 取证数字 1234（=1280−8−38）与 354（=400−8−38）均命中 38×26 回退值，真实浏览器首挂定位未走实测尺寸。根因（两层）：① `createCapsule`（内含 applyPosition→measureSize）先于 `doc.body.append(host)` 执行；② 胶囊 el 未入 `.skc-stack` 前测量、且首挂时胶囊文本为空（空胶囊实测宽 34px 级），数据填充后宽度跳变（实测 155.7px）越过右缘。jsdom rect 恒零，两条路径在 jsdom 下不可区分——此即漏网机理。修复：host 先 append 再创建胶囊（quota-watch 同构）+ 胶囊自挂入 `.skc-stack` 后再 applyPosition + update 时按尺寸变化重定位一次（拖拽中跳过）。回归：`tests/client-dom.test.mjs` 补 host rect 桩用例（打桩 {width:150,height:26} → 断言默认位 x=866 而非回退 978，并断言 createCapsule 返回时 el 已在 stack）。活体复核：left=1116px = 1280−8−155.7（实测宽），右缘余量恰 8px（capRight=1271.7）；两次构建 sha256 一致 `29f5543866c18a1a9f33c6f940d96ebd9630fbee2f8d571212d5376cebf7533e`；npm test 125/125。


## 12.11 quota 联动·宿主侧（CEP v1，2026-11-09，计划 B 实施计划 docs/plans/2026-11-09-quota-embed-capsule-group-implementation-plan.md → 宿主侧已实现并验证；访客侧端到端活体待 S7）

**提交链**：`91ebb74`（S2 宿主模块 `client/quota-embed.mjs` + S3 拖拽手势共享化 `attachFloatDrag` + S4 合并开关基础：store 四件套 / footer 开关 / i18n / 样式）→ `d2a9218`（S5 `client/main.mjs` 装配 + 集成组 + bundle 重建）→ 本次 S6 收口（GLOSSARY / README / 本节 / 对齐矩阵 / 一行测试标题注释）。

**协议双端测试（宿主侧，离线）**：
- `tests/client-quota-embed.test.mjs` 10 用例：降级矩阵五行（guest 缺席零事件 / legacy 共存不隐藏 / quotaMerge off 永不 engage / 能力+默认开 engage+心跳+warn/danger 渲染 / guest 消失同 disengage）、404 藏段+慢重试后恢复、传输错误保留上次渲染+正常节奏、tap→open-panel 锚点为 pill 实测 rect（零值回退 host rect）、组拖动落同一位置记忆键、setEnabled 往返（off→disengage+移除；on→重新握手再 engage）。
- `tests/client-quota-integration.test.mjs` 8 用例（真实 `mountKanban`；fetch 桩与心跳间隔注入，心跳不依赖真实时钟）：挂载后 guest 握手→pill+开关+engage+心跳派发；挂载前同步握手→首帧即合并；拖 quota pill→host 整组位移 +20 且落同一记忆键；legacy 守卫（guest 在、不应答，跨过 500ms 超时后复核：无 pill、无开关、零 engage、零 overview 拉取、stock 胶囊零变化）；quotaMerge off（seed ui:v1）挂载前同步握手下零 engage、开关呈关态、点击开→立即合并；guest 消失→disengage 且 pill/开关移除、心跳清除；overview 传输错误→保留上次渲染且 title=`quota.stale`，恢复后清除；dispose 全清、之后的能力回复不再 engage。
- `tests/client-dom.test.mjs`：quota 样式锚点（`--quota` cursor、数值 tabular-nums、warn/danger 阈值色、pulse 仅在 reduced-motion 守卫块内）+ footer 开关（仅 quotaCapable 渲染、随 quotaMerge 切换 label/active、点击取反、能力消失即移除）。
- `tests/client-ui.test.mjs`：store quotaMerge 四件套 + 会话态 quotaCapable 不落盘；`tests/i18n.test.mjs`：quota.* 四键 zh/en 双侧非键名回退。
- `npm test` 148/148，`fail 0`，exit 0（S6 收口后复跑）。

**构建**：`npm run build` 两次 sha256 逐字节一致 `af6e102eff5cb8890625f11134bc493a0d61a7583de6c78cabf32af6f1c80364`（`d2a9218` 同笔重建 `lib/client.js`）。

**偏差记录（语义等价，不改计划）**：颜色写法——`client/styles.mjs` 中 quota 阈值色写作 `var(--dsw-alias-label-warning,#d29922)` / `var(--dsw-alias-label-danger,#c93c3c)`（无空格，与 sk 样式表既有写法一致），计划引文为带空格形式；CSS 语义完全相同，样式锚点断言按实际写法钉死。动效：pulse 为 `transform: scale 1→1.06`、1.6s（与 quota-watch `dqw-pulse` 同语义），关键帧与类均在 `prefers-reduced-motion: no-preference` 守卫块内。文案与字形（footer「合并显示 quota」、⊞/⊟、on/off 提示、「额度数据已过期」）为计划未给定的拟定值，待主人过目。

**quota.stale 消费**：`client/quota-embed.mjs` 在传输错误保留上次渲染时设置 `title=t("quota.stale")`，拉取恢复后清除；键已消费，无死键（由集成组「传输错误」用例钉死）。

**活体取证（S5 附加项，只读，独立临时 headless 实例，端口 9337，临时 profile，用后已删）**：

- **第一次运行（主人启用 dsh-stock-kanban 之前）——未达，不计为证据**：宿主批次不含 `dsh-stock-kanban`，45 秒内 `[data-dsh-stock-kanban-float]` 未挂载，sk 侧无法取证。落盘：`s5-legacy-live.json`、`s5-legacy-live.png`、`s5-legacy-live-run.log`、`s5-legacy-live-probe.mjs`（保留，仅作历史记录）。
- **复查（主人启用后，同一临时 profile、同一五项判据；判据③改为归因法）——结论见下**：

五项判据（复查）：
- ① 达：stock 胶囊挂载于 2.2 秒，文本为真实行情「ⒷⓈ腾讯控股 418.40 −0.33%」。
- ② 达：`button[data-action="quota-merge"]` 0 个；`.skc-capsule--quota` 0 个（此时 sk 已挂载，计数具有证据力，非空真）。
- ③ 达（归因法）：overview 请求字面 2 次（t≈1.2 秒、t≈32.5 秒，约 30 秒一次，即 qw 自身轮询的节奏）；两次调用栈均归因到合并包中的 `@iasiv5/dsh-quota-watch` 模块，**归因到 stock 包 0 次**，engage 前计数 0。字面 2 次不作为判据依据。
- ④ 达：全页 console error 0 条、exception 0 条，sk 相关 error 0 条。
- ⑤ 不适用：CDP 与页面均正常，已执行。

**归因方法**：文档最早期（`Page.addScriptToEvaluateOnNewDocument`）包装 `window.fetch`，仅透传、不改变请求；对 `api/dsh-quota-watch/overview` 请求记录 `new Error().stack`（`stackTraceLimit=50`）的帧（函数名、URL、行、列）。合并包 URL（`plugins/??…`）的帧无法仅凭 URL 区分（同一文件内含全部插件），因此对该静态文件做只读 GET，按 `__ModuleLoader__.load({ id: … })` 模块边界把帧行号映射回模块 id：本批次共 32 个模块，`dsh-stock-kanban` 位于行 141527 起；两次调用的帧均落在 `@iasiv5/dsh-quota-watch` 的行区间 22397–24357 内。判定规则：调用栈任一帧属 stock 模块即计入 stock 归因。

**观察（只记录，不调整）**：stock 胶囊 rect (1125,766)–(1272,792)，qw 胶囊 rect (1106,763)–(1266,791)，二者相交面积 3525 px²，占 stock 胶囊面积的 92%；两枚胶囊几乎叠在右下角默认位，截图中 qw 胶囊覆盖在上层、stock 胶囊文字被遮挡。属 B20 已接受的共存态。

复查落盘：`s5-legacy-recheck.json`、`s5-legacy-recheck.png`、`s5-legacy-recheck-run.log`、`s5-legacy-recheck-probe.mjs`。


**未执行（S7）**：双插件活体 E2E——真实 GLM/Copilot 数据的 warn/danger 渲染、点击 quota 段开 quota-watch 面板、拖动组移动与位置记忆、开关 off/on 往返、停用 quota-watch 后额度段消失并恢复。依赖 qw 0.1.38 发版与主人批准外部动作门；本次未执行。

**已知缺口**：仓内当前无源码级 CSS↔JSX 类名对齐守卫（原 `client-contract` 类名缝守卫见 §12.6，随 §12.10 契约面退役，未重建）；本节新增的 quota 类名仅经样式锚点断言覆盖。

## 12.12 合并胶囊·方案③（2026-11-09，ADR 0003；sk 实施提交 8d5a907，qw 竞态修复 1e29f47）

实施范围（计划 `docs/plans/2026-11-09-merged-capsule-option3-implementation-plan.md`）：
- 形态：单胶囊两段（股票段 | 1px 分隔线 | 额度段双迷你条，GLM 上、Copilot 下，单条居中，无数据则隐藏）；额度段并入股票胶囊本体，`quota-embed` 挂载目标为胶囊元素。
- 面板：分区点击（左段开股票面板，右段开 qw 面板）；股票面板水平推出（右侧优先、左侧次之、两侧都放不下回退垂直），顶边与胶囊对齐；视口 ≤480px 为底部 sheet。
- 窄屏（≤480px）：隐藏股票名称、保留价格与涨跌；额度段热区 44px（`::before` inset −10 px 作用于 align-self:stretch 的 24 px 段）。
- 待处理兑换：`manualOutcome` 或 `manualOutcomeError` 存在即显示琥珀小点，即使没有数字；点击打开 qw 面板。
- 字形与颜色（B26）：额度危险态琥珀（`#d29922`）；股票标记、列表徽章与详情目标价文案统一为拉丁 B/S；涨跌色只作用于股价与涨跌幅。
- 文案（B37）：`quota.merge.on/off` 与新增 `quota.outcome` 的 zh/en 双侧统一为「合并胶囊」术语；合并开关（footer「合并显示 quota」）保留。
- 面板与胶囊的交互修复：面板开着时再点股票胶囊最终关闭（Q14；外点豁免粒度 Q15=A：胶囊根且不含额度段）。

测试与构建（sk，逐阶段核对，计数来自 `npm test` 原始输出）：
- 基线 148/148/0；S1–S11 逐阶段红→绿，累计 195/195/0（S12 全量）。
- bundle `lib/client.js` 两次构建 sha256 相同：`5e52d6da…858e7`。
- 冻结面（`src/`、`data/`、`locale/`、`cordis.patch.yml`、`scripts/probe-markets.mjs`）自 `4124df4` 起零差异（FROZEN_CLEAN）。

qw 侧（竞态修复，2026-11-09）：
- 1e29f47：外点关闭后同一手势的 `open-panel` 不重开（500 毫秒窗口，B32）。
- 线上热部署：bundle sha `e5506dce…f49d6`，链接数 1；备份 `.dsh-research/qw-hotdeploy-backup-20261109-race/`。
- 用户目测：额度小胶囊再点关闭无问题。

已知缺口（非本计划引入，记录待办）：
- 额度段键盘激活（回车/空格开额度面板）为 HEAD 既有缺失：段保留 `role="button"`、`tabIndex=0` 与 aria 属性，但无键盘处理。
- `manualOutcome: null` 按 `!== undefined` 计为待处理，与 qw 同规则；qw 的 `manualOutcomeView()` 无记录时返回 `{}`，不发出 null，该边界在实际数据中不出现。

未验证（待 S14，需主人批准后在临时 profile 中以真实指针执行）：
- P1 额度段是胶囊子节点；P2 双条与单条居中；P3 额度段真实指针轻点开 qw 面板并再点关闭；P4 股票段开股票面板并水平推出，面板开着时再点股票胶囊最终关闭；P5 控制台无 error；P6 停用 stock 后 qw 胶囊立即恢复；P7 整组拖动，位置记忆键不变；P8 B26 字形与颜色；P9 B27 五态；P10 B29 翻转与钳位；P11 B30 窄屏 44px 与底部 sheet；P12 滑入约 150 ms。

发版：v0.1.38 暂缓（本计划不包含发版动作）。

## 未验证与降级汇总（13 章交付口径）

**已完成且验证通过**：见上表全部 ✅ 项 + 125 单测（vanilla 化后，12.10）+ 23 数据源探针。

**已实现但未在目标环境验证**：
- Windows 浏览器场景与 Windows desktop profile（同代码路径，按 12.4 步骤可复现）；
- 多浏览器并发修改的 UI 级 409 提示（服务端 CAS 已在路由测试验证，UI toast 逻辑未双页实测）；
- 导入的文件选择器端到端（headless 无法驱动 OS 文件对话框；导入链路的解析/校验/落盘已由单测+路由测试覆盖，UI 侧确认对话框逻辑已实现）。

**已按需求允许的降级**：
- 盈亏比例在隐私模式下同样遮挡（保守默认，4.6 允许自定）；
- 港股 K 线不复权（接口能力，如实标注）；
- 腾讯 minute 主域回退备域（上游 WAF 前科）；
- desktop 缺 storage 服务时回退文件驱动（health.driver= file 可见）。

**尚未完成或被阻塞**：
- CEP 双插件活体 E2E（S7）：依赖 qw 0.1.38 发版与主人批准外部动作门，未执行（见 §12.11）；
- legacy 活体取证：首次运行因插件未启用未达；主人启用后复查五项达成，归因法确认 stock 归因 0（见 §12.11）；
- 其余无核心需求阻塞项。

## 已知问题

1. 首次添加标的时胶囊价格短暂显示 "—"（最多一个轮询周期 15–30s），随后自动补齐。
2. 美股列表快照无高低开收（EM 批量端点字段限制），详情页字段完整。
3. CDP/headless 自动化工具直发导航会被 DSH 的 Host/Origin 围栏判 cross-site 403（安全特性，真实用户浏览器无此现象；E2E 用页内同源导航绕过）。
4. 备份导入的 UI 走浏览器文件选择器；在不支持文件输入的嵌入环境可用 `curl -X POST`（同源）方式导入。

## 移动端适配修复（2026-11-07，用户 Android 实测反馈 → 已修复并验证）

用户报告：手机浏览器（约 360–400 CSS px 视口）打开面板后收起按钮在屏幕外，面板无法收起。
根因（两个，均在真实环境暴露）：
1. 面板固定 400px 宽 + 位置钳位不足 → 窄视口下右侧按钮出屏。修复：宽度 `min(400px, 100vw-16px)` + 挂载/拖动/释放/resize 四路位置钳位 + 胶囊点击开/关切换兜底。
2. `setPanelPos` 笔误（`setUi({ panelPos })` 简写引用未定义变量）→ 面板位置自初版起从未持久化（此前 E2E 只覆盖了胶囊位置）。修复并全量自查其余 setter 无同类问题；补 `setPointerCapture` 合成事件容错。

修复后实测（CDP 视口仿真）：393×852 与 360×780 下面板完整（right ≤ vw）、收起/添加/隐私按钮全部可达、添加对话框 ✕ 可见、拖拽后位置正确持久化、宽屏 1280 回归正常；67 单测全绿；截图留证存档。已随 `7cd1954` 推送。
