# 合并胶囊额度段可靠性修复实施计划（dsh-stock-kanban）

## 目标

- 修复合并胶囊额度段「偶尔点不出二级卡片 / 额度信息更新不及时」的宿主侧成因：
  1. 拉取链单请求挂死即整链冻结且无过期标注（P0）
  2. 页面回前台不立即刷新（后台定时器节流放大滞后）（P0）
  3. guest 元素被替换后 `capable` 守卫阻断重握手（P1）
  4. 胶囊 flex gap / padding 命中被分流到股票段（P2）
  5. `.skc-qdot` / `.skc-qseg-divider` 自身缺 `[hidden]` 配套规则——现行由 `.skc-capsule [hidden]`
     兜底（R1-2 定谳：症状不可达），本项为契约固化（P2，防御性）
- 不在本计划内：quota-watch 访客侧的水印与心跳修复（姊妹计划
  `dsh-quota-watch/docs/plans/2026-11-11-guest-reembed-and-gesture-suppression-implementation-plan.md`）、
  npm 发版动作（版本准备做在本计划，publish 走既有 runbook）。

## 架构快照

- `client/quota-embed.mjs` 的 `pull()` 是单链自排程（一次只有一个 `setTimeout`，settle 后才排下一个），
  且 `await fetchImpl(...)` 无超时——一次挂死的 GET 永久冻结链路。修法：给每次拉取挂
  `AbortSignal`（默认 `win.AbortSignal.timeout(pullTimeoutMs)`，可注入以便测试），超时走既有
  `catch` 分支（保留上次渲染 + `quota.stale` title + 按 `pollMs` 续排）。
- sk 额度段没有任何 visibility 处理；qw 独立态回前台会立即 poll。修法：`createQuotaEmbed`
  内部监听 `doc` 的 `visibilitychange`，回到 visible 且 engaged 时清掉在排定时器并立即 `pull()`。
- `syncGuest` 只在 guest 元素变化时重新 `probe()`，但 `onCapabilities` 有
  `if (disposed || capable) return` 守卫——guest 替换（qw HMR/重挂）后 `capable` 仍为 true，
  新 guest 永远收不到 `embed-engage`。修法：guest 元素变化即重置握手状态（`capable = false` +
  `stopEngage(true)`），让 capabilities 回复走完整 `startEngage`。
- `routeTap` 仅凭 pointerdown target 的 `closest` 分流；胶囊根（flex gap 7px / padding 10px）
  上的命中落到 else 分支永远开股票卡。修法：`attachFloatDrag` 的 `onTap` 追加第二参
  `point`（pointerdown 坐标），target 未命中任何段时按 x 就近归属股票段 / 额度段。
- CSS 契约固化（R1-2 修订）：styles.mjs:71 的 `.skc-capsule [hidden]{display:none}`（特异性
  0,2,0）已在现行装配下兜底正确隐藏额度段内带 `hidden` 的节点（生产 `target` 恒为
  `capsule.el`，main.mjs:94）；但 `.skc-qdot` / `.skc-qseg-divider` 自身的
  `display:inline-block`（0,1,0）仍是隐式依赖——段一旦移出胶囊或宿主选择器调整，
  UA `[hidden]` 即被压掉。本任务补齐两条自身配套规则，消除该隐式依赖。

## 全局约束

- `engines.dsh >= 0.2.2-rc.1`、`peerDependencies.@deepseek-ai/cordis >= 4.1.0` 不动；零新增依赖。
- `lib/client.js` 一律经 `node scripts/build-client.mjs` 生成（内置版本注入断言），禁止手改。
- 不新增任何用户可见文案（超时降级复用既有 `t("quota.stale")`；i18n.mjs 不动）。
- 命令环境：bash + Node >= 20；构建/测试前先 `test -d node_modules`，缺失先 `npm ci`（注意：
  `dsh plugin add/remove` 会清掉 workspace 的 node_modules）再跑；跑 `npm test` 前确认无残留
  chrome 进程（headless 残留曾把 22s 拖到 700s）。
- 测试命令统一 `node --test tests/<file>.test.mjs`（单文件）与 `npm test`（全量）；构建统一
  `npm run build`。
