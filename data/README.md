# data/ — 标的池（生成器产出）

本目录的 `a_stocks.json` / `etf_stocks.json` / `hk_stocks.json` 是添加标的对话框的本地候选池（代码 + 简称），由 `src/markets/search.mjs` 读取。**只能由 `scripts/refresh-pools.mjs` 生成，不得手改**；每次生成都更新 `manifest.json`（来源、原始响应哈希、文件 sha256），由 `tests/data-provenance.test.mjs` 逐项校验。

## 来源架构（生成器 v3）

列表与行情同源优先，官方清单对账，最后统一过报价校验：

1. **行情侧列表（主）**：上交所 yunhq（股票 / ETF）、北交所 920 号段腾讯报价枚举；深股 / 深 ETF / 港股用东方财富 clist，不可达时回落官方清单（报告标注 fallback）。
2. **官方清单（对账 + 回落）**：上交所股票 JSON（上市 + ST，剔除退市）、深交所报表 1110（A 股）/ 1945（ETF）、港交所 ListOfSecurities.xlsx（**HKD 计价**的 Equity 与 ETP；窝轮、牛熊证、债券、人民币柜台在此剔除）。
3. **报价校验（兜底）**：全部候选经腾讯行情确认「有名称且价格 > 0」，失败率 > 2% 整体失败。

任一来源失败且无回落、对账差异 > 1%、条目数越界（BOUNDS）、缩量 > 5%，均 fail-closed 不落盘。

## 如何刷新

```bash
node scripts/refresh-pools.mjs             # dry-run：抓取、对账、校验、打印差异报告，不写文件
node scripts/refresh-pools.mjs --apply     # 全部校验通过后写入 data/*.json 与 manifest.json
npm test                                   # provenance 守卫校验 manifest 与文件一致
```

- 刷新后：核对报告 diff（added / removed / renamed 样本）→ `npm test` → 数据文件作为**独立 chore(data) 提交**；用户拿到新数据要随插件发版。
- 缩量超过 5% 需 `--accept-shrink` 显式确认（先读差异报告）。
- 节奏与责任人：无自动定时；行情异常、新号段 / 新板块、季度例行时由 Agent 或主人手动触发。

## 历史与迁移（2026-11-13 首次生成器刷新）

- 旧文件是上游快照（`Justin-Mai/dsh-stock-view`、`Awu12277/dsh-stock-watch`，MIT，版权见 NOTICE.md），初始导入 20736d7，抓取时间与来源不明；2026-11-13 起由生成器接管，`SHA256SUMS` 由 manifest 取代删除。
- 北交所（920 号段）为新覆盖：旧池无北交所，旧 BSE 8xxxxx 代码从未入池。
- 港股池改为 HKD 口径：25 只人民币柜台（hk8xxxx，如 hk80700）移出——搜索侧此前已排除，行为不变。
- ETF 名称改用交易所官方简称（如 510050「50ETF」）；只影响搜索展示，不改已存自选。
- 旧池含已退市代码（如 000024 招商地产、PT 系），已清除；自选里若存有退市码，行情报错属预期。

## 已知数据质量

- 名称含空格与全角字母已按 NFKC + 去空白规范化（「万 科Ａ」→「万 科A」）；搜索匹配不受影响。
- 少数港股腾讯无报价（如 hk02953、hk08561）会被报价校验剔除，宁缺毋滥。
- 备用行情列表源（已验证、未接线）：新浪 Market_Center——sz_a 2905、etf_hq_fund 938 可用；港股 qbgg_hk 需鉴权不可用。东方财富 clist 本机 502 时，深股 / 深 ETF / 港股回落官方清单。
- 基金号段 sh52 / sh53 / sh55 的 78 只 ETF：身份白名单已放行（`src/identity.mjs`）。
