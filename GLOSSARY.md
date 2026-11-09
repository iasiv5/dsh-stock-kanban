# dsh-stock-kanban 术语表

DSH 多市场盯盘插件的领域语言：客户端以「浮动壳」直挂宿主页面，服务端持有全部业务数据，两端共享身份与时段模型。

## Language

**快照（Snapshot）**:
store 对外发布的单一不可变状态对象（business / quotes / quoteMeta / ui / toast / providers）；组件只经它或其字段读取状态。
_Avoid_: state、全局状态

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
