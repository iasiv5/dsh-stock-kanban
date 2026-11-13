# 测试与验证记录（12.x）

## 12.1 核心逻辑（自动化，全部通过）

`npm test`（node --test，全离线 mock）的**实时用例总数以命令输出为准，本文件不缓存数字**——README/此处曾三次过期（148→207→208 一日内，2026-11-10 retro 立规）。本节覆盖面清单为 2026-11-09 时点；其后新增的覆盖面见 12.11/12.13/12.16。

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

> **⚠ 已退役（2026-11-09，随 §12.10 vanilla 化）**：本节所述 `tests/client-contract.test.mjs`（React 浅渲染契约面）已删除，类名缝守卫未重建（缺口见 §12.11「已知缺口」）。本节仅作历史记录，勿当现行守卫引用。

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

## 12.13 额度段形态修订：qw 同款文案（2026-11-10，Q16–Q18）

- 额度段由双迷你条改为 qw 胶囊同款全名文案「GLM 82% · Copilot 97%」（数字常驻）；悬停提示与条样式退场（`.skc-qseg-bars`/`.skc-qbar*`/`.skc-qseg-tip*` 删除，「提示：」两条用例删除）。
- 保留：待处理琥珀点、单条/无数据/过期（变暗 + title）规则、分隔线、44px 热区、窄屏降级、分区点击与面板水平推出。
- `quotaSegmentModel` 契约不变（tooltip 字段保留、文案版未使用）；渲染复用既有 `.skc-qval/.skc-qwarn/.skc-qdanger`，分隔符仅两条都有数时显示。
- 测试：全量 193/193/0；bundle 重建幂等 sha `8068685b…4a93f`。
- 决策记录：ADR 0003 第 10 条（宽度约 290px 由主人接受，推翻 0002 的宽度否决理由）。

## 12.14 合并胶囊文字溢出修复（2026-11-10，主人实测发现 → 已修复并验证）

现象：文案版上线后，较窄窗口下「Copilot 54%」的百分号溢出胶囊背景之外（主人截图）。

根因（两层，均以 Chromium 实测取证，探针 `.dsh-research/merged-capsule-impl/textform-*`）：
1. **≤520px 的 `max-width:52vw`** 把胶囊钳得比文案窄：420 视口实测 seg 右缘超出胶囊右缘 4px；
2. fixed 宿主 shrink-to-fit 被视口剩余空间压窄时，flex 压缩额度段——四路位置钳位（挂载/拖动/释放/视口 resize）不含「胶囊内容变宽」这一路径，额度文案到货后无人重钳。

修复（sk `…`，全量 193/193/0，bundle `a81f549b…92`）：
- `[data-seg]{flex-shrink:0}`：分区不参与 flex 压缩；
- `.skc-stack{align-items:flex-start}` 与 `.skc-capsule{width:max-content}`：胶囊恒为内容全宽；
- `ResizeObserver`（胶囊尺寸变化 → 重跑视口钳位，jsdom 守卫跳过，dispose 断开）；`measureSize` 改以胶囊 rect 为准（宿主可能窄于胶囊）；
- ≤520 放开 `max-width:52vw` 为 `max-width:none`（防出屏交给位置钳位；≤480 compact 已隐藏名称）。

验证：420 视口实测 seg 右缘 401 < 胶囊右缘 412（不再溢出）；1280 视口同验；截图 `textform-narrow-capsule-3x.png` / `textform-capsule-3x.png`。

## 12.15 位置继承与四场景活体验证（2026-11-10，Q19–Q20）

设计：双键互认（sk `dsh-stock-kanban:float-position` / qw `dsh-quota-watch:float-position`，记录同为 `{x,y}`、同一页面 localStorage）。engage 接管 qw 坐标（按 sk 实测宽重钳，主人提醒的「sk 比 qw 长」已覆盖：宽 146→283px，右缘贴视口时整体左移 5px 实测）；拖动落盘镜像写回 qw 键。qw 零改动（只读自己的键）。

实现（sk `f7a8ade` + `d3fb7b3` 后续）：float-prefs 增 `loadGuestFloatPosition`/`mirrorGuestFloatPosition`；quota-embed `startEngage` 前调 `adoptGuestPosition`（采纳结果同笔落 sk 键）；attachFloatDrag 增 `onPersisted` 回调，main 装配镜像。测试 +5 → 全量 198/198/0。

四场景 live 验证（dshm_toggle 序列 + 临时持久 profile CDP 真实指针，证据 `.dsh-research/merged-capsule-impl/scenario-*.json/png`）：
1. **qw 单独存在**（停 sk）：qw 胶囊正常显示；拖到屏中部 → qw 键 `{476.50, 306.28}` ✓
2. **sk 单独存在**（停 qw）：纯股票胶囊（额度段无 guest 不渲染），停于继承位置 ✓
3. **先 qw 后 sk**（启用 sk）：合并胶囊**接管 qw 位置**——左 477/上 306 与 qw 键一致，双键瞬时收敛，无溢出 ✓
4. **先 sk 后 qw**（启用 qw）：qw 到场即隐藏、合并胶囊原位不动（宽 146→283 重钳左移 5px，右缘距视口 8px）✓
拖动镜像：拖合并胶囊后双键逐字节相等 ✓；全程 console error 0 ✓。
探针实录教训：SIGKILL 会输掉 localStorage 异步落盘——探针改 `Browser.close` 优雅退出（首跑场景 1 坐标因此丢失重跑）。

## 12.16 UI 优雅化重构 + impeccable polish + 实拍守卫工具（2026-11-10）

全案与决策记录：`docs/ui-redesign.md`（功能清单/设计现状/令牌修正/钉死契约串/Round 2 记录）。要点：

- **样式层重写**（保留 client-dom.test.mjs 钉死的全部 CSS 契约串）：修正 4 个失效令牌（`border-secondary`/`bg-elevated`/`bg-hover`/`label-warning` 不存在于 DSH 主题，恒走硬编码回退），换真实 alias 阶梯；footer emoji 字形（👁⚙⟳⊞✕）全换 `client/icons.mjs` 线性 SVG；分段 Tab、ghost/soft-primary/danger 按钮体系、品牌点头部（行情异常转警示红）。
- **impeccable polish**（craft-floor/operate 清单）：`::selection`/`caret-color` 主题化、`.skc-btn:disabled` 补齐、图表加载改 shimmer 骨架（reduced-motion 守卫内）、教学式空态、列表行键盘可达（tabIndex + Enter/Space）、toast `role="status"`、图标钮 `aria-label`。
- **图表主题跟随**：轴文字/昨收线走 `style` 属性 + `var(--dsw-alias-label-tertiary)`（SVG 表现属性吃不到 var()）；MA5 `#e8e8e8`（深底遗产、浅色不可读）改 `#94a3b8`。

**实拍抓获的存在性 bug（hidden 击穿）**：`.skc-layer{display:flex}` 作者优先级压过 UA `[hidden]{display:none}`——列表视图下详情覆盖层恒渲染、详情视图下列表层不隐藏（双层叠渲染）。vanilla 重写（12.10）引入、jsdom 不做 CSS 级联故全量绿也测不出，存活 1 天后由 CDP 截图人眼复核抓获。修复：`:host [hidden]{display:none !important}` 全局守卫（唯一 important；样式串已入 client-restyle.test.mjs 回归钉）。**教训：hidden 属性存在 ≠ 实际渲染；渲染层改动必须实拍。**

**实拍守卫工具（retro 收编，取代 /tmp 即兴重写）**：`scripts/cdp-shot.mjs`——指纹探针（新串在/死串不在）+ 键盘路径开面板 + 三视口截图（桌面面板/窄屏 sheet/详情）+ 双层叠渲染哨兵（列表视图下详情层 computed display 必须 none，即 hidden 击穿类的直接观测面）+ console error 计数 + `--down` 括号 trick 杀 chrome。运维纪律：起 chrome 一律 run_in_background（行内 `&` 吊挂输出管道）、build/test 前 chrome 进程数必须为 0（headless chrome 曾把整机 load 顶到 45、npm test 22s→700s、esbuild 卡 D 态）、`pkill` 必加 `[c]` 括号 trick（忘加曾 SIGTERM 自杀，012）。

验证：全量 `npm test` 绿（新增 `tests/client-restyle.test.mjs` 终态 11 用例：图标契约/footer 图标化/quote-error 状态类/令牌卫生/原生面与状态面/行键盘可达/hidden 守卫/emoji 零回潮；用例总数以命令输出为准）；构建指纹探针两轮（rev `5087049fc711` → `c6a83a293ae9`，下发字节与 `lib/client.js` 逐字前缀相等，client-only HMR 免重启）；CDP 三轮截图修复前后对照（双层叠渲染 → 单层干净），人眼复核通过。

## 12.17 手机软键盘丢失修复（2026-11-10，主人 Android 实测反馈 → 已修复并验证）

现象：添加标的对话框搜索框，手机上每输入一个字符软键盘消失一次。

根因：`add.mjs` 的 `render()` 对话框整段 `replaceChildren()`——每键一次（300ms 防抖搜索触发两次：searching 态 + 结果态），聚焦中的输入框被连带销毁。旧实现虽有 `focus()` 恢复，但移动端**不带用户手势的程序化 focus() 不会唤回软键盘**（iOS Safari/Android Chrome 通病）。附带面：面板开着时行情轮询（15s）同样整段重绘打断输入与中文 IME 组合。

