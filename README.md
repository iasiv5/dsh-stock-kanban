# dsh-stock-kanban

DSH 0.2.2-rc1 轻量多市场盯盘与持仓查看插件：悬浮胶囊 + A股/港股/美股/加密货币分组自选 + 持仓盈亏 + 目标价 + 分时/日/周/月K。

![badge](https://img.shields.io/badge/DSH-0.2.2--rc.1-22d3ee) ![license](https://img.shields.io/badge/license-MIT-green)

## 功能一览

- **悬浮胶囊**：显示自选标的名称/现价/涨跌幅；拖动后吸附屏幕边缘并按访问端记忆位置；达到目标价显示 Ⓑ/Ⓢ 标记（行情过期时明确暂停而非伪装）；点击展开面板。
- **四市场分组**：A 股 / 港股 / 美股 / 加密货币 固定分组（ETF 归入上市市场，是类型不是分组）；同一标的只在一处。
- **列表**：名称/代码、现价、涨跌幅、持仓标记 ★、目标价状态；「只看持仓」额外显示盈亏金额与比例。
- **详情**：分时 / 日K / 周K / 月K（自绘 SVG，含成交量与 MA5/10/20/60，无 CDN 依赖）；持仓数量/平均成本编辑，自动计算市值/浮动盈亏/比例；买卖目标价设置（阈值重叠显式确认）；行情时间与拉取时间分开标注。
- **持仓汇总**：按报价币种独立汇总（USD 与 USDT 不合并）；部分缺行情时明确标注"不完整"。
- **隐私开关**：实例级开关，遮挡持仓数量/成本/市值/盈亏金额与比例（仅展示层遮挡，非加密）。
- **备份**：结构化导出（schemaVersion 1）与覆盖式导入（双重校验、显式确认）。
- **数据边界**：业务数据（自选/持仓/目标价/隐私开关）存 **DSH 实例**（跨浏览器共享）；界面偏好（胶囊位置/面板位置/上次市场/筛选/均线显隐/胶囊标的）按**访问端浏览器**保存。

## 安装（web profile，Linux/Windows 浏览器访问远端 DSH 同此）

```bash
# 在能访问 DSH runtime 的机器上（开发态链接安装；正式部署可 npm pack 后 add 包）
dsh plugin --profile web add "link:/path/to/dsh-stock-kanban"
# 或 tarball：
# npm pack && dsh plugin --profile web add ./dsh-stock-kanban-0.1.0.tgz
# 随后重启 DSH 服务使 host 端路由激活：
sudo systemctl restart deepseek-harness.service
```

- 从源码构建客户端（如改动 client/ 后）：`npm install && npm run build`
- 运行测试：`npm test`（89 用例，全部离线 mock，不依赖外网）

**验证插件已激活**：浏览器打开 DSH → 应看到右上角"盯盘"胶囊；或 `curl http://<dsh>/stock-kanban/health` 返回 `{"driver":...}`。

### 升级 / 卸载

```bash
dsh plugin --profile web add "link:/path/to/dsh-stock-kanban"   # 覆盖同路径升级（link 安装）
dsh plugin --profile web remove dsh-stock-kanban                # 卸载（数据保留）
```

卸载不删除业务数据：DSH storage 单元在 `~/.dsh/storages/stock_kanban.json`（文件回退驱动在 `~/.dsh/stock-kanban/data.json`），重装后自动读回。建议卸载前先在 UI 导出备份。

## 数据保存位置与共享关系

| 数据 | 位置 | 共享范围 |
|---|---|---|
| 自选/持仓/目标价/隐私开关 | DSH 服务端 `~/.dsh/storages/stock_kanban.json`（DSH storage hub json 后端；缺失该服务时回退 `~/.dsh/stock-kanban/data.json`，health 路由的 `driver` 字段可查当前驱动） | 同一 DSH 实例的全部浏览器（Windows/Linux 访问同一远端 DSH 看到同一份） |
| 胶囊位置、面板位置、上次市场、只看持仓、均线显隐、胶囊展示标的 | 各访问端浏览器 `localStorage["stock-kanban:ui:v1"]` | 按浏览器独立 |

不同 DSH 实例（如 Windows 本机 desktop 与远端 web）数据完全独立，迁移用手动导出/导入。

## 多页面一致性

每次变更带版本号（rev）：旧页面用过期状态提交会收到 409 与最新数据，UI 明确提示"数据已被其他页面更新，已刷新，请重试"——不静默覆盖、不静默丢失。行情轮询在服务端做 TTL 缓存合并（默认 10s），多页面/多视图同时轮询不会放大上游请求；上游失败按提供方指数退避（30s→5min）。

## 行情来源与限制（免费、无 Key、无注册）

| 市场 | 快照/列表 | 分时 | K线 | 复权口径 |
|---|---|---|---|---|
| A 股/ETF | 腾讯 qt.gtimg.cn（批量） | 腾讯 minute/query（proxy 域主、web 域备） | 腾讯 fqkline | **前复权（qfq）** |
| 港股 | 同上（同批） | 同上 | 同上 | **不复权**（接口无 qfq 键，图表如实标注） |
| 美股 | 东方财富 ulist（批量）/stock/get | trends2（北京时间为轴） | kline klt=101/102/103 | **前复权（fqt=1）** |
| 加密货币 | OKX 现货公开 REST（ticker/tickers） | 5m×288 ≈ 24h | candles 1D/1W/1M | 无复权概念 |

- 全部免费接口有延迟与限流可能；插件显示数据时间（行情时间/拉取时间）、失败与过期状态，不承诺实时行情，不缓存伪装最新。
- 搜索：A股/港股/ETF 用本地标的池（`data/*.json`，约 1 万条，来自参考项目）+ 腾讯 smartbox；美股 smartbox；加密 OKX 交易对清单。搜索源不可用时明确提示，不展示虚构结果。
- 直连代码添加必须通过行情校验（实际取到有效价格才收）。

## 隐私与安全边界

- 行情请求只携带市场代码，**不发送任何持仓数据**给行情提供方。
- 写操作路由强制同源（Origin/Sec-Fetch-Site 双校验）+ JSON 体积上限。
- 隐私开关是**展示层遮挡**（••••），不是加密；导出备份包含持仓明文，请自行妥善保管。
- 传入备份逐条校验身份与数值，非法文件被整体拒绝或计入 rejected，不破坏现有数据。

## 已知限制

见 `docs/verification.md` 的「未验证与降级」章节（Windows desktop profile 未实测、备份导入的文件选择器在部分嵌入式浏览器需手动路径、腾讯接口曾有 WAF 前科等）。

## License

MIT（含第三方 MIT 复用声明，见 `NOTICE.md`）。运行时零 npm 依赖；devDependencies 仅构建期 esbuild。
