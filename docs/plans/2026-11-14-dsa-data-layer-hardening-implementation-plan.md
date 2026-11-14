# DSA 数据层加固战役（新浪第三源 / 688 量纲 / 退避键 / 来源标注 / UA 轮换）实施计划

## 目标

落地与主人三轮 grilling 达成共识的 6 项数据层改动（2026-11-14，本文件即共识载体），统一发版 **0.3.4**：

1. **新浪快照第三源**：cn 链变 `腾讯 → 东方财富 → 新浪`（cn-only、仅快照；hk 不动；节假日延期不在本战役）。
2. **科创板 688/689 K 线量纲**：probe 门控，确认后 K 线量统一为「股/份」。
3. **退避键按 (提供方, 市场) 拆分**：消除跨市场连坐；健康载荷改嵌套形状并增 `lastOkAt`/`lastErrorAt`/`lastError`。
4. **行情行来源标注**：`source`（恒有）+ `fallbackFrom`（首个失败源，条件有）；详情页数据源脚注**常显**。
5. **东财 UA 池轮换**（顺带项）。
6. 全部配齐：GLOSSARY 两增一改、capability-matrix 登记、NOTICE 补 DSA 来源、probe 扩充、verification.md 每项独立小节。

## 架构快照

- 现有编排：`src/quotes.mjs` `createQuoteService`——每市场一条有序提供方链，链内逐源补位（单标的缺席交下一源），TTL 10s 缓存 + 在途合并，提供方级指数退避（30s 翻倍、300s 封顶），无常驻定时器。本次不改变这些骨架，只做三处切口：
  - 链清单 `CHAINS.cn` 追加 `"sina"`，`providers` 注册新适配器；
  - `state` 键从 `name` 改 `name|market`（`fetchProvider`/`guardedFull` 调用点都在市场循环内，市场入参现成）；
  - 合并循环在 `out.set` 处补 `source`/`fallbackFrom`（逐源补位时已知道「谁失败过、谁供的数」）。
- 新浪适配器独立成 `src/markets/sina.mjs`，与腾讯适配器同构（GBK 解码 + 纯函数 parser 导出，probe 可复用）。
- 客户端唯一改动是详情页脚注：`/quotes` 响应行新增两个字段，经既有快照通道（`providers` 引用型切片同理，客户端不解析内容）自然到达 `paintQuoteLine`。
- 健康载荷形状变更（扁平 `{name: {...}}` → 嵌套 `{name: {market: {...}}}`）对客户端无破坏：`client/store.mjs` 把 `providers` 当引用型切片（恒 emit、不读内容，B3 基线）；仓内有两处测试断言了旧扁平形状，须随任务改写。

## 全局约束（逐字继承）

- 零运行时 npm 依赖不变（`devDependencies` 仅构建期 esbuild + 测试期 jsdom）；Node ≥20；`engines.dsh >= 0.2.2-rc.1`。
- 无常驻定时器：全部惰性请求触发，宿主空闲零后台活动。
- 批量上限：腾讯/EM 60/请求（现状）；新浪 60/请求**内部分块**（新浪是 cn 链末位，不得 cap 丢弃标的）。
- probe 纪律：探测脚本必须 import 生产 parser 函数，不得复制正则；**唯一例外**是本战役 Task 1 对尚不存在的新浪做原始形状取证（与既有 probe 同风格），Task 2 落地 parser 后须补一段 import 生产 parser 的复跑探针。
- i18n zh/en 双语 parity（既有守卫测试强制）；文案钉死见 Task 8，不得临场改词。
- 发版链：bump → `npm run build` → `chore(release): v0.3.4` 单提交 → 轻量 tag `v0.3.4` → push；pre-push 钩子全量测试 + `lib/client.js` 产物新鲜度 diff，过期产物推不出去。
- 文档正文中文；未验证行为如实标注「未验证（不冒充已验证）」。
- 无额外全局约束（版本下限/平台要求沿用 package.json 现值）。

## 输入工件

