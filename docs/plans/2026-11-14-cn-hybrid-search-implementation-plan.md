# cn 混合搜索（ADR-0006）实施计划

## 目标

- A 股（cn）搜索改为「本地池优先 + smartbox 补充」的混合模式：池结果凑满 30 条不打上游；smartbox 补充 GP-A 正股（拼音缩写搜索、刷新间隙的新上市标的）。
- 把搜索源架构决策落档：新建 ADR-0006，向既有 GLOSSARY.md 追加术语，verification.md 追记 §12.42。
- 明确非目标：us / crypto 不建池；不加「添加时行情新鲜度闸」；不含 0.3.3 发版（独立决策）。

## 架构快照

- 现状各市场搜索源：cn = 指数目录 + 纯本地池（a_stocks + etf_stocks）；hk = 目录 + 池 + smartbox（池满 30 条不打上游）；us = 目录 + 纯 smartbox；crypto = 代码内常用币表 + OKX 在线清单（30 分钟缓存）。
- 本次改动只动 cn：照抄 hk 的混合口径。`parseSmartbox` 新增 (sh|sz|bj) × GP* 分支（实测 smartbox 返回 `GP-A` 类型且带拼音缩写，如 `sz~000001~平安银行~payh~GP-A`；延迟 120–170ms/次）；cn 分支在池结果后追加 smartbox 行，池满 30 条（MAX_ROWS）不打上游；上游失败时池结果照常返回并标 `smartbox-unavailable`。
- 既有防线不变：市场门禁（push 内 `row.market !== market` 丢弃）、身份白名单（B 股 sz200xxx 等被 makeIdentity 返回 null 自动丢弃）、添加路径行情实测校验。
- 实测记录（2026-11-14）：smartbox 对 bj 零覆盖（返回 N），bj 分支为前瞻放行；smartbox 自身含死码（`sh~600001` 邯郸钢铁 2009 年退市仍在列）；退市码行情为冻结价（sz000024 = 40.50，`price > 0` 仍通过添加校验）。

## 全局约束

- 文件编辑前必先 read 同一文件；文件读写走 OPS 工具（read_files / edit_file / inspect_local_file），构建 / 测试 / git 走 bash。
- 改 `client/` 后必跑 `npm run build`（esbuild 打包 lib/client.js，构建脚本自带注入断言）。
- i18n 为 zh / en 双字典，任何文案改动两字典同步。
- `npm test` 保持全离线（.githooks/pre-push「全套离线测试」不变量）；凡实现让搜索路径可能触网的，相关用例一律以 fetch stub 封闭。
- pre-push 跑全套 `npm test` + 产物新鲜度（build+diff lib/client.js），红灯不得落远端。
- 本计划不含发版与 tag；仓库惯例为 main 直推，开始实现前与主人确认一次。
- 命令环境：bash（Linux）；仓库 `/home/ubuntu/workspace/dsh-stock-kanban`；Node 24；本计划不新增任何依赖。

## 输入工件

- grill-with-docs 共识（2026-11-14 对话）：Q1 目标排序 a>d>c>b；Q2 cn 转混合；Q3 us 不建池；Q4 crypto 维持现状；Q5 不加新鲜度闸；Q6 落档 ADR + 术语表。
- 实测记录：smartbox 探针（GP-A / 拼音 / bj 零覆盖 / 混排含 ZS·KJ / 死码 600001）、腾讯死码探针（sz000024 冻结价 40.50）、quotes.mjs 行情链（cn/hk: tencent→eastmoney；us: eastmoney→tencent-us→yahoo）。
- `docs/adr/` 现有最高编号 0005，本计划 ADR 取 0006。
- ADR-0006 与 GLOSSARY 术语尚未落盘，由本计划任务承担。

## 文件结构与职责

- Modify: `src/markets/search.mjs`（文件头定案清单、`parseSmartbox`、`search()` 的 cn 分支）——混合搜索的唯一实现点。
- Modify: `tests/search-index.test.mjs`（文件末尾追加 2 个测试；该文件已 import `search` 与 `parseSmartbox`）。
- Modify: `client/i18n.mjs`（zh 约 193 行、en 约 370 行的 `err.smartbox-unavailable`）。
- Modify: `lib/client.js`（构建产物，由 npm run build 再生成，不手改）。
- Create: `docs/adr/0006-search-source-architecture.md`。
- Modify: `GLOSSARY.md`（既有文件，向 `## Language` 追加术语，不改既有术语与标题）。
- Modify: `docs/verification.md`（文件末尾追记 §12.42）。

