# data/ — 标的池（上游原样快照）

本目录三个 JSON 是搜索用的本地候选池（代码与名称），由 `src/markets/search.mjs` 读取。

## 来源（2026-11-13 核对）

- 来源未在本仓库或两份上游 README 里明确记录：两份上游（`Justin-Mai/dsh-stock-view`、`Awu12277/dsh-stock-watch`，MIT，版权声明见 NOTICE.md）的 README 只描述用途与条目数（Awu12277 写明 A 股 5549、港股 2791、ETF 1650），没有抓取来源、日期或刷新方法。
- 本仓库的三个文件与本机两份上游副本（`.dsh-research/Justin-Mai-dsh-stock-view`、`.dsh-research/Awu12277-dsh-stock-watch`）字节完全相同；SHA-256 见 `SHA256SUMS`，由 `tests/data-provenance.test.mjs` 校验。
- 全仓库搜索文件名，只命中文档与 `src/markets/search.mjs`：没有生成或下载脚本。git 历史中这三个文件只在初始导入提交 20736d7（2026-11-07）出现过，之后未改动。
- 条目数核对：含 `code` 键的行，`hk_stocks.json` 为 2791、`etf_stocks.json` 为 1650，与 Awu12277 README 声称的数量一致（两者均为每条 4 行的多行格式）。A 股文件为单行，无法按行数核对，README 声称的 5549 只未验证。
- 抓取时间未知，数据可能已过期。

## 格式

- `a_stocks.json`：单行压缩 JSON（218,711 字节）。
- `hk_stocks.json`、`etf_stocks.json`：多行 JSON。
- 这是上游的格式，不是本仓库的选择。

## 规则

1. 不改格式，不改内容。`npm test` 里的 `tests/data-provenance.test.mjs` 校验字节指纹，任何就地修改都会红灯。
2. 修正单条数据要留痕：不要就地编辑。应在 NOTICE.md 记录偏离上游的条目与原因，更新 `SHA256SUMS`，并作为独立提交。
3. 整体刷新：用新快照整体替换，更新 `SHA256SUMS`，并在 NOTICE.md 记录新来源（含 commit 与日期）。若要规范化格式，作为独立提交，写明转换规则（JSON 规范化，语义不变）。
4. 检索这三个文件时用 count 或 files_with_matches 模式。content 模式在单行的 `a_stocks.json` 上，单次命中可返回约 3.6 万字节。

## 已知数据质量（与上游一致，不在此修正）

- 名称含空格与全角字母（如「万 科Ａ」）：搜索侧已做 NFKC + 去空白匹配。
- 港股人民币柜台（代码 8xxxx，如 80700「腾讯控股-R」）：搜索侧不展示（报价币种为 CNY，身份模型仅支持 HKD）。
- 基金号段 sh52 / sh53 / sh55 的 78 只 ETF（如 sh551520「科创债ETF汇添富」）：身份白名单已放行（`src/identity.mjs`），未在数据层修正。
