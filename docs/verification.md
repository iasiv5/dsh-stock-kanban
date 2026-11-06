# 测试与验证记录（12.x）

## 12.1 核心逻辑（自动化，全部通过）

`npm test` → node --test 67 用例 / 67 通过 / 0 失败（Node v24.20.0，2026-11-07）。

| 覆盖点 | 用例位置 |
|---|---|
| 持仓市值/浮动盈亏/比例 | tests/portfolio.test.mjs |
| 零成本/缺失价格/非法输入（不产出伪 0%/NaN/Infinity；价格缺失不显示虚假全额亏损） | tests/portfolio.test.mjs |
| 小数数量与价格精度（加密 8 位小数） | tests/portfolio.test.mjs |
| 按币种汇总（USD≠USDT 不合并、汇总盈亏比例按汇总成本、部分缺行情 partial 显式标注） | tests/portfolio.test.mjs |
| 目标价边界等于即触发/离开消失/未设置/both 重叠/过期不伪装/无时间戳保守 stale | tests/targets.test.mjs |
| 备份导出导入校验（结构/kind/schemaVersion/单条非法 rejected 不中断/重复 rejected/身份一致性） | tests/model.test.mjs |
| 标的身份（市场/代码/报价币种三元组、裸代码补前缀、号段白名单、名称不作键） | tests/identity.test.mjs |
| 存储（CRUD 推 rev、损坏文件隔离保字节、写链串行并发不丢失、导入覆盖与回滚、失败不删数据） | tests/store.test.mjs |
| 行情服务（TTL 合并、失败退避不打上游、退避回退陈旧缓存、每标的独立判错） | tests/quotes-service.test.mjs |
| 路由（同源 403、CAS 409 带最新态、重复 409、无效代码 422、搜索失败明确报错、导出导入往返、health 无业务数据） | tests/routes.test.mjs |
| 腾讯解析（批量快照字段/时间戳→epoch、K线列序与 qfq/none 口径、分时点过滤、prevClose 推导、smartbox 类型过滤） | tests/providers-tencent.test.mjs |
| 客户端纯函数（隐私遮挡、价格自适应精度、拖动阈值、视口钳位、边缘吸附、均线计算） | tests/client-ui.test.mjs |

测试夹具（上游响应采样文本）仅存在于 tests/ 内，不进入生产行情路径；单测不依赖外网（fetch 全 mock）。

## 12.2 / 12.3 交互与生命周期（真实浏览器端到端，2026-11-07 04:30–04:40）

环境：本机 Linux（Ubuntu，DSH 0.2.2-rc.1 web 实例 = deepseek-harness.service）+ Chrome for Testing 152 headless（BrowserSkill 扩展 + 自建 CDP evaluate 通道 `scripts/cdp-eval.mjs`）。本机场景即「Linux 浏览器访问（远端）DSH」使用方式。

| 验证点 | 结果 | 证据 |
|---|---|---|
| 插件在真实宿主激活、路由可达 | ✅ `GET /stock-kanban/health` → `{"driver":"dsh-storage",...}`（DSH 原生存储驱动，非回退） | curl + 页内 fetch |
| 胶囊挂载与显示（名称/现价/涨跌幅） | ✅ `.skc-capsule` = "贵州茅台 1,453.00 +0.07%" | CDP DOM 断言 |
| 点击展开面板 | ✅ 指针事件序列 → `.skc-panel` 出现 | CDP |
| 面板固定四市场分组 | ✅ Tabs = A 股/港股/美股/加密货币 | CDP |
| 搜索添加 + 去重标记 | ✅ 搜"茅台"→点击→"已添加"徽标 + disabled；重复请求 409 duplicate | CDP + 路由测试 |
| 直连代码添加（三市场） | ✅ 00700/aapl/BTC-USDT 全部过行情校验入库 | CDP toast |
| 直连无效代码拒绝 | ✅ cn 999999 → 422（不入库） | 路由测试（mock）+ 冒烟（真网） |
| 四市场实时行情上屏 | ✅ 1,453.00/+0.07% · 419.80/-2.46% · 343.71/-0.13% · 75,875.40/-0.24% | CDP |
| 详情结构与时间标注 | ✅ 行情 16:14 · 拉取 04:37:36（区分展示）；名称/代码/市场/报价币种 | CDP |
| 分时图渲染 | ✅ SVG 269 元素（价格线+均价线+量柱）；港股时间轴含午休段 | CDP |
| 日K + 复权标注 + 均线 | ✅ "前复权"（A股）；港股周/月K 如实标注"不复权"；MA5/10/20/60 显隐 | CDP |
| 持仓保存与计算 | ✅ 100@1500@1453 → 市值 145,300.00 CNY · 盈亏 -4,700.00（-3.13%） | CDP |
| 目标价保存 | ✅ 1400/1800 保存成功回显 | CDP |
| 阈值重叠显式校验 | ✅ 1900>1800 → confirm 明确解释，取消不保存 | CDP（覆盖 window.confirm 捕获文案） |
| 隐私开关遮挡 | ✅ 盈亏列 → ••••；footer 标注"仅展示层，数据未加密"；实例级开关（服务端 settings） | CDP |
| 只看持仓筛选 | ✅ 过滤无持仓标的 + 盈亏列出现 + ★ 标记；重开浏览器后筛选被记住（访问端） | CDP |
| 详情返回保留上下文 | ✅ 返回后市场 Tab 保持激活（列表不卸载，滚动/筛选天然保留） | CDP |
| 快速切换标的防串数据 | ✅ 茅台详情未就绪即切腾讯 → 慢响应被 fetchKey 丢弃，最终显示腾讯图表 | CDP |
| 触价降级（过期行情） | ✅ 行情时间 16:14 已过期 → 胶囊 title"行情已过期或不可用：触价标记暂停显示"、0 个标记 | CDP |
| 胶囊拖动/吸附/记忆/防误触 | ✅ 拖到左缘 → 吸附 (8,195)、dock=left、localStorage 记忆、未误触展开 | CDP |
| 重载持久化（实例 vs 访问端边界） | ✅ 业务数据（rev=8、四标的、持仓、目标价）来自服务端实例存储；localStorage 仅存界面偏好键（pos/panelPos/lastMarket/holdingsOnly/maVisible/capsuleSymbolId），无业务数据 | CDP |
| 页面关闭停止刷新 | ✅ 设计即页面内定时器（无服务端常驻任务）；服务端缓存为惰性 TTL | 代码结构 + health |