- 仓库纪律（AGENTS.md）：clone 后一次性 `git config core.hooksPath .githooks`（pre-push 跑
  全套 `npm test`）；**改 `client/` 的任务（Task 1–5）checkpoint 提交前必跑 `npm run build`**
  （R2-1 拍板 b 案：逐任务构建验证，提前暴露构建破坏；重建的 `lib/client.js` 不随中间
  checkpoint 提交——测试直测 `client/*.mjs` 源码、package-shape 仅断言 exports 字符串，
  中间提交 stale lib 不炸任何验证，lib 新鲜度统一由 Task 6 最终 build+commit 收口）；
  验证记录追记 `docs/verification.md`（§12.x 追记式，未验证项如实标注）。

## 输入工件

- 诊断结论（本会话 2026-11-11 排查）：额度段点击/刷新问题四条机制链 + qw 侧姊妹计划。
- 既有协议文档：`docs/interop/capsule-embed-protocol.md`（本计划不改动它；协议语义修订由
  姊妹计划 Task 3 统一承担，含宿主侧重握手语义的表述）。

## 文件结构与职责

- Modify: `client/quota-embed.mjs`（Task 1/2/3 串行：pull 超时、visibility 立即拉取、guest 替换重握手）
- Modify: `client/capsule.mjs`（Task 4：`attachFloatDrag` onTap 第二参 + `routeTap` 就近归属）
- Modify: `client/styles.mjs`（Task 5：两条 `[hidden]` 配套规则）
- Modify: `package.json`（Task 6：版本 0.2.3）
- Test: `tests/client-quota-embed.test.mjs`（Task 1/2/3；`setup` 增加选项透传）
- Test: `tests/client-dom.test.mjs`（Task 4；S6 分区分流节，:1017 起）
- Test: `tests/client-restyle.test.mjs`（Task 5；样式契约断言，已 import `FLOAT_STYLE_TEXT`）

## 任务清单

### Task 1: quota-embed pull 超时与过期标注（P0）

- 目标：单次拉取挂死不再冻结整条链，超时按既有传输错误分支降级（保留上次渲染 + stale title + 续排）。
- 涉及文件
  - Modify: `client/quota-embed.mjs`（`createQuotaEmbed` options 与 `pull()`，:82-95、:175-197）
  - Modify: `tests/client-quota-embed.test.mjs`（`setup()` 增加选项透传；新用例）
- 接口契约
  - Consumes: 既有测试辅助 `addGuest` / `replyCaps` / `okResponse` / `overviewPayload` / `hasEngage`（同测试文件）；既有降级分支 `catch`（quota-embed.mjs:190-196）。
  - Produces: `createQuotaEmbed` 新 options `pullTimeoutMs`（默认 15000）与 `buildTimeoutSignal`（默认 `(ms) => typeof win.AbortSignal?.timeout === "function" ? win.AbortSignal.timeout(ms) : undefined`）；Task 2 的 `refreshNow` 复用本任务的 `pull()`，不依赖本任务新 option。
- 验证范围：`node --test tests/client-quota-embed.test.mjs`

- [ ] Step 1: 扩展测试基建并写失败测试
  - Change: `setup()` 签名改为 `setup({ fetchImpl, withCapsule = false, ...opts } = {})`，并在
    `createQuotaEmbed({...})` 固定选项之后、`...opts` 之前**默认注入 stub**：
    `buildTimeoutSignal: () => undefined,`（R1-1：本仓 jsdom 29.1.1 的 window **有**
    `AbortSignal.timeout`，且其定时器会拖住 Node 事件循环 15s——既有全部 engage 用例
    默认不挂真实定时器，行为确实不变；新用例经 `...opts` 注入真实现）。
    同批在 `tests/client-dom.test.mjs` 的 `setupCapsuleWithQuota` 内 `createQuotaEmbed`
    调用（:1035-1050 附近）注入同一 stub——该骨架不走 `setup()`，不打 stub 会在 S6 全部
    用例各泄漏一个 15s 定时器。
  - 新用例（追加在文件末尾，照既有 `addGuest` → `replyCaps` 握手序列）：

    ```js
    test("pull 超时：挂死请求按传输错误降级且链路继续", async () => {
      let fetchCount = 0;
      const s = setup({
        fetchImpl: (_url, opts = {}) => {
          fetchCount += 1;
          return new Promise((_resolve, reject) => {
            opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          });
        },
        pollMs: 40,
        pullTimeoutMs: 30,
        buildTimeoutSignal: (ms) => {
          const ctl = new AbortController();
          setTimeout(() => ctl.abort(), ms);
          return ctl.signal;
        },
      });
      try {
        addGuest(s.h);
        await sleep(30);
        replyCaps(s.h, ["hide-pill", "anchored-panel"]);
        await sleep(220); // ≥ pullTimeoutMs + 2×pollMs
        assert.ok(fetchCount >= 3, `超时后链路继续拉取（实际 ${fetchCount} 次）`);
        assert.equal(s.embed.el.title, t("quota.stale"), "挂死期间段标注过期");
      } finally {
        s.embed.dispose();
        s.h.cleanup();
      }
    });
    ```

- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: 新用例红（当前实现不传 signal，挂死 fetch 永不 settle，`fetchCount` 停在 1，title 为空）；其余用例绿。
- [ ] Step 2: 运行并确认失败
- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: `fetchCount >= 3` 断言失败。
- [ ] Step 3: 写最小实现
  - Change: options 增加 `pullTimeoutMs = 15000` 与 `buildTimeoutSignal`（默认实现见 Produces）；
    `pull()` 内改为：

    ```js
    const signal = buildTimeoutSignal(pullTimeoutMs);
    const res = await fetchImpl(OVERVIEW_URL, {
      headers: { accept: "application/json" },
      ...(signal ? { signal } : {}),
    });
    ```

    超时 reject 落入既有 `catch`（title = quota.stale + `schedulePoll(pollMs)`），不改 catch 本体。
- [ ] Step 4: 运行并确认通过
- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: 全文件绿（含既有降级矩阵/404/传输错误用例——它们经 setup 的默认 stub
  `buildTimeoutSignal: () => undefined` 不挂真实定时器，行为不变；生产路径默认实现
  `win.AbortSignal.timeout(pollTimeoutMs)` 不受影响）。
- [ ] Step 5: checkpoint commit
- Run: `npm run build && git add client/quota-embed.mjs tests/client-quota-embed.test.mjs && git commit -m "fix(client): 额度段拉取链挂超时——单请求挂死不再冻结整链，超时按传输错误降级"`
- Expected: 构建通过 + commit 成功（重建的 lib/client.js 不随本提交，收口统一在 Task 6）。

### Task 2: quota-embed visibilitychange 立即拉取（P0）

- 目标：页面回到前台且合并态时立即清掉在排定时器并拉取一次，消除回前台后最长 30s 的陈旧窗口。
- 涉及文件
  - Modify: `client/quota-embed.mjs`（`createQuotaEmbed` 生命周期区，:199-204 附近新增；`dispose()` :347-355 补退订）
  - Modify: `tests/client-quota-embed.test.mjs`（新用例）
- 接口契约
  - Consumes: Task 1 改造后的同文件 `pull()`（本任务只新增外层触发，不改 pull 本体）。
  - Produces: 内部函数 `refreshNow`（清 `pollTimer` 后调 `pull()`）；无对外接口变化。
- 验证范围：`node --test tests/client-quota-embed.test.mjs`

- [ ] Step 1: 写失败测试

  ```js
  test("visibilitychange：回前台立即拉取、后台不拉", async () => {
    let fetchCount = 0;
    const s = setup({
      fetchImpl: async () => {
        fetchCount += 1;
        return okResponse(overviewPayload());
      },
      pollMs: 60000,
    });
    try {
      addGuest(s.h);
      await sleep(30);
      replyCaps(s.h, ["hide-pill", "anchored-panel"]);
      await sleep(40);
      const base = fetchCount; // engage 首拉
      Object.defineProperty(s.h.document, "visibilityState", { value: "hidden", configurable: true });
      s.h.document.dispatchEvent(new s.h.window.Event("visibilitychange"));
      await sleep(40);
      assert.equal(fetchCount, base, "后台不触发拉取");
      Object.defineProperty(s.h.document, "visibilityState", { value: "visible", configurable: true });
      s.h.document.dispatchEvent(new s.h.window.Event("visibilitychange"));
      await sleep(40);
      assert.equal(fetchCount, base + 1, "回前台立即拉取一次");
    } finally {
      s.embed.dispose();
      s.h.cleanup();
    }
  });
  ```

- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: 新用例红（当前实现无 visibility 监听，`fetchCount` 不变）。
- [ ] Step 2: 运行并确认失败
- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: `fetchCount = base + 1` 断言失败。
- [ ] Step 3: 写最小实现
  - Change: `createQuotaEmbed` 内新增：

    ```js
    const refreshNow = () => {
      if (pollTimer !== null) {
        win.clearTimeout(pollTimer);
        pollTimer = null;
      }
      return pull();
    };
    const onVisibilityChange = () => {
      if (engaged && doc.visibilityState === "visible") refreshNow();
    };
    doc.addEventListener("visibilitychange", onVisibilityChange);
    ```

    `dispose()` 增加 `doc.removeEventListener("visibilitychange", onVisibilityChange);`。
    `startEngage` 的 `pull()` 改为 `refreshNow()`（防御重复触发时定时器叠链）。
- [ ] Step 4: 运行并确认通过
- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: 全文件绿。
- [ ] Step 5: checkpoint commit
- Run: `npm run build && git add client/quota-embed.mjs tests/client-quota-embed.test.mjs && git commit -m "fix(client): 额度段回前台立即拉取——对齐 qw 独立态可见性刷新语义"`
- Expected: 构建通过 + commit 成功（lib 不随本提交）。

### Task 3: guest 替换后重握手（P1）

- 目标：guest 元素被替换（qw 插件 HMR / 重挂）时，重置握手状态并重新走 probe → capabilities → engage，
  新 guest 立即收到 `embed-engage`，不再依赖 ≤5s 的心跳兜底。
- 涉及文件
  - Modify: `client/quota-embed.mjs`（`syncGuest`，:288-299）
  - Modify: `tests/client-quota-embed.test.mjs`（新用例）
- 接口契约
  - Consumes: 既有 `stopEngage` / `startEngage` / `probe` / `hasEngage` 辅助；Task 2 已完成同文件串行改动。
  - Produces: 无对外接口变化。
- 验证范围：`node --test tests/client-quota-embed.test.mjs`

- [ ] Step 1: 写失败测试

  ```js
  test("guest 替换：重新握手并重新 engage", async () => {
    const s = setup();
    try {
      const g1 = addGuest(s.h);
      await sleep(30);
      replyCaps(s.h, ["hide-pill", "anchored-panel"]);
      await sleep(30);
      const engageCount = s.dispatched.filter((t) => t === `${NS}:embed-engage`).length;
      assert.ok(engageCount >= 1, "首个 guest 正常 engage");
      g1.remove();
      addGuest(s.h);
      await sleep(30);
      replyCaps(s.h, ["hide-pill", "anchored-panel"]);
      await sleep(30);
      const engageCount2 = s.dispatched.filter((t) => t === `${NS}:embed-engage`).length;
      assert.ok(engageCount2 > engageCount, "guest 替换后重新派发 embed-engage");
      assert.notEqual(s.stack.querySelector('[data-seg="quota"]'), null, "额度段重新在位");
    } finally {
      s.embed.dispose();
      s.h.cleanup();
    }
  });
  ```

- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: 新用例红（当前实现 `onCapabilities` 的 `capable` 守卫早退，engage 计数不增）。
- [ ] Step 2: 运行并确认失败
- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: `engageCount2 > engageCount` 断言失败。
- [ ] Step 3: 写最小实现
  - Change: `syncGuest` 的 guest 变化分支改为：

    ```js
    if (found && found !== guestEl) {
      guestEl = found;
      capable = false; // 重置握手位：替换后的 guest 必须重新收一次 embed-engage
      if (engaged) stopEngage(true); // 旧 guest 已不在，disengage 广播无害
      probe();
    } else if (!found && guestEl !== null) {
      guestEl = null;
      capable = false;
      stopEngage(true);
      notifyCapability(false);
    }
    ```

    `onCapabilities` / `startEngage` 本体不动（`capable` 已复位，守卫不再早退；
    `engaged` 已被 stopEngage 置 false，startEngage 完整重跑含 `adoptGuestPosition`）。