## 任务清单

### Task 1: tests/search-index.test.mjs + 写 cn 混合的失败测试

- 目标：用两个失败测试钉死 GP-A 解析契约与 cn 混合行为。
- 涉及文件：`tests/search-index.test.mjs`（末尾追加）。
- 接口契约：Consumes 无（文件已 import `search`、`parseSmartbox`）；Produces 测试「parseSmartbox：A股正股 GP/GP-A 收录为 cn stock（sh/sz/bj），指数与基金仍过滤（ADR-0006）」与「搜索 cn：池子未凑满时 smartbox 补充（拼音查询池内无命中）；上游挂时池结果仍在并标错」（Task 2 的验收依据）；以及既有 cn 用例的离线 fetch stub（维持 npm test 全离线不变量）。
- 验证范围：定向测试文件红绿；既有 cn 用例离线封闭（不触网）。

- [ ] Step 1: 在文件末尾追加以下两个测试（逐字使用）：

```js
test("parseSmartbox：A股正股 GP/GP-A 收录为 cn stock（sh/sz/bj），指数与基金仍过滤（ADR-0006）", () => {
  const body = 'v_hint="sh~600000~浦发银行~pfyh~GP-A^sz~300750~宁德时代~ndsd~GP^bj~920000~安徽凤凰~ahfh~GP-A^sh~000001~上证指数~szzs~ZS^jj~000001~华夏成长~hxczhh~KJ"';
  const rows = parseSmartbox(body);
  assert.deepEqual(rows.map((r) => [r.market, r.kind, r.code]), [
    ["cn", "stock", "sh600000"],
    ["cn", "stock", "sz300750"],
    ["cn", "stock", "bj920000"],
  ]);
});

test("搜索 cn：池子未凑满时 smartbox 补充（拼音查询池内无命中）；上游挂时池结果仍在并标错", async () => {
  const originalFetch = globalThis.fetch;
  const body = 'v_hint="sz~000001~平安银行~payh~GP-A"';
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => Buffer.from(body, "utf8") });
  try {
    const r = await search("cn", "payh");
    assert.ok(r.rows.some((x) => x.id === "cn:sz000001" && x.source === "smartbox"), JSON.stringify(r));
  } finally {
    globalThis.fetch = originalFetch;
  }
  globalThis.fetch = async () => { throw new Error("down"); };
  try {
    const r = await search("cn", "600519");
    assert.equal(r.rows[0].id, "cn:sh600519");
    assert.equal(r.error, "smartbox-unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```
- [ ] Step 2: 运行并确认失败
- Run: `node --test tests/search-index.test.mjs`
- Expected: 恰好这 2 个新用例失败（GP-A 行不被收录；cn 不打 smartbox、error 为 null），既有用例全部通过。
- [ ] Step 3: 既有 cn 用例补离线 fetch stub（npm test 离线不变量；Task 2 实现后这些用例在池命中 <30 时会打上游）
- Change: 对下列无 mock 的 cn 用例套用同一模式（`const originalFetch = globalThis.fetch; globalThis.fetch = async () => { throw new Error("offline"); }; try { …原有断言… } finally { globalThis.fetch = originalFetch; }`）：
  - 「搜索：名称按 NFKC+去空白匹配（池内「万 科Ａ」可被「万科」「万科a」命中）」（2 处调用）
  - 「搜索：股票与 ETF 交错合并，数字查询不让 ETF 被饿死」
  - 「搜索：精确代码排第一（600519 → 贵州茅台）」
  - 「身份：sh52/53/55 基金号段纳入白名单（池内科创债等 ETF 不再被静默丢弃）」
  以及通读全文件核实的其余无 mock cn 用例（「搜索：指数目录本地匹配…」用例自带 throw mock，无需处理）。
  逐字示例（万科用例改后形态）：

