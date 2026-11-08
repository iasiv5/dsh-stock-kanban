# 客户端插槽契约测试面 实施计划

## 目标

- 为 dsh-stock-kanban 客户端建立第一个自动化「插槽契约」测试面：stub-react 浅渲染烟测（三态 UI 全树渲染零抛错）+ 转发 props 形状断言 + effect 生命周期断言，零新依赖、零 DOM harness。
- 在契约测试保护下修掉 `client/main.mjs:35` 杂散 `langObserver.disconnect()`（复活「跟随 DSH 界面语言」功能）。
- 收拢守卫与肇因工具：移除 `build-client.mjs` 的 FORBIDDEN 符号黑名单，删除 `scripts/patch-main.mjs`、`scripts/patch-ux.mjs`。
- 文档落笔：`docs/verification.md` 12.5 节、`docs/tech-notes.md` 第 10 节（`GLOSSARY.md` 已在 grill 阶段建档，不在本计划内）。
- 范围外（共识锁定的后续独立任务，本计划不做）：client/store.mjs 纯决策抽取、market→provider registry、identity.mjs 共享纯化、routes.mjs 卫生、aggregateByCurrency 处置。

## 架构快照

- 契约测试经**真实接缝**驱动：伪造 `ctx.slots.inject/register` 调 `client/main.mjs` 导出的 `apply(ctx)`，从注册回调取渲染函数执行，得到 App 元素树——测试穿过插件与宿主的 slots 协议，不经任何测试专用后门。
- react 以 node:module resolve 钩子重定向到假实现（`createElement` 返回元素树并录制、hooks 捕获不执行 effect）：渲染路径上的自由标识符/漏解构当场抛 ReferenceError——整类覆盖 MARKET_LABELS 与 quoteMeta 两次历史事故；effect 不执行 → 无定时器、无 DOM 提交、无网络依赖（唯一例外：生命周期用例手动执行 App 的 effect，全部依赖均为录制桩）。
- UI 三态（列表 / 详情 / 添加）经 `window.localStorage` 种子驱动：`createStore()` 的 `loadUi()` 本就从 localStorage 读 UI 偏好，种子即走生产真实路径，且各态用 `?state=<tag>` 查询串取得独立模块实例。业务数据保持初始空态——与生产首绘形状一致，空态崩溃同样是插槽崩溃。
- 形状断言：遍历录制的组件元素，任何「值为 `undefined` 且名字存在于快照键集」的 prop 即违规——拦「快照改名字段、转发点静默失联」类。
- 构建产物 `lib/client.js` 在源码修复后重建并做幂等验证；FORBIDDEN 黑名单移除后，`npm test` 的契约测试成为泄漏类唯一守卫。

## 全局约束

- Node >= 20（package.json `engines`；本机实跑环境 v24.20.0，`node:module.register` 自 20.6 起稳定）。
- 测试框架沿用仓库惯例：`node:test` + `node:assert/strict`，中文用例名；`npm test` 的 glob `"tests/*.test.mjs"` 自动收编新测试文件，**package.json 不改动**。
- **零新依赖**：不执行任何 `npm install`；所有桩与钩子手写。
- 无额外全局约束（无平台/文案/命名新规则）。

## 输入工件

- `/grill-with-docs` 共识清单（2026-11-08 会话内三轮问答，用户逐轮确认「全按推荐」）。
- `GLOSSARY.md`（已存在）：「插槽契约」术语定义即本计划的验收语义。
- 文档锚点（已核实）：`docs/verification.md` 现有 12.1–12.4，新增 12.5；`docs/tech-notes.md` 现有 1–9 节，新增第 10 节。

## 文件结构与职责

