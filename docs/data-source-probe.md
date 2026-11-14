# 数据源实测记录（data-source-probe）

探针脚本：`scripts/probe-markets.mjs`；结果文件：`scripts/probe-result.json`。
实测时间：2026-11-06 21:26 Asia/Shanghai；环境：Linux（插件将部署的同一出口网络）。
**结论：23/23 端点全部通过**，四市场（A股/港股/美股/加密货币）的快照、K线、分时、搜索链路当日全部实测可用。

## 各端点结果与已确认的结构假设

| 端点 | 用途 | 结果 | 关键确认 |
|---|---|---|---|
| `qt.gtimg.cn/q=sh600519,sz000001,hk00700,sh510300,r_hkHSI` | A股/港股/ETF **批量快照**（一次请求整列表） | ✓ 242ms | GBK 编码；`v_<code>="1~名称~代码~现价~昨收~今开~量(手)~…~时间~涨跌~涨跌%~最高~最低~…~量~额(万)~换手~PE…"`；字段序与 minute/query 的 qt 数组一致（1名称/3现价/4昨收/5今开/6量/30时间/31涨跌额/32涨跌%/33高/34低/36量/37额万） |
| `proxy.finance.qq.com/ifzqgtimg/appstock/app/minute/query?code=X` | 单标的快照+分时 | ✓ 143ms | `data[code].data.data` 分时点（"HHMM价量"行）+ `data[code].qt[code]` 88 字段快照；`data.date`；当日 267 点（收盘后探测） |
| `web.ifzq.gtimg.cn/appstock/app/minute/query` | 同上备源 | ✓ 228ms | 与 proxy 域同构（Justin-Mai 记录的 2026-09-29 WAF 事件当日未复现，仍保留双 host 回退） |
| `web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=<code>,day|week|month,,,N,qfq` | A股/ETF 日/周/月K | ✓ 57–59ms | 键 `qfqday/qfqweek/qfqmonth`；**行序 [date, open, close, high, low, volume]**（末行与快照高低收逐项核对一致）→ 前复权口径（qfq 参数生效） |
| 同上 `hk00700` | 港股日K | ✓ 62ms | **返回键为 `day`（无 qfq 键）→ 港股 K 线为不复权口径**（记录进能力矩阵）；列序同上 |
| `push2.eastmoney.com/api/qt/stock/get?secid=105.AAPL…` | 美股快照 | ✓ 1035ms | f43现价/f44高/f45低/f46开/f47量/f48额/f57代码/f58名称/f60昨收/f169涨跌额/f170涨跌% |
| `push2his…/kline/get?klt=101|102|103&fqt=1` | 美股日/周/月K | ✓ 79–312ms | 行 CSV `date,open,close,high,low,volume,amount,…`；`fqt=1` 前复权生效（331.695 等小数复权价可证） |
| `push2his…/trends2/get?ndays=1` | 美股分时 | ✓ 77ms | 391 点；时间字符串为**北京时间**（"2026-11-05 22:30" = 美东 09:30）；`data.preClose` 存在 |
| `okx.com/api/v5/market/ticker?instId=BTC-USDT` | 加密快照 | ✓ 61ms | `last/open24h/high24h/low24h/vol24h(基础币)/volCcy24h(计价币)/ts(ms)`；code 为字符串"0"，非 0 即业务错误 |
| `okx…/market/candles?bar=1D|1W|1M|5m` | 加密日/周/月K+分时 | ✓ 47–54ms | 新→旧返回需反转；ts 为 ms；日线按 UTC+8 切分（Justin-Mai 记录，探针 ts 可复核） |
| `okx…/public/instruments?instType=SPOT` | 加密交易对清单（搜索用） | ✓ 150ms | live 状态 USDT 报价对可过滤 |
| `smartbox.gtimg.cn/s3/?v=2&q=…&t=all` | 港股/美股/ETF 搜索 | ✓ 52–137ms | GBK + 字面 `\uXXXX` 转义；行格式 `市场\|代码\|名称\|拼音\|类型`；类型 GP=正股、ETF、KJ=场外/理财（过滤）；美股代码带交易所后缀（aapl.oq→NASDAQ 105） |
| `push2…/stock/get?secid=1.600519` | EM A股（备用源，本次不启用） | ✓ 427ms | 腾讯故障时的备选，已验证可达 |

## 2026-11-14 增测（DSA 数据层加固战役 Task 1/T2，§12.44）

探针组由 23 → 26（+`sina-cn-snapshot`、`volume-cn-kline-compare`、`sina-parse-recheck`）。本轮环境：Windows 本机（与前轮 Linux 不同出口）。

| 端点/组 | 结果 | 关键确认 |
|---|---|---|
| `hq.sinajs.cn/list=sh600519,sh510300,sh000001,sz000001` | ✓ | GBK；**行前缀 `hq_str_<code>=`**（非腾讯的 `v_`）；字段 f0名称/f1今开/f2昨收/f3现价/f4高/f5低/f8量/**股**/f9额(元)/**f30 日期 YYYY-MM-DD**/**f31 时间 HH:MM:SS**（横杠+冒号，非紧凑数字）；必须带 `Referer: https://finance.sina.com.cn/`；**bj 920 号段实测有返回**（安徽凤凰） |
| `volume-cn-kline-compare`（600519/688111/920000 三方对照） | ✓ | 腾讯 K线==腾讯快照（两端点同口径）；**sh600519：腾讯 41780 手 ↔ 新浪 4177984 股（ratio 0.01）**；**sh688111：腾讯 K线 3558749 == 新浪 3558749（ratio 1.00）→ 科创板 688 量纲=股，DSA #2350 结论独立复现**；**bj920000：腾讯 2662 手 ↔ 新浪 266207 股（ratio 0.01）** |
| EM ulist 一次性对照（`fetchBatchSnapshots` 生产 parser） | ✓ | EM f5：600519=41780（=腾讯，手）、bj920000=2662（=腾讯，手）——EM 与腾讯同口径，第三方旁证 |
| `sina-parse-recheck`（生产 parser 实测） | ✓ | 生产适配器 5/5 码全解析（含指数+北交所），price/volume/quoteTimeMs 有效 |
| OKX 六组 | ✗ | 本机（Windows 出口）okx.com 全部超时/拒连——与 2026-11-13 diag 实录同象（provider 退避 300s），非代码问题；2026-11-06 Linux 出口曾 23/23 全绿 |

**量纲裁决（Task 7 门控，分支 A 成立）**：腾讯 K 线 volume——sh/sz/bj（非 688/689）= **手**；sh688/sh689 = **股**；hk = 股（既有口径）。新浪快照 f8 = **股**（修正 DSA 借鉴时的「手」假定）。EM ulist f5 = 手。