- 共识：本文件「目标」节 + 对话定案（2026-11-14 三轮 grilling；GLOSSARY 已增「退避」「降级」两词条）。
- 调研底稿：`D:\_dsh-workspace\01_docs\research\2026-11-14-dsa-vs-dsh-stock-kanban-data-source-benchmark.md`（DSA 侧证据：`data_provider/akshare_fetcher.py:1226-1240` 新浪端点与 Referer、`data_provider/tencent_fetcher.py:243-254` 科创板量纲 `_lots_to_shares` Refs #2350、`realtime_types.py:379-391` record_inconclusive 语义）。
- DSA 本地镜像：`D:\_dsh-workspace\.dsh-research\daily-stock-analysis-clone\`（NOTICE 登记取其 HEAD short hash）。

## 文件结构与职责

- Create: `src/markets/sina.mjs` —— 新浪 cn 快照适配器（handles/fetchBatchSnapshots/parseSinaSnapshot；GBK；Referer；60/请求分块；quoteTimeMs UTC+8）。
- Create: `tests/providers-sina.test.mjs` —— 新浪 parser 离线夹具测试。
- Create: `tests/detail-source.test.mjs` —— 脚注文案 helper 单测 + zh/en 键 parity。
- Modify: `src/quotes.mjs` —— CHAINS.cn 加 sina、providers 注册、fullAdapter 加 sina、state 键 `name|market`、health() 嵌套 + lastOk/lastErr、getQuotes/getQuoteFull 行补 source/fallbackFrom、文件头链形态注释更新。
- Modify: `src/markets/tencent.mjs` —— fetchKline 量纲归一函数 + 文件头字段口径注释更新。
- Modify: `src/markets/eastmoney.mjs` —— UA 常量改 5 元素池，emFetch 每次请求随机取用。
- Modify: `src/markets/search.mjs` —— `resolveDirect` cn 分支在 EM 腿后追加新浪腿（import sina）。
- Modify: `src/routes.mjs` —— `/quotes` 行装配（306-313 一处，full/非 full 共用）补 `source`/`fallbackFrom`。
- Modify: `client/detail.mjs` —— `paintQuoteLine`（630-636 锚点）meta 区追加来源脚注。
- Modify: `client/i18n.mjs` —— 新增 detail.source/detail.source.fallback + provider.* 六键（zh/en）。
- Modify: `client/styles.mjs` —— `.skc-source-note` 弱化小字样式。
- Modify: `scripts/probe-markets.mjs` —— 新浪形状取证探针 + 688 量纲三方对照探针 + parser 复跑探针。
- Modify: `tests/quotes-service.test.mjs` —— health 断言改嵌套（96-100、133 两处）+ 逐市场隔离/lastError/inconclusive/source 新用例。
- Modify: `tests/routes.test.mjs` —— providers 断言改嵌套（195 行一处）。
- Modify: `tests/providers-tencent.test.mjs`（或同族文件）—— 688/普通A股/港股 K 线量纲断言。
- Modify: `GLOSSARY.md` —— 「行情链」条目 cn 链更新（实施完成时）。
- Modify: `docs/capability-matrix.md` —— 多源链描述、量纲口径、新浪源观察义务。
- Modify: `docs/data-source-probe.md` —— 新探针组结果摘录。
- Modify: `NOTICE.md` —— 增 `ZhuLinsen/daily_stock_analysis` 行。
- Modify: `docs/verification.md` —— §12.44-§12.50（各任务随做随写；§12.50 发版实录由 Task 11 产出）。
- Modify: `lib/client.js` —— Task 8 脚注改动重建 + Task 11 版本注入重建（产物，随 release 提交）。
- Modify: `package.json` —— 0.3.3 → 0.3.4（仅 Task 11）。

稳定边界（本战役不动）：`src/markets/okx.mjs`、`src/markets/yahoo.mjs`、`src/markets/us-detail.mjs`、`src/identity.mjs`、`src/sessions.mjs`、`src/targets.mjs`、`src/store.mjs`、分时 volume 口径（相对量柱，明确 non-goal）、CHAINS.hk/us/crypto。

## 任务清单

### Task 0: 环境 reconciliation（本机一次性；评审 N5 阻断 + N6 + Q4 前移）

- 目标：把本克隆修到「全量测试绿基线」——评审 Batch-2 实测现状 exit 1（252 tests / 242 pass / 10 fail：9 个 client 套件缺 jsdom、1 个 data-provenance 因 autocrlf 检出 CRLF 字节哈希守卫恒红），不修则后续每个任务的回归检查、T10 Step 5、T11 全量门与 pre-push 全部被环境阻断。
- 涉及文件：仓库 git 配置（hooksPath）、`data/` 五文件工作区字节、`node_modules`（如缺）。**不改动任何被跟踪文件的内容**（cat-file 原字节写回，无 reset --hard，不波及未提交文件）。
- 接口契约
  - Consumes：无。
  - Produces：绿测试基线（Task 1-11 所有全量测试判据的前提）；基线计数记录。
- 验证范围：`node scripts/run-tests.mjs "tests/data-provenance.test.mjs"` 绿；全量 `npm test` 绿。

- [ ] Step 1: 钩子激活：`git config core.hooksPath` 为空则 `git config core.hooksPath .githooks`（AGENTS.md:7；本克隆 2026-11-14 实测为空）。
- [ ] Step 2: 依赖恢复（评审 N6 加强判据）：`test -d node_modules` **且** `node -e "require.resolve('jsdom'); require.resolve('esbuild')"`（防空壳目录漏检）；任一失败 → `npm_config_cache=D:/_dsh-workspace/.npm-cache-ws npm ci`（联网 npm 先指缓存，workspace 规则）。
- [ ] Step 3: data/ 字节 reconciliation（评审 N5）：本机 `core.autocrlf=true`（局部配置，实测）使 data/ 五文件检出为 CRLF（`git ls-files --eol data/` 实测 i/lf w/crlf ×5），data-provenance 字节哈希守卫恒红。修法（不动配置、零跟踪内容变更）：
  ```bash
  for f in data/README.md data/a_stocks.json data/etf_stocks.json data/hk_stocks.json data/manifest.json; do git cat-file blob HEAD:"$f" > "$f"; done
  ```
  workspace「git 幻影 M」细则只覆盖 status 伪 M（diff 过滤后无差异），不覆盖字节哈希守卫——本步是该 know-how 的守卫面补充。注记：未来 checkout/reset 重灌 CRLF 时重跑本步；备选方案（仓局部 `core.autocrlf=false` + 全量检出重写）因会把全仓 CRLF 变幻影 M 为真 M 且有未提交文件波及风险，不采纳。
- [ ] Step 4: 基线验证
  - Run: `node scripts/run-tests.mjs "tests/data-provenance.test.mjs" && npm test`
  - Expected: data-provenance 绿；全量 ≈401 全绿（两因已修）；实测计数落盘 scratch/台账。
- [ ] Step 5: 本任务预期零提交（git config 不可提交、data/ 写回后与 index 字节一致无 diff、node_modules 不入库）——以测试绿为判据，台账注明即可。

### Task 1: probe 扩充——新浪形状取证 + 688 量纲三方对照

- 目标：为 Task 2（新浪字段口径）与 Task 7（量纲分支）取得当日实测证据。
- 涉及文件：`scripts/probe-markets.mjs`、`scripts/probe-result.json`、`docs/data-source-probe.md`。
- 接口契约
  - Consumes：无（既有 probe 框架 `probe(name, fn)` / `getText(url, timeout)`）。
  - Produces：`scripts/probe-result.json` 新增**两组**结果——`sina-cn-snapshot`（sh600519,sh510300,sh000001,sz000001 原始字段位转储）、`volume-cn-kline-compare`（sh600519 / sh688111 / bj920000 同日腾讯 K 线末根 volume vs 腾讯快照 f36 vs 新浪快照 f8）；第三组 `sina-parse-recheck` 由 Task 2 Step 4 追加（须 import 届时才存在的 `parseSinaSnapshot`，ESM 静态 import 不能提前入 T1——评审 Q3 修正）；`docs/data-source-probe.md` 摘录段落。
- 验证范围：probe 全绿且新增组 ok；量纲结论二选一记录在案（见 Task 7 门控）。

- [ ] Step 1: 在 em-cn-snapshot 组（probe-markets.mjs:109）之后、writeFileSync 之前追加**两组**探针（评审 Q3/Q6 修正）。sina 取证用原始转储（唯一的非生产 parser 例外，注明理由）；量纲对照 import 生产函数，bj 样本独立 try 包裹（腾讯 bj fqkline 从未实测，失败不得拖垮整组——评审 Q7）：
  ```js
  import { parseBatchSnapshot, fetchKline } from "../src/markets/tencent.mjs";
  ```
  `volume-cn-kline-compare` 对每个样本码：`fetchKline(code,"day")` 取末根 volume；`parseBatchSnapshot(GBK文本)` 取 f36；新浪组直接 GET `https://hq.sinajs.cn/list=...`（headers 带 `referer: "https://finance.sina.com.cn/"`），记录原始行与字段位。输出对象形如 `{ code, klineLastVolume, snapshotF36, sinaF8, ratio }`。
