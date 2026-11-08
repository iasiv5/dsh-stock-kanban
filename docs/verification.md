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
| 2. Windows 浏览器访问远端 DSH | **未验证**（代码路径同场景 3：同一份服务端 + 同一份客户端 bundle，浏览器端无平台分支代码） | 复现步骤：任意 Windows 浏览器（Edge/Chrome）访问 `https://<远端DSH地址>/`，确认右上角胶囊出现 → 点击展开 → 添加/持仓/图表。需注意远端入口若经认证网关，插件路由同源原则不受影响。 |
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

## 未验证与降级汇总（13 章交付口径）

**已完成且验证通过**：见上表全部 ✅ 项 + 89 单测 + 23 数据源探针。

**已实现但未在目标环境验证**：
- Windows 浏览器场景与 Windows desktop profile（同代码路径，按 12.4 步骤可复现）；
- 多浏览器并发修改的 UI 级 409 提示（服务端 CAS 已在路由测试验证，UI toast 逻辑未双页实测）；
- 导入的文件选择器端到端（headless 无法驱动 OS 文件对话框；导入链路的解析/校验/落盘已由单测+路由测试覆盖，UI 侧确认对话框逻辑已实现）。

**已按需求允许的降级**：
- 盈亏比例在隐私模式下同样遮挡（保守默认，4.6 允许自定）；
- 港股 K 线不复权（接口能力，如实标注）；
- 腾讯 minute 主域回退备域（上游 WAF 前科）；
- desktop 缺 storage 服务时回退文件驱动（health.driver= file 可见）。

**尚未完成或被阻塞**：无核心需求阻塞项。

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