- Create: `tests/helpers/react-stub.mjs` — 假 react：`createElement/useState/useRef/useCallback/useEffect`；录制组件元素与 effect。被钩子当作 `"react"` 提供，也被测试直接 import 共享同一实例。
- Create: `tests/helpers/react-resolve-hook.mjs` — node:module resolve 钩子：specifier `"react"` → 重定向到 react-stub.mjs 的 file URL（`shortCircuit: true`），其余走 `next`。
- Create: `tests/helpers/client-env.mjs` — globalThis 最小桩：`document`（createElement/head.appendChild/addEventListener/removeEventListener/documentElement/hidden）、`window`（innerWidth 1024 / innerHeight 768 / addEventListener / removeEventListener / Map 版 localStorage）、`MutationObserver`（observe/disconnect 录制）。返回录制器句柄。
- Create: `tests/helpers/contract-harness.mjs` — 装配层：注册 resolve 钩子 → 安装 env → `bootMain(seedUi, tag)`（种子 localStorage → 动态 import `../client/main.mjs?state=<tag>` → fake-slots 调 `apply` → 返回渲染函数）→ `walkTree` 树遍历器 → 快照键集探测。
- Test: `tests/client-contract.test.mjs` — 5 个用例：list 态渲染 / detail 态渲染 / add 态渲染 / 转发形状断言 / langObserver 生命周期。
- Modify: `client/main.mjs`（锚点：`langObserver.disconnect();` 杂散行，约 L35，cleanup 内已有正确 disconnect）— 仅删这一行。
- Modify: `scripts/build-client.mjs`（锚点：注释「守卫：已移除/重命名的符号不得残留在产物」起、`const FORBIDDEN` 至 for 循环闭合）— 整段移除。
- Delete: `scripts/patch-main.mjs`、`scripts/patch-ux.mjs`。
- Modify: `docs/verification.md`（在 `## 未验证与降级汇总（13 章交付口径）` 之前插入 `## 12.5 客户端契约测试（2026-11-08）`）。
- Modify: `docs/tech-notes.md`（文件末尾追加 `## 10. 客户端契约测试（2026-11-08）：为何用 stub-react 浅渲染而非 DOM harness`）。
- Modify（构建产物，非手编）: `lib/client.js` — Task 7 由 `npm run build` 重建。

## 任务清单

### Task 1: tests/helpers 四件 + 契约测试骨架（list 态冒烟绿）

- 目标：搭起全部测试基建并跑通第一个绿用例（list 态全树渲染零抛错）。
- 涉及文件：Create `tests/helpers/react-stub.mjs`、`tests/helpers/react-resolve-hook.mjs`、`tests/helpers/client-env.mjs`、`tests/helpers/contract-harness.mjs`、`tests/client-contract.test.mjs`。
- 接口契约：
  - Consumes: `client/main.mjs` 导出的 `apply, inject`（已存在）；`client/store.mjs` 导出的 `createStore, useStore`（已存在）。
  - Produces（后续任务的精确依赖，命名逐字一致）:
    - `react-stub.mjs` 导出：`createElement(type, props, ...children)`（props 缺省 `{}`，children 挂到 `props.children`；type 为函数时向 `elementRecords` push `{type, props}`）、`useState(init)`（返回 `[init值, noop]`，函数 init 先调用）、`useRef(init)`（返回 `{current: init}`）、`useCallback(fn)`（原样返回 fn）、`useEffect(fn, deps)`（向 `effectRecords` push `{fn, deps}`）、数组 `elementRecords`、数组 `effectRecords`。
    - `react-resolve-hook.mjs` 导出：`async resolve(specifier, context, next)`，`specifier === "react"` 时返回 `{ url: <react-stub.mjs 的 pathToFileURL>, shortCircuit: true }`。
    - `client-env.mjs` 导出：`installClientEnv()` → 返回 `{ observers, docListeners, winListeners, storage }`（observers 为 MutationObserver 实例数组，storage 为 Map 版 localStorage，`getItem/setItem/removeItem`）。document 与 window 桩均含 `addEventListener(type, fn)`（推入对应录制数组）与 `removeEventListener(type, fn)`（从数组移除匹配项）——cleanup 路径必调两者（main.mjs:37-38），缺 `removeEventListener` 会 TypeError。刻意不提供 reset/卸载：测试进程单次装配，不留死代码。
    - `contract-harness.mjs` 导出：`bootMain(seedUi, tag)` → 种子 `storage`（`stock-kanban:ui:v1` = JSON(seedUi)）→ `await import(new URL("../client/main.mjs?state=" + tag, import.meta.url).href)` → 以 fake ctx（`slots.inject` 存 factory、`slots.register: (opts, render) => render`）调 `apply` → 返回 `factories["shell.overlay"]()`（渲染函数）；`walkTree(node, visit, depth)`（null/string/number/boolean 直返；数组逐项；先 visit 元素、函数组件调用 `node.type(node.props)` 后递归其返回值、宿主元素递归 `props.children`；depth > 50 抛错）；`SNAPSHOT_KEYS`（清空 storage 后 `createStore()` + `getState()` 取 `Object.keys`——store 暴露 `getState`，装配期求值一次）；常量导出 `env`（installClientEnv 的返回句柄，Task 3 消费）。
  - 名称必须精确，后续任务按上表逐字引用，不得同义改写。
