# AGENTS.md — dsh-stock-kanban

DSH 插件（盯盘胶囊 + 面板 + 分时/K 线）。运行时零 npm 依赖；devDeps：esbuild、jsdom。

## 每轮生效

- clone 后一次性：`git config core.hooksPath .githooks`（pre-commit 对暂存 `.mjs` 做语法闸；pre-push 跑全套 `npm test` + 产物新鲜度 build+diff `lib/client.js`，红灯不得落进远端历史）。
- build/test 前：`test -d node_modules`，缺失先 `npm ci`——**`dsh plugin add/remove` 会清掉 workspace 的 node_modules**（2026-10-27、2026-11-10 两次实录）；同时确认无 headless chrome（chrome-cft）进程——pre-push 同口径只计测试进程，桌面浏览器 chrome 不拦（2026-11-13 retro；headless 曾把 npm test 22s→700s）。
- 改 `client/` 后必跑 `npm run build`（esbuild 打包 `lib/client.js`；`__APP_VERSION__` 由 package.json 注入，设置页页尾展示，构建脚本自带注入断言）。渲染层改动再跑 `scripts/cdp-shot.mjs`（纪律见其头注：chrome 一律后台起跑、假活 `--down` 重启、重活前进程清零）。
- 发版链：bump → build → `chore(release)` → tag → push → `../01_docs/dsh-intall-know-how/tools/release-monitor.sh <owner/repo> <tag> <npm包> <版本>`（两阶段轮询，铁律见 know-how 018：窗口内不重推 tag）。
- 发版约定：tag 用轻量 tag（`git tag vX.Y.Z`，与历史一致）；先提 fix 提交（不含版本号），再提 `chore(release): vX.Y.Z`（package.json + 重建 `lib/client.js`）；验证记录新编号取 `docs/verification.md` 末尾 §12.N+1。发布推送前跑 `scripts/ci-parity.sh`（无宿主布局克隆全量 npm test，防环境依赖守卫漏网——2026-11-14 v0.3.3 CI 红灯实录，RUN 43477989591）。
- 联网 npm 命令（`npm view` / `npm ci` / `npm publish`）前加 `npm_config_cache=/home/ubuntu/workspace/.dsh-research/npm-cache-dsh-stock-kanban`：沙箱 `~/.npm` 只读，会报 EROFS（workspace AGENTS 的 npm 一节有完整规则）。

## 仓库事实（易踩）

- **npm 页 README 来自发布 tarball**：改 GitHub README 不改 npm 页，随下次发版生效；渲染面守卫见 `tests/readme-portability.test.mjs`（禁浮动排版，v0.2.1 错位实录）。
- i18n 为 zh/en 双字典，parity 与键位对齐有守卫测试——新文案两字典同步加。
- 市场注册条目（dsh-m/registry.json）：兼容句与 `verified` 的核对是 **DSH 升级动作**（know-how 008），不挂在插件发版上；插件发版仅在兼容句已腐烂时顺带修正。`verified` 只记实测 DSH 运行时版本，**严禁混入插件自身版本**（铁律 022；本地守卫 `tests/registry-verified.test.mjs`，dsh-m 侧 validate-registry 已门禁化为硬错误；2026-11-13 0.3.0 发版实录曾误填）。
- 验证记录写 `docs/verification.md`（§12.x 追记式，含未验证项与降级——未验证不冒充已验证）。
- 产物核证探针用 minify 免疫标记：字符串字面量（版本号等）与 `lib/client.js` 逐字节 diff/cmp；局部标识符会被 minify 混淆（2026-11-12 实录：`pullSequence` 计 0 被误读为代码缺失）。中文字面量在 lib 内是 `\uXXXX` 转义形态（esbuild minify 默认 charset=ascii），产物判据须用 `grep -cF` 转义定串或 ASCII 标记——BRE 单反斜杠 `\u` 会被吞为 `u`，不可用（2026-11-14 实录：中文新文案字面量判据恒 0，双态检出力以 -F 实证）。`grep -c` 计 0 即 exit 1，禁入 `&&` 链。
- 探针必须 import 生产解析函数（如 `src/markets/search.mjs` 的 `parseSmartbox`），不得复制正则；现成入口 `scripts/probe-markets.mjs`。（2026-11-13 实录：手写正则的反转义错误被误读为上游格式。）
- 标的池 `data/*.json` 由 `scripts/refresh-pools.mjs` 生成（`data/manifest.json` 登记来源与哈希，`tests/data-provenance.test.mjs` 校验）：**不得手改**；来源架构与刷新流程见 `data/README.md`。当前为多行规范化格式（2 空格缩进、按代码升序）。

## 文档索引

- `docs/ui-redesign.md` 设计契约与分轮变更、`docs/verification.md` 验证记录、`docs/adr/` 架构决策、`docs/interop/capsule-embed-protocol.md` 与 quota-watch 的 CEP 协议、`docs/tech-notes.md` 技术核查。
- `GLOSSARY.md` 领域术语表（决策定案即时追加）；`docs/plans/` 实施计划归档（writing-plans 产出，随实现入库）。
- 搜索（添加标的）：入口 `src/markets/search.mjs`（文件头为定案口径），UI `client/add.mjs`，验证 `docs/verification.md` §12.39；数据来源 `data/README.md`。