修复（两层，按病根分治）：
1. **`add.mjs` 骨架静态化**：对话框骨架（头部/市场 Tab/搜索框/直连区）一次构建、永不重建；搜索状态只更新「状态区 + 结果区」两个动态区。输入框节点身份跨渲染稳定 → 焦点与软键盘天然保活，IME 组合不再被打断。焦点恢复 bookkeeping 随之删除（无重建即无需恢复）。
2. **`detail.mjs` 编辑中跳过重绘**：详情视图轮询驱动的 `update()` 在持仓/目标价输入聚焦期间跳过整段重绘（行情展示最长陈旧一个轮询周期，失焦后下一快照即恢复）；`detailId` 变化不豁免（旧输入框属于旧标的）。save/clear/切周期等直接动作路径不经此守卫（点击按钮时键盘本已收起）。

回归钉（`tests/client-restyle.test.mjs` +2，「节点身份」断言——jsdom 下等价于软键盘保活机制）：add 搜索跨防抖重绘后 `input[data-field=query]` 为同一 DOM 节点；detail 聚焦中 update 不重建、blur 后 update 恢复重建。测试基建教训：jsdom `focus()` 仅对已入文档树元素生效（detached 调用不改变 activeElement）。

验证：全量 `npm test` 211/211/0；`npm run build` 幂等重建下发（HMR）。真机复测（Android 键盘不再消失）待主人手机确认。

**§12.17 追记（2026-11-11，机制替换——渲染切片广播 Task 3，ADR 0004）**：detail 层「编辑中跳过重绘」守卫（上文修复第 2 层）退役——切片广播后骨架按标的一次构建（renderSkeleton），quotes tick 只走活区 patch（paintQuoteLine + paintLive）、「tick 不重建」直接保证输入框身份稳定，守卫失去存在理由。覆盖面顺带扩大：旧守卫只认 `data-field` 输入框（确认条/周期 Tab 按钮聚焦时焦点仍每 15s 丢失），身份保活对全视图生效；光标捕获/恢复 bookkeeping 随之删除。用户可见契约不变：输入框跨 tick 身份稳定。回归钉改写：restyle detail 用例翻转（失焦后 tick 同一节点 + 报价行原位更新，不再断言「恢复重绘」）；client-render-identity 新增图表 SVG 身份与空转早退两钉。

## 12.18 footer 精简：合并开关与说明文案迁入设置（2026-11-10，主人反馈 → 已实现并验证）

主人截图反馈：footer 的「合并/拆分胶囊」切换钮与底层说明文案（免费行情延迟/数据边界）碍事。

变更：
1. **footer 只留一行五钮**（胶囊标的 picker + 隐私/添加/设置/刷新/关闭），合并切换钮与说明文案移除；
2. **设置对话框重排**：标题从「设置（备份与迁移）」改「设置」，新增「显示」区承载——「合并显示 quota」checkbox（仅 quota-watch 能力在线渲染，语义沿用 quotaMerge 持久偏好）+ quota.merge.hint 说明 + app.data-boundary 数据边界说明（自 footer 迁入的静态版）；备份与迁移区原样保留（自带节标题）；
3. i18n：删 `app.footer`/`app.footer.privacy`（footer 文案退役），新增 `settings.display`/`quota.merge.hint`/`app.data-boundary`；`app.settings` 值改「设置」。

**连带修复（主人截图暴露）——骨架静态文案语言实时跟随**：主人截图即中英混排（"Watchlist" + “6 个自选”）：挂载时语言 en、locale 特性后置 zh → 骨架化后 construction 时定格的文案不随 `onLangChange` 刷新（12.9 的实时切换语义被骨架化打破）。修复：panel/list/add 的 render/update 重套 `t()`（title/picker/按钮 title/设置区/市场 Tab/直连区/筛选文案——纯属性写，零重建，软键盘保活不受影响）。回归钉：三语言轮换断言（client-restyle.test.mjs）。

迁移说明：quota-merge 的 DOM 契约自 `.skc-footer` 迁至 `.skc-dialog--settings`（data-action 保留、aria-pressed → checkbox checked）；`.skc-quota-merge-on` 钉死串保留（现在着色设置行 label）。

验证：全量 `npm test` 212/212/0（重写 client-dom footer 合并开关用例、更新 quota-integration 选择器与 checked 断言、i18n data-boundary 断言、restyle +2）；CDP 实拍——footer 钮序 `privacy,add,settings,refresh,close`、零合并钮零说明文案，设置对话框合并开关（checked=true）+ 双说明文案 + 备份区在位，截图留证；HMR 下发确认。

## 12.19 隐私开关退役 + footer 持仓开关（2026-11-10，主人反馈 → 已实现并验证）

主人反馈：隐私开关（实例级金额遮挡）自用无价值；建议该位置改放「只看持仓」，开时列表才显持仓信息。

变更（采纳主人方案并前进一步）：
1. **footer 隐私按钮移除**：隐私遮挡自 UI 退役。实例 `privacyMode=false`（迁移前实证，无卡死风险）；服务端 `privacyMode` 字段与 routes/校验保留兼容（无 schema 变更），展示层遮挡路径（maskIf/MASK）代码保留但仅 API 可达时惰性生效——既有隐私遮蔽测试零改动全绿。
2. **footer 第一位 → 持仓开关**（公文包图标 `wallet` 新增 icons.mjs）：`data-action="holdings"`，aria-pressed + `.skc-toggle-on` accent 着色，与列表筛选同源 `ui.holdingsOnly`（持久偏好不变）。开态即原「只看持仓」语义：行显示盈亏金额/比例，关态显目标价徽章。
3. **筛选栏整个退役**：「只看持仓」迁 footer 后，筛选栏只剩刷新按钮——与 footer 刷新纯重复，一并移除（Tab 下直入行区，footer 单一刷新入口）。`.skc-filterbar`/`.skc-filter` CSS 与 i18n `privacy.on/off` 键同步删除；`backup.privacy-note` 去「隐私开关不加密」从句。

验证：全量 `npm test` 212/212/0（restyle footer 钮清单 privacy→holdings、icons 契约清单更新，隐私遮蔽/组合/integration 用例零改动全绿）；CDP 实拍——footer 钮序 `holdings,add,settings,refresh,close`、筛选栏零残留、持仓开关 accent 开态着色正确（截图留证，浅色主题令牌同步验证）；当前实例无持仓数据（quantity 全 null）→ 只看持仓行区为空属正确行为，盈亏行显示由既有 jsdom 用例（quantity 夹具）覆盖；HMR 下发确认。

## 12.20 面板设计语言对齐 qw（毛玻璃复刻，2026-11-10，主人反馈 → 已实现并验证）

主人反馈：sk 面板风格要与 qw 面板统一——毛玻璃复刻、关闭钮右上、二级返回左上。

**qw（.dqw-panel）设计 DNA 提取**（`dsh-quota-watch/lib/client.js`）：面板 = `bg-base 86%` 单层 color-mix + `blur(14px) saturate(1.3)` 真实半透明毛玻璃 + radius 10 + 单层阴影 `0 8px 24px .25` + 无 supports 回落实底；header 无分隔线（title 11px flex + 动作钮右侧内联）；关闭 24×24 ghost r6 右上、二级返回 28×28 ghost 左上；按钮 = 透明底 hairline 边 10px opacity .72 hover 交互面；次要区分隔 = **dashed** 虚线；密度 10-11px。

**sk 差距梳理与对齐**（12 项，详见本节与 ui-redesign.md）：
1. 毛玻璃：sk 原为 layer-2 94% 双层叠涂**全不透明**（12.8 为玻璃皮肤可读性引入）→ **复刻 qw 配方**（bg-base 86% + blur(14px) saturate(1.3)，supports-not 回落实底）。computed 实证：`blur(14px) saturate(1.3)`、alpha 0.47——页面文字透面板被柔化，与 qw 同观感；
2. 圆角 14→10；阴影对齐单层；max-height 对齐 `calc(100dvh - 24px)`；
3. sheet 去抓手/特殊圆角（qw sheet 即普通面板贴底）；
4. 头部去 border-bottom（qw 无分隔线），标题 13px→12px 收敛；品牌点与行情异常警示点保留（sk 身份记号）；
5. **关闭钮迁 header 右上**（24×24 ghost r6，`data-action="close"` 保留）；footer 不再放关闭；
6. 按钮对齐 qw panel-action：透明底 hairline 边 10.5px、opacity .78→hover 1、hover 交互面（primary/danger 变体保持语义色）；
7. 分隔语言改 **dashed**：备份区 border-top、目标价节 border-top（qw models/reset 同款）；
8. 对话框/toast 地板同配方 86%+blur（对话内覆盖层与面板同质）；
9. icon-btn 26→24 r8→r6（qw close 尺寸）；
10. chartbox 圆角 8；二级返回按钮已在左上（无需动）；footer 保留（sk 功能密度需要，qw 无 footer）。

**已知取舍**：玻璃皮肤下 bg-base 半透明时，86% 单层会比 12.8 的不透明地板更透——这是 qw 同款取舍（强 blur + 短面板），主人指名要这个观感；可读性若在某皮肤下不达标，回退通道是 `@supports not` 分支 + 单独皮肤调 token。

验证：全量 `npm test` 212/212/0（关闭钮用例迁 header、restyle footer 清单去 close）；CDP 实拍——毛玻璃透字效果、radius 10、header 右上关闭、footer 无关闭（computed backdropFilter/bg 断言 + 截图留证）；HMR 下发确认。

## 12.21 二级菜单透字修复（2026-11-10，主人手机实测反馈 → 已实现并验证）