## 12.4 环境验证

| 场景 | 状态 | 说明 |
|---|---|---|
| 3. Linux 浏览器访问（远端）DSH | **已验证** | 即本次端到端环境：Chrome for Testing 152（headless）访问 DSH 0.2.2-rc.1 web 实例。DSH 版本 0.2.2-rc.1、OS Ubuntu (VM)、Chrome 152.0.7977.82。 |
| 2. Windows 浏览器访问远端 DSH | **未验证**（代码路径同场景 3：同一份服务端 + 同一份客户端 bundle，浏览器端无平台分支代码） | 复现步骤：任意 Windows 浏览器（Edge/Chrome）访问 `https://<远端DSH地址>/`，确认右上角胶囊出现 → 点击展开 → 添加/持仓/图表。需注意远端入口若经认证网关，插件路由同源原则不受影响。 |
| 1. Windows 本机 desktop profile | **未验证** | 本机无 Windows 环境。插件已声明 `dsh.engines.dsh >=0.2.2-rc.1`，不依赖 webRuntime（0.2.1-rc.2 起移除项）；存储优先走 DSH storage hub，desktop 若无该服务自动回退文件驱动（health.driver 可查）。复现步骤：desktop 安装包后 `dsh plugin --profile desktop add <tarball>`，重启 desktop，确认胶囊与健康路由。 |

## 未验证与降级汇总（13 章交付口径）

**已完成且验证通过**：见上表全部 ✅ 项 + 67 单测 + 23 数据源探针。

**已实现但未在目标环境验证**：
- Windows 浏览器场景与 Windows desktop profile（同代码路径，按 12.4 步骤可复现）；
- 多浏览器并发修改的 UI 级 409 提示（服务端 CAS 已在路由测试验证，UI toast 逻辑未双页实测）；
- 导入的文件选择器端到端（headless 无法驱动 OS 文件对话框；导入链路的解析/校验/落盘已由单测+路由测试覆盖，UI 侧确认对话框逻辑已实现）。

**已按需求允许的降级**：
- 盈亏比例在隐私模式下同样遮挡（保守默认，4.6 允许自定）；
- 港股 K 线不复权（接口能力，如实标注）；
- 腾讯 minute 主域回退备域（上游 WAF 前科）；
- desktop 缺 storage 服务时回退文件驱动（health.driver= file 可见）。

**尚未完成或被阻塞**：无核心需求阻塞项。

## 已知问题

1. 首次添加标的时胶囊价格短暂显示 "—"（最多一个轮询周期 15–30s），随后自动补齐。
2. 美股列表快照无高低开收（EM 批量端点字段限制），详情页字段完整。
3. CDP/headless 自动化工具直发导航会被 DSH 的 Host/Origin 围栏判 cross-site 403（安全特性，真实用户浏览器无此现象；E2E 用页内同源导航绕过）。
4. 备份导入的 UI 走浏览器文件选择器；在不支持文件输入的嵌入环境可用 `curl -X POST`（同源）方式导入。
