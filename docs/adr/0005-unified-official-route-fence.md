# ADR-0005：全部路由统一官方信任围栏（connection.requestRejection 守卫式委派）

日期：2026-11-12　状态：已采纳（随 0.2.5 发布）
触发：PR 评审（fkysly）——exact 裸路由无准入，`isSameOriginRequest` 在 DNS rebinding 下必然通过。

## 背景

`/stock-kanban/*` 以 `webServer.register({ kind: "exact" })` 挂载，DSH 对这类裸路由
不做 Host / Origin / Cookie 准入。写路由仅校验 Origin host === Host 头，DNS rebinding
后 Origin 与 Host 均为攻击者域名，校验必然通过：GET `/export`（含持仓的明文备份）可被
读走，POST `/import` 可被驱动覆盖。读写路由都暴露；DSH 直听 127.0.0.1:3080 的本机场景
暴露面最大。

## 决策

1. **全部路由（含 GET）入口先过官方信任检查** `connection.requestRejection`，
   dsh-m 0.9.0 同款**守卫式委派**：`ctx.get("connection")` 非抛式查询，
   `reject.call(connection, { headers })` → 401/403 原样下发、undefined 放行。
2. **语义三态**（与家族各仓对齐的关键区分）：
   - 官方判定为准；
   - **服务查不到**（含 cordis Local 对未注入名 get 抛错）→ 回落本地栅栏，不砖旧 runtime；
   - **围栏执行抛错** → fail-closed（warn 一次）。
3. **本仓取整段 fail-closed**（服务缺席连本地栅栏都不回落）：评审点名要堵的洞；
   `dsh.engines >= 0.2.2-rc.1` 保证 connection 服务在位（dsh-m 生产先例）。宁可砖不可漏。
   写路由仍保留 `isSameOriginRequest` 作纵深。
4. **不迁移** `ctx.connection.fetch.register`（12 条路由重写为 Response 风格）、
   **不挪** `/api` 前缀（URL 变更牵连客户端）——入口一行委派是最小统一形态。
5. **不抽共享 npm 包**：守「零运行时依赖」；各仓内联同一段守卫 + 统一注释锚点
   （grep「守卫式委派」全家族可同步）。

## 家族落地形态（2026-11-12 六仓同步）

| 仓 | 官方缺席时 | 本地回落栅栏 |
|---|---|---|
| stock-kanban | **fail-closed 403**（本仓特殊点） | 写路由 isSameOriginRequest 纵深 |
| copilot-auth | 回落 | Host∈loopback∪trustedHosts + sec-fetch-site + Origin/Host |
| quota-watch | 回落 | pairing/loopback + 同源 |
| obmc-web / onetree-log | 回落 | trustedRequest（Host 白名单） |
| skins | 回落 | isTrustedRequest（最强自研，loopback peer 绑定） |

dsh-m / dsh-skip-browser-auth 本就运行官方围栏，无需改。send-later / skills / surf
无自建路由，不涉及。

## 后果与验证

- **本机 curl（loopback、无 Origin）照常 200**——官方语义下这是可信运维通道，不是漏洞；
  不要把「裸 curl 应 403」写进验证清单（2026-11-12 实录误判）。
- 判别探针：rebinding 形态（Host=Origin=攻击者域）→ `403 {"error":"untrusted"}`；
  0.2.4 旧代码此形态 200 放行。跨站形态 403（origin-rejected 纵深）。
- 测试：tests/routes.test.mjs「官方信任检查」组——拒绝原样下发 / 放行业务照常 /
  缺席 fail-closed warn-once / 抛错 fail-closed / 读路由不豁免 / 64KiB 体积上限。
- 家族同步入口：grep「守卫式委派」。
