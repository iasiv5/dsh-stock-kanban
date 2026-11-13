# 复用映射（参考仓库 → 本插件）

三个参考仓库 commit（克隆时点 2026-11-06，`.dsh-research/` 下本地镜像可复现）：

| 仓库 | commit | 许可证 |
|---|---|---|
| Bob-Bo1/dsh-stock-watch | `8b74366` (2026-08-18) | MIT |
| Awu12277/dsh-stock-watch | `ea92259` (2026-09-07) | MIT |
| Justin-Mai/dsh-stock-view | `45d1646` (2026-09-30) | MIT（双行版权：Awu12277 原作 + Justin-Mai 修改） |
| suifei/dsh-market-lens | `9ed8477` (2026-11-13, v0.34.8) | MIT |

## 复用（含版权声明，见 NOTICE.md）

| 参考内容 | 原始位置 | 本插件位置 | 修改说明 |
|---|---|---|---|
| 腾讯财经协议：批量快照字段表（1名称/3现价/4昨收/6量/30时间/31涨跌额/32涨跌%/33高/34低/37额万）、minute/query 结构、fqkline qfq 参数与 WAF 双 host 回退经验 | Justin-Mai `index.js` L46-52、L261-424（上游 Awu12277 同源） | `src/markets/tencent.mjs` | 按身份模型重写；批量快照从"逐标的 minute/query"改为 qt.gtimg.cn 一次批量（上游没有的优化，减少上游请求）；fqkline 列序实测复核（date,open,close,high,low,volume）；qfq 键缺失→`adjust:'none'` 显式化（上游静默回落） |
| 东方财富美股协议：secid 105/106/107 探测、klt/fqt 参数、trends2 北京时间轴、smartbox 交易所后缀→secid 预置 | Justin-Mai `usstock.js` 全文 | `src/markets/eastmoney.mjs` | 重写；新增 ulist.np 批量快照（上游逐标的请求）；secid 探测结果区分 null（确认不存在）缓存 |
| OKX 加密协议：ticker/candles/instruments、HTTP 200+code 字符串判错、UTC+8 日线切分、5m×288 分时、Binance 451/CoinGecko 403 选型结论 | Justin-Mai `crypto.js` 全文 | `src/markets/okx.mjs` | 重写；新增 tickers 全量端点做批量行情（>2 个标的一次请求，上游逐个 ticker） |
| smartbox 搜索解析（GBK + 字面 \uXXXX 还原、GP/ETF 类型过滤） | Justin-Mai `index.js` fetchSmartbox L171-215；Bob-Bo1 `lib/index.js` parseSearchText | `src/markets/search.mjs` parseSmartbox | 重写；保留 hk GP + us GP/ETF + sh/sz ETF 过滤规则 |
| 标的池数据文件 a_stocks/hk_stocks/etf_stocks.json | Justin-Mai `data/*.json`（上游 Awu12277） | `data/*.json` | 原样复制（MIT 随附，版权归原作者） |
| 悬浮胶囊交互模型：拖动/贴边吸附/位置记忆/拖动阈值防误触 | Awu12277 `client.js`（sk-pill/sk-dock 及拖动处理） | `client/capsule.mjs`（一代 React 实现，vanilla 重写后由下述「悬浮胶囊二代」行取代） | React 重写；吸附封装为纯函数并测试；位置按访问端 localStorage |
| 悬浮胶囊二代（自由坐标+钳位+transform 拖拽管线+body shadow 挂载） | dsh-quota-watch `src/client/{drag,prefs}.mjs`、`src/client.mjs` L572-793/L1118-1148 | `client/{drag,float-prefs,capsule,panel,main}.mjs` | 同作者双仓移植（MIT）；slop 6/10、MARGIN 8、键格式与 v0.1.37 逐字对齐，parity 测试同向量 |
| 目标价触价概念（≤买触发/≥卖触发/标记展示） | Awu12277/Justin-Mai `computeTrigger` | `src/targets.mjs` targetState | **语义修正**：上游 sell 优先静默覆盖 buy → 本插件 both 显式状态 + 保存时 confirm 校验；增加行情新鲜度门（过期/缺失不伪装触价） |
| SVG 分时/K线绘制思路（价格线/均价线/昨收虚线/成交量柱/MA） | Awu12277 `client.js` SvgMinute/SvgCandles/computeMa | `client/charts.mjs`、`client/chartmath.mjs` | 重写；去掉 CDN lightweight-charts 主路径（纯 SVG 一条路径）；MA 参数沿用参考实现 MA5/10/20/60 |
| 持仓数据模型惯例（quantity/costPrice 正数校验、原子写文件、同源 POST 校验） | Bob-Bo1 `lib/index.js` normalizeHoldings/savePayload/sameOriginPost | `src/model.mjs`、`src/store.mjs`、`src/access.mjs` | 改造：存储改为 DSH storage hub KV 驱动（实例级共享）+ 文件回退；同源校验吸收 quota-watch 的 Origin/Sec-Fetch 双检实现 |
| 多源降级链形态（市场分链 + 逐源补位 + 全链失败语义）、Yahoo chart v8 协议（meta 字段/无 crumb/指数符号）、EM push2 https→http 回退与 f124 时间戳口径、指数目录（INDEX_CATALOG 形态）、诊断日志结构与 route.status 门（两分钟一行 + dropped 补记） | suifei `lib/service.js`、`lib/sources/yahoo.js`、`lib/sources/eastmoney.js`、`lib/http.js`、`lib/normalize.js`、`lib/diaglog.js`、`lib/routes.js` | `src/quotes.mjs`、`src/markets/yahoo.mjs`、`src/markets/eastmoney.mjs`、`src/identity.mjs`、`src/diag.mjs`、`src/routes.mjs` | 重写并修正：**保留本仓提供方级指数退避**（lens 无退避，死源会随轮询反复被打）；诊断零依赖手写 config（lens 用 schemastery）；明确不采纳 React 栈/LED 灯墙/localStorage 业务存储（2026-11-13） |

## 明确不包含（需求排除 + 卫生红线）

- Awu12277 扇形 AI 菜单与宿主 systemPrompt 注入（skills/frontend-design、skills/investment-research）；
- Justin-Mai 残留的 `systemPrompt.section` 分析提示词注入（其 index.js L621-634）；
- 上游 localStorage 业务存储与 `~/.stocking/settings.json` 文件存储（不满足实例共享，改为 DSH storage hub）；
- 上游自由分组模型（改为固定四市场）；
- 上游"代码字符串即身份 + 名称兜底"（改为 `{market, code, quoteCurrency}` 结构化身份，名称仅展示）。

## 新写（无上游对应）

`src/identity.mjs`（身份与市场常量）、`src/portfolio.mjs`（持仓/按币种汇总）、`src/model.mjs`（记录/备份校验）、`src/quotes.mjs`（TTL 合并缓存+退避）、`src/store.mjs`（写链+rev CAS+双驱动）、`src/routes.mjs`（全部路由）、`src/host.mjs`、`client/store.mjs`（客户端状态机+分层轮询）、`client/detail.mjs`、`client/list.mjs`、`client/add.mjs`、`client/backup.mjs`、`client/panel.mjs`、`client/styles.mjs`、`tests/*`（67 用例）、`scripts/probe-markets.mjs`（数据源探针）、`scripts/cdp-eval.mjs`（E2E 验证助手）。
