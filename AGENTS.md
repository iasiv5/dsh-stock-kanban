# AGENTS.md — dsh-stock-kanban

DSH 插件（盯盘胶囊 + 面板 + 分时/K 线）。运行时零 npm 依赖；devDeps：esbuild、jsdom。

## 每轮生效

- clone 后一次性：`git config core.hooksPath .githooks`（pre-push 跑全套 `npm test`，红灯不得落进远端历史）。
- build/test 前：`test -d node_modules`，缺失先 `npm ci`——**`dsh plugin add/remove` 会清掉 workspace 的 node_modules**（2026-10-27、2026-11-10 两次实录）；同时确认无 chrome 进程（headless 曾把 npm test 22s→700s）。
- 改 `client/` 后必跑 `npm run build`（esbuild 打包 `lib/client.js`；`__APP_VERSION__` 由 package.json 注入，设置页页尾展示，构建脚本自带注入断言）。渲染层改动再跑 `scripts/cdp-shot.mjs`（纪律见其头注：chrome 一律后台起跑、假活 `--down` 重启、重活前进程清零）。
- 发版链：bump → build → `chore(release)` → tag → push → `../../01_docs/dsh-intall-know-how/tools/release-monitor.sh <owner/repo> <tag> <npm包> <版本>`（两阶段轮询，铁律见 know-how 018：窗口内不重推 tag）。

## 仓库事实（易踩）

- **npm 页 README 来自发布 tarball**：改 GitHub README 不改 npm 页，随下次发版生效；渲染面守卫见 `tests/readme-portability.test.mjs`（禁浮动排版，v0.2.1 错位实录）。
- i18n 为 zh/en 双字典，parity 与键位对齐有守卫测试——新文案两字典同步加。
- 市场注册文案同步义务：`dsh-m/registry.json` 条目描述与 `verified` 核对清单见 know-how 008（dsh-workspace 01_docs）；npm 侧描述按「发版时顺带对齐、不为文案单独发版」边界。
- 验证记录写 `docs/verification.md`（§12.x 追记式，含未验证项与降级——未验证不冒充已验证）。

## 文档索引

- `docs/ui-redesign.md` 设计契约与分轮变更、`docs/verification.md` 验证记录、`docs/adr/` 架构决策、`docs/interop/capsule-embed-protocol.md` 与 quota-watch 的 CEP 协议、`docs/tech-notes.md` 技术核查。
