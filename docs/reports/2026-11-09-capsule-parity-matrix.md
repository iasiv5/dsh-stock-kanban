# 胶囊行为对齐矩阵（quota-watch 基准 → stock-kanban 目标）

2026-11-09 grill 共识 + 独立评审后的验收基线。基准 = `@iasiv5/dsh-quota-watch@0.1.37` 现行线上行为（锚点为其仓库 file:line，评审亲核零错位）。「验收载体」指向 `docs/plans/2026-11-09-client-vanilla-rewrite-implementation-plan.md` 的任务/测试。**域保留**列出的差异是显式声明的 stock 域适配（非漂移）。

| 维度 | quota-watch 基准（锚点） | stock-kanban 现状 | 对齐目标 | 验收载体 |
|---|---|---|---|---|
| 挂载通道 | body 顶层直挂 host + open shadow root（client.mjs:572-604） | `shell.overlay` 插槽 + 页面级 style（main.mjs:53-60） | body 直挂 `div[data-dsh-stock-kanban-float]` + open shadow | Task 13 + client-dom 挂载组 |
| 样式隔离 | 全部样式入 shadow root，token 带硬编码回退（ADR 0001） | `<style id=stock-kanban-styles>` 入 document.head | FLOAT_STYLE_TEXT 入 shadow root | Task 5 断言 + Task 13 |
| z-index | 2147483000（host 与面板同层，client.mjs:217/239） | 9998–10001 阶梯 | 2147483000 单层 | Task 5/8/12 断言 |
| 拖拽 slop | 鼠标 6 / 触屏·笔 10（drag.mjs:7-13） | 单阈值 4（fmt.mjs:89-94） | 6/10 分级 | Task 4 parity 向量 |
| 拖拽管线 | grab 偏移保留 + transform + rAF 批处理，手势期零 left/top 写入（client.mjs:688-793） | pointermove 直写 left/top（capsule.mjs:30-44） | transform/rAF 管线 | Task 8 + client-dom 拖拽序列 |
| pointercancel | 复位、不落盘、允许 trailing click（client.mjs:778-786） | 与 up 同路径（会落盘，capsule.mjs:104） | 复位不落盘 | Task 8 用例 ⑤ |
| 位置记忆 | 自由 {x,y}+钳位，键 `…:float-position`（prefs.mjs:4-33,49-82） | 四边吸附 + pos 混入 ui:v1 含废弃 dock | 自由 {x,y}，键 `dsh-stock-kanban:float-position`，不迁移旧值，dock 退役 | Task 3 parity + Task 8 用例 ③ |
| 视口钳位 | clampPoint：MARGIN 8 + 安全区 + Windows 标题栏 inset（prefs.mjs:19-47, client.mjs:629-670） | clampToViewport 纯 8px（fmt.mjs:96-103） | clampPoint 全套（含 insets 探针与 titlebar） | Task 3/8 |
| 默认位置 | 右下（client.mjs:618-621） | 右上 y=14（capsule.mjs:15） | 右下 | Task 8 用例 ② |
| 命中区 | 视觉 26px + `::before` −9px 外扩 ≥44px（client.mjs:219） | 同款 −9px 已有（styles.mjs:33） | 保留 | Task 5 断言 |
| 键盘路径 | role=button + tabIndex=0 + Enter/Space（client.mjs:576-590,1257-1261） | 无 | 同款 | Task 8 用例 ⑥ |
| 拖后防误触 | suppressNextClick（client.mjs:753） | moved 分支天然不触发点击 | 拖动释放不触发 toggle | Task 8 用例 ③④ |
| print 隐藏 | `@media print { :host{display:none!important} }` | 无 | 同款 | Task 5 断言 |
| 动效守卫 | 动画/过渡全包 prefers-reduced-motion（client.mjs:230-233） | 部分有 | 全包 | Task 5 断言 |
| 胶囊视觉 | 26px pill / blur(10px) saturate(1.2) / color-mix 86% / radius 999 / tabular-nums（client.mjs:218-224） | 同款已对齐（styles.mjs:31-33） | 保留 | Task 5 断言 |
| 面板锚定 | 侧弹+同高+翻转+钳位+top 标题栏安全（client.mjs:1118-1148） | 下方弹出/上方翻转（panel.mjs:63-78） | 机制对齐（锚定/翻转/钳位/sheet/Esc/外点/footer/top 安全），**弹出轴保留垂直**（主人确认 2026-11-09；400px 宽面板 vs 240px 窄栏） | Task 12 + client-dom 面板组 |
| 窄屏 sheet | ≤480px 底部 sheet + safe-area（client.mjs:1122-1129, L241） | 无 | 同款 | Task 12 用例 ② |
| 面板关闭 | Esc + 外点 composedPath（client.mjs:1704-1744） | 仅关闭按钮 | Esc + 外点 + footer 关闭 | Task 12 用例 ③④ |
| 双挂载守卫 | host 存在即 noop（client.mjs:536-537） | 无 | dedupe 守卫 | Task 13 用例 ② |
| dispose 契约 | 全量还原（停轮询/断观察/移除 host，client.mjs:1767-1793） | React unmount 依赖宿主 | 显式 dispose 闭环 | Task 13 用例 ④ |
| 测试面 | jsdom DOM 级 + 纯函数（package.json:41） | stub-react 浅渲染 9 用例 | jsdom DOM 级 + parity 同向量 | Task 2/3/4 |

## 域保留（显式声明，非漂移）

| 项 | stock 域取值 | 理由 |
|---|---|---|
| 面板弹出轴 | 垂直（下方优先/上方翻转） | 400px 宽列表面板；quota-watch 侧弹服务其 240px 窄栏 |
| 面板宽度 | min(400px, vw−16px) | 承载列表+K线图表 |
| 胶囊内容语义 | 名称+现价+涨跌%+B/S 触价标记；红涨绿跌（#e5484d/#2bb596） | A股惯例盯盘域 |
| 胶囊背景令牌 | `--dsw-alias-bg-elevated`（quota-watch 用 bg-base） | B11 只约束 86% 混合比 |
| 点击触发通道 | pointerup 触发 toggle（quota-watch 用 click+suppressNextClick） | 规格自洽；边界语义备案（评审建议 #3） |
| 轮询节奏 | 面板关 30s / 开 15s、详情全量 | 盯盘域节奏，服务端 TTL+退避不变 |
| stale 呈现 | price 位「行情旧」+ title 提示 | 触价新鲜度门语义保留 |

## 联动（计划 B · CEP v1：宿主侧已实现；访客侧端到端活体待 S7）

- `.skc-stack` 纵向容器（Task 5/13）= 合并胶囊结构缝（ADR 0002 的结构缝；形态由 ADR 0003 取代）→ **已实现（方案③）**：quota 胶囊经 `createQuotaEmbed({ target, host })` 挂载（方案③起：挂载目标为合并胶囊本体，`.skc-stack` 已不再承载额度胶囊）（`client/quota-embed.mjs`、`client/main.mjs`）；证据：`tests/client-quota-integration.test.mjs`（8 用例）、`docs/verification.md` §12.11。
- 协议规格 `docs/interop/capsule-embed-protocol.md`（CEP v1）→ **宿主侧已实现**：probe / capabilities / engage / heartbeat / disengage / open-panel 由 `client/quota-embed.mjs` 派发与消费；证据：`tests/client-quota-embed.test.mjs`（10 用例）、`tests/client-quota-integration.test.mjs`（8 用例）；活体：主人启用后的 legacy 只读复查已通过（归因法，§12.11），双插件端到端 E2E 待 S7。
