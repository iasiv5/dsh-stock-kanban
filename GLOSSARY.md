# dsh-stock-kanban 术语表

DSH 多市场盯盘插件的领域语言：客户端以「插槽」形态注入宿主界面，服务端持有全部业务数据，两端共享身份与时段模型。

## Language

**插槽（Slot）**:
客户端注入 DSH 宿主界面的挂载点（`shell.overlay`）；胶囊与面板都渲染在它内部，宿主可在渲染异常时整体卸载它。
_Avoid_: 容器、挂载区、overlay

**插槽契约（Slot Contract）**:
客户端 bundle 挂载并完整渲染零未解析引用（含样式类名对齐：产出的类名均须在样式表中有定义）、且组件间传递的数据形状与快照一致的约定；由 `tests/client-contract.test.mjs` 执有，违反即 `npm test` 失败（构建期符号黑名单已退役，测试面为唯一守卫）。
_Avoid_: 渲染守卫、UI 测试

**快照（Snapshot）**:
store 对外发布的单一不可变状态对象（business / quotes / quoteMeta / ui / toast / providers）；组件只经它或其字段读取状态。
_Avoid_: state、全局状态