- [ ] Step 2: 运行并记录
  - Run: `node scripts/probe-markets.mjs`
  - Expected: 退出码 0，控制台全 ✓；`sina-cn-snapshot` 返回非空 fields0（f0 名称 / f3 现价 / f30 日期 / f31 时间位有值）；量纲组三个样本 ratio 结论明确。
- [ ] Step 3: 把结论写进 `docs/data-source-probe.md`（新浪字段位表 + 量纲裁决：「688 K线=股、其余A股 K线=手、快照=手、hk=股」或证伪结论），并把 Task 7 的分支选择写死。
- [ ] Step 4: checkpoint commit 必做：`git add scripts/probe-markets.mjs scripts/probe-result.json docs/data-source-probe.md && git commit -m "probe: sina shape + 688 volume evidence"`。

### Task 2: 新浪适配器 src/markets/sina.mjs + 离线测试

- 目标：零依赖新浪 cn 快照适配器，纯 parser 可被 probe/测试复用。
- 涉及文件：Create `src/markets/sina.mjs`、Create `tests/providers-sina.test.mjs`。
- 接口契约
  - Consumes：Task 1 的字段位证据（f0 名称 / f1 今开 / f2 昨收 / f3 现价 / f4 高 / f5 低 / f8 量(手) / f9 额(元) / f30 yyyymmdd / f31 hhmmss）。
  - Produces：`handles(market) → market === "cn"`；`parseSinaSnapshot(text) → Map(code → quote)`；`fetchBatchSnapshots(codes) → Promise<Map(code → quote)>`（quote 形状与 EM ulist 行一致：`code,name,price,changePercent,changeAmount,volume,amount,high,low,open,prevClose,quoteTimeMs,quoteTimeText:null`）。Task 3/4 消费前两个 export。
- 验证范围：`node scripts/run-tests.mjs "tests/providers-sina.test.mjs"` 全绿；全量 `npm test` 不回归。

- [ ] Step 1: 写失败测试（夹具为**已解码的 GBK 文本字符串**，直接喂 `parseSinaSnapshot`——GBK 编码无法用 Node 原生 Buffer 构造，故 fetch 层负责解码、parser 只吃文本，与 `tencent.mjs` 的 `parseBatchSnapshot` 同构）。用例钉死：
  1. 标准行：`v_sh600519="贵州茅台,1450.00,1452.00,1453.00,1457.72,1436.00,...,42848,619953000,...,20261114,150000";` → price/prevClose/open/high/low/volume(原样=手)/amount 正确；`changePercent = (1453-1452)/1452*100`；`changeAmount = 1.00`；`quoteTimeMs` = `2026-11-14T15:00:00+08:00` 的 epoch。
  2. ETF 行与指数行（v_sh510300 / v_sh000001）同格式收录。
  3. 现价 0（停牌）行剔除；空文本返回空 Map；`v_` 前缀缺失行跳过。
  4. bj 请求码不在响应 → Map 无该键（缺席语义）。
  5. f30/f31 缺失或畸形 → `quoteTimeMs: null`，行情仍收录。
  - Run: `node scripts/run-tests.mjs "tests/providers-sina.test.mjs"`
  - Expected: 加载即红（`parseSinaSnapshot` 不存在）。**红灯须辨因**：模块导出缺失红与断言红都算数，但 Task 2 实现后必须重跑确认断言级通过（防夹具假绿）。
- [ ] Step 2: 实现最小 `src/markets/sina.mjs`（骨架钉死，执行者按现行代码风格成文）：
  ```js
  /** 新浪财经适配器（A 股/ETF/指数快照备源）—— 零依赖，Node fetch。
   * 协议知识来源：ZhuLinsen/daily_stock_analysis (MIT) 新浪直连口径（akshare_fetcher），见 NOTICE.md；
   * 2026-11-14 经 scripts/probe-markets.mjs 实测复核（§12.44）：
   *   - 批量快照 hq.sinajs.cn/list=<codes>（GBK；必须带 Referer: https://finance.sina.com.cn/）
   *   - 行格式 v_sh600519="名称,今开,昨收,现价,最高,最低,…,量(手),额,…,日期yyyymmdd,时间hhmmss"
   *   - 不服务北交所（bj）代码：请求中的 bj 码在结果 Map 中缺席，调用方按链补位
   */
  const SINA_HOST = "https://hq.sinajs.cn/list=";
  const BATCH_CAP = 60;          // 每请求上限；超出内部分块顺序请求（链末位不得丢码）
  const TIMEOUT_MS = 12000;
  const REFERER = "https://finance.sina.com.cn/";
  export function handles(market) { return market === "cn"; }
  export function parseSinaSnapshot(text) { /* 上述钉死语义；num() 沿用 tencent.mjs 写法 */ }
  export async function fetchBatchSnapshots(codes) {
    // 去重 → 60 分块顺序 GET（fetch headers: { accept:"text/plain,*/*", referer: REFERER }，AbortSignal.timeout(TIMEOUT_MS)）
    // → GBK TextDecoder 解码 → parseSinaSnapshot → 合并 Map
  }
  ```
