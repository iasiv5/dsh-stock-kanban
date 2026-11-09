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
直挂 document.body 的 open shadow host（`data-dsh-stock-kanban-float`）；胶囊与面板渲染其内，样式不外泄（ADR 0001）。
_Avoid_: 容器、overlay、插槽（已退役）

**浮动壳契约（Float Shell Contract）**:
浮动壳的挂载与形状约定——body 直挂 + open shadow root、`inject: []`（无宿主注入通道）、位置记忆挂 host left/top、面板锚定胶囊弹出；由 `tests/client-dom.test.mjs` + `tests/package-shape.test.mjs` 执有，违反即 `npm test` 失败。
_Avoid_: 挂载守卫、插槽契约（已退役）

**位置记忆（Position Memory）**:
胶囊组的自由坐标 {x,y} 持久化（键 `dsh-stock-kanban:float-position`）；渲染时按实测几何与安全区钳位，历史格式不迁移。
_Avoid_: 贴边停靠、dock、吸附

**胶囊组（Capsule Group）**:
浮动壳内垂直堆叠的多枚胶囊（stock 段 + quota 段）构成的单一拖拽单元：一套位置记忆、一个 z 层级、分区点击各自开面板（ADR 0002 / CEP v1，计划 B 落地）。
_Avoid_: 合并悬浮框、合并面板

**嵌入协议（Embed Protocol）**:
宿主插件与访客胶囊之间的 window 名字空间 CustomEvent 握手与生命周期（探测/能力/嵌入/心跳/拆分）；规格见 docs/interop/capsule-embed-protocol.md（CEP v1）。
_Avoid_: 插件间依赖、peer 声明
