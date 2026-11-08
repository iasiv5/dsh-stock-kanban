# 技术核查记录（dsh-stock-kanban）

核查时间：2026-11-06（Asia/Shanghai）
目标 DSH 版本：0.2.2-rc1（本机 deepseek-harness.service 实际运行版本，已核对 runtime checkout `@deepseek-ai+dsh-harness-dev-context@0.2.2-rc.1`）
核查方式：直接读取本机 `~/.dsh/profiles/node_modules/@deepseek-ai/*` 实际装机代码与类型、`dsh --profile web --dump-config` 组合真相源、参考仓库源码。数据源结论另行用探针脚本实测（见 `docs/data-source-probe.md`）。

## 1. DSH 0.2.2-rc1 插件结构（已验证）

**插件包形态**（证据：本仓库工作区 `dsh-quota-watch/package.json` + 三个参考仓库同构）：

- `package.json`：
  - `"main"`：host 端 ESM 入口，导出 `{ name, inject, apply }`；
  - `"exports"`：`"./client"` 指向浏览器端 bundle（如 `./lib/client.js`）；
  - `"dsh.engines.dsh"`：版本门槛（know-how 033 定谳：0.2.1-rc.2 起 `engines.dsh` 存在即被真实强制）；
  - `"dsh.bundle.patch": "./cordis.patch.yml"`；
  - `"dsh.client": { "platform": "web", "inject": [...] }`。
- `cordis.patch.yml`：`- insert: - id: <插件id> - name: <包名> [config]`，把插件挂进 profile 组合。
- 校验证据：`dsh-client-modules/lib/index.js` 解析 `dsh.client` 声明（platform/inject/external/immediately）。

**组合确认**：`dsh --profile web --dump-config`（本机 2026-11-06 实跑，1811 行）确认 web profile 已装载 `storage`、`storage-json`（config.root = `dshHomePath('storages')`）、`storage-domain`（backend: json）。`~/.dsh/storages/` 目录实存且已被内置单元使用（schedule.json、workspace.json 等），存储链路生产可用。

## 2. Host 端服务接口（已验证）

| 服务 | 接口 | 证据 |
|---|---|---|
| `webServer` | `ctx.webServer.register({kind:'exact'\|'prefix', path, handler(req,res)})`，handler 持有完整响应生命周期（可 SSE）；注销用 `ctx.effect(() => disposer)` | `dsh-host-webserver/lib/types/*.d.ts` |
| `storage` | `ctx.storage.backend`（BackendRegistry：`register/get/names`）；`get('json')` 取 JSON 后端 | `dsh-storage/lib/types/registry.d.ts` |
| storage kv | `backend.kv.open({name, version, tables, hasGlobal, layout:'single', compatibleVersions?})` → `KvUnit`：`loadAll()/putRecord()/deleteRecord()/deleteRecords()/setGlobal()/close()`；单文件 `<root>/<name>.json`，temp+fsync+rename 原子替换，崩溃安全；版本不符报 `version-mismatch` | `dsh-storage/lib/types/backend.d.ts`、`dsh-storage-json/lib/index.js` |
| 单元命名 | `UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/` | `dsh-storage/lib/index.js:80` |
| 写串行化 | **KV 层不串行化并发写**（"write ordering is the caller's responsibility"）——域层才带写链。插件必须自建写链（promise 队列） | `dsh-storage/lib/types/backend.d.ts` KvUnit 注释 |
| settings / credentials | `inject: ['webServer','settings','credentials']` 模式可用 | `dsh-quota-watch/src/host.mjs` |

**选型决定（存储）**：不使用 `storageDomain`（需引入 zod 依赖），直接 `inject:['storage']` + `get('json')` + KV 单元 + 自建写链 + 自校验。理由：①零第三方依赖、零 `@deepseek-ai/*` 依赖（know-how 041 卫生红线）；②HTTP 路由层本来就要做输入校验，域层 zod 校验重复；③变更事件对浏览器端无直接通道，多页一致性改用全局 `rev` 计数 + CAS(409) 实现（见 §5）。降级：若 profile 未装 `storage`/`storage-json`（如某些 desktop 形态），回退为 `~/.dsh/stock-kanban/data.json` 原子写文件驱动（同一抽象接口），并在运行日志标注降级。**desktop profile 是否带 storage 服务未验证**（本机无 Windows desktop），故回退驱动是需求允许的保守措施。