- [ ] Step 3: 运行并确认通过
  - Run: `node scripts/run-tests.mjs "tests/providers-sina.test.mjs"`
  - Expected: 全绿（上述 5 组用例全过）。
- [ ] Step 4: 追加 parser 复跑探针进 probe（Task 1 的 `sina-parse-recheck` 位），Run: `node scripts/probe-markets.mjs`，Expected: 该组 ok 且解析出行数 > 0。
- [ ] Step 5: `docs/verification.md` 追加 `## 12.44 新浪快照第三源（适配器 + 链接入 + 直加腿）`（先写适配器部分；链接入/直加小节由 Task 3/4 追加到同节）。checkpoint commit 必做。

### Task 3: quotes.mjs 接线——cn 链第三位 + 详情路径 fullAdapter

- 目标：cn 快照链与 cn 详情链获得新浪第三腿。
- 涉及文件：`src/quotes.mjs`（CHAINS:29-34、providers:37-43、fullAdapter:184-208、文件头注释 5-8）、`tests/quotes-service.test.mjs`。
- 接口契约
  - Consumes：Task 2 的 `handles`/`fetchBatchSnapshots`（import 自 `./markets/sina.mjs`）。
  - Produces：`CHAINS.cn === ["tencent","eastmoney","sina"]`；`fullAdapter.sina`。Task 5/6 在同一文件继续改。
- 验证范围：`node scripts/run-tests.mjs "tests/quotes-service.test.mjs"` 全绿（含新用例）。

- [ ] Step 1: 写失败测试。扩展 `mockFetchWorld`：新增 `hq.sinajs.cn` 分支返回 `v_sh600519="..."`（独立价格）+ 新增开关 `setSinaFail`；新增 `setTencentSparse`（腾讯只回 sh600519、不回 sz000001）。新用例钉死：
  1. 腾讯+EM 全挂 → sz000001 行 `status:"ok"` 且价格来自新浪夹具（第三腿兜住）。夹具钉死（评审 Q8）：用例 identity 集含 `{ id: "cn:sz000001", market: "cn", code: "sz000001", quoteCurrency: "CNY" }`；mock 世界 sina 分支返回 `v_sz000001="平安银行,…" ` 行。
  2. 三源全挂 → 行 `status:"error"`。
  3. 详情路径 `getQuoteFull`：tencent/em 失败时 sina 供数成功。
  - Run: `node scripts/run-tests.mjs "tests/quotes-service.test.mjs"`
  - Expected: 红——用例 1/3 中该行 error（sina 尚未入链）、用例 3 无 fullAdapter.sina。
- [ ] Step 2: 实现：import sina；`CHAINS.cn` 加 `"sina"`；`providers` 数组加 `{ name: "sina", handles: sinaHandles, fetch: sinaBatch, quoteTime: null }`；`fullAdapter` 加
  ```js
  sina: async (code) => { const rows = await sinaBatch([code]); const quote = rows.get(code) ?? null; return { quote, quoteTime: quote?.quoteTimeMs ?? null }; },
  ```
  文件头注释 5-8 行链形态描述同步更新（cn: 腾讯 → 东方财富 → 新浪）。
- [ ] Step 3: 运行并确认通过（同 Step 1 命令，全绿）。
- [ ] Step 4: `docs/verification.md` §12.44 追加「链接入」小节（三腿用例与 full 路径结果）；checkpoint commit 必做：`git commit -m "quotes: sina third source for cn chain"`。

### Task 4: search.mjs 直连添加新浪腿

- 目标：cn/hk 直连校验链与行情链保持同构——cn 分支在 EM 腿后补新浪。
- 涉及文件：`src/markets/search.mjs`（import 区 19-24、`resolveDirect` cn/hk 分支 337-352）、`tests/search-index.test.mjs`（或现有直连用例所在文件）。
- 接口契约
  - Consumes：Task 2 的 `fetchBatchSnapshots`（`import * as sina from "./sina.mjs"`，与现有 `* as tencent` 同风格）。
  - Produces：无下游消费。
- 验证范围：直连用例测试文件全绿。

- [ ] Step 1: 写失败测试：cn 直连，mock 腾讯与 EM 都失败、新浪夹具成功 → `resolveDirect("cn","sh600519")` 返回 `{ ok: true }` 且 name 来自新浪夹具；三源全失败 → 现行 `quote-unavailable` 语义不变（cn 分支若无该语义则维持现状，测试只钉「新浪腿兜住」与「全灭失败」两态）。
  - Run: `node scripts/run-tests.mjs "tests/search-index.test.mjs"`
  - Expected: 红——mock 新浪分支不生效（resolveDirect 尚无新浪腿，行 error/symbol-not-found）。
- [ ] Step 2: 实现：cn 分支 EM 腿后追加
  ```js
  if (!quote) { try { const rows = await sina.fetchBatchSnapshots([identity.code]); quote = rows.get(identity.code) ?? null; } catch { quote = null; } }
  ```
  分支注释补「新浪第三腿（P0-1 同构，§12.44）」。hk 分支不动（共识：hk-sina 不承诺本轮）。
- [ ] Step 3: 运行并确认通过（同 Step 1 命令）。
- [ ] Step 4: §12.44 追加直加腿小节；checkpoint commit 必做。

### Task 5: 退避键按 (提供方, 市场) 拆分 + 嵌套健康载荷

- 目标：消除跨市场连坐（EM 美股失败不再冻结 cn/hk 备源）；health 载荷增 `lastOkAt`/`lastErrorAt`/`lastError` 并改嵌套形状。
- 涉及文件：`src/quotes.mjs`（state:47、backoffMs:49-51、fetchProvider:57-92、guardedFull:158-181、getQuoteFull 调用点:216、health:230-236）、`tests/quotes-service.test.mjs`（96-100、133 两处扁平断言）、`tests/routes.test.mjs`（195 行扁平断言）。
- 接口契约
  - Consumes：无前序依赖（与 Task 3 同文件顺序执行）。
  - Produces：`fetchProvider(provider, market, codes)` 与 `guardedFull(name, market, code, fn)` 新签名（文件内私有，无外部消费）；`health()` 返回 `{ [name]: { [market]: { failures, backoffRemainMs, lastOkAt, lastErrorAt, lastError } } }`（仅含已被触达的 name|market 键）；diag 事件 `provider.fail` 增加 `market` 字段。Task 6 在同文件继续；`/health`、`/quotes` 的 `providers` 字段形状由本任务定形。
- 验证范围：`node scripts/run-tests.mjs "tests/quotes-service.test.mjs" "tests/routes.test.mjs"` 全绿。

- [ ] Step 1: 写失败测试（改既有 + 加新）：
  1. 改扁平断言：`health.tencent.backoffRemainMs` → `health.tencent.cn.backoffRemainMs`（quotes-service 96-100、133；routes.test 195 `providers.tencent.cn !== undefined`）。Run 后 Expected: 红（嵌套键 undefined）。
  2. 逐市场隔离新用例：mock 世界先 `setTencentFail(true)` 拉一次 cn 轮询（tencent|cn 进入退避），再 `setTencentFail(false)` 拉一次含 hk 标的的轮询 → hk 行 ok 且 `calls` 含 qt.gtimg.cn（证明 hk 未被 cn 退避冻结）。红——现状 hk 也被冻结（calls 不含腾讯）。
  3. `lastError` 记录用例：腾讯挂时 `health.tencent.cn.lastError === "upstream-down"` 且 `lastErrorAt > 0`；恢复后 `lastOkAt` 被刷新。
  4. inconclusive 语义钉死：腾讯挂、EM 返回**空 diff** → 该批标 error、diag 无 eastmoney 的 `provider.fail`、`health.eastmoney.cn.failures === 0`（上游有响应≠失败，§12.46 记录该口径）。
- [ ] Step 2: 实现：
  - `state` 改惰性构建：`function stateOf(name, market)` 键 `name + "|" + market`，值增 `lastOkAt:null, lastErrorAt:null, lastError:null`；
  - `fetchProvider(provider, market, codes)` / `guardedFull(name, market, code, fn)` 取 `stateOf(...)`；成功路径刷 `lastOkAt`，失败路径刷 `lastErrorAt`/`lastError`（slice 120，与 diag 同口径）；
  - `getQuotes` 链循环（111-117）与 `getQuoteFull` 循环（214-216）传 `market`（两处作用域内均有）；
  - `health()` 按 state 键拆分聚合为嵌套对象；
  - diag 事件加 `market` 字段（fetchProvider 与 guardedFull 两处）。
- [ ] Step 3: 运行并确认通过（同 Step 1 命令，含改写后的既有用例全绿）。
- [ ] Step 4: `docs/verification.md` 追加 `## 12.45 退避键按 (提供方, 市场) 拆分 + 健康载荷嵌套增强`（含 inconclusive 口径与「形状变更对客户端无破坏：providers 引用型切片」说明）。checkpoint commit 必做。

### Task 6: 行情行来源标注 source / fallbackFrom

- 目标：每行行情带 `source`（实际供数方 token）与 `fallbackFrom`（该标的在链上首个失败/丢弃它的源 token；链首直接供数时 null）。
- 涉及文件：`src/quotes.mjs`（getQuotes 合并循环 122-133、getQuoteFull 循环 214-224）、`src/routes.mjs`（rowsById 装配 306-313）、`tests/quotes-service.test.mjs`。
- 接口契约
  - Consumes：Task 3 已把 sina 纳入链（用例里新浪作 third-leg 供数方）。
  - Produces：quotes.mjs 行形状 `{ ..., source, fallbackFrom }`；routes.mjs `/quotes` 响应行形状 `{ ..., source, fallbackFrom }`（full=1 与非 full 两路径同形状）。Task 8 消费 routes 字段。
- 验证范围：`node scripts/run-tests.mjs "tests/quotes-service.test.mjs" "tests/routes.test.mjs"` 全绿。

- [ ] Step 1: 写失败测试（quotes-service 层钉语义，routes 层钉透传）：
  1. 全链正常 → cn 行 `source:"tencent"`、`fallbackFrom:null`。
  2. `setTencentFail` → 行 `source:"eastmoney"`、`fallbackFrom:"tencent"`。
  3. 稀疏丢码：`setTencentSparse`（sz000001 腾讯缺席）→ sz000001 落到新浪（mock sinajs 有该码）→ `source:"sina"`、`fallbackFrom:"tencent"`（首个失败源是腾讯而非顺位的 EM——钉死「首个」语义）。
  4. error 行 `source:null`。
  5. routes 透传：`rowsById[...].source` 与 `fallbackFrom` 字段存在且与服务层一致（routes.test.mjs 加断言）。
  - Run: `node scripts/run-tests.mjs "tests/quotes-service.test.mjs"`
  - Expected: 红——行无 source 字段（undefined ≠ 期望值）。
- [ ] Step 2: 实现：
  - getQuotes 市场循环内 `const firstFail = new Map()`：整源 throw 时对全部 pending 记首败；稀疏掉队（push 进 `still`）时对掉队标的记首败（均 `if (!firstFail.has(id))`）；`out.set` 处行加 `source: name, fallbackFrom: firstFail.get(identity.id) ?? null`；终局 error 行 `source: null, fallbackFrom: null`。
  - getQuoteFull 同构：循环内记录首个失败 name（guardedFull throw 或 quote 无效两种情形都记），成功行加 `source`/`fallbackFrom`。
  - routes.mjs rowsById 加 `source: row.source ?? null, fallbackFrom: row.fallbackFrom ?? null`。
- [ ] Step 3: 运行并确认通过（同 Step 1 命令全绿）。
- [ ] Step 4: `docs/verification.md` 追加 `## 12.46 行情行来源标注（source / fallbackFrom）`，显式记录口径（评审 Q13）：error 行 `source`/`fallbackFrom` 均为 null——fallbackFrom 描述「降级供数」的来源，无供数则无从降级，B5 的「条件有」以此为准。checkpoint commit 必做。

### Task 7: 科创板 688/689 K 线量纲归一（probe 门控）

- 目标：K 线量纲统一为「股/份」——若且仅若 Task 1 probe 证实 DSA #2350 结论仍成立。
- 涉及文件：`src/markets/tencent.mjs`（fetchKline:165-203、文件头注释）、`tests/providers-tencent*.test.mjs`（执行者先 `ls tests/providers-tencent*` 定位现有文件，量纲断言加进该文件）。
- 接口契约
  - Consumes：Task 1 `volume-cn-kline-compare` 的裁决结论。
  - Produces：`fetchKline` 返回 candles 的 `volume` 为股/份口径（cn 非科创板 ×100；sh688/sh689 原样；hk/bj 按 probe 裁决原样或相应处理）；capability-matrix 量纲段落措辞素材（Task 10 消费）。
- 验证范围：`node scripts/run-tests.mjs "tests/providers-tencent.test.mjs"` 全绿。

- [ ] Step 1（门控分支，二选一）：
  - **分支 A（probe 证实 688=股、其余 A 股=手）**：写失败测试——mock fqkline 夹具三行同 volume 值 `12345`：`fetchKline("sh600519","day")` → `volume === 1234500`；`fetchKline("sh688111","day")` → `volume === 12345`；`fetchKline("hk00700","day")` → `volume === 12345`（hk 原生股不换算）；bj 分支按 Task 1 裁决钉死（原生股 → 原样）。**同时改写既有断言**（评审 Q2 清点）：`tests/providers-tencent.test.mjs:60` 的 `deepEqual(..., volume: 42848)` 在归一后应为 `4284800`——本战役唯一一处「现存期望值改值」，随本任务清单化改写；该文件 hk 用例不断言 volume、不受影响。Run Expected: 红（现状全原样返回）。
  - **分支 B（probe 证伪：腾讯已统一口径或 688 特例消失）**：不加代码，`docs/verification.md` 独立写 `## 12.47 科创板 688/689 K 线量纲归一`（内容：probe 裁决证伪、量纲维持现状、capability-matrix 口径不变），Task 7 就此关闭，跳到 Task 8。
- [ ] Step 2（分支 A 续）: 实现最小函数 + 接线：
  ```js
  /** 腾讯 fqkline 量纲归一：多数 A 股/ETF 为手 → ×100 归股/份；科创板 688/689 原生为股（DSA #2350 口径，2026-11-14 probe 复核 §12.47）；港股原生为股不换算；bj 按 probe 裁决 */
  function klineVolumeToShares(raw, code) {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return 0;
    const c = String(code ?? "").toLowerCase();
    if (c.startsWith("sh688") || c.startsWith("sh689")) return v;
    if (c.startsWith("sh") || c.startsWith("sz")) return v * 100;
    return v;
  }
  ```
  `fetchKline` 的 candle push 改 `volume: klineVolumeToShares(row[5], apiCode)`；文件头「K线行序」注释补量纲口径。
- [ ] Step 3: 运行并确认通过（分支 A：同 Step 1 命令全绿）。
- [ ] Step 4: `docs/verification.md` 追加 `## 12.47 科创板 688/689 K 线量纲归一`（分支 B 则为证伪记录）。checkpoint commit 必做。

### Task 8: 详情页数据源脚注（客户端，常显）

- 目标：详情页报价行 meta 区常显「数据源：{name}」，降级时附加「（降级自 {from}）」；行情行不加徽章（共识 Q5/Q10）。
- 涉及文件：`client/i18n.mjs`、`client/detail.mjs`（paintQuoteLine 630-636 锚点）、`client/styles.mjs`、Create `tests/detail-source.test.mjs`、重建 `lib/client.js`。
- 接口契约
  - Consumes：Task 6 的 `/quotes` 行字段 `source`/`fallbackFrom`（经 store 快照 `quotes[id]` 到达 paintQuoteLine，变量 `q`）。
  - Produces：`client/i18n.mjs` 导出 `detailSourceText(row)`（Task 测试消费；paintQuoteLine 调用）。
- 验证范围：`node scripts/run-tests.mjs "tests/detail-source.test.mjs"` 全绿；`npm run build` 退出码 0 且 `git diff --stat lib/client.js` 显示重建；全量测试含 i18n parity 守卫绿。

- [ ] Step 1: 写失败测试 `tests/detail-source.test.mjs`（纯 node:test，无 DOM）：import `detailSourceText`——
  1. `{status:"ok", source:"eastmoney", fallbackFrom:null}` → zh 含「数据源：东方财富」且不含「降级自」；
  2. `{status:"ok", source:"sina", fallbackFrom:"tencent"}` → zh 含「数据源：新浪（降级自 腾讯）」；
  3. `{status:"error"}` / `null` / `source:null` → 返回 null；
  4. en 语言同两态（`Source: EastMoney` / `(fell back from Tencent)`）；
  5. 六个 `provider.*` 键 zh/en 均存在（parity 手检，既有守卫兜底）。
  - Run: `node scripts/run-tests.mjs "tests/detail-source.test.mjs"`
  - Expected: 红——detailSourceText 未导出。
- [ ] Step 2: 实现。i18n 文案**钉死**（插值为单花括号 `{name}`——`t()` 用 `replaceAll('{'+k+'}')`，i18n.mjs:381-387 实测）：
  - zh：`detail.source` = `数据源：{name}`；`detail.source.fallback` = `数据源：{name}（降级自 {from}）`；`provider.tencent`=`腾讯`、`provider.eastmoney`=`东方财富`、`provider.tencent-us`=`腾讯美股`、`provider.yahoo`=`Yahoo`、`provider.okx`=`OKX`、`provider.sina`=`新浪`。
  - en：`detail.source` = `Source: {name}`；`detail.source.fallback` = `Source: {name} (fell back from {from})`；`provider.*` = `Tencent`/`EastMoney`/`Tencent US`/`Yahoo`/`OKX`/`Sina`。
  - i18n.mjs 导出：
    ```js
    export function detailSourceText(row) {
      if (!row || row.status !== "ok" || !row.source) return null;
      const name = t(`provider.${row.source}`);
      const from = row.fallbackFrom ? t(`provider.${row.fallbackFrom}`) : null;
      return from ? t("detail.source.fallback", { name, from }) : t("detail.source", { name });
    }
    ```
  - detail.mjs paintQuoteLine：badge 块之后追加
    ```js
    const srcNote = detailSourceText(q);
    if (srcNote) meta.append(textSpan("skc-source-note", srcNote));
    ```
  - styles.mjs 加 `.skc-source-note { font-size: 11px; opacity: .72; margin-left: 6px; }`（沿用现行弱化小字惯例，执行时对照 `skc-badge` 相邻规则命名）。
- [ ] Step 3: 运行并确认通过 + 重建
  - Run: `node scripts/run-tests.mjs "tests/detail-source.test.mjs" && npm run build`
  - Expected: 测试全绿；build 退出码 0（含 `__APP_VERSION__` 注入断言）。
- [ ] Step 4: `docs/verification.md` 追加 `## 12.48 详情页数据源脚注`（未验证项如实标注：GUI 渲染效果未复验，随发版后主人点验）。checkpoint commit 必做。

### Task 9: 东财 UA 池轮换

- 目标：EM 请求 UA 从固定值改为 5 元素池随机取用（DSA efinance_fetcher.py:113-121 同款列表）。
- 涉及文件：`src/markets/eastmoney.mjs`（HEADERS 常量 22-26、emFetch 40-45）。
- 接口契约
  - Consumes：无。
  - Produces：无下游消费（emFetch 内部行为）。
- 验证范围：`node scripts/run-tests.mjs "tests/providers-eastmoney.test.mjs"` 全绿（既有用例断言 URL/行形状，未断言 UA 头——执行时先 grep 确认，若发现 UA 断言则同步改夹具）。

- [ ] Step 1: 改动前检查：`grep -n "user-agent\|HEADERS" tests/providers-eastmoney.test.mjs tests/quotes-service.test.mjs`——Expected: 无 UA 头断言（若有则本任务 Step 2 一并改夹具）。
- [ ] Step 2: 实现：
  ```js
  const UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];
  const emHeaders = () => ({ accept: "application/json, text/plain, */*", "user-agent": UA_POOL[Math.floor(Math.random() * UA_POOL.length)], referer: "https://quote.eastmoney.com/" });
  ```
  `emFetch` 改用 `emHeaders()`；原 `HEADERS` 常量删除。
- [ ] Step 3: 运行并确认通过
  - Run: `node scripts/run-tests.mjs "tests/providers-eastmoney.test.mjs"`
  - Expected: 全绿（无行为变化，仅头轮换）。
- [ ] Step 4: `docs/verification.md` 追加 `## 12.49 东财 UA 池轮换`（如实标注：轮换仅降低同 UA 连续请求特征，无限流对照实验）。checkpoint commit 必做。

### Task 10: 文档落盘（GLOSSARY 一改 + capability-matrix + NOTICE + probe 文档）

- 目标：战役知识落盘到仓内既有文档载体（按共识 Q11：零 ADR）。
- 涉及文件：`GLOSSARY.md`（行情链条目）、`docs/capability-matrix.md`、`NOTICE.md`、`docs/data-source-probe.md`。
- 接口契约
  - Consumes：Task 1 probe 结论、Task 2-9 各任务已写入的 verification 小节（§12.44-§12.49）。
  - Produces：无下游消费。
- 验证范围：`npm test` 全量（agents-paths 守卫等文档相关守卫不红）；四个文档 diff 人工核对一遍。

- [ ] Step 1: GLOSSARY「行情链」条目 cn 描述改为 `腾讯→东方财富→新浪`（us/crypto 措辞不动）。
- [ ] Step 2: capability-matrix 三处：
  1. 「多源降级链」条目 cn 链补新浪 + 「**2026-11-14 新浪 cn 第三源**」小节（端点、Referer 要求、60/请求分块、bj 不覆盖、WAF/限流观察义务——措辞对齐腾讯 WAF 前科条目写法）；
  2. 「精度与单位口径」段：按 Task 7 裁决改写（分支 A：「快照量：A 股为手、港/美股为股（现状不变）；K 线量：统一为股/份（688/689 原生股、其余 A 股/ETF ×100 归一）；界面量柱为图内相对高度，显示不受影响」；分支 B：维持原文并记录 probe 结论）；
  3. 探针计数更新（23/23 → 新总数）。
- [ ] Step 3: NOTICE.md 表格加一行（短 hash 由执行者取：`git -C ../../.dsh-research/daily-stock-analysis-clone rev-parse --short HEAD`）：来源 `daily_stock_analysis (ZhuLinsen)`、MIT、复用内容「新浪 hq.sinajs.cn 快照字段口径与 Referer 要求、科创板 688/689 K 线量纲特例（issue #2350）、退避 inconclusive 语义参考」、对应位置 `src/markets/sina.mjs`、`src/markets/tencent.mjs`（协议知识参考，重写实现）。
- [ ] Step 4: data-source-probe.md 补 Task 1 三组探针摘录。
- [ ] Step 5: 运行 `npm test`（全量）Expected: 全绿。
- [ ] Step 6: 文档 checkpoint 提交必做（评审 N1）：`git add GLOSSARY.md docs/capability-matrix.md NOTICE.md docs/data-source-probe.md docs/plans/2026-11-14-dsa-data-layer-hardening-implementation-plan.md && git commit -m "docs: dsa 数据层加固战役登记（GLOSSARY/能力矩阵/NOTICE/probe/计划）"`——同时清空执行纪律 Q5 条款所指的工作区现存未提交文件，使 T11 Step 2「工作区仅余本步产物」前提可满足。

