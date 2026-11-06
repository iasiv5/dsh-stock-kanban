/**
 * 备份导入／导出：
 *   - 导出：下载结构化 JSON（schemaVersion 1），包含自选/持仓/目标价/隐私设置；
 *   - 导入：文件选择 → 客户端预读展示计数 → 覆盖语义显式确认（可取消）→ 服务端再次全量校验；
 *   - 明确提示：备份含个人持仓信息；隐私开关不等于加密。
 */

import { createElement as h, useRef, useState } from "react";
import { api } from "./api.mjs";

export function BackupSection({ store, business }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // {payload, text}
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState(null);

  const pickFile = () => fileRef.current?.click?.();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParseError(null);
    let text;
    try {
      text = await file.text();
    } catch (err) {
      setParseError(`读取文件失败：${err.message ?? err}`);
      return;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      setParseError("不是合法的 JSON 文件");
      return;
    }
    if (payload?.kind !== "stock-kanban-backup" || payload?.schemaVersion !== 1) {
      setParseError("不是本插件的备份文件（kind/schemaVersion 不符），已拒绝");
      return;
    }
    const count = Array.isArray(payload.symbols) ? payload.symbols.length : 0;
    setPending({ payload, count });
  };

  const confirmImport = async () => {
    if (!pending) return;
    setImporting(true);
    const result = await store.importBackup(pending.payload);
    setImporting(false);
    if (result.ok) {
      store.setToast(`导入完成：${result.result.imported} 个标的（覆盖模式）`);
      setPending(null);
    } else if (result.error?.status === 422) {
      store.setToast(`备份内容校验未通过（${result.error.body?.error ?? "invalid"}），现有数据未改动`);
      setPending(null);
    }
  };

  return h("div", { className: "skc-backup" },
    h("div", { className: "skc-section-title" }, "备份与迁移"),
    h("div", { className: "skc-backup-row" },
      h("a", { className: "skc-btn skc-btn-ghost", href: api.exportUrl, download: true }, "导出备份"),
      h("button", { className: "skc-btn", onClick: pickFile }, "导入备份"),
      h("input", { ref: fileRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: onFile }),
    ),
    parseError ? h("div", { className: "skc-error" }, parseError) : null,
    pending ? h("div", { className: "skc-confirm" },
      h("div", {}, `备份含 ${pending.count} 个标的。导入为【覆盖】模式：将替换当前全部自选/持仓/目标价（当前 ${business.symbols.length} 个）。`),
      h("div", { className: "skc-hint" }, "备份文件包含个人持仓信息，请妥善保管；隐私开关不会加密备份文件。"),
      h("div", { className: "skc-backup-row" },
        h("button", { className: "skc-btn skc-btn-danger", disabled: importing, onClick: confirmImport }, "确认覆盖导入"),
        h("button", { className: "skc-btn", disabled: importing, onClick: () => setPending(null) }, "取消"),
      )) : null,
  );
}