- 验证范围：`node --test tests/client-contract.test.mjs` 全绿。

- [ ] Step 1: 写当前状态检查——确认仓库还没有该测试面、现有全量测试绿
  - Run: `cd /home/ubuntu/workspace/dsh-stock-kanban && test -d node_modules && ls tests/helpers 2>&1; npm test 2>&1 | tail -4`
  - Expected: `ls` 报 `No such file or directory`；`npm test` 83 用例 0 失败（`pass 83`）。
- [ ] Step 2: 写四个 helper 与测试文件（list 态用例），实现内容如下
  - `react-stub.mjs`：按上方 Produces 契约实现；`createElement` 中 `props.children` 仅在未显式提供时挂 children。
  - `react-resolve-hook.mjs`：
    ```js
    export async function resolve(specifier, context, next) {
      if (specifier === "react") {
        return { url: new URL("./react-stub.mjs", import.meta.url).href, shortCircuit: true };
      }
      return next(specifier, context);
    }
    ```
    （URL 的 `.href` 已是 file:// 字符串，直接用；经 `pathToFileURL` 二次编码会产生畸形 URL 致 ENOENT——评审 R1 实证。）
  - `client-env.mjs`：按 Produces 契约实现三个 global 桩；`document.createElement` 返回普通对象（styles.mjs 会对其设 textContent，属性赋值即可）；MutationObserver 构造器记 `cb`，`observe(target, options)` 存 `this.observed`，`disconnect()` 置 `this.disconnected = true`。
  - `contract-harness.mjs`：模块顶层 `register(new URL("./react-resolve-hook.mjs", import.meta.url).href, import.meta.url)`（自 `node:module` import）→ `installClientEnv()` → 探测 `SNAPSHOT_KEYS` → 导出 `bootMain/walkTree`。注意：`register` 之后才能动态 import client 模块（静态 import 会被钩子前的解析缓存）。
  - `client-contract.test.mjs` 用例 1：
    ```js
    import test from "node:test";
    import assert from "node:assert/strict";
    import { bootMain, walkTree } from "./helpers/contract-harness.mjs";

    test("插槽契约 · list 态：App 全树渲染零抛错", async () => {
      const render = await bootMain({}, "list");
      assert.doesNotThrow(() => walkTree(render(), () => {}));
    });
    ```
  - Change: 以上 5 个新文件。
- [ ] Step 3: 运行并确认通过
  - Run: `node --test tests/client-contract.test.mjs`
  - Expected: `pass 1` `fail 0`。若 `injectStyles`/`loadUi` 抛错，优先核对 client-env 桩字段名，不修改生产源码。
- [ ] Step 4: 全量回归确认无破坏
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `pass 84`（83 既有 + 1 新增）、`fail 0`。

### Task 2: detail/add 态冒烟 + 转发形状断言

- 目标：补齐三态渲染覆盖与结构性形状断言（契约第②层）。
- 涉及文件：Test `tests/client-contract.test.mjs`（追加 3 用例）。
- 接口契约：
  - Consumes: Task 1 的 `bootMain(seedUi, tag)`、`walkTree`、`SNAPSHOT_KEYS`（逐字引用）；`react-stub.mjs` 的 `elementRecords`（经 `await import("./helpers/react-stub.mjs")` 取同一实例）。
  - Produces: `elementRecords` 中三态渲染累计的组件元素记录（Task 3 无需，但 Task 5 自证会复用此文件的红绿信号）。
- 验证范围：`node --test tests/client-contract.test.mjs` → `pass 4` `fail 0`。