主人反馈：手机上二级菜单（添加/设置覆盖层）半透明导致下层列表文字透出、看不清。

根因：12.20 全面对齐时把对话框地板也换成了 qw 的 86% 玻璃配方——但 qw 玻璃的衬底是**低密度页面内容**（悬浮短面板），而 sk 对话框盖在**自家列表高对比文字**上：86% 单层在手机高密度屏 + 玻璃皮肤（bg-base 半透明）下有效 alpha 仅 ~47%，文字透出。这是 12.8 同款事故的复发（12.20 已在「已知取舍」预警，实测确认不可接受）。

**分治定版**：qw 玻璃配方的适用域 = **浮在页面上的低衬底表面**（面板本体、toast）；**全幅覆盖层（对话框）不适用**（衬底是自家高密度文字）→ 对话框回到 12.8 不透明地板（surface 顶涂 + `rgb(from base / 1)` 相对颜色语法垫底，玻璃皮肤令牌半透明也强制 alpha=1；blur 只做深度）。回归钉：client-restyle.test.mjs 对话框不透明地板 + 面板毛玻璃 86% 双断言（两配方分治防再次误统一）。

验证：全量 `npm test` 213/213/0；`npm run build` 下发（HMR）。真机复测待主人手机确认。

## 12.22 添加对话框市场 Tab 被截半修复（2026-11-10，主人手机实测反馈 → 已实现并验证）

主人反馈：搜索框填内容后，上方四个市场 Tab 只剩一半（被顶出对话框视口）。

根因：添加对话框是**整段滚动容器**（`.skc-dialog` overflow-y:auto 罩住全部内容）。结果列表渲染 / 手机软键盘弹起时，浏览器为让聚焦的搜索框可见而滚动该容器 → 头部与市场 Tab 行被顶出截半。

修复（钉头结构）：对话框改 `skc-dialog--pinned`（overflow:hidden）——头部/市场 Tab/搜索框/直连区钉在骨架层不滚动，仅「状态区 + 结果区」放入内滚区 `.skc-dialog-scroll`（flex:1 min-height:0 overflow-y:auto）。输入类控件永不滚出视口，与 12.17 的软键盘保活同向；`.skc-add-results` 内层 max-height 随之退役（单滚动上下文）。设置对话框不受影响（无 pinned 修饰符，保持整段滚动）。

回归钉（client-restyle.test.mjs add 用例扩断言）：搜索框/市场 Tab 的 parentElement 恒为骨架层（不在内滚区内）、结果行落内滚区。

验证：全量 `npm test` 213/213/0；`npm run build` 下发（HMR）。真机复测待主人手机确认。

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

## 12.23 设置页重排——方案 B 行式设置列表（2026-11-11，主人拍板 → 已实现并验证）

主人反馈设置页编排混乱（「显示」区顶上放数据边界说明、开关 label accent 高亮像链接、备份区无覆盖警示），三方案（A 分区卡片 / B 行式列表 / C 最小改动）拍板选 **B**。

结构（`.skc-settings-body` 行式列表，块间 dashed 分隔）：
1. **合并显示 quota 行**：左标签右 **switch**（`skc-switch`：34×20、track checked=brand-primary、thumb=`switch-thumb` 令牌、纯 CSS 无依赖）；`data-action="quota-merge"` 契约保留，`skc-quota-merge-on` 钉死串改着色行标签（开态 accent）；
2. **导出备份行**：整行 `<a href="/stock-kanban/export" download>`（契约保留），副行「下载 JSON 到本机」，行尾 chevron；
3. **导入备份行**：整行 `<button>` → 文件选择，副行「覆盖模式：替换当前全部数据」**常显警示**（原仅在确认弹层）；
4. **页尾脚注**：数据边界说明（app.data-boundary，caption 弱化）——自「显示」区顶部迁出（它不是显示设置）；
5. 「显示」节标题与 `settings.display`/`backup.title` 键删除（行自描述，零死键）。

i18n 新增：`backup.export.hint`/`backup.import.hint`。语言实时跟随覆盖新行（render 重套 t() 清单已含 merge/hint/footnote）。

实施实录（一次性验证脚本抓获）：备份行 helper 误用行类名造成标签嵌套重复渲染——已修正（内层=`skc-setting-main`）。CDP DOM 契约实拍：三行（合并显示 quota/导出备份/导入备份）+ 三副行 + switch checked + 脚注 + export href 全部在位；多恢复标签页抢占截图框位问题未影响 DOM 断言（视觉观感由主人设备复核）。

验证：全量 `npm test` 213/213/0；HMR 下发确认。CDP DOM 契约实拍（真实挂载实例）：三行（合并显示 quota/导出备份/导入备份）+ 三副行 + switch checked + 脚注 + export href 全部在位；像素截图受 headless 多恢复标签页抢占限制未框中面板（工具层噪声，非产品问题）——视觉观感由主人设备复核（HMR 刷新即见）。

## 12.24 分组内拖拽排序（2026-11-10，/impeccable shape 定稿 → 已实现并验证）

主人需求：盯盘列表标的手动切换顺序。此前数据层 `sort` 字段已预埋（添加时 = 添加时间戳）但全链路无消费（patch 不收 sort、无路由、无 UI、列表按 KV key 序渲染）——本次补齐全链路。

**shape 定稿（主人三项拍板）**：① 整行拖拽 + 行尾 ⠿ 把手悬停浮现（静默可供性，零引导文案）；② 触屏长按 300ms 起拖，未满长按的位移交还原生滚动；③ 拖拽行浮起（偏移阴影 + 1.5% 缩放）+ FLIP 平移 150ms 让位，`prefers-reduced-motion` 全降级。

**实施**：
- 模型：`compareBySort`（sort → addedAt → id 确定性兜底）+ `reorderSorts`（排列校验 + 组内 sort 重编号 0..n-1；changed 按「排列是否变化」判定，拖回原位零副作用）；
- 服务端：`POST /stock-kanban/symbols/reorder`（market + 全量 id 排列），store 整组一次串行写 + 单次 rev 推进，任一记录落盘失败整组回滚；
- 客户端：`client/reorder.mjs` DOM-free 决策核心（liftIntent/moveId/dropIndexFromY/mergeVisibleIntoFull/flipOffsets，模式对齐 drag.mjs）；list.mjs 手势粘合（指针委托 + setPointerCapture + 非被动 touchmove 压制起拖后滚动 + 拖拽中冻结轮询重绘 + 拖后 click 压制）；键盘 `Alt+↑/↓` 焦点跟随 + `aria-keyshortcuts`；「只看持仓」视图下拖拽可用，可见子序并入全序（只有被拖项换槽，隐藏项不位移）；
- 把手图标入 icons.mjs 线性图标系统（fill 点阵），无 Unicode 字符。

**验证**：268/268/0 全量单测（新增 reorder-model 11 例 + store 2 例 + routes 契约 1 例 + client-dom 列表排序/键盘 1 例）；`impeccable detect` 对 4 个改动 UI 文件 0 发现。HMR 下发即见；实机拖拽/长按/键盘三路径观感由主人设备复核（视觉契约以 DOM 断言 + 主人复核为准，同 §12.23 口径）。

**§12.24 追记（同日二轮，主人实测反馈 → 已修复）**：① 拖拽触发浏览器文字全选（行是可选中文本，按点成选择锚点）→ `.skc-rows` 容器 `user-select:none` + `-webkit-touch-callout:none`（列表是控件面，标准做法，顺带压制 iOS 长呼出菜单）；② 拖拽不流畅（每次 pointermove 全行双读 rect 布局抖动 + 被拖行离散跳槽）→ 重写为指针跟随模型：起拖一次性快照行几何（拖拽期间零布局读），被拖行 transform 直写 1:1 跟随（`will-change:transform`），过半行换槽、兄弟行 FLIP 滑移，松手 settle 过渡滑回槽位；`dropIndexFromY` 退役换 `slotIndexFromY`（半行阈值换槽）。268/268/0 全绿；detect 0 发现；client-only 改动，刷新页面即生效。

**§12.24 追记二（同日三轮）**：胶囊显示下拉与面板列表同序——picker 选项由 KV 原序平铺改为 A-H-U-C 四组（optgroup 标签 = 市场 Tab 名）+ 组内 sort 升序（compareBySort），拖拽排序后两端即时同步；同名跨市场的「· 市场后缀」随分组语境退役；store 胶囊默认标的回退改为排序后首行（=面板首行）。269/269/0 全绿；detect 0 发现；client-only，刷新即生效。

**§12.24 追记三（同日四轮）**：详情页返回/删除按钮两行字高化——`.skc-detail-head` 由 flex-start+(-3px 补丁) 改 align-items:stretch，两钮撑满标题区高度（≈38px，≥触达标准），返回/删除同构 chip（同边框/同 12px 字号/同内距/同高），标签常显保证功能一眼可辨；删除悬停/聚焦整组转危险色（描边同染）。CSS-only 无 DOM 契约变化；269/269/0 全绿；detect 0 发现；刷新即生效。

**§12.24 追记四（同日五轮，主人实测反馈 → 已修复）**：详情页分时↔日K 切换卡片「弹跳」——根因是卡片总高随周期变化（minute 图表钳位 [120,190] vs candle [140,230]，且 MA 指标行分时隐藏/K线显示，合计 ~68px 突变触发面板重新定位）。修复：CHART_H 统一为单套钳位 [140,230] + 单套固定区（zh 494/en 511），指标行四档周期常驻且行高地板 20px（=MA chip 高）——分时档显示「昨收 {v}」图例（真实标注图内虚线参考线，非占位空行，新增 i18n detail.prev-close）；切任意周期卡片几何恒定、零位移。270/270/0 全绿（detail-fit 4 例按新契约更新 + 新增「切周期几何恒定」契约例）；client-only，刷新即生效。

