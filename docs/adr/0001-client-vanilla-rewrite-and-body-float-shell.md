# 客户端 vanilla 化与 body 直挂浮动壳

胶囊的交互模型承自 Awu12277/dsh-stock-watch 血统（React 组件树 + `shell.overlay` 插槽 + 页面级 `<style>` + 四边吸附）。2026-11-09 grill 共识（四轮、逐项确认）：与同作者仓 `@iasiv5/dsh-quota-watch` 的悬浮胶囊**行为与模式完全对齐**，并为 quota 联动（ADR 0002）奠基。两仓挂载哲学相反——quota-watch 的胶囊刻意「页面顶层直挂、绝不进宿主管理容器」（其 ADR 0001 + GLOSSARY），本插件走宿主插槽；React 栈（`useStore` hook、stub-react 契约测试面 9 用例）是与 vanilla 基准栈的最大结构差异。位置模型也相反：quota-watch 现行为自由坐标 `{x,y}` + 实测几何钳位（其贴边停靠在 v0.1.12 已回退），本插件为松手贴边吸附。

**Status**: accepted（2026-11-09 主人确认；实施计划 `docs/plans/2026-11-09-client-vanilla-rewrite-implementation-plan.md`，经独立评审 8/8 闭环）

## Decision

- **一次性全量重写为 vanilla DOM**（React 退役）：订阅漏斗（`store.subscribe` → 单一 `renderAll`）替代 `useStore`；视图簇采用 `{ el, update(snapshot), dispose() }` seam（对齐 quota-watch ADR 0007 的簇纪律）。
- **挂载通道改为 body 直挂**：`document.body` 上 `div[data-dsh-stock-kanban-float]` + open shadow root（`:host { position:fixed; z-index:2147483000 }`）；`shell.overlay` 插槽与页面级样式注入退役。
- 浮动壳内 `.skc-stack` 纵向容器承载胶囊——**为胶囊组（ADR 0002）预留的结构缝**。
- **位置与拖拽整套照搬 quota-watch v0.1.37**：自由坐标 `{x,y}` + 实测钳位（MARGIN 8 + 安全区 inset + Windows 标题栏 inset）+ transform/rAF 管线 + 分级 slop（鼠标 6px/触屏 10px）+ pointercancel 不落盘 + 默认右下；新键 `dsh-stock-kanban:float-position`，不迁移旧值；`snapToEdge`/`shouldDrag`/`dock` 退役。
- **面板机制对齐 placePanel**（锚定+翻转+钳位、≤480px 底部 sheet、Esc/外点关、footer 动作区、top 标题栏安全钳位）；弹出轴保留 stock 垂直方向（400px 宽列表面板侧弹易越界 vs quota-watch 240px 窄栏）——主人 2026-11-09 确认。
- **测试面切换**：stub-react 契约面退役，jsdom DOM 级契约测试 + 与 quota-watch 同向量的 parity 测试（drag/float-prefs）。

## Considered options

- **行为+隔离对齐、React 保留（B 方案）**——拒：两套栈并存，联动合并时双范式；契约测试面报废只是推迟而非避免。
- **分阶段（胶囊壳先行、面板后跟）**——拒：中间态双范式长期共存，违反「一次性全量」共识。
- **维持 shell.overlay 插槽**——拒：与基准挂载哲学相反，胶囊组合并无共同载体；插槽的可卸载性由浮动壳 dispose 契约等价承接。

## Consequences

- 「插槽/插槽契约」术语退役，「浮动壳/浮动壳契约/胶囊/位置记忆」入 GLOSSARY（实施计划 Task 16 改写）。
- 服务端 `src/` 冻结面零改动，以 `FROZEN_CLEAN` 机器断言收口（Task 1 记 BASE_REF，Task 17 diff 断言）。
- 重写窗口期（React 退场前）本机活体 UI 短暂不可用属预期；`npm test` 全绿为唯一门禁；窗口期零提交，单点提交于 bundle 重建后。
- `lib/client.js` 去 react external；任何触碰 `client/` 的提交同 commit 重建 bundle。
- quota 联动不在本 ADR 范围：仅留 `.skc-stack` 缝，跨插件逻辑全部后置计划 B。