- [ ] Step 1: 写当前状态检查
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | tail -3`
  - Expected: `pass 1`（Task 1 基线）。
- [ ] Step 2: 追加 3 个用例
  - detail 态：`bootMain({ panelOpen: true, view: "detail", detailId: "cn:600519" }, "detail")` → 渲染 + `walkTree` 零抛错（业务为空态，Detail 走「无此标的」回退渲染——空态形状即生产首绘契约）。
  - add 态：`bootMain({ panelOpen: true, view: "list", showAdd: true }, "add")` → 渲染 + `walkTree` 零抛错。
  - 形状断言：
    ```js
    test("插槽契约 · 形状：无组件收到 undefined 且快照同名的 prop", async () => {
      const { elementRecords } = await import("./helpers/react-stub.mjs");
      const { SNAPSHOT_KEYS } = await import("./helpers/contract-harness.mjs");
      const violations = [];
      for (const el of elementRecords) {
        for (const [k, v] of Object.entries(el.props)) {
          if (k !== "children" && v === undefined && SNAPSHOT_KEYS.includes(k)) {
            violations.push(`${el.type.name}.${k}`);
          }
        }
      }
      assert.deepEqual(violations, []);
    });
    ```
    （`symbol`/`quote`/`store`/`snapshot` 不在快照键集，空数据下的 undefined 不会误报。）
- [ ] Step 3: 运行并确认通过
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | tail -3`
  - Expected: `pass 4` `fail 0`。
- [ ] Step 4: 全量回归
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `pass 87`、`fail 0`。

### Task 3: langObserver 生命周期用例（红）

- 目标：写出能抓住 main.mjs:35 杂散 disconnect 的生命周期断言——先红。
- 涉及文件：Test `tests/client-contract.test.mjs`（追加 1 用例）。
- 接口契约：
  - Consumes: Task 1 的 `bootMain`、`contract-harness.mjs` 导出的 `env`（Produces 契约已定义）；`react-stub.mjs` 的 `effectRecords`。
  - Produces: 1 个失败用例（Task 4 修复对象）。
- 验证范围：`node --test tests/client-contract.test.mjs` → `pass 4` `fail 1`，失败信息含 `disconnected`。

- [ ] Step 1: 写当前状态检查
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | tail -3`
  - Expected: `pass 4` `fail 0`。
- [ ] Step 2: 追加生命周期用例
  - 用例逻辑：`bootMain({}, "lifecycle")` → 记录 `effectRecords.length` 基线 → `walkTree(render(), () => {})`（**必须经 walkTree**：createElement 只录制不执行组件，纯 `render()` 不会产生任何 effect 记录）→ 取 `const app = effectRecords[baseline + 1]`。索引依据（调用点序）：walkTree 执行 App 时，`main.mjs:18` 的 `useStore(store)` 先于 `main.mjs:22` 的 useEffect 执行，而 useStore 内部的 subscribe effect（store.mjs:239）先记录——故 baseline+0 = subscribe effect、**baseline+1 = App 生命周期 effect** → `app.fn()` 执行 setup → 断言：`env.observers.length >= 1`；末位 observer 的 `observed.target === globalThis.document.documentElement` 且 `observed.options.attributeFilter` deepEqual `["lang"]`；**`observer.disconnected === false`，断言附含 "disconnected" 的 message（`assert.equal(observer.disconnected, false, "setup 路径不得 disconnect：langObserver.disconnected 应为 false")`，使 Task 3 Step 3 的 grep 判据严格命中；当前必红：L35 在 setup 路径执行了 disconnect）** → 同一次 `app.fn()` 的返回值即本次 setup 的 cleanup，先于 setup 断言捕获（**勿二次调用 fn 取 cleanup**：第二次 setup 会建立第二个 observer，断言盯住的第一个将永不 disconnect——执行期实录教训）→ `cleanup()` → 断言 `observer.disconnected === true`。
  - 说明：执行 App effect 触发 `store.refreshState()` → 相对 URL fetch 返回 **rejected Promise**（TypeError: Failed to parse URL；同步不抛），由既有 `.catch` 接住 → `setToast` 非空 → store 的 toast 自动消失定时器（setTimeout ≈4000ms）恰好调度 1 次：契约测试进程收尾会多等约 4 秒，属预期而非卡死，不要据此误诊；restartPolling 在 then 分支不会到达，无轮询定时器。
- [ ] Step 3: 运行并确认失败
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | grep -E "disconnected|fail [0-9]"`
  - Expected: 恰好 `fail 1`，失败断言为 `disconnected === false` 处（实际为 true）。