## 3. 浏览器端接口（已验证）

- 加载约定：`window.__ModuleLoader__.load({ id, factory: (require) => {...; return module.exports } })`，factory 内 `require("react")` 取宿主 React（构建时 react external）。
  证据：`dsh-quota-watch/scripts/build-client.mjs`（esbuild bundle → 包装输出）、三个参考仓库 client.js 头部。
- 客户端插件体：`exports.apply = apply; exports.inject = ["slots"]`；挂载：`ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id }, render))`。
  证据：Awu12277 client.js L1772-1789；quota-watch 同用 slots。
- 悬浮胶囊适用性：`shell.overlay` 是自由 overlay 槽位（参考仓库的胶囊/弹窗均挂这里），配 `position:fixed` 渲染即可。
- 客户端"页面生命周期"：插件代码运行在页面 JS 上下文，`setInterval` 随页面关闭自然终止——"所有页面关闭后停止刷新"由宿主页面生命周期天然保证，服务端**不设任何常驻定时器**（缓存为被动 TTL）。

## 4. desktop profile 与浏览器模式（部分验证）

- 同一插件包结构对 web/desktop profile 通用（bundle patch + dsh.client 双面声明是 profile 无关的）。
- **已验证**：web profile（本机 Linux，0.2.2-rc.1）——本插件将在该环境端到端验证。
- **未验证（标记）**：Windows desktop profile。已知差异面（know-how 034/035）：desktop 0.2.1-rc.x 起 webRuntime 已移除，插件服务面用 `webServer`/`webStartup`；本插件不依赖 webRuntime，理论兼容；desktop 是否装载 storage 服务未确认（有文件驱动回退）。安装/验证步骤写入 README，标"未验证"。

## 5. 多页一致性方案（设计，基于已验证的 KV 能力）

- 服务端：全局记录 `{ rev, settings, ... }`，每次变更（增删标的/改持仓/改目标价/导入）在写链内 `rev++` 并落盘（KV 单文件原子替换）。
- HTTP 变更路由带 `ifRev` 参数做 CAS：不匹配 → `409 { rev, state }`，客户端重拉后重试/提示。串行写链保证服务端无交错；CAS 保证"旧页面用过期状态覆盖新修改"被显式拒绝而非静默丢失。
- 客户端轮询行情时顺带携带/接收 `rev`，数据过期即刷新本地视图。

## 6. 三个参考仓库事实（commit 记录）

| 仓库 | commit（main HEAD，克隆时点 2026-11-06） | 规模 | 要点 |
|---|---|---|---|
| Bob-Bo1/dsh-stock-watch | `8b74366` 2026-08-18 | host 314 行 + client 1287 行 | 仅 A股；持仓（quantity/costPrice）文件存储（DSH 工作目录 holdings.json，env 可覆盖）；同源 POST 校验 + 原子写；测试样例 |
| Awu12277/dsh-stock-watch | `ea92259` 2026-09-07 | host 671 行 + client 1793 行 | A股/ETF/港股（腾讯）；胶囊+贴边吸附+扇形菜单（AI 技能注入，**不复用**）；localStorage 存业务配置（**不满足实例共享，不采用**）；TradingView Lightweight-charts CDN + SVG 兜底；目标价触发 |
| Justin-Mai/dsh-stock-view | `45d1646` 2026-09-30 | host 637+264+223 行 + client 1619 行 | fork 自 Awu12277 v1.1.0；新增美股（东方财富）+加密货币（OKX）；腾讯 minute 域名被 WAF 后回退 proxy.finance.qq.com（2026-09-29 实录记录在其源码注释）；**仍保留 systemPrompt 注入段（index.js L621-634，不复用）** |

- 三仓库 LICENSE 均为 MIT（Justin-Mai 为双行版权：Awu12277 原作 + Justin-Mai 修改）。依赖：三仓库运行时均**零 npm 依赖**（fetch 为 Node 内置）。复用条件满足。
- 文档宣称 vs 代码事实：Awu12277 README 的"扇形 AI 菜单"在 Justin-Mai fork 中已移除宿主注入但客户端扇形 UI 仍在；本插件两者都不采用（需求排除 AI 联动）。