- [ ] Step 4: 运行并确认通过
- Run: `node --test tests/client-quota-embed.test.mjs`
- Expected: 全文件绿（含降级矩阵行「guest 消失 → stopEngage + 能力位复位」用例）。
- [ ] Step 5: checkpoint commit
- Run: `npm run build && git add client/quota-embed.mjs tests/client-quota-embed.test.mjs && git commit -m "fix(client): guest 替换重握手——capable 守卫不再吞掉新 guest 的 embed-engage"`
- Expected: 构建通过 + commit 成功（lib 不随本提交）。

### Task 4: routeTap 就近归属（P2）

- 目标：pointerdown 落在胶囊根（flex gap / padding，target 未命中任何段）时，按 x 坐标就近归属
  股票段或额度段；target 命中段内元素的既有路径不变。
- 涉及文件
  - Modify: `client/capsule.mjs`（`attachFloatDrag` 的 `onPointerUp` onTap 调用，:143；`createCapsule` 的 `routeTap`，:326-332）
  - Modify: `tests/client-dom.test.mjs`（S6 分区分流节追加用例，:1017 起）
- 接口契约
  - Consumes: 既有 S6 测试骨架 `setupCapsuleWithQuota` / `disposeCapsuleWithQuota`（client-dom.test.mjs:1023-1082）；`onQuotaTap` 透传链 `routeTap → onQuotaTap → quotaEmbed.onQuotaTap()`。
  - Produces: `attachFloatDrag` 的 `onTap(target, point)` 新签名（`point = { x, y }` 为 pointerdown 坐标；既有 `onTap(target)` 单参调用方兼容——多收一个实参不报错）。
- 验证范围：`node --test tests/client-dom.test.mjs`

- [ ] Step 1: 写失败测试（追加在 S6 节末尾；派发用该节既有的 `s.h.firePointer(el, type, { x, y })` 辅助，rect 打桩照该节 `STOCK_RECT` 先例直接赋值 `getBoundingClientRect`）

  ```js
  test("分区：胶囊根命中就近归属——gap 点击按 x 就近开对应卡", async () => {
    const s = await setupCapsuleWithQuota();
    try {
      s.capsule.el.querySelector('[data-seg="stock"]').getBoundingClientRect =
        () => ({ left: 0, top: 0, right: 100, bottom: 26, width: 100, height: 26 });
      s.capsule.el.querySelector('[data-seg="quota"]').getBoundingClientRect =
        () => ({ left: 107, top: 0, right: 227, bottom: 26, width: 120, height: 26 });
      const capEl = s.capsule.el;
      s.h.firePointer(capEl, "pointerdown", { x: 120, y: 13 }); // 更近额度段中心 167（股票段中心 50）
      s.h.firePointer(capEl, "pointerup", { x: 120, y: 13 });
      assert.equal(s.opened.length, 1, "gap 内靠近额度段的点击派发 open-panel");
      assert.equal(s.calls.length, 0, "不误走股票 toggle");
      s.h.firePointer(capEl, "pointerdown", { x: 90, y: 13 }); // 更近股票段中心 50
      s.h.firePointer(capEl, "pointerup", { x: 90, y: 13 });
      assert.equal(s.calls.length, 1, "gap 内靠近股票段的点击走股票 toggle");
      assert.equal(s.opened.length, 1, "open-panel 不新增");
    } finally {
      disposeCapsuleWithQuota(s);
    }
  });
  ```
