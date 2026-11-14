# 第三方声明（NOTICE / 第三方素材来源）

本插件为独立实现，引用了以下 MIT 项目的**协议知识与部分数据文件**。所有复用均保留原项目版权声明。

| 来源 | 仓库 / commit | 许可证 | 复用内容 | 对应本仓库位置 |
|---|---|---|---|---|
| dsh-stock-watch (Awu12277) | `Awu12277/dsh-stock-watch@ea92259`（2026-09-07） | MIT | 悬浮胶囊交互模型（拖动/贴边吸附/位置记忆）、列表+详情面板骨架、目标价触价标记概念、SVG 图表绘制思路 | `client/capsule.mjs`、`client/list.mjs`、`client/charts.mjs`（重写实现） |
| dsh-stock-view (Justin-Mai) | `Justin-Mai/dsh-stock-view@45d1646`（2026-09-30） | MIT | 东方财富美股适配协议（secid 105/106/107、klt/fqt 参数、trends2 分时）、OKX 加密适配协议（ticker/candles/instruments、code 字符串判错）、腾讯 smartbox 搜索解析（GBK+`\uXXXX`） | `src/markets/eastmoney.mjs`、`src/markets/okx.mjs`、`src/markets/search.mjs`（按本插件身份模型重写） |
| stock-watch (Bob-Bo1) | `Bob-Bo1/dsh-stock-watch@8b74366`（2026-08-18） | MIT | 持仓数据模型惯例（quantity/costPrice 数值校验）、同源 POST 校验与原子写文件模式 | `src/model.mjs`、`src/access.mjs`、`src/store.mjs`（改造为 DSH storage 驱动） |
| dsh-market-lens (suifei) | `suifei/dsh-market-lens@9ed8477`（2026-11-13 克隆时点，v0.34.8） | MIT | 多源降级链形态与逐源补位语义（lib/service.js CHAINS）、Yahoo chart v8 适配协议（meta 口径 / 无 crumb 直连 / 指数符号 ^DJI·^IXIC·^GSPC）、EM push2 https→http 回退与字段口径（f2/f3/f12/f13/f14/f124 等）、指数目录形态（INDEX_CATALOG）、诊断日志结构（off/errors/full + 按天 JSONL + 轮转 + tail 回读）与 route.status 日志门纪律（两分钟一行 + dropped 计数） | `src/quotes.mjs`、`src/markets/yahoo.mjs`、`src/markets/eastmoney.mjs`、`src/identity.mjs`、`src/diag.mjs`、`src/routes.mjs`（按本插件身份模型与零依赖口径重写；明确不采纳其 React 栈 / LED 灯墙 / localStorage 业务存储） |
| daily_stock_analysis (ZhuLinsen) | `ZhuLinsen/daily_stock-analysis@ac9c33d`（2026-11-14 克隆时点） | MIT | 新浪 `hq.sinajs.cn` 直连快照协议口径（Referer 必带、GBK、字段位与行前缀 `hq_str_`）、科创板 688/689 腾讯 K 线量纲特例（issue #2350）、退避「有响应≠失败」（inconclusive）语义参考 | `src/markets/sina.mjs`、`src/markets/tencent.mjs`（协议知识参考，按本插件身份模型与实测复核重写；实测修正其未覆盖项：新浪服务北交所、f30/f31 横杠冒号格式） |

**数据文件**：`data/a_stocks.json`、`data/hk_stocks.json`、`data/etf_stocks.json` 复制自
`Justin-Mai/dsh-stock-view@45d1646`（其上游为 Awu12277/dsh-stock-watch@ea92259），仅作本地搜索候选池，
MIT 许可证随附（见上文版权行）。原始数据版权归原作者；本插件不做数据正确性担保。

**明确不包含**（需求排除项，防止残留）：
- Awu12277 的扇形菜单 AI 技能注入（skills/frontend-design、skills/investment-research 及宿主 systemPrompt 注入）；
- Justin-Mai 残留的 `systemPrompt.section` 分析提示词注入（其 index.js L621-634）；
- 任何 localStorage 业务数据存储（业务数据一律走 DSH 实例存储）。

以上前三个项目均无运行时 npm 依赖；dsh-market-lens 自身运行时依赖 `@deepseek-ai/schemastery`——本插件只复用其协议知识与结构形态，未引入任何运行时依赖（零依赖口径不变，devDependencies 仅有构建期 esbuild）。