## 7. 主干选型

**主干：Justin-Mai/dsh-stock-view 的数据源适配层（Tencent/EM/OKX 三个 provider 的协议知识）+ Awu12277 的胶囊/面板交互骨架；业务模型、存储、路由、客户端整体为新写。**

理由：
1. 四市场数据源协议是本任务最大的"已踩坑知识"（腾讯 WAF 回退、smartbox 交易所后缀→EM secid、OKX 200+code!=0 判错、Binance 451/CoinGecko 403 地域事实），重写等于重踩。
2. Awu12277/Justin-Mai 的 UI 骨架（胶囊、贴边、列表、详情、目标价）验证过挂载与渲染方式，可对照改造。
3. 但其数据模型（自由分组 + localStorage + 名称即身份）与需求（固定四市场 + 实例存储 + 显式标的身份）冲突，必须重写而非拼接；Bob-Bo1 的持仓模型（quantity/costPrice 校验、原子写、同源校验）作为模式参考。

## 8. 复用 / 改造 / 新写清单（摘要，详见 reuse-mapping.md）

- **复用（带版权声明）**：Tencent/EM/OKX 适配协议逻辑（重写整理进 `src/markets/`）、smartbox 搜索解析、`data/*.json` 标的池、SVG 分时/K线绘制思路、胶囊拖动吸附交互模型。
- **改造**：存储从 localStorage/`~/.stocking` 文件 → DSH storage hub；分组从自由分组 → 固定四市场；代码字符串身份 → `{market, code, quoteCurrency}` 结构化身份；触发计算 sell 优先 → 显式 both 状态 + 校验。
- **新写**：实例存储驱动 + 写链 + rev CAS、持仓/汇总纯函数、导入导出校验、刷新调度（客户端分层轮询 + 服务端 TTL 合并缓存 + 退避）、隐私开关、全部 UI。

## 9. 关键风险与降级

| 风险 | 处置 |
|---|---|
| 免费行情接口限流/被 WAF | 服务端 TTL 缓存合并请求；失败退避；多 host 回退（腾讯双 host 已有先例）；明确显示数据时间与失败态 |
| 美股/加密源地域不可达 | EM/OKX 为参考仓库已验证可直连源；探针实测记录；失败时明确降级提示，不伪造数据 |
| desktop profile 无 storage 服务 | 文件驱动回退（同接口） |
| 浏览器后台节流 | document.hidden 时降频；不承诺固定秒级触价捕获（需求已接受） |
| 复权口径 | 腾讯 fqkline 用 `qfq`（前复权）、EM 用 `fqt=1`（前复权）——均以接口参数为准并在图表标注"前复权"；接口真实行为以探针实测为准 |

## 10. 客户端契约测试（2026-11-08）：为何用 stub-react 浅渲染而非 DOM harness

决策三理由：

1. **历史事故全在渲染路径**。插槽级事故（MARKET_LABELS 残留引用、quoteMeta 漏解构）都是「渲染期自由标识符 ReferenceError → React 卸载整个 shell.overlay 插槽」；handler 内抛错在 React 17+ 只记 console、不卸载插槽——静态作用域分析（acorn）的增量覆盖买不来等值风险削减，YAGNI。
2. **零新依赖、零脆测面**。stub-react 的 `createElement` 只返回元素树并录制，hooks 捕获不执行 effect：无 DOM 提交、无定时器、无网络（唯一例外：lifecycle 用例手动执行 App effect，依赖均为录制桩），测试确定性 100%，不引入选择器/时序耦合。
3. **测试走真实接缝**。经 fake-slots（伪造 `ctx.slots.inject/register`）调用 `apply()` 取渲染函数，穿过插件与宿主的真实 slots 协议；三态 UI 经 localStorage 种子驱动 `loadUi()`，走生产持久化真实路径。

守卫收拢：`build-client.mjs` 的 `FORBIDDEN` 符号黑名单（只记得单个历史符号的浅守卫）已退役，`tests/client-contract.test.mjs`（经 `npm test`）为泄漏类唯一守卫。`SNAPSHOT_KEYS` 装配期一次求值、随 store 默认状态键自动扩展，形状断言免维护。若未来客户端出现第二处 observer 类接线，可考虑抽 `createLangObserver` 式工厂；当前单点不抽。
