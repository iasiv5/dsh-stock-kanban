# quota 联动·宿主侧：胶囊组与嵌入协议消费

2026-11-09 共识：检测到 `@iasiv5/dsh-quota-watch` 已安装时，把其悬浮胶囊并入本插件浮动壳，合并为「**胶囊组**」——一个 shadow host 内垂直堆叠两枚 26px pill：各自内容、各自点击语义（stock 段开 stock 面板；quota 段经协议开 quota 原生面板），整组拖动、一套位置记忆、一个 z-index。信息零丢失、宽度不膨胀。

调研核证的事实约束（2026-11-09 互操作深潜）：quota-watch 侧无任何对外隐藏/嵌入 API；其胶囊+面板**同住一个 body 级 shadow host**（CSS 藏 host 连面板一起杀；只藏胶囊元素与其每 30s 渲染循环打架）；插件间 peerDependencies 官方 boot 检查与 dshm 预检均不检查；`dsh.client.external` 是硬边（缺供应商即崩，无 optional 机制）。可行通道：DOM 探测（`[data-dsh-quota-watch-float]` + MutationObserver）、同源 HTTP（其 `GET api/dsh-quota-watch/overview`）、window CustomEvent（composed 穿 shadow，双方现零使用）。

**Status**: accepted（2026-11-09 设计共识；实施属**计划 B**——待 vanilla 重写（ADR 0001）落地后启动；协议规格以 `docs/interop/capsule-embed-protocol.md` 为单一事实源；quota-watch 侧决策见其 ADR 0008）

## Decision

- **检测**：DOM 探测为主（host 元素存在 = 活胶囊）+ MutationObserver 感知其启停/HMR；`window.__DSH_BOOT__` 作辅助清单；**不** inject `remote.pluginInventory`（宿主缺该服务时本插件停摆）。
- **合并机制：协作式**——quota-watch 发一个小版本实现访客侧协议（探测应答/藏 pill 不藏 host/锚定开面板/嵌入态停轮询/心跳自恢复），本插件作为宿主消费；不采用侵入式 CSS 藏 host。
- **quota 段数据**：同源直拉其 `GET api/dsh-quota-watch/overview`（权威快照；404/路由不在 → 段自动隐藏）；不读其胶囊 shadow DOM 文本（耦合私有类名）。拉取节奏 30s（与其客户端轮询同频），恰好喂饱其 idle watcher（其 ADR 0006）。
- **交互**：整组拖动 + 分区点击；设置项「合并显示 quota」默认开（协议可用时出现）可拆分；共存态（协议不可用/被拒）**接受重叠不做避让**（降级态不配复杂度）。
- vanilla 重写（ADR 0001）只留结构性缝 `.skc-stack`；不实现任何跨插件逻辑。

## Considered options

- **侵入式零改动（CSS 藏 host）**——拒：面板同殁、manual redemption 失去唯一入口、属性名是私有契约。
- **quota-watch 当宿主**——拒：反向改动成熟侧；其「胶囊是唯一保证表面」语义被动摇更大。
- **独立协同不合并**——拒（本轮）：信息面重复、无合并价值；保留为协议被拒时的降级态。

## Consequences

- 计划 B 依赖计划 A 完成 + quota-watch 协议版发布；降级矩阵保证旧版/未装 → 共存不隐藏，永不孤儿（心跳超时自恢复）。
- 嵌入态 quota-watch 停自身客户端轮询（省一半请求），由本插件拉取喂其 idle watcher。
- quota-watch 侧栏卡片不在合并范围（独立表面，机会性挂载）。
- 本插件不改其面板内部：quota 面板仍由其渲染，仅锚定位置经协议传入。