- Run: `node --test tests/client-dom.test.mjs`
- Expected: 新用例红（当前实现两次都走股票 toggle：`opened.length` 为 0、`calls.length` 为 2）。
- [ ] Step 2: 运行并确认失败
- Run: `node --test tests/client-dom.test.mjs`
- Expected: `opened.length = 1` 断言失败。
- [ ] Step 3: 写最小实现
  - Change 1（`attachFloatDrag`，capsule.mjs:143）：`onTap(downTarget);` 改为
    `onTap(downTarget, { x: originX, y: originY });`（`originX/originY` 即 pointerdown 坐标，轻点时与 up 坐标差 < slop）。
  - Change 2（`routeTap`，capsule.mjs:326-332）：

    ```js
    const routeTap = (target, point) => {
      if (target?.closest?.('[data-seg="quota"]')) {
        if (typeof onQuotaTap === "function") onQuotaTap();
        return;
      }
      if (point && target && !target.closest?.('[data-seg="stock"]')) {
        const quotaSeg = el.querySelector('[data-seg="quota"]');
        const stockSeg = el.querySelector('[data-seg="stock"]') ?? el;
        const qr = quotaSeg && !quotaSeg.hidden ? quotaSeg.getBoundingClientRect() : null;
        const sr = stockSeg.getBoundingClientRect();
        if (qr && sr && qr.width > 0 && sr.width > 0) {
          const qd = Math.abs(point.x - (qr.left + qr.width / 2));
          const sd = Math.abs(point.x - (sr.left + sr.width / 2));
          if (qd < sd) {
            if (typeof onQuotaTap === "function") onQuotaTap();
            return;
          }
        }
      }
      toggle(stockRect());
    };
    ```

    额度段隐藏（`hidden` 或 rect 宽 0）时 gap 不存在，自然回落股票 toggle；jsdom 全零 rect
    场景同样回落，既有用例不受影响。
- [ ] Step 4: 运行并确认通过
- Run: `node --test tests/client-dom.test.mjs && node --test tests/client-drag.test.mjs && node --test tests/client-capsule-drag-close.test.mjs`
- Expected: 三文件全绿（drag 两文件无 onTap 参数断言，签名加宽不破坏；若有用例因新实参翻红，按新签名更新该断言并注明）。
- [ ] Step 5: checkpoint commit
- Run: `npm run build && git add client/capsule.mjs tests/client-dom.test.mjs && git commit -m "fix(client): 胶囊根命中按 x 就近归属段——gap/padding 点击不再一律开股票卡"`
- Expected: 构建通过 + commit 成功（lib 不随本提交）。

### Task 5: qdot / divider 自身 [hidden] 配套规则（P2 · 契约固化）

- 目标：消除 `.skc-qdot`（琥珀待处理点）/ `.skc-qseg-divider` 对宿主装配位置的隐式依赖——
  现行 `.skc-capsule [hidden]{display:none}`（styles.mjs:71，特异性 0,2,0）已兜底正确隐藏
  （生产 `target` 恒为 `capsule.el`，「琥珀点常显」在现行产品**不可达**，R1-2 定谳）；本任务
  为两节点补自身 `[hidden]` 配套规则，段移出胶囊时不再依赖外层选择器。
- 涉及文件
  - Modify: `client/styles.mjs`（:361-362 附近）
  - Modify: `tests/client-restyle.test.mjs`（样式契约新用例）
- 接口契约
  - Consumes: `FLOAT_STYLE_TEXT`（client-restyle.test.mjs 已 import）；既有先例 `.skc-qseg[hidden]{display:none}`（styles.mjs:359）与兜底先例 `.skc-capsule [hidden]{display:none}`（styles.mjs:71）。
  - Produces: 无。
- 验证范围：`node --test tests/client-restyle.test.mjs`

- [ ] Step 1: 写失败测试

  ```js
  test("qseg · [hidden] 兜底：qdot 与 divider 的 display 声明必须带配套隐藏规则", () => {
    assert.ok(
      FLOAT_STYLE_TEXT.includes(".skc-qdot[hidden]{display:none}"),
      "skc-qdot 缺自身 [hidden] 兜底——现行仅靠 .skc-capsule [hidden] 外层兜底，段移出胶囊即复发",
    );
    assert.ok(
      FLOAT_STYLE_TEXT.includes(".skc-qseg-divider[hidden]{display:none}"),
      "skc-qseg-divider 缺 [hidden] 兜底",
    );
  });
  ```