```js
test("搜索：名称按 NFKC+去空白匹配（池内「万 科Ａ」可被「万科」「万科a」命中）", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const plain = await search("cn", "万科");
    assert.ok(plain.rows.some((r) => r.id === "cn:sz000002"), JSON.stringify(plain.rows.map((r) => r.id)));
    const latin = await search("cn", "万科a");
    assert.ok(latin.rows.some((r) => r.id === "cn:sz000002"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] Step 4: 重跑确认红灯面不变
- Run: `node --test tests/search-index.test.mjs`
- Expected: 仍恰好本任务 Step 1 的 2 个新用例失败，其余用例（含补 stub 后）全部通过。
- [ ] Step 5: 无实现（本任务只产红测试与离线封闭）
- Change: 无

### Task 2: src/markets/search.mjs + GP-A 分支与 cn 混合实现

- 目标：parseSmartbox 收录 A 股正股；cn 分支接入 smartbox（hk 同口径）。
- 涉及文件：`src/markets/search.mjs`（3 处编辑，锚点如下）。
- 接口契约：Consumes Task 1 的两个测试名；Produces `parseSmartbox` 新行为（(sh|sz|bj) × GP* → `{market:"cn", kind:"stock", source:"smartbox"}`）与 `search("cn", …)` 混合行为（池优先、`rows.length < MAX_ROWS` 才打上游、上游失败标 `smartbox-unavailable` 且保留池结果）——Task 3、Task 5、Task 6 依赖此行为。
- 验证范围：定向测试文件全绿。

- [ ] Step 1: 写最小实现，共 3 处编辑：

编辑 1（文件头定案清单，锚点 = OKX 冷却行）：

```text
old:   - OKX 清单失败进入 60 秒冷却，并发请求合并为一次上游调用，不再每次等满超时。
new:   - OKX 清单失败进入 60 秒冷却，并发请求合并为一次上游调用，不再每次等满超时。
 *   - cn 混合搜索（ADR-0006）：池优先凑满 30 条不打上游；smartbox 补充 GP-A 正股（拼音缩写、刷新间隙的新上市）。