### Task 11: 统一发版 0.3.4

- 目标：全部任务完成后按仓内发版链发布 0.3.4（共识 Q9：单版本）。
- 涉及文件：`package.json`（version）、`lib/client.js`（重建）、git tag。
- 接口契约
  - Consumes：Task 1-10 全部完成且全量测试绿。
  - Produces：npm `dsh-stock-kanban@0.3.4`；verification.md `## 12.50 v0.3.4 发版实录`。
- 验证范围：pre-push 钩子（全量测试 + 产物新鲜度）通过；CI 工作流绿；npm registry 三键入账。

- [ ] Step 0: 钩子激活检查（评审 Q4）：`git config core.hooksPath`——本克隆 2026-11-14 实测为空（exit 1）；为空则 `git config core.hooksPath .githooks`（AGENTS.md:7 一次性配置）。Expected: 输出 `.githooks`，否则 Step 3 的「pre-push 钩子全绿」将静默落空。
- [ ] Step 1: 全量前置验证
  - Run: `npm test && npm run build`
  - Expected: 全绿；build 后 `git status` 中 lib/client.js 无 diff（新鲜）。
- [ ] Step 2: bump + 重建 + 单提交：package.json `0.3.3` → `0.3.4` → `npm run build`（version 注入）→ `git add package.json lib/client.js && git commit -m "chore(release): v0.3.4"`（**显式路径**，评审 Q5：release 提交仅含这两文件，AGENTS.md:11 口径；前置前提是各任务 checkpoint 提交已全部落盘，工作区仅余本步产物）。
- [ ] Step 3: CI 平价门 + 打轻量 tag 并推送
  - Run: `bash scripts/ci-parity.sh && git tag v0.3.4 && git push && git push origin v0.3.4`
  - Expected: ci-parity 全绿（AGENTS.md:11，v0.3.3 CI 红灯实录后新增纪律——评审 Q5a）；pre-push 钩子全绿；GitHub Actions 发布工作流启动。
- [ ] Step 4: 上架轮询按 AGENTS.md:10 收尾：`bash ../01_docs/dsh-intall-know-how/tools/release-monitor.sh iasiv5/dsh-stock-kanban v0.3.4 dsh-stock-kanban 0.3.4`（两阶段轮询；铁律 know-how 018：窗口内不重推 tag——评审 Q11）。npm registry 三键核对（per-version 200 / dist-tags.latest=0.3.4 / published_at）→ RELEASE_LIVE 记录进 §12.50。
- [ ] Step 5: `docs/verification.md` 追加 `## 12.50 v0.3.4 发版实录`（含 CI 红灯往返实录位、装机 `dshm_upgrade` + `dshm_restart`（当轮最后动作）、生效判据见「最终验证」节、GUI 复验清单留主人：A 股详情页脚注常显 / 拔网线或等 EM 502 时脚注显示降级源 / 688 标的 K 线量柱正常）。
- [ ] Step 6: 发版后文档提交必做（评审 N2；先例 4af3ef6）：`git add docs/verification.md && git commit -m "docs: verification 12.50 v0.3.4 发版实录" && git push`。

## 执行纪律

- 开始实现前批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 前置检查由 Task 0 统一执行（评审 N5/N6）：①依赖判据加强为「目录存在 **且** 关键 devDep 可解析」；②data/ 字节 reconciliation——本机 autocrlf 检出 CRLF 使 data-provenance 哈希守卫恒红，npm ci 不治。
- TDD 红灯必须辨因：加载红（import 失败）只证明符号缺失，实现后必须重跑到断言级通过；严防夹具假绿与加载失败静默（workspace AGENTS「测试注入形态与红确认」）。
- 按任务顺序执行，不无声跳步/合并步/改任务目标；Task 7 的 probe 分支裁决必须先落 docs 再动代码。
- probe 与 push 为联网动作；`dshm_restart` 只能当轮最后动作（`~/.dsh/AGENTS.md` 红线）。
- 每任务完成即运行其定义的验证并写 verification 小节；遇阻塞、重复失败或计划与仓库现实不符，立即停下说明。
- 发版在 main 上直接进行（共识 Q9 已获主人同意）。
- 本战役每任务收尾的 checkpoint 提交为**必做**（评审 Q5：跳过则发版提交被迫卷入全战役改动，违反 AGENTS.md:11「release 提交仅 package.json + lib/client.js」）；工作区现存未提交的 GLOSSARY.md 词条与本计划文档，在 Task 10 文档提交一并入库。
- 计划内 file:line 为定位辅助，一律以符号锚点复核为准（评审 Q9）。

## 最终验证

- `npm test`：全量绿（现基线 401 项 + 本战役新增 ≥14 项：providers-sina 5、quotes 链/隔离/来源 ≥7、detail-source 5 组、tencent 量纲 3-4——以实跑计数为准）。
- `npm run build`：退出码 0，`git diff --stat lib/client.js` 非空（含 version 注入）且提交后无残留 diff。
- `node scripts/probe-markets.mjs`：全 ✓（原 23 组 + 新增 ≥3 组）。
- 发版后：CI 绿、npm registry 三键 `0.3.4` 入账；`dshm_upgrade` + `dshm_restart` 后的生效判据（评审 Q12 钉死，健康检查 200 类恒真信号不作数）：①安装副本 `node_modules/dsh-stock-kanban/package.json` 的 version 读数 = 0.3.4（构建指纹类）；②先 `GET /stock-kanban/quotes?ids=cn:sh600519` 触达一次行情，再 `GET /stock-kanban/health` → providers 嵌套结构非空（health 仅含已触达键，不先拉行情则判据空转）。
- GUI 复验留主人（如实列入 §12.50 未验证面）：详情页脚注两态、降级实时性、688 量柱。

## 审阅 Checkpoint

- 本计划已完成 inline 自检（见对话记录），按主人指示**就此停住，交人工评审**。
- 评审通过前不进入实现；评审意见回填本文件后按 Task 0 → Task 1-11 顺序执行。
