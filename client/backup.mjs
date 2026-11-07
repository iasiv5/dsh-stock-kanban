/**
 * 备份导入／导出：
 *   - 导出：下载结构化 JSON（schemaVersion 1），包含自选/持仓/目标价/隐私设置；
 *   - 导入：文件选择 → 预读计数 → 覆盖语义显式确认（可取消）→ 服务端再次全量校验；
 *   - 明确提示：备份含持仓明文；隐私开关不等于加密。
 */

import { createElement as h, useRef, useState } from "react";
import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";

export function BackupSection({ store, business }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null); // {payload, count}
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
      setParseError(t("backup.err.read", { e: String(err?.message ?? err) }));
      return;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      setParseError(t("backup.err.json"));
      return;
    }
    if (payload?.kind !== "stock-kanban-backup" || payload?.schemaVersion !== 1) {
      setParseError(t("backup.err.kind"));
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
      store.setToast(t("backup.done", { n: result.result.imported }));
      setPending(null);
    } else if (result.error?.status === 422) {
      store.setToast(t("backup.rejected", { e: tErr(result.error.body?.error) }));
      setPending(null);
    }
  };

  return h("div", { className: "skc-backup" },
    h("div", { className: "skc-section-title" }, t("backup.title")),
    h("div", { className: "skc-backup-row" },
      h("a", { className: "skc-btn skc-btn-ghost", href: api.exportUrl, download: true }, t("backup.export")),
      h("button", { className: "skc-btn", onClick: pickFile }, t("backup.import")),
      h("input", { ref: fileRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: onFile }),
    ),
    parseError ? h("div", { className: "skc-error" }, parseError) : null,
    pending ? h("div", { className: "skc-confirm" },
      h("div", {}, t("backup.confirm", { n: pending.count, m: business.symbols.length })),
      h("div", { className: "skc-hint" }, t("backup.privacy-note")),
      h("div", { className: "skc-backup-row" },
        h("button", { className: "skc-btn skc-btn-danger", disabled: importing, onClick: confirmImport }, t("backup.overwrite")),
        h("button", { className: "skc-btn", disabled: importing, onClick: () => setPending(null) }, t("backup.cancel")),
      )) : null,
  );
}