**§12.24 追记五（同日六轮，主人实测反馈 → 已修复）**：① 切周期残余弹跳「先变短再涨回去」——根因是加载骨架屏内容高 ~140px 低于成图（最高 230px），loading 期卡片塌陷、数据到达再回弹；修复：`.skc-chartbox` 三态（加载/错误/成图）钉同一高度 = chartHeight(vh)，骨架/错误占位 height:100% 垂直居中——任何状态切换卡片几何零变化（detail-fit 新增「骨架占位与成图同高」契约断言）。② 详情头部居中化：标题区 text-align:center 卡在返回/删除两钮正中（三栏对称构图），行情行 justify-content:center 与标题同轴。270/270/0 全绿；detect 0 发现；client-only，刷新即生效。

**§12.24 追记六（同日七轮，主人实测反馈 → 已修复）**：合并胶囊额度段与 qw 独立胶囊字体不一致——sk 段继承 `.skc-capsule` 12px/常规字重，qw 本体为 `.dqw-capsule` 11px/600 + tabular-nums；修复：`.skc-qval` 钉 11px/600/tabular-nums、分隔点 `.skc-qsep` 对齐 qw opacity .5；danger 琥珀色为 B26 拍板规格（守卫钉死），不随 qw 红色，维持原样。270/270/0 全绿；detect 0 发现；client-only，刷新即生效。

**§12.24 追记七（同日八轮）**：设置页页尾加入版本号——`dsh-stock-kanban v0.2.0`，位于「行情来自免费源」脚注之后；构建期 esbuild define 注入 package.json 版本（client/version.mjs，typeof 守卫使 node --test 直跑源码回落 "dev"），与发版号永不错位；样式 11px/text-2/opacity .6（字号阶梯无 10px 契约守卫生效，10px 改 11px + 透明度弱化）。270/270/0 全绿；detect 0 发现；client-only + 构建脚本改动，刷新即生效。

**§12.24 追记八（同日九轮，主人反馈 → 已修复）**：设置页脚注一行制——「行情来自免费源，可能有延迟。 · dsh-stock-kanban v0.2.0」同线，中点分隔（opacity .5）+ 版本段弱一档（opacity .65）；脚注 DOM 契约更新（restyle 测试改为断言同行包含延迟文案与版本号），语言实时跟随仅作用于说明段（版本恒拉丁）。270/270/0 全绿；detect 0 发现；刷新即生效。

**§12.24 追记九（同日十轮，主人改定 → B26 琥珀退役）**：合并胶囊额度段 danger 态对齐 qw 本体红（`.skc-qdanger` → `--dsw-alias-label-danger,#c93c3c`）——主人理由成立：同一数据同一语义，跨插件语义色一致性优先于内部拍板，qw 老用户看合并胶囊零陌生感。守卫同步改判：client-dom 钉死串换 label-danger、restyle 令牌卫生 label-warning 计数 2→1。270/270/0 全绿；detect 0 发现；刷新即生效。

**§12.24 追记十（2026-11-11，机制替换——渲染切片广播 Task 2，ADR 0004）**：「拖拽中冻结轮询重绘」退役，改为 patch-only——拖拽中 quotes tick 只做行内文本原位写（价格/涨跌/尾巴列，零节点增删/重排，起拖几何快照假设照旧守住）；结构重建（外部 rev 变化撞上拖拽的罕见路径）跳过并标记，endDrag 补一次全量；拖后 reorder 经 mutate→refreshState 重建语义不变。连带：列表行情 tick 从整段重建升级为 keyed 行复用（行节点身份跨 tick 稳定），焦点抢救补丁随之退役（身份复用天然保焦，不再「重绘后归还」）。回归钉：client-render-identity「拖拽中零节点增删、价格原位更新」；round3 列表焦点用例翻转（notEqual → equal 身份断言）。288/288/0 全绿。

## 12.25 渲染切片广播 + 活区 patch（2026-11-11，ADR 0004 → 已实现；单测 + 实拍 + 活体取证完成）

实施计划 `docs/plans/2026-11-10-render-slice-broadcast-implementation-plan.md`（grill 十一题决议 + 三轮独立评审收敛），七个 checkpoint commit：

1. `f85cbfc` store 切片广播——emit 浅拷贝投递携带 `changed`，无实质变化不 emit（providers 引用为例外通道，poll 恒 emit 空切片）；
2. `da5c521` list keyed 行复用——quotes tick 行内动态域原位写（尾巴列双分支），焦点抢救/拖拽冻结退役（拖拽 patch-only）；
3. `2bc1f6c` detail 骨架静态化——按标的一次构建，活区 patch（paintQuoteLine + paintLive），图表仅数据引用变化/周期切换/resize 重画；跳绘守卫与光标恢复退役；
4. `ac12bec` panel chrome 门控——picker 按 rev/结构键重建，toast 走 patchToast 轻路径；main errorGlobal 按 quoteMetaError 门控；
5. `d140474` minify 开启 + 版本注入断言改 minify 免疫（版本字面量在 + `__APP_VERSION__` 标识符不在）；cdp-shot 指纹探针核查为 CSS 字面量（不受压缩影响），无需改；
6. `23ce3c4` ADR-0004 + GLOSSARY（快照修订/变更切片/活区）+ §12.17/§12.24 机制替换追记；
7. 本节（最终验证记录）。

**验证**：

- 单测：`npm test` **288/288/0**（基线 272 + 新增 16：store 切片契约 9 + 跨 tick 身份回归 7；身份翻转改写 3 例——round3 列表焦点、restyle detail 编辑、r6 编辑中 tick 带切片）；双构建 sha256 幂等（`9f42b552…`）。
- bundle：minify 后 **200.9KB → 130.6KB（133,685B，−34%）**——低于「减半」预估（CSS/i18n 数据串不可压），如实记录，无动作。
- 下发与活体取证（know-how 037 路径）：新 `lib/client.js` 下发到本机安装副本（旧件备份 `.dsh-research/render-slice-probe/backup/`），宿主未重启（client-only），页面硬刷新后指纹三串在/死串不在。**A/B 对照**：旧构建面板开 15s tick 行节点全换（`NEW,NEW` @ 14806ms）；新构建同窗口 17.5s 行签名全程不变（`w0,w1`）且详情输入框身份保持（tokensKept 2/2、inputIdentityPreserved true；tick 时点休市价格静态 = 空切片零重绘路径真实走到）。探针与日志留证 `.dsh-research/render-slice-probe/`。
- cdp-shot（新构建）：面板 360 挂载；双层叠哨兵 `hiddenAttr` + `displayNone` 双 true；三视口（桌面面板/窄屏 sheet/详情）+ 设置 + 胶囊特写截图留证 `/tmp/skc-shots/202611-10T2357-*`；console 1 error = `favicon.ico` 404（硬刷新浏览器自动请求，非插件资源，无害；旧构建轮未触发因其未整页刷新）。

**§12.25 追记（同日，主人实机复测反馈 → 已修复）**：评审建议 b 观察项应验——**移动端详情编辑软键盘立跳**（竖屏四个输入框必现、横屏不现）：根因 `onWinResize` 在 window resize（竖屏 sheet 下键盘弹出必然触发；横屏键盘多走 pan 不触发）时整段 `renderSkeleton()`，聚焦输入框当场销毁。旧版同路径也是整段重建，此前被 15s 轮询跳的主噪音掩盖，tick 修好后浮出。修复：resize 降级为**仅图表区重画**（paintChartArea——该 handler 的存在意义即图表高度随视口收缩），头部/表单/输入框不动。回归钉：client-detail-fit「编辑中 resize：输入框身份不变 + 图表仍随视口重算」。289/289/0 全绿；观察项 ③ 就此闭环，待主人竖屏复测确认。

**未验证项与降级**（未验证不冒充已验证）：

1. 拖拽中 tick（场景②）与 picker 排序（场景④）未在真实浏览器复演，以 jsdom 身份断言为锚（`client-render-identity`，§12.23 DOM 契约口径），待实机复核；
2. 移动端软键盘/IME 真机行为待主人设备确认（同 §12.17 口径）；
3. ~~编辑中 resize/旋转是否引发骨架重建~~ → **已复现并修复**（见 §12.25 追记），待主人竖屏复测确认；
4. 主机侧插件安装副本现携带未发版构建——回滚路径：`npm 0.2.1` 重装或恢复 `backup/client.old.js`；仓库侧回滚：revert 上述 commit 链。

## 12.26 合并胶囊额度段可靠性修复（2026-11-11；实施计划 `docs/plans/2026-11-11-quota-segment-reliability-implementation-plan.md`，独立评审 3 轮通过后执行）

背景：主人报「额度那一半偶尔点不出二级卡片 / 额度信息更新不及时」。诊断（同日会话）+ 双计划独立评审（评审台账 `.dsh-research/plan-review-scratch/ledger.md`），六个 checkpoint commit：