- Run: `node --test tests/client-restyle.test.mjs`
- Expected: 新用例红（两条规则当前不存在）。
- [ ] Step 2: 运行并确认失败
- Run: `node --test tests/client-restyle.test.mjs`
- Expected: includes 断言失败。
- [ ] Step 3: 写最小实现
  - Change: styles.mjs 的 qseg 区（:361-362 附近）追加两行：

    ```css
    .skc-qdot[hidden]{display:none}
    .skc-qseg-divider[hidden]{display:none}
    ```
- [ ] Step 4: 运行并确认通过
- Run: `node --test tests/client-restyle.test.mjs`
- Expected: 全文件绿。
- [ ] Step 5: checkpoint commit
- Run: `npm run build && git add client/styles.mjs tests/client-restyle.test.mjs && git commit -m "fix(client): qdot/divider 补自身 [hidden] 兜底——消除对 .skc-capsule 外层兜底的隐式依赖"`
- Expected: 构建通过 + commit 成功（lib 不随本提交）。

### Task 6: 版本 0.2.3 发版准备

- 目标：版本号、构建产物、全量测试收口，形成可发版状态。
- 涉及文件
  - Modify: `package.json`（`"version": "0.2.2"` → `"0.2.3"`）
  - 重新生成: `lib/client.js`（构建产物，经 build 脚本落新版本号与 sha 指纹）
  - Modify: `docs/verification.md`（§12.x 追记本计划六任务的验证记录）
- 接口契约
  - Consumes: Task 1–5 全部合入；`scripts/build-client.mjs` 内置版本注入断言（期望版本从 package.json 读取）。
  - Produces: 0.2.3 可发版工作树。publish / tag / push / 轮询不在本计划内，按仓库发版链执行：
    bump → build → `chore(release)` → tag → push →
    `../../01_docs/dsh-intall-know-how/tools/release-monitor.sh iasiv5/dsh-stock-kanban <tag> dsh-stock-kanban 0.2.3`（know-how 018 铁律：窗口内不重推 tag）。
- 验证范围：`npm run build` + `npm test` 全量 + verification.md 追记完成

- [ ] Step 1: bump 版本并构建
- Run: `sed -i 's/"version": "0.2.2"/"version": "0.2.3"/' package.json && npm run build`
- Expected: 构建成功（版本注入断言内部通过，输出含 `"0.2.3"` 与新 bundle sha）。
- [ ] Step 2: 全量测试
- Run: `npm test`
- Expected: 全量绿（0 失败）。
- [ ] Step 3: 追记验证记录
- Change: `docs/verification.md` 按 §12.x 追记式补一节：逐任务列出验证命令与结果、
  覆盖的降级矩阵行为；活体症状（点击失败/滞后）无法在 jsdom 复现的项如实标注「待装机活体验证」。
- [ ] Step 4: checkpoint commit
- Run: `git add package.json lib/client.js docs/verification.md && git commit -m "chore(release): v0.2.3"`
- Expected: commit 成功。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾或验证命令无效先修计划再动手。
- Task 1/2/3 改同一文件（client/quota-embed.mjs），必须按编号串行执行；Task 4、5 相互独立可并行。
- 每完成一个任务运行该任务定义的验证；不无声跳步、不合并任务。
- `npm test` / 构建前确认 `node_modules` 在位（缺失先按锁文件恢复）。
- 遇阻、重复失败或计划与仓库现实不符，立即停下说明，不猜。
- 当前不在 main/master 单独分支要求：若工作树在 main 且未获明确同意，开分支再动手。

## 最终验证

- Run: `npm run build && npm test`
- Expected: 构建成功（0.2.3 注入断言通过）；全量测试 0 失败。
- 收尾核对（人工）：`git log --oneline -6` 应见 Task 1–6 六条 commit。

## 审阅 Checkpoint

- 本计划为「合并胶囊额度段可靠性」双计划中的宿主侧（dsh-stock-kanban）一份；姊妹篇为
  `dsh-quota-watch/docs/plans/2026-11-11-guest-reembed-and-gesture-suppression-implementation-plan.md`。
- 两份计划相互独立、可分别评审与发版；协议文档的语义行修订统一由姊妹计划 Task 3 承担。
- 审阅通过前不进入实现。