### Task 4: 修 client/main.mjs 杂散 disconnect（红转绿）

- 目标：删除 setup 路径上的杂散 `langObserver.disconnect();`，功能「跟随 DSH 界面语言」复活。
- 涉及文件：Modify `client/main.mjs`（锚点：cleanup `return () => {` 之前一行、`window.addEventListener("languagechange", onLangChange);` 之后，即带注释「组件与页面同生命周期…」下方那行独立语句）。
- 接口契约：
  - Consumes: Task 3 的失败用例（红信号）。
  - Produces: 全绿基线（Task 5/7/8/10 的前提）。
- 验证范围：契约文件 5/5 绿；`npm test` 全量绿。

- [ ] Step 1: 确认红仍在
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | tail -3`
  - Expected: `fail 1`。
- [ ] Step 2: 仅删除 `client/main.mjs` 中 cleanup 之前的独立行 `langObserver.disconnect();`；其上方注释「// 组件与页面同生命周期…」**保留**——git 取证（20736d7 引入、9115b33 时位于 `return () => {` 上方原位）证明它描述的正是 cleanup 语义、属 v0.1.0 原始内容而非补丁残留；patch-main.mjs #3 只插入了裸 disconnect 行。删行后注释自然回到 `return () => {` 上方原位。cleanup 块内的 `langObserver.disconnect();` 保留不动。
  - Change: 净删 1 行，其余零改动（恰为 B4 批准范围「只删 setup 路径行」）。
- [ ] Step 3: 运行并确认通过
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | tail -3`
  - Expected: `pass 5` `fail 0`。
- [ ] Step 4: 全量回归
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `pass 88`、`fail 0`。
- [ ] Step 5（可选 checkpoint commit，仅在用户同意直接于 main 提交时执行）: `git add client/main.mjs tests/ && git commit -m "test: 客户端插槽契约测试面 + 修 langObserver 杂散 disconnect"`

### Task 5: 守卫有效性自证（回灌自由标识符断红）

- 目标：证明契约测试真的拦得住历史事故类——临时回灌一个自由标识符，契约必红，再还原。
- 涉及文件：Modify 后还原 `client/capsule.mjs`（锚点 L15：`const pos = ui.pos ?? { x: Math.max(8, window.innerWidth - 180), ...`）。
- 接口契约：
  - Consumes: Task 4 的全绿基线。
  - Produces: 无（纯验证动作，不留任何改动）。
- 验证范围：红信号（ReferenceError: __contractProbe）与还原后绿信号先后出现；`git status` 显示 capsule.mjs 无残留改动。

- [ ] Step 1: 临时改动——把 capsule.mjs L15 的 `window.innerWidth` 改为 `__contractProbeFreeIdentifier.innerWidth`（自由标识符，等价于当年 MARKET_LABELS 残留引用）
  - Change: 单点临时改动。
- [ ] Step 2: 运行并确认契约红
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | grep -E "__contractProbeFreeIdentifier|fail [0-9]"`
  - Expected: 失败信息含 `__contractProbeFreeIdentifier is not defined`，红用例 ≥ 3（三个渲染态用例全崩）。
- [ ] Step 3: 还原
  - Run: `git checkout -- client/capsule.mjs && git status --porcelain client/`
  - Expected: 输出为空（无残留）。
- [ ] Step 4: 确认回到全绿
  - Run: `node --test tests/client-contract.test.mjs 2>&1 | tail -3`
  - Expected: `pass 5` `fail 0`。

### Task 6: 移除 build-client.mjs FORBIDDEN 守卫段

- 目标：符号黑名单退役，契约测试成为泄漏类唯一守卫。
- 涉及文件：Modify `scripts/build-client.mjs`（锚点：注释「// 守卫：已移除/重命名的符号不得残留在产物…」至 `const FORBIDDEN` for 循环的闭合 `}`，连同其后直接紧邻的空行规整）。
- 接口契约：
  - Consumes: Task 4 全绿（黑名单退役的安全性前提）。
  - Produces: 无 FORBIDDEN 符号的构建脚本（Task 7 重建依赖）。
- 验证范围：grep 零残留；构建以 exit 0 通过。

- [ ] Step 1: 写当前状态检查
  - Run: `grep -n "FORBIDDEN" scripts/build-client.mjs`
  - Expected: 命中 `const FORBIDDEN = ["MARKET_LABELS"];` 所在行及循环体（约 L23–30）。
- [ ] Step 2: 整段删除守卫注释 + `FORBIDDEN` 声明 + for 循环
  - Change: 删除该段；esbuild 调用与产物包装逻辑零改动。
- [ ] Step 3: 验证
  - Run: `grep -c "FORBIDDEN" scripts/build-client.mjs; echo "exit=$?"`
  - Expected: grep 无命中（`grep -c` 输出 `0`）。
- [ ] Step 4: 构建通过
  - Run: `node scripts/build-client.mjs && echo BUILD_OK`
  - Expected: `BUILD_OK`（此步顺带产出含 Task 4 修复的 bundle，Task 7 只做幂等与内容复核）。

### Task 7: 重建 lib/client.js 并验证幂等与内容

- 目标：让构建产物与修复后的源码同步，并验证构建可重复。
- 涉及文件：Modify（构建产出）`lib/client.js`。
- 接口契约：
  - Consumes: Task 4 修复后的 `client/main.mjs`；Task 6 之后的 `scripts/build-client.mjs`。
  - Produces: 与源码同步的 `lib/client.js`（最终验证与交付的一部分）。
- 验证范围：两次构建产物逐字节一致；disconnect 在 bundle 中恰出现 1 次。

- [ ] Step 1: 首次构建后记录指纹
  - Run: `node scripts/build-client.mjs && sha256sum lib/client.js`
  - Expected: 输出指纹 A。
- [ ] Step 2: 二次构建验证幂等
  - Run: `node scripts/build-client.mjs && sha256sum lib/client.js`
  - Expected: 指纹与 Step 1 完全一致。
- [ ] Step 3: 内容断言
  - Run: `grep -c "langObserver.disconnect()" lib/client.js`
  - Expected: `1`（仅 cleanup 处；修复前为 2）。
- [ ] Step 4（可选 checkpoint commit，仅在用户同意直接于 main 提交时执行）: `git add lib/client.js scripts/build-client.mjs && git commit -m "build: 移除 FORBIDDEN 黑名单并重建 bundle（含 langObserver 修复）"`
  - Expected: commit 成功（与执行纪律「Task 4 与 Task 7 两个自然边界」对齐）。

### Task 8: 删除一次性 patch 脚本

- 目标：移除事故肇因工具（锚点已消费、重跑必 MISS 的一次性 sed），git 历史留档。
- 涉及文件：Delete `scripts/patch-main.mjs`、`scripts/patch-ux.mjs`。
- 接口契约：
  - Consumes: 无（独立杂务；`package.json` scripts 仅 build/test/probe，已核实无引用）。
  - Produces: 无。
- 验证范围：文件消失；仓库无活引用；测试不受影响。

- [ ] Step 1: 删除前确认无活引用
  - Run: `grep -rn "patch-main\|patch-ux" package.json scripts/ README.md tests/ 2>/dev/null`
  - Expected: 仅命中两脚本自身文件名行（scripts/ 目录内彼此不引用则为空）；package.json/README/tests 零命中。
- [ ] Step 2: 删除
  - Run: `git rm scripts/patch-main.mjs scripts/patch-ux.mjs`
  - Expected: 两文件进入暂存的删除状态。
- [ ] Step 3: 回归确认
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `pass 88`、`fail 0`。

### Task 9: 文档落笔（verification 12.5 + tech-notes 10）

- 目标：测试面与守卫决策进入交付文档。
- 涉及文件：Modify `docs/verification.md`、`docs/tech-notes.md`。
- 接口契约：
  - Consumes: Task 1–5 的实际结果（用例数、红案例、自证信号）——文档内容必须与实测一致，不得预写未跑出的数字。
  - Produces: 无。
- 验证范围：锚点存在且编号衔接正确。

- [ ] Step 1: `docs/verification.md` 在 `## 未验证与降级汇总（13 章交付口径）` 之前插入 `## 12.5 客户端契约测试（2026-11-08）`
  - 内容要点：5 用例清单及各自拦的事故类（渲染自由标识符 / 漏解构静默失联 / effect 生命周期）；Task 3 红案例（langObserver）与 Task 4 修复；Task 5 回灌自证结果；用例总数（88）。
  - Change: 单节插入，其余不动。
- [ ] Step 2: `docs/tech-notes.md` 文件末尾追加 `## 10. 客户端契约测试（2026-11-08）：为何用 stub-react 浅渲染而非 DOM harness`
  - 内容要点：决策三理由（历史事故全在渲染路径 / 零新依赖零脆测面 / fake-slots 走真实 slots 接缝）；明确「handler 内抛错不卸载插槽，静态分析暂缓」的 YAGNI 边界；FORBIDDEN 黑名单退役、契约测试为唯一守卫。
  - Change: 单节追加。
- [ ] Step 3: 验证锚点与编号
  - Run: `grep -n "^## 12.5" docs/verification.md && grep -n "^## 10\." docs/tech-notes.md`
  - Expected: 两锚点各命中 1 行，前后编号（12.4→12.5、9→10）衔接。

### Task 10: 最终验证

- 目标：全量收口。
- 涉及文件：无新改动，只读验证。
- 接口契约：
  - Consumes: Task 1–9 全部完成。
  - Produces: 交付状态确认。
- 验证范围：见下方 Step 清单。

- [ ] Step 1: 全量测试
  - Run: `npm test 2>&1 | tail -4`
  - Expected: `pass 88`、`fail 0`。
- [ ] Step 2: 构建幂等复验
  - Run: `node scripts/build-client.mjs && git status --porcelain | sort`
  - Expected: 改动面恰为本计划清单：新增 5 文件（tests/helpers×4、tests/client-contract.test.mjs）、修改 5 文件（client/main.mjs、scripts/build-client.mjs、docs/verification.md、docs/tech-notes.md、lib/client.js）、删除 2 文件（patch 脚本）、untracked 另有 `?? GLOSSARY.md` 与 `?? docs/plans/`（本计划文档自身所在目录）；除上述外无计划外条目。
- [ ] Step 3: 守卫三重奏终检
  - Run: `grep -c "FORBIDDEN" scripts/build-client.mjs; ls scripts/; git status --porcelain client/capsule.mjs`
  - Expected: `0`；scripts/ 仅剩 `build-client.mjs cdp-eval.mjs probe-markets.mjs probe-result.json`；capsule.mjs 无残留改动。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 仓库当前在 **main** 分支：未经用户明确同意不提交任何 commit；若用户同意，checkpoint commit 只落在 Task 4 与 Task 7 两个自然边界。
- 每次跑测试/构建前确认 `node_modules` 存在（本仓已有）；全部命令在仓库根 `/home/ubuntu/workspace/dsh-stock-kanban` 下执行。
- 按任务顺序执行，不无声跳步、合并步或改变任务目标；每完成一个任务即运行该任务定义的验证。
- 遇阻塞、重复失败或计划与仓库现实不符（如 `?state=` 查询串缓存分离在该 Node 版本不生效、effect 记录顺序与预期不符），立即停下说明，不猜、不绕。
- 全部任务完成后运行 Task 10 最终验证并输出修改摘要。

## 最终验证

- `npm test` → `pass 88` `fail 0`（83 既有 + 5 新增：list / detail / add / 形状 / lifecycle；若执行中把复合断言拆成独立用例，以实测总数为准，并同步更新 Task 2/4/8/10 的预期数字）。
- `node scripts/build-client.mjs` 两次 → sha256 一致；`grep -c "langObserver.disconnect()" lib/client.js` → `1`。
- `grep -c "FORBIDDEN" scripts/build-client.mjs` → `0`；`scripts/` 无 patch 脚本。
- 交付语义：`GLOSSARY.md`「插槽契约」定义所指的约定，自此由 `tests/client-contract.test.mjs` 执有。
