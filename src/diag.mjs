/**
 * 插件自有诊断日志（P1-6，2026-11-13）：按天一个 JSONL 文件、串行追加、超限轮转 .1。
 * 结构与纪律参考 suifei/dsh-market-lens 的 diaglog（MIT，见 NOTICE.md），按本仓口径重写：
 *   - level 三档：off（完全静默，客户端也不该再发）/ errors（发布默认：provider.fail、
 *     route.status、route.reject、store.conflict、*.fail）/ full（开发调试）；
 *   - 客户端半经 POST /stock-kanban/diag 批量上报（src:'client'），过同一过滤器；
 *   - 与 routes 的日志纪律一致：不记录持仓数值/备份内容/自选明细，只有事件与计数。
 * 配置（cordis.patch.yml 行内 config，零依赖手写校验）：diagLevel / diagDir / diagLogMaxBytes。
 */

import { appendFile, mkdir, readFile, rename, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const DIAG_LEVELS = ["off", "errors", "full"];

export function defaultDiagDir() {
  return join(homedir(), ".dsh", "stock-kanban");
}

/** errors 档保留的事件（其余只在 full 档落盘） */
export function isErrorEvent(ev) {
  return typeof ev === "string" && (
    ev === "provider.fail" || ev === "route.status" || ev === "route.reject" || ev === "store.conflict" || ev.endsWith(".fail")
  );
}

/**
 * @param {object} [options]
 * @param {string} [options.dir] 日志目录（默认 ~/.dsh/stock-kanban）
 * @param {number} [options.maxBytes=1048576] 单文件上限，超限轮转为 .1
 * @param {string} [options.level="errors"] off | errors | full
 * @param {() => Date} [options.now] 时钟注入（测试）
 */
export function createDiagLogger({ dir, maxBytes = 1048576, level = "errors", now = () => new Date(), enabled = true } = {}) {
  const theDir = dir ?? defaultDiagDir();
  const theLevel = DIAG_LEVELS.includes(level) ? level : "errors";
  let queue = Promise.resolve();
  let dirReady = null;
  let appended = 0;

  const fileName = () => "stock-kanban-diag-" + now().toISOString().slice(0, 10) + ".jsonl";
  const path = () => join(theDir, fileName());
  const ensureDir = () => {
    if (dirReady === null) dirReady = mkdir(theDir, { recursive: true });
    return dirReady;
  };

  /** 追加一行（等级过滤在前，被滤掉的行零开销）；返回当前写链（测试可 await） */
  function append(row) {
    if (!enabled || !row || typeof row !== "object") return queue;
    if (theLevel === "off") return queue;
    if (theLevel === "errors" && !isErrorEvent(row.ev)) return queue;
    // 服务端时间戳权威（2026-11-13 评审轮2 P3）：row 展开在前、t 在后——客户端自带 t 不可覆盖宿主时钟
    const line = JSON.stringify({ ...row, t: now().toISOString() }) + "\n";
    queue = queue.then(async () => {
      await ensureDir();
      appended += 1;
      if (appended % 20 === 1) {
        // 廉价轮转：每 20 次追加 stat 一次大小
        try {
          const info = await stat(path());
          if (info.size > maxBytes) await rename(path(), path() + ".1");
        } catch {
          /* 首写尚无文件 */
        }
      }
      await appendFile(path(), line, "utf8");
    }).catch(() => {
      /* 诊断写失败不得影响业务 */
    });
    return queue;
  }

  /** 回读当日尾部（按行序取尾） */
  async function tail(count = 50) {
    let text = "";
    try {
      text = await readFile(path(), "utf8");
    } catch {
      return { file: path(), rows: [] };
    }
    const rows = text
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { t: "?", ev: "unparsed" };
        }
      });
    return { file: path(), rows: rows.slice(-Math.max(1, Math.min(500, count))) };
  }

  return { append, tail, path, dir: theDir, level: theLevel, flush: () => queue };
}