1. `ad07a16` 拉取链挂超时——`pullTimeoutMs`（默认 15s）+ `buildTimeoutSignal`（默认 `win.AbortSignal.timeout`），单请求挂死不再冻结整条自排程链，超时走既有传输错误降级（stale title + 续排）；测试基建同步：quota-embed setup 默认 stub `buildTimeoutSignal: () => undefined`、client-dom S6 两处骨架同批注入（评审 R1-1：jsdom 的 timeout 定时器拖住 Node 事件循环 15s）；
2. `dd1f796` visibilitychange——回前台且 engaged 时清在排定时器立即拉取（对齐 qw 独立态 `onVisibilityChange` 语义），dispose 退订；
3. `549ba6a` guest 替换重握手——`syncGuest` 在 guest 元素变化时重置 `capable` 并 stopEngage(true)，新 guest 立即收到 embed-engage（旧 capable 守卫早退致分脑的宿主侧修复）；
4. `94fa257` routeTap 就近归属——胶囊根命中（flex gap/padding）按 x 就近归属股票/额度段，`attachFloatDrag.onTap` 加宽第二参 `{x,y}`（向后兼容）；
5. `6a3e70c` qdot/divider 自身 `[hidden]` 配套规则（契约固化，防御性——现行 `styles.mjs:71 .skc-capsule [hidden]` 已兜底，主人确认未实际见过「琥珀点常显」症状（2026-11-11 拍板），症状从修复清单除名，任务按契约保留）；
6. 本节（0.2.3 版本收口）。

**验证**：

- 逐任务红→绿（TDD）：T1 红 fetchCount 停 1 → 绿 23/0；T2 红 visible 不拉 → 绿 24/0；T3 红 engage 1→1 → 绿 25/0；T4 红 opened=0/calls=2 → 绿（client-dom 50/0 + drag 5/0 + capsule-drag-close 3/0）；T5 红（规则串缺失）→ 绿 16/0。全部日志留证 `.dsh-research/exec-scratch-20261111/`。
- 全量：`npm test` **294/294/0**（基线 289 + 新增 5：超时降级 1、可见性 1、guest 替换 1、就近归属 1、qseg 契约 1）。
- 构建：`npm run build` 逐任务通过（版本注入断言 0.2.3 内置）；lib/client.js 仅本节 commit 收口。

**未验证项与降级**（未验证不冒充已验证）：

1. 症状级活体验证（挂死拉取、后台节流、guest 替换的分脑/恢复时序、gap 点击）未在真实浏览器复演——jsdom 行为断言为锚，待装机 0.2.3 后实机观察；
2. 心跳分脑的访客侧根治在姊妹计划（dsh-quota-watch 0.1.39），本仓 `549ba6a` 为宿主侧加速兜底，联合效果待双插件同装后验证；
3. 回滚路径：revert 上述 commit 链或 `npm 0.2.2` 重装。

**§12.26 追记（2026-11-12，S-1 落地——pull 代际戳/序列守卫）**：评审 I-2/S-1 建议项实施——`pull()` 加 `pullSequence` 代际戳：迟到请求（被更新代际取代）不写回，三路全守（成功 paint 不覆盖新数据 / 404 藏段不误触 / catch 仅在仍为最新代际时打 stale title 与排程，取代者负责续排无链停顿）。修法借鉴 qw `forceGeneration/normalSequence` 水印先例（评审 S-1 归档素材）。回归钉：client-quota-embed 两条新用例「迟到的失败请求不误标 stale / 迟到的成功请求不覆盖新数据」——红复演经修正夹具在旧实现（stash 基线）坐实双红因（首跑夹具误以 rej 代 res，探针 `.dsh-research/exec-scratch-20261111/s1-debug.mjs` 抓栈定责后修正）；绿 27/0，全量 296/296/0。版本维持 0.2.3（未发版增量，lib 已随源重建保持产物新鲜，下次发版 bump 0.2.4）。

## 12.27 合并态卡片新鲜度根治（2026-11-12；修复在姊妹仓 dsh-quota-watch 0.1.41，本仓仅协议文档同步）

背景：主人实机复测「胶囊里 GLM 18% 是最新的，一级卡片和二级卡片里的信息都是 out-of-date」（双红框截图：胶囊 18% vs 两卡 50%/重置 11:15）。诊断定谳：合并态（CEP poll-pause）下 qw 客户端整条轮询链被停（`startPolling` 的 `embedded` 硬门控 + engage `stopPolling`），而一级/二级卡片渲染自 qw 客户端内存快照——打开卡片零 fetch，快照冻在嵌入时刻；sk 侧胶囊段自拉 `/overview` 所以始终新鲜，服务端快照也因 sk 30s 拉取保持新鲜（loopback 直测 5h=19%、updatedAt 当刻）。11-11 双计划修的是点击/分脑/拉取链冻结，未覆盖此洞。

修复（qw 侧，本仓零代码改动）：qw `src/client.mjs` 嵌入门控改为**数据面豁免**——面板/弹卡（openKey）或副栏卡片可见 ⇒ qw 恢复自身节奏拉取（开卡即新：`syncPop`/`syncCardVisibility` → `syncEmbeddedPolling`），全关 ⇒ 恢复停链；在飞 GET 的级联渲染不补发（`ordinaryPollInFlight` 守卫，防微任务级联风暴——首版实现曾因此把事件循环饿死 60s，探针定位后修正）。CEP §4 engage 行同步（本仓 commit 85f414a）。

验证：

- TDD：client-embed 三新用例（开面板立即拉取+开着续排+关后停链 / 卡片可见轮询继续+藏卡面板仍开不停+全关停 / 既有后台停链用例保绿）红→绿 13/13；qw 全量 272/272/0（21s）。小机纪律（本日教训）：3.7G 内存机上测试一律 solo + 硬超时包裹——并发两套 jsdom 套件曾把宿主挤挂，Hermes 杀进程自愈并已入册 dsh-runtime-ops skill。
- 发版链：0.1.41 三处锁步 + build → `fix(client)` bdc6818 + `chore(release)` cad3fc7 → tag 推送（pre-push 全量套件 + 新鲜度门禁过）→ release-monitor 两阶段：workflow success + npm 三键 200（13:00:16 上架）→ `dshm_upgrade` 装机 0.1.41。
- **活体验证**（chromium-1234 驱动本机宿主页，探针 `.dsh-research/exec-scratch-20261112/probe-qw-0141.mjs`）：`guestVersion 0.1.41`（免重启生效）；合并态 qw pill 隐藏、sk 段 `GLM 48%·Copilot 68%` 与服务器同值；**open-panel 后 overview GET +1（旧代码为 0）且面板渲染 48% === 服务器当前值**；关面板后台 2.5s 零新增请求。

**未验证项与降级**：主人实机手感（浏览器刷新后开卡即新）待确认；`dshm_upgrade` activation 报 restart-required 系保守判定——本轮 diff 纯客户端文件，活体 guestVersion 已证免重启。

## 12.28 多源降级链 / 指数目录 / 美股行情时间戳 / 诊断闭环（2026-11-13；调研 suifei/dsh-market-lens 后 P0-1/2/3 + P1-6 落地）

背景：深度调研 suifei/dsh-market-lens@9ed8477（v0.34.8，本机已装）后按主人拍板落地四项（钢人取舍：不采纳 LED 灯墙 / React 栈 / localStorage 业务存储；复用映射与署名见 NOTICE.md、docs/reuse-mapping.md）：

1. **P0-1 多源降级链**（src/quotes.mjs 重写）：cn/hk 腾讯→东方财富、us 东方财富→Yahoo、crypto OKX 单源；链内逐源补位（含 EM 静默丢行场景），整链失败才标 error；**保留本仓提供方级指数退避**（对参考实现的修正——lens 无退避，死源会随轮询反复被打；本仓退避使源静默期零上游调用）。getQuoteFull 同构分链（cn/hk 腾讯→EM、us EM→Yahoo）。
2. **P0-2 指数目录**（src/identity.mjs INDEX_CATALOG 10 只）：kind='index' 仅由目录代码裁决，目录外传 kind=index 降级 stock（防绕过持仓校验，model 层 normalize 剥除业务字段 + patch 显式拒绝 index-no-position）；detail 页指数不渲染持仓/目标价表单（占位说明 + i18n 双语）；搜索走目录本地匹配（零网络，上游全挂也搜得到）；直连添加走主备源双链校验。
3. **P0-3 美股行情时间戳**：EM ulist/stock/get 补 f124 → quoteTimeMs；Yahoo chart meta.regularMarketTime（备源路径）——美股新鲜度从「按拉取时间判定」改为「按行情时间判定」（此前目标价 30 分钟门对美股实际失真）。
4. **P1-6 诊断闭环**（src/diag.mjs + routes + 客户端上报）：按天 JSONL（~/.dsh/stock-kanban/，超限轮转 .1），diagLevel off/errors（默认）/full（零依赖手写 config：diagLevel/diagDir/diagLogMaxBytes，钳位 64KiB–16MiB）；route.status 门（同 path+status 两分钟一行，dropped 窗口内累计、随下一行补记）；provider.fail（仅真实上游失败，含退避参数；退避快速失败不发）；store.conflict（409 计数）；客户端批量上报（挂载 / 行情失败迁移去重，≥40 行或 2s 或页面隐藏 sendBeacon）；POST /stock-kanban/diag（同源 + 64KiB + ≤200 行 + ev 归入 client. 命名空间、服务端保留事件族 provider./route./store./host. 拒收并计数）；GET tail 仅信任壳（与读路由惯例一致）；全路由过官方信任检查。

**验证**：