```

编辑 2（parseSmartbox，锚点 = sh/sz ETF 分支行，在其前插入）：

```js
    } else if ((marketTag === "sh" || marketTag === "sz" || marketTag === "bj") && type.startsWith("GP")) {
      // GP / GP-A：A股正股（2026-11-14 实测 smartbox 返回 GP-A 且带拼音缩写；bj 暂无返回，放行备用）
      rows.push({ code: marketTag + code, name, market: "cn", kind: "stock", source: "smartbox" });
    } else if ((marketTag === "sh" || marketTag === "sz") && type === "ETF") {
```

编辑 3（search() cn 分支，锚点 = `for (const row of merged) push(row);` 与 `} else if (market === "hk") {` 之间）：

```js
    // 池子已凑满上限则不打上游（与 hk 同口径）；smartbox 补充拼音缩写与刷新间隙的新上市标的（ADR-0006）
    if (rows.length < MAX_ROWS) {
      try {
        for (const row of await fetchSmartbox(needle)) push(row);
      } catch {
        error = "smartbox-unavailable";
      }
    }
```

- 行为说明：smartbox 行在池行之后追加，`seen` 集合按 `market:code` 去重；B 股等非白名单代码由 `makeIdentity` 返回 null 在 push 内丢弃，无需额外代码；池失败且 smartbox 也失败时 error 以 smartbox-unavailable 覆盖（与 hk 现行为一致）。
- [ ] Step 2: 运行并确认通过
- Run: `node --test tests/search-index.test.mjs`
- Expected: 全部通过（含 Task 1 的 2 个新用例与既有用例）。
- [ ] Step 3: 可选 checkpoint commit（建议跳过，随 Task 7 统一提交）

### Task 3: client/i18n.mjs + 文案扩到 cn 并重建产物

- 目标：`err.smartbox-unavailable` 的文案不再限定「港股/美股」（cn 现在也会产生该错误码）。
- 涉及文件：`client/i18n.mjs`（zh 约 193 行、en 约 370 行）、`lib/client.js`（构建产物）。
- 接口契约：Consumes Task 2（cn 产生 smartbox-unavailable）；Produces 新 lib/client.js 与新文案（Task 6 记录、Task 7 提交）。
- 验证范围：构建退出码 + 产物字符串 + 全量测试。

- [ ] Step 1: 改文案（zh / en 同步）：

```text
zh old:   "err.smartbox-unavailable": "港股/美股搜索源暂时连不上",
zh new:   "err.smartbox-unavailable": "腾讯搜索源暂时连不上，本地结果仍可用",
en old:   "err.smartbox-unavailable": "HK/US search source unreachable",
en new:   "err.smartbox-unavailable": "Tencent search source unreachable; local results still shown",
```
- [ ] Step 2: 重建产物
- Run: `npm run build`
- Expected: 退出码 0，输出 `wrote lib/client.js`。
- [ ] Step 3: 产物核证（esbuild minify 默认 charset=ascii：lib 内中文一律为 \uXXXX 转义形态，「字面量判据」对中文不成立——核证 D 三重实测，详见评审台账）
- Run: `grep -cF '\u817E\u8BAF\u641C\u7D22\u6E90\u6682\u65F6\u8FDE\u4E0D\u4E0A' lib/client.js`
- Expected: ≥ 1（=「腾讯搜索源暂时连不上」的转义形态；注意仓库纪律：grep -c 计 0 即 exit 1，不得进入 && 链）。
- [ ] Step 4: 旧文案清零核证（grep -c 计 0 = exit 1，须独立运行或 `|| echo 0` 收尾，禁入 && 链；lib 侧必须用转义形态——中文字面量在 lib 从不出现，字面量判据恒真、无检测力）
- Run: `grep -c "港股/美股搜索源暂时连不上" client/i18n.mjs || echo 0` 与 `grep -cF '\u6E2F\u80A1/\u7F8E\u80A1\u641C\u7D22\u6E90\u6682\u65F6\u8FDE\u4E0D\u4E0A' lib/client.js || echo 0` 与 `grep -c "HK/US search source unreachable" client/i18n.mjs || echo 0` 与 `grep -c "HK/US search source unreachable" lib/client.js || echo 0`
- Expected: 四处输出均为 `0`（zh 源码侧为字面量判据；lib 侧为转义形态判据；en 旧文案为 ASCII，源码与 lib 两侧均为字面量形态，双侧可检）。
- [ ] Step 5: 全量测试
- Run: `npm test`
- Expected: 401 项全部通过（399 + Task 1 新增 2）。

### Task 4: docs/adr/0006-search-source-architecture.md + 写架构决策记录

- 目标：把 Q1–Q6 决策、实测证据与已接受风险落成 ADR。
- 涉及文件：`docs/adr/0006-search-source-architecture.md`（新建；现有最高编号 0005）。
- 接口契约：Consumes 输入工件（grill 共识 + 实测记录）；Produces ADR 路径（Task 6 §12.42 与 Task 7 提交引用）。
- 验证范围：文件存在 + 编号 + 内容要点。

- [ ] Step 1: 写入以下内容（逐字使用）：

```md
# 搜索源架构：池与在线搜索按市场分工

各市场搜索源不追求同一模式，按「列表与行情是否同源、离线兜底价值」取舍（2026-11-14 与主人对齐；目标排序：可靠覆盖 > 一致性 > 维护成本 > 速度）：cn = 本地池优先 + smartbox 补充（GP-A 正股，拼音缩写与刷新间隙的新上市；池满 30 条不打上游）；hk = 本地池 + smartbox（既有形态）；us = 纯 smartbox（不建池：约 1.1 万标的的维护与死码面不划算，smartbox 单点为已接受风险，发生事故后按 `data/README.md` 预案补 `us_stocks.json`）；crypto = OKX 在线清单（行情源本身，池文件只是会过期的复制品）+ 代码内常用币表。

## Considered Options

- **全在线（删池）**：实测 smartbox 能搜 A 股正股（GP-A），技术上可行；但失去离线兜底、全量模糊匹配与确定性排序，且三个 Tab 单点依赖腾讯。
- **添加时行情新鲜度闸（拒死码）**：拒绝 —— 会误伤长期停牌后复牌的真实标的；池的报价校验已封住主要入口，冻结价（退市的 sz000024 仍返回 40.50）作为已知边界记录。

## Consequences

- 本地池死码由刷新管道的报价校验在刷新时点全量排除；「刷新后新死」要等下次刷新，危害形态是冻结价误导而非报错。
- smartbox 是 cn/hk/us 三个 Tab 的共同依赖；其不可用时 cn/hk 仍有池结果（标 smartbox-unavailable），us 无搜索。
- smartbox 自身并非无死码（实测 `sh~600001` 邯郸钢铁 2009 年退市仍在列）；添加路径的行情校验是最终防线。
```
- [ ] Step 2: 验证
- Run: `test -f docs/adr/0006-search-source-architecture.md && head -1 docs/adr/0006-search-source-architecture.md`
- Expected: 输出 ADR 标题首行。

### Task 5: GLOSSARY.md + 追加搜索源术语

- 目标：向既有术语表追加本轮固化的 8 个术语（已存在文件，标题与既有术语一律不动）。
- 涉及文件：`GLOSSARY.md`（在 `## Language` 小节末尾追加）。
- 接口契约：Consumes 无；Produces 术语定义（与 Task 4 同批落档）。
- 验证范围：8 个新术语全部在文件中，既有术语未动。

- [ ] Step 1: 先通读 `GLOSSARY.md` 全文，确认以下术语均不存在后，在 `## Language` 末尾逐字追加（已存在的跳过并在提交说明中注明）：

```md
**本地标的池（Pool）**:
随插件分发的 data/*.json 候选列表（代码 + 简称），由刷新管道生成，入池前经报价校验。
_Avoid_: 数据库、缓存、词表

**代码内本地表**:
写在源码里的固定小列表（INDEX_CATALOG 指数目录、COMMON_COINS 常用币）。与池文件的分工：小而稳定的不发行数据文件。
_Avoid_: 硬编码列表、常量表

**在线搜索源**:
行情商提供的搜索接口（smartbox、OKX instruments），列表与行情天然贴近。
_Avoid_: 上游搜索、远程搜索

**行情链（Quote Chain）**:
某市场取行情的提供方顺序（cn: 腾讯→东方财富；us: 东方财富→腾讯美股→Yahoo）。搜索源与行情链是两个概念，提供方可以不同（美股搜索走腾讯、行情主源是东方财富）。
_Avoid_: 行情源、数据源

**混合搜索（Hybrid Search）**:
池优先、池不满 30 条时才打在线搜索源补足；上游失败仍返回池结果并带错误标记。
_Avoid_: 双源搜索

**市场门禁（Market Gate）**:
搜索结果逐行校验 market 与请求 Tab 一致；smartbox 全市场混排，无门禁即串台（0.3.1 实录）。
_Avoid_: 结果过滤

**死码（冻结价）**:
已退市或长期停牌、但行情链仍返回最后价的代码（如 sz000024 = 40.50）。池靠刷新时的报价校验排除；刷新后新死的要等下次刷新。
_Avoid_: 废码、失效代码

**报价校验（Quote Validation）**:
入池或添加前，以「取到名称且价格 > 0」判定代码有效；格式对 ≠ 标的存在。
_Avoid_: 行情验证
```
- [ ] Step 2: 验证
- Run: `grep -c "^\*\*" GLOSSARY.md`
- Expected: 追加后术语条目数 = 追加前计数 + 8（先记录追加前计数）。

### Task 6: docs/verification.md + 追记 §12.42

- 目标：按仓库验证记录纪律（追记式、含未验证项）记录本轮。
- 涉及文件：`docs/verification.md`（文件末尾，§12.41 之后）。
- 接口契约：Consumes Task 2/3/4 的结果、Task 5 的 GLOSSARY 术语数（§12.42 断言「追加 8 术语」）与 ADR 路径；Produces §12.42（Task 7 提交）。
- 验证范围：文件尾部含 §12.42 与未验证小节。

- [ ] Step 1: 在文件末尾追加（逐字使用；测试计数以实际运行为准，预期 401）：

```md
## 12.42 cn 混合搜索（ADR-0006）与搜索源架构落档

- **决策**（与主人 grill 对齐，2026-11-14）：cn = 池 + smartbox 混合；hk 维持混合；us 不建池（smartbox 单点为已接受风险）；crypto 不建池；不加添加时新鲜度闸。目标排序：可靠覆盖 > 一致性 > 维护成本 > 速度。落档：`docs/adr/0006-search-source-architecture.md` + 根 `GLOSSARY.md`（追加 8 术语）。
- **实现**（src/markets/search.mjs）：parseSmartbox 增 (sh|sz|bj)×GP* 分支收录 A 股正股（实测 smartbox 返回 GP-A 且带拼音缩写；bj 暂无返回，放行备用）；cn 分支照 hk 口径——池满 30 条不打上游，smartbox 补充。
- **文案**（client/i18n.mjs）：err.smartbox-unavailable 的 zh/en 由「港股/美股…」改为覆盖 cn 的表述；npm run build 重建 lib/client.js。
- **测试**：parseSmartbox GP-A 用例（ZS/KJ 过滤、bj 放行）+ cn 混合用例（拼音 payh 查询走 smartbox；上游挂时池结果仍在并标错）。全量 npm test 401 项通过。
- **实测记录**：smartbox「1」返回 10 条含 ZS/KJ（过滤后 GP-A 收录）；smartbox 自身也含死码（sh~600001 邯郸钢铁，2009 年退市仍在列）——在线源并非无死码，添加路径的行情校验与池子的刷新校验仍是必要防线。
- **未验证（不冒充已验证）**：GUI 未复验拼音搜索；smartbox 对 bj 覆盖为零（返回 N），GP-A 的 bj 分支为前瞻放行。
```
- [ ] Step 2: 验证
- Run: `tail -20 docs/verification.md`
- Expected: 末尾为 §12.42，含「未验证（不冒充已验证）」小节。

### Task 7: 提交与推送

- 目标：四个提交上远端（含实施计划归档），pre-push 全量门禁通过。
- 涉及文件：无新改动（仅 git 操作）。
- 接口契约：Consumes Task 1–6 全部产物与本计划文件自身（归档）；Produces 远端 main = 本地 HEAD。
- 验证范围：远端引用一致。

- [ ] Step 1: 四个提交（顺序执行）：

```bash
git add src/markets/search.mjs tests/search-index.test.mjs client/i18n.mjs lib/client.js
git commit -m 'feat(search): cn 混合搜索——smartbox GP-A 补充池结果（ADR-0006)'
git add docs/adr/0006-search-source-architecture.md GLOSSARY.md
git commit -m 'docs(adr): ADR-0006 搜索源架构（cn/hk/us/crypto 分工）+ GLOSSARY 追加术语'
git add docs/verification.md
git commit -m 'docs(verification): §12.42 cn 混合搜索与搜索源架构落档'
git add docs/plans/2026-11-14-cn-hybrid-search-implementation-plan.md
git commit -m 'chore(plan): 归档 cn 混合搜索实施计划'
```
- Expected: 四次 commit 成功；pre-commit（.mjs 语法闸）不拦。
- [ ] Step 2: 推送
- Run: `git push origin main`
- Expected: pre-push 全量 npm test + 产物新鲜度通过；push_exit=0。
- [ ] Step 3: 确认
- Run: `git status --short; git ls-remote origin main; git rev-parse HEAD`
- Expected: status 干净；两处 HEAD 一致。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务顺序执行，不无声跳步、合并步或改变任务目标；每完成一个任务运行该任务的验证。
- 遇阻、重复失败或仓库现实与计划不符（如 GLOSSARY.md 术语已存在、测试基线数不是 399），立即停下说明，不要猜。
- 仓库在 main 直推是既有惯例，但开始实现前与主人确认一次。
- 文件编辑前必先 read 同一文件；本轮会话曾出现「读范围不含目标行导致锚点为空」的翻车，读锚点时确保覆盖目标行段。
- 判据命令写入计划前按最终命令形态复跑一次（含 shell 引号、grep -F/BRE 形态与退出码语义），不以「内容存在」的等价证明替代（核证 D→E 实录：node indexOf 证实内容存在，grep 原样复跑仍失败）。

## 最终验证

- `npm test`：401 项全部通过。
- `npm run build` 后 `grep -cF '\u817E\u8BAF\u641C\u7D22\u6E90\u6682\u65F6\u8FDE\u4E0D\u4E0A' lib/client.js` ≥ 1（定串 grep -F：中文在 lib 中是 \uXXXX 转义形态；BRE 单反斜杠形式会把 \u 当普通 u，不可用——核证 E 双态实测）。
- 推送后 `git ls-remote origin main` 与 `git rev-parse HEAD` 一致，工作区干净。
- 发版（0.3.3）不在本计划内：新池、i18n 文案与本功能都要随发版才到达用户，属后续独立决策。

## 审阅 Checkpoint

- 计划正文结束。请主人审阅；审阅通过前不进入实现。