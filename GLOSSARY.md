# dsh-stock-kanban 术语表

DSH 多市场盯盘插件的领域语言：客户端以「浮动壳」直挂宿主页面，服务端持有全部业务数据，两端共享身份与时段模型。

## Language

**快照（Snapshot）**:
store 对外发布的单一不可变状态对象（business / quotes / quoteMeta / ui / toast / providers）；组件只经它或其字段读取状态。快照投递可携带变更切片（changed）；切片缺省（undefined）视为全量。
_Avoid_: state、全局状态

**变更切片（Changed Slices）**:
store 随快照投递的变更描述（quotes: 变化的标的 id 集、business、ui: 变化的键名、quoteMetaError）；组件读它决定整段重建还是活区 patch。切片缺省即全量（订阅回放/语言切换）；providers 为引用型例外通道（行情 tick 恒 emit 但切片为空）。
_Avoid_: diff、脏检查、事件总线

**活区（Live Region）**:
骨架内随行情 tick 原位改写的节点集（报价行、派生数字、按钮态）；tick 永不重建骨架与图表（图表仅在其数据引用变化时重画）。
_Avoid_: 热区、动态区、重绘区

## 浮动界面

**胶囊（Capsule）**:
浮动壳内常驻的可拖拽信息 pill（视觉 26px、命中区 ≥44px）；点击开面板，是插件在宿主页面的主要入口。
_Avoid_: 悬浮框、悬浮球、FAB、widget

**浮动壳（Float Shell）**:
直挂 document.body 的 open shadow host（`data-dsh-stock-kanban-float`）；合并胶囊（stock 胶囊；嵌入协议在线时额度段并入其中）与面板渲染其内，样式不外泄（ADR 0001、ADR 0003）。
_Avoid_: 容器、overlay、插槽（已退役）

**浮动壳契约（Float Shell Contract）**:
浮动壳的挂载与形状约定——body 直挂 + open shadow root、`inject: []`（无宿主注入通道）、位置记忆挂 host left/top、面板锚定胶囊弹出；由 `tests/client-dom.test.mjs` + `tests/package-shape.test.mjs` 执有，违反即 `npm test` 失败。
_Avoid_: 挂载守卫、插槽契约（已退役）

**位置记忆（Position Memory）**:
合并胶囊的自由坐标 {x,y} 持久化（键 `dsh-stock-kanban:float-position`）；渲染时按实测几何与安全区钳位，历史格式不迁移。
_Avoid_: 贴边停靠、dock、吸附

**合并胶囊（Merged Capsule）**:
单枚胶囊两段（stock 段 | 1px 分隔线 | quota 段）构成的单一拖拽单元：一套位置记忆、一个 z 层级；分区点击各自开面板；额度段渲染 qw 胶囊同款全名文案（GLM/Copilot + 百分比，数字常驻；2026-11-10 修订，迷你条退场），无数据则隐藏（ADR 0003 及其第 10 条修订）。
_Avoid_: 胶囊组、合并悬浮框、合并面板

**待处理提醒（Pending Reminder）**:
额度段上的琥珀小点：quota-watch 有待处理的兑换结果（overview 的 `manualOutcome` 或 `manualOutcomeError`）时显示，即使没有额度数字；点击打开 quota-watch 面板查看详情（ADR 0003 第 3 条）。
_Avoid_: 待办、提示点

**嵌入协议（Embed Protocol）**:
宿主插件与访客胶囊之间的 window 名字空间 CustomEvent 握手与生命周期（探测/能力/嵌入/心跳/拆分）；规格见 docs/interop/capsule-embed-protocol.md（CEP v1）。
_Avoid_: 插件间依赖、peer 声明

**本地标的池（Pool）**:
随插件分发的 data/*.json 候选列表（代码 + 简称），由刷新管道生成，入池前经报价校验。
_Avoid_: 数据库、缓存、词表

**代码内本地表**:
写在源码里的固定小列表（INDEX_CATALOG 指数目录、COMMON_COINS 常用币）。与池文件的分工：小而稳定的不发行数据文件。
_Avoid_: 硬编码列表、常量表

**在线搜索源**:
行情商提供的搜索接口（smartbox、OKX instruments），列表与行情天然贴近。
_Avoid_: 上游搜索、远程搜索

**行情链（Quote Chain）**:
某市场取行情的提供方顺序（cn: 腾讯→东方财富；us: 东方财富→腾讯美股→Yahoo）。搜索源与行情链是两个概念，提供方可以不同（美股搜索走腾讯、行情主源是东方财富）。
_Avoid_: 行情源、数据源

**混合搜索（Hybrid Search）**:
池优先、池不满 30 条时才打在线搜索源补足；上游失败仍返回池结果并带错误标记。
_Avoid_: 双源搜索

**市场门禁（Market Gate）**:
搜索结果逐行校验 market 与请求 Tab 一致；smartbox 全市场混排，无门禁即串台（0.3.1 实录）。
_Avoid_: 结果过滤

**死码（冻结价）**:
已退市或长期停牌、但行情链仍返回最后价的代码（如 sz000024 = 40.50）。池靠刷新时的报价校验排除；刷新后新死的要等下次刷新。
_Avoid_: 废码、失效代码

**报价校验（Quote Validation）**:
入池或添加前，以「取到名称且价格 > 0」判定代码有效；格式对 ≠ 标的存在。
_Avoid_: 行情验证