- 真机上游实测（2026-11-13 上午 curl 直连）：腾讯 qt.gtimg.cn 快照 sh000001/hkHSI/hkHSTECH（指数行存在；港股指数时间为 "2026/11/13 10:30:48" 斜杠格式，解析与回归钉已落 tests/providers-tencent）；fqkline hkHSI/sh000001（day 键、无 qfq → 不复权口径成立）；minute/query hkHSI/sh000001。Yahoo chart AAPL（meta.regularMarketPrice/chartPreviousClose/regularMarketTime；无 crumb + 浏览器 UA/referer 直连可用）。EM push2his kline/trends2 secid=100.DJIA（美股指数预置 secid 成立）。
- **EM push2 本机故障实录**：push2.eastmoney.com https/http 均 502（nginx 边缘），push2his 正常——现网美股实际由 Yahoo 备源兜底，即 P0-1 链的现实降级场景。EM cn/hk ulist 与 f124 的真机端到端**未验证**（见下）。
- 单测：新增 tests/providers-eastmoney、providers-yahoo、diag、search-index 四文件 + identity/model/providers-tencent/quotes-service/routes 六文件扩展（多源链补位、整链退避、指数身份/记录/搜索、斜杠时间、diag 三级过滤/轮转/回读、diag 路由同源与 route.status 门）。全量 npm test **326/326/0**（基线 302 + 新增 25、其中 1 条为改写既有整链退避用例并删旧 1，净 +24——原记「基线 296 + 新增 30」系沿用 §12.26 缓存数字未实测基线，评审轮 1 机械统计勘误，见文末追记）；npm run build 重建 lib/client.js（版本维持 0.2.5，未发版增量，下次发版 bump）。
- 工程教训（测试当场抓获，留档防再犯）：① Object.create(res) 代理 response 破坏 Node 内部槽位 → /state 挂起 300s（HeadersTimeoutError）——route.status 门改为 handler 结束后按 res.statusCode 记账（finally），不做响应代理；② 港股指数时间解析秒段多拼 ":00" → Date.parse NaN（夹具抓出）；③ 嵌套对象字面量闭括号层序（}] } }) 序）heredoc 手写两处笔误，靠 node --check + 逐字节对比工作行坐实——批量生成代码后机械校验不可省。

**未验证项与降级**（未验证不冒充已验证）：

1. EM push2 通道（cn/hk ulist 批量、stock/get f124、美股 ulist 时间戳）真机未通（本机 502）——由单元夹具按 lens 字段口径 + 本机历史实测（2026-11-06 probe 23/23）覆盖；push2 恢复后跑 scripts/probe-markets.mjs 补测并追记本节。
2. Yahoo 指数符号 ^DJI/^IXIC/^GSPC 未真机实测（仅 AAPL 实测 + 夹具）；Yahoo 地域 403 风险沿 lens 记录，降级路径 = EM 主源（美股双源互补）。
3. 指数添加/详情/K 线未做真实浏览器端到端（jsdom 单测 + 数据源 curl 已钉）；装机后按仓库纪律补 scripts/cdp-shot.mjs 截图留证。
4. 诊断闭环真宿主活体（轮转触发、客户端 beacon 到达、route.status 门在真实 502 下的行为）未观察——单测覆盖读写路径；装机后看 ~/.dsh/stock-kanban/*.jsonl（默认 errors 级，push2 故障期间应见 provider.fail eastmoney 行）。

**§12.28 追记（2026-11-13 评审轮 1，评审 Agent reviewer-lens-adopt 提出三项，全部接受并修复）**：

1. **用例分解勘误**（评审#1，建议）：原记「基线 296 + 新增 30」沿用 §12.26 缓存数字、未实测基线（违反本文件 12.1「实时用例总数以命令输出为准，不缓存数字」纪律——立规者自己违规，记入教训）。机械统计（基线 tests 计数 + diff 新增 test( 行）实为基线 302 + 新增 25（其中 1 条为改写既有整链退避用例、删旧 1），净 +24 → 326；总数 326/326/0 不变。
2. **README 行情来源表指数行「分时」列事实错误**（评审#2，重要）：美股指数（道/纳/标普）detail 分时实际走 adapterFor('us') → EM trends2，非腾讯 minute/query；列改为分市场表述（中/港指数腾讯、美股指数 EM）。
3. **Yahoo 备源涨跌幅口径修正**（评审#3，重要）：meta.chartPreviousClose 是 range 起点的前收盘、随 range 漂移（评审实测 range=1mo → 340.97 ≠ 昨收；range=5d → 344.17 同样 ≠ 昨收），原实现按它算涨跌幅 → 备源路径当日涨跌幅系统性失真（实测样本 +4.08% vs meta 真值 -0.135%）。该实现自 dsh-market-lens lib/sources/yahoo.js 原样继承（上游同病，复用映射纪律照记不隐）。修正：regularMarketChangePercent 直读 + 昨收按 price/(1+pct/100) 反推（腾讯分时 prevClose 同款推导先例）；pct 缺失或 ≤-100 才回落 chartPreviousClose/previousClose；providers-yahoo 夹具同步改真值断言（含「changeAmount 与当日口径同号」回归钉）。
   评审问「是否升阻断」：执行方意见维持**重要**——失真仅限备源路径的当日涨跌幅展示字段；价格与行情时间戳（目标价新鲜度判定依据）不受影响；已当场修复。如主人认为备源常开期的展示失真应按阻断归档，改口径即可，不影响代码。

修复 commit 见 git log；复跑命令（solo）：node scripts/run-tests.mjs tests/providers-yahoo.test.mjs tests/quotes-service.test.mjs。

**§12.28 追记（2026-11-13 评审轮 2，评审 Agent reviewer-lens-adopt 终批复核）**：

批次1 三项（P1 README 指数分时列 / P2 Yahoo 涨跌幅口径 / P4 用例分解勘误）已修复并经评审亲跑复核通过（commit 6e33393；yahoo 夹具红灯复演红→绿）。P2 严重度两方观点已归档待主人裁（D1，执行方维持「重要」）。

本轮接受并修复：

- **P3 diag 日志完整性**（重要）：① diag.append 展开序改为 row 在前、服务端时钟 t 在后——客户端自带 t 不可覆盖宿主时间戳；② POST /diag 客户端行 ev 强制归入 client. 命名空间，服务端保留事件族（provider./route./store./host.）拒收并以 rejected 计数返回——客户端不可伪造 provider.fail/route.status、绕不过 route.status 门；③ src 恒覆写 client。D3 执行方立场：不做逐字段白名单（客户端事件字段 legitimately 多样，白名单锁死扩展），「命名空间化 + 保留族拒收 + 服务端时间戳权威」三件套闭合伪造审计线向量。
- **P5 迁移告警**（建议，D2 处置=不接受静默）：store.init 检测「历史记录被 P0-2 目录翻为 index 且原带持仓/目标价」时 warn 一次带计数（提示可用升级前备份回滚）；剥除行为本身是 P0-2 规格不变。
- **§12.28 措辞修正**：GET tail 仅信任壳（与读路由惯例一致），POST 才有同源+体积+行数上限——原文「GET/POST 同源」过宽已改。

P6（退避期含陈旧缓存时主源缓存优先于备源新鲜度）维持既有显式取舍：退避期内不打上游是限流纪律（quotes.mjs 注释明示），备源新鲜度换上游保护——记录为已知取舍，不改。

新增回归钉：diag.test「服务端时间戳权威」、routes.test「客户端行 ev 命名空间化——保留事件不可伪造」（既有 diag POST 断言同步改 client.panel.quotes.fail）、store.test「指数迁移告警计数」。

评审轮 2 收口后全量 npm test **329/329/0**（亲跑 EXIT=0，即代码最后一次改动后的套件；评审 Agent 在副本 review-final=58b8932 亦复跑 329/329/0）。本轮仅改 src/tests/docs，未改 client/，lib/client.js 无需重建；版本仍 0.2.5，未发版（发版与装机均未执行）。

范围外建议（评审提出，未实施，留档）：push2+push2his 同域故障时美股 K线/分时降级面补 capability-matrix 一句；search.mjs 未使用 import normalizeKind 清理；client/diag visibilitychange 监听无 dispose（无害）。

## 12.29 评审收口后的三项落地 + 本机热部署（2026-11-13，轮 3）

依据：§12.28 评审终核遗留的 D1，以及 capability-matrix 补句、search.mjs 未用 import、client/diag.mjs 监听 dispose 三项计划外建议。主人指令：先落地，再本机热部署，手动验证后发 0.3.0。

- **D1 落地**（P2 严重度）：记为「重要」（执行方立场）。评审终核确认修复已落地、不构成发布阻塞；评审方主张阻断的理由已在 §12.28 归档。残余风险（pct 缺失时的回落分支仍按 chartPreviousClose 计算）已消除：备源请求改为固定 `range=1d`（提交 2d76450）。实测（2026-11-13，AAPL）：`range=1d` 时 chartPreviousClose=355.36，与 `regularMarketPrice/(1+pct/100)` 反推的 355.3597 一致；紧随其后的 `range=1mo` 请求返回 HTTP 429「Too Many Requests」，即 Yahoo 对快速连续请求限流，备源路径由提供方级退避兜底。
- **R3-1（超出评审清单，本轮新发现并修复）** `resolveUSSecid` 负缓存污染（提交 91e38aa）：旧实现把「三交易所全部探测失败（网络/上游故障）」也写成 null 并永久缓存，故障期间首次探测过的美股代码在进程存活期内 K 线/分时一律报 not-found，即使 push2 已恢复。修复：仅当三交易所都明确应答且均无此代码时才负缓存；有任何传输失败则下次重新探测。红灯：修复前新增 3 条中 2 条红（瞬时故障恢复、部分失败），1 条守卫绿（确认不存在仍负缓存，符合预期）。
- **search.mjs**：删除未使用的 `normalizeKind` import（提交 0dfbb1b；grep 核实该符号仅在 import 行出现）。
- **client/diag.mjs**：增加 `dispose`（提交 2944dc6）：摘除 visibilitychange 监听并冲掉队列，拆卸后 add 不再入队；main.mjs 拆卸路径改调 dispose。新增 tests/client-diag.test.mjs 两条。
- **capability-matrix**：补一句，push2 与 push2his 同域故障时美股 K 线/分时无备源。
- 测试：`npm test` **334/334/0**（EXIT=0；§12.28 收口时为 329，本轮新增 5）。`npm run build` 重建 lib/client.js（134.5 KB），随 2944dc6 入库。

### 本机热部署（执行计划与核验判据）

- **基线**：DSH web profile 中 dsh-stock-kanban 为 **npm 注册表安装 0.2.5**（dshm_list 核实：source=npm）。systemd 基线 `MainPID=1644228`，`ActiveEnterTimestamp=Fri 2026-11-13 13:46:49 CST`，health=200。
- **切换**：`dsh plugin --profile web add link:/home/ubuntu/workspace/dsh-stock-kanban`（链接安装，sourceKind=link；链接期间升级通道不可用，发 0.3.0 时改回注册表安装）。随后按 AGENTS 恢复 `node_modules`：`npm ci`，npm 缓存指向 `.dsh-research/` 子路径。
- **重启**：按 know-how 037 §3 的分离式姿势，作为本轮最后一个动作：`nohup bash -c 'sleep 20 && sudo systemctl restart deepseek-harness.service'` 后台排程；排程后不再发工具调用。
- **下一轮核验**（只读，判据逐条）：
  1. `systemctl show -p ActiveEnterTimestamp -p MainPID deepseek-harness.service` 晚于基线且 MainPID 变化——否则重启未发生，改由主人在终端执行，或走 dshm_restart（需主人同意）。
  2. `dshm_list` 中 dsh-stock-kanban 的 source=link。
  3. `GET /stock-kanban/search?market=cn&q=上证` 返回 kind=index 的 sh000001（目录路径，不依赖上游）。
  4. `GET /stock-kanban/health` 的 providers 含 yahoo（新主机代码的标志）。
  5. 构建指纹：页面下发的本插件 client.js 与 lib/client.js 前缀一致（字节比对，不以 HTTP 200 为判据）。
- **回滚**：若服务重启后异常，先回到注册表安装：`dsh plugin --profile web add dsh-stock-kanban@0.2.5 --registry=https://registry.npmjs.org/`，再重启。
- **发版 0.3.0**：待主人手动验证通过后执行，本段不包含。

## 12.30 美股详情图表多源备源（2026-11-13；修复详情页「加载失败：行情获取失败 (fetch failed)」）

现象：美股卡片恢复后（12.29 重启生效），详情页分时与日 K 报 fetch failed。根因：东方财富 push2his 在本机当时整体不通（curl 报 Empty reply from server，HTTP=000；push2 返回 HTTP 502），而详情图表此前只有东方财富一条路径，无备源。

修复（本次提交）：新增 src/markets/us-detail.mjs，美股详情经它取数（src/routes.mjs 的 adapterFor 对 us 改指向它，其余不变）。
- K 线：东方财富（前复权，主源）→ 腾讯美股 fqkline（备源，未复权，adjust='none'，界面标注「不复权」）；指数（DJI/IXIC/INX）只走东方财富，不回落腾讯。
- 分时：东方财富 trends2（主源）→ Yahoo chart 1 分钟（备源，昨收取 meta.chartPreviousClose，日期按纽约时区）。
- 腾讯美股后缀：usNVDA.OQ 返回 180 根、升序；无后缀 usNVDA 只返回 2 根（数据不完整），故后缀按 .OQ → .N → .AM 逐个探测并记住。
- Yahoo 429、5xx 或网络错误后 120 秒内不再请求 Yahoo（提供方级退避）。
- 缓存：成功结果 K 线 5 分钟、分时 30 秒，失败不缓存。

测试：tests/us-detail.test.mjs 6 条（东方财富不通回落腾讯、后缀探测与记忆、指数不回落腾讯、分时回落 Yahoo 与昨收/纽约日期、429 退避、K 线缓存）。全量 npm test 350/350/0（EXIT=0）。src/routes.mjs 仅改 adapterFor 一行；lib/client.js 未改动。

未验证与降级（未验证不冒充已验证）：
1. 本次未重启宿主，新代码尚未加载；详情页活体效果待重启后由主人在浏览器确认。
2. 腾讯美股分时：休市时返回空数组，开盘时段可用性未验证，故未纳入分时备源。
3. 腾讯 K 线未复权：周 K、月 K 跨拆股日会出现断点（如 NVDA 2024 年拆股）。界面如实标注「不复权」；东方财富恢复后优先使用其前复权数据。
4. Yahoo 1 分钟：本机多次连续请求返回 429，备源常被限流；Yahoo 日 K 的 adjclose 本次未能实测（429），故未使用 Yahoo 日 K。
5. 后缀探测：仅 NVDA（NASDAQ，.OQ）做过实测；NYSE（.N）与 .AM 的后缀路径未实测。

## 12.31 详情页头部报价与分时守卫修复（2026-11-13；修复头部「获取失败 / 行情缺失」，并让详情轮询不再持续打 Yahoo）

现象：12.30 重启生效后，卡片上的美股已恢复（用户截图确认），但详情页头部仍显示「获取失败 — 行情缺失」，分时报 `yahoo-backoff`。

根因（代码，已用红测试复现）：
- 详情路径 `getQuoteFull` 的 `fullAdapter` 缺 `tencent-us` 一项。美股链配置了 `tencent-us`，详情路径却直接跳过它；东方财富 secid 探测失败、Yahoo 又被限流，于是头部报 `no-data`。
- 详情路径绕过提供方退避与缓存。详情视图的头部轮询（`client/store.mjs`：仅当面板打开且处于详情视图时 `full` 为真，间隔 15 秒）每次都直接调用 Yahoo 批量接口，批量路径的退避从未覆盖到这里，429 因此持续。

修复（`src/quotes.mjs`）：
- `fullAdapter` 增加 `tencent-us`，与卡片批量路径同一适配器，时间戳经美东换算。
- `guardedFull`：详情路径与批量路径共用提供方状态（失败计数、指数退避）；退避期内直接抛错、不打上游；有行情的成功结果按 `ttlMs` 短缓存。
- 美股链顺序不变：东方财富 → 腾讯美股 → Yahoo。

测试：`tests/quotes-full-us.test.mjs` 3 条——东方财富失败时腾讯美股补位且不落到 Yahoo；Yahoo 429 后退避期内腾讯美股与 Yahoo 不被重复打；成功结果在 TTL 内腾讯美股不重复打。修复前三条均红（缺 tencent-us 得 no-data；无退避与缓存则重复打上游），修复后全绿。`npm test` 353/353/0（EXIT=0）。

未验证与降级（未验证不冒充已验证）：
1. 本次未重启宿主，服务端代码尚未加载；头部报价与 Yahoo 恢复情况待重启后在页面上核验。
2. 东方财富 secid 探测的传输失败由 `resolveUSSecid` 静默吞掉并返回 `null`（既有设计：传输失败不负缓存）。详情路径因此计不到东方财富的失败，东方财富的探测仍每轮执行（本机实测失败很快，但仍是上游请求）。已知遗留项：根治需要为 `resolveUSSecid` 增加严格模式并单独测试，本次未处理。
3. 分时仍只有 Yahoo 1 分钟一条路径（东方财富 trends2 不通；腾讯美股分时休市时返回空数组，开盘时段未验证）。守卫减少了头部轮询对 Yahoo 的压力，但不保证 Yahoo 解除限流；限流不解除时分时仍会显示 `yahoo-backoff`。
4. 美股详情 K 线回落腾讯美股时为未复权数据（`adjust=none`，界面标注「不复权」）。

## 12.32 东方财富 secid 探测失败不再静默（2026-11-13；§12.31 遗留项收口）

现象（§12.31 遗留项）：东方财富 secid 探测的传输失败被 `resolveUSSecid` 静默吞掉并返回 `null`。详情路径因此计不到东方财富的失败，每次详情轮询仍探测三个交易所（每个交易所 https 失败后降级 http 再试一次，全部失败时约 6 次上游请求）。另有 K 线与分时的解析失败被报为 `not-found`（界面「行情缺失」），而不是 `fetch-failed`。

修复（`src/markets/eastmoney.mjs`、`src/quotes.mjs`）：
- `resolveUSSecid(code, { strict })`：严格模式下，若三交易所中存在传输失败且未解析出 secid，则抛出 `SECID_TRANSPORT`，**仍不负缓存**（故障恢复后可解析）。默认模式行为不变，搜索路径 `fetchQuote(code)` 不受影响。
- 严格模式用于：批量快照的美股个股解析（卡片路径）、详情快照（`fullAdapter.eastmoney` 调用 `fetchQuote(code, { strict: true })`）、K 线与分时（解析失败报 `fetch-failed`，不再报 `not-found`）。
- 由此东方财富的传输失败进入提供方级退避：卡片与详情共用同一退避状态，退避期内不再探测东方财富。

测试：`tests/eastmoney-strict.test.mjs` 3 条（严格模式传输失败抛错且不负缓存；三交易所明确无此代码仍负缓存；`fetchQuote` 严格与默认两种模式）。`tests/quotes-full-us.test.mjs` 第 2、3 条改为统计全部上游请求（含东方财富探测），新增第 4 条（退避期内不再探测东方财富）。修复前上述断言为红（退避期内东方财富仍被探测 6 次），修复后全绿。`npm test` 357/357/0（EXIT=0）。

未验证与降级（未验证不冒充已验证）：
1. 本次未重启宿主，服务端代码尚未加载；线上行为待重启后核验，判据是 `/health` 中 `eastmoney` 的 `failures` 与 `backoffRemainMs`。
2. 东方财富 push2 与 push2his 在本机仍不通（2026-11-13 实测），本次只减少无效探测，不改变东方财富可用性；美股主数据仍走腾讯美股备源。
3. 搜索路径仍是默认模式：传输失败时返回 `null`（交互查询失败即显示无结果），未改动。

## 12.33 开休市显示与轮询策略（2026-11-13；用户要求：官方来源、与兄弟项目对比、不过度设计）

**官方来源（时段依据）**
- 上交所交易时间（《上海证券交易所交易规则》2.4.2）：9:15–9:25 开盘集合竞价；9:30–11:30、13:00–14:57 连续竞价；14:57–15:00 收盘集合竞价。来源：https://www.sse.com.cn/lawandrules/sselawsrules2025/trade/universal/c/c_20260424_10816492.shtml（依据搜索摘录核对，正文抓取未成功）。
- 深交所交易规则（同款条款）：https://docs.static.szse.cn/www/disclosure/notice/W020180328432928783546.pdf
- 纽交所：Core 9:30 a.m.–4:00 p.m. ET；Late Trading 4:00–8:00 p.m. ET；2026 年节假日与提前收市：https://www.nyse.com/markets/hours-calendars
- 纳斯达克扩展时段 4:00 a.m.–8:00 p.m. ET：https://www.nasdaq.com/articles/nasdaq-global-trading-hours-future-trading
- 仅供了解、本次未编入：上交所 2026 年度休市安排 https://www.sse.com.cn/disclosure/dealinstruc/closed/ ；港府 2026 一般假日 https://www.gov.hk/en/about/abouthk/holiday/2026.htm
- 未核实：港交所证券市场时段（HKEX 页面为动态渲染，抓取未成功，沿用 09:30–12:00、13:00–16:00）；深交所休市原文（未直接核对，沿用沪深同步的联合公告说法）。

**兄弟项目对比（dsh-quota-watch，工作区内的同类插件；dsh-market-clone 不在本机，无法对比）**
| 维度 | dsh-quota-watch | sk（定稿） |
|---|---|---|
| 浏览器轮询 | 固定 30 秒（`CLIENT_POLL_INTERVAL_MS`） | 随开休市：任一市场开市时展开 15 秒 / 收起 30 秒；全部休市 60 秒 |
| 可见性 | 隐藏停表，可见立即拉取 | 同（沿用） |
| 失败重试 | 冷启动 2 秒 × 2 倍、封顶 30 秒（`retryNoDataMs` / `retryBackoff`） | 不做：与服务端同机，下一拍即恢复，不增加状态 |
| 宿主探测 | 固定 60 秒（`pollIntervalSec`） | 服务端无常驻定时器，按请求惰性取数（TTL 10 秒 + 提供方退避） |
| 空闲 | ADR 0006：无人观看即跳过探测；恢复时先返回缓存、再后台刷新 | 客户端隐藏即停；休市降频 60 秒；服务端不因空闲产生上游请求 |

取舍理由：额度不随交易时段变化，固定节奏即可；行情随市场变化，且目标价提醒依赖及时刷新，故按开休市切换节奏。两者都遵循「无人观看不探测」的原则。

**定稿策略**
- 开休市 = 时段表（周一至周五 + 时段；美股含 04:00–20:00 扩展时段；加密恒开市）。法定节假日、提前收市与长假不建模，按工作日处理。
- 标签 = 复合判断（时段 × 服务端行情状态）：行情过期时，时段内「旧」、时段外「休」；无数据「无」；行情正常不显示。列表「休」、详情「休市中」、胶囊「休市」。
- 轮询：任一标的市场开市（或含加密）→ 展开 15 秒 / 收起 30 秒；全部休市 → 60 秒。隐藏停表，可见、展开面板、切换市场即刻拉取。
- 图表：开市时分时 / K 线每 60 秒静默刷新；休市不刷新；刷新失败保留旧数据。
- 目标价提醒：行情过期或休市时暂停判断（沿用既有规则）。

**限制（已接受）**
- 节假日按工作日处理：长假期间行情过期显示「旧」而非「休」（国庆、春节等）；行情数据本身仍正确。
- 休市时最多 60 秒才感知开盘（轮询降频）。
- 时段表为近似值，不逐分钟对齐交易所规则（集合竞价、午间临停等不区分）。

**测试与部署**
- `tests/sessions.test.mjs` 重写为 6 条（时段判断、扩展时段、加密、复合标签、轮询节奏、图表刷新）。先前的官方日历模块与两份过度设计的测试未入库，已删除。
- 聚焦测试 90/90；全量 `npm test` 353/353/0（EXIT=0）；`npm run build` 生成 `lib/client.js`（134.5 KB）。
- 仅客户端改动（`src/sessions.mjs` 只被客户端引用）。安装副本为指向工作区的符号链接，页面硬刷新即生效；东方财富严格模式（§12.32）仍需重启服务才会在线上生效。
## 12.34 截图反馈四项（2026-11-13）：指数备注间距、休市分时提示、休市徽标整列一致、分时轴锚定

- 指数备注紧贴图框：`.skc-index-note` 改为上留白 10px。
- 休市时分时获取失败（源退避/限流）不再标红「加载失败」，改安静提示「休市中，暂无分时数据」（`detail.chart.closed`，zh/en 双侧）；K 线不受影响（历史数据仍有效）。数据可得时仍显示上一时段分时图。
- 休市徽标整列一致：休市是市场事实，不再依赖目标价是否设置（此前英伟达设过目标价显示「休」，苹果未设则不显示）。`targetBadgeKind` 收口：休市时段一律「休」；开市时维持原语义（触价 B/S、旧、无）。
- 分时轴锚定常规时段（`CHART_WINDOWS`：cn 09:30–15:00、hk 09:30–16:00、us 09:30–16:00）：按时间比例定位（午休压缩），轴首尾 = 开市/收市，不再随数据首尾漂移（此前 13:12 / 15:30 均为数据点时刻）；数据超出常规窗（美股扩展时段、ETF 15:30 尾点）轴自适应外扩，盘中未走完时线停在当前时刻的比例位。加密等无窗市场维持原样。
- 测试：sessions 复合标签整列一致；client-dom 分时轴锚定（A股数据止于 11:00，轴首尾仍 09:30–15:00、含 13:00、线未到右缘）。渲染层改动按纪律跑 cdp-shot 实拍复核。
- 实拍复核（cdp-shot 两轮，console error 0，bundle 指纹页面=本地）：首轮发现两处缺陷——列表休市徽标被 `no-targets` 早退门挡住、港股收盘竞价外扩窗（16:00–16:08）起点与终点标注在右缘重叠——`c35b198` 修复并新增港股外扩轴 deepEqual 测试；二轮确认列表「休」整列一致（智谱 / 腾讯控股均显示）、分时轴 09:30 / 13:00 / 16:08 无重叠、详情「休市中」正常。宿主 wrapped-chrome（运行 19h）与本插件无关，未触碰。
## 12.35 第二轮截图反馈（2026-11-13 傍晚）：休市提示即时化、指数分时间歇空白、分时轴行为确认、刷新按钮结论

- 美股休市分时提示出来慢（图一反馈）：休市时段不再等上游——进入详情立即显示「休市中，暂无分时数据」，后台仍取数，数据到达后下一帧静默换成上一时段图表。
- 上证指数分时「有时刷不出来」（图二空白 + 昨收 —，8 秒后图三正常）：根因 = CN/港股分时是单一腾讯源，偶发短包（0–1 个有效点）被伪装成成功响应（error:null + points:[]），客户端走了「暂无分时数据」空态而非错误 / 休市提示。修复：routes 层守卫——点位 < 2 一律按 no-data 上报，不得伪装成功；客户端休市显示「休市中」、盘中显示错误并可重试。新增路由层测试（单点 → no-data；3 点正常通过；腾讯行格式实测 HHMM）。指数分时本体两次直探测均稳定，与 eastmoney 退避无关（分时路由不经过 eastmoney）。
- ETF（sh510210）轴尾 15:30 与港股（hk02513）轴尾 16:08（图四图五）：分别是数据源包含的 ETF 盘后尾段与港股收盘竞价，自适应外扩是设计行为——轴如实标注数据实际覆盖范围；属可接受近似，不为它加复杂度。
- 明日 10:00 盘中行为（用户问询，确认）：轴锚定 09:30–15:00；10:00 打开时线覆盖 09:30–10:00（约 9% 宽度，午休压缩口径），其余留白等待绘制；盘中每 60 秒静默刷新延长线段。client-dom 测试已锁定该行为。
- 刷新按钮（图六）：绑定 `store.pollQuotes()`（panel.mjs:273），功能正常。结论：保留——它是唯一的手动立即拉取通道，与自动轮询互补（自动管节奏、手动管「现在就要」）；休市降频 60 秒后兜底价值上升。不建议删除，也不建议扩功能（图表已有 60 秒静默刷新，切标的 / 周期即拉取）。

