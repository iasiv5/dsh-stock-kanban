/**
 * 备份导入／导出（vanilla，行式设置列表——2026-11-11 方案 B）：
 *   - 导出备份行：整行可点 <a>（下载结构化 JSON，schemaVersion 1），副行注明去向；
 *   - 导入备份行：整行可点 <button> → 文件选择，副行注明覆盖语义（常显警示）；
 *   - 导入链路：文件选择 → 预读计数 → 覆盖式显式确认（可取消）→ 服务端再次全量校验；
 *   - 明确提示：备份含持仓明文（未加密）。
 * DOM 契约：a[href="/stock-kanban/export"]（download 属性）+ input[type=file]。
 */

import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";
import { iconEl } from "./icons.mjs";

export function createBackup({ store }) {
  let disposed = false;
  let snapshot = null;
  let pending = null; // {payload, count}
  let importing = false;
  let parseError = null;

  const el = document.createElement("div");
  el.className = "skc-backup-rows";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => onFile());

  /** 行式设置行：主标签 + 副行说明 + 行尾 chevron */
  const settingRow = (labelText, subText) => {
    const row = document.createElement("span");
    row.className = "skc-setting-main";
    const main = document.createElement("span");
    main.className = "skc-setting-main";
    const label = document.createElement("span");
    label.className = "skc-setting-label";
    label.textContent = labelText;
    const sub = document.createElement("span");
    sub.className = "skc-setting-sub";
    sub.textContent = subText;
    main.append(label, sub);
    const chev = document.createElement("span");
    chev.className = "skc-setting-chev";
    chev.append(iconEl(document, "chev-right"));
    row.append(main, chev);
    return row;
  };

  const onFile = async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    parseError = null;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      parseError = t("backup.err.read", { e: String(err?.message ?? err) });
      render();
      return;
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      parseError = t("backup.err.json");
      render();
      return;
    }
    if (payload?.kind !== "stock-kanban-backup" || payload?.schemaVersion !== 1) {
      parseError = t("backup.err.kind");
      render();
      return;
    }
    const count = Array.isArray(payload.symbols) ? payload.symbols.length : 0;
    pending = { payload, count };
    render();
  };

  const confirmImport = async () => {
    if (!pending) return;
    importing = true;
    render();
    const result = await store.importBackup(pending.payload);
    importing = false;
    if (disposed) return;
    if (result.ok) {
      store.setToast(t("backup.done", { n: result.result.imported }));
      pending = null;
    } else if (result.error?.status === 422) {
      store.setToast(t("backup.rejected", { e: tErr(result.error.body?.error) }));
      pending = null;
    }
    render();
  };

  const cancelImport = () => {
    pending = null;
    render();
  };

  const render = () => {
    if (disposed) return;
    const business = snapshot?.business ?? { symbols: [] };

    el.replaceChildren();

    // 导出备份行：整行 <a>（下载结构化 JSON，schemaVersion 1）
    const exportRow = document.createElement("a");
    exportRow.className = "skc-setting-row skc-setting-row--link";
    exportRow.href = api.exportUrl;
    exportRow.setAttribute("download", "");
    exportRow.append(
      settingRow(t("backup.export"), t("backup.export.hint")),
      (() => { const c = document.createElement("span"); c.className = "skc-setting-chev"; c.append(iconEl(document, "chev-right")); return c; })(),
    );
    el.append(exportRow);

    // 导入备份行：整行 <button> → 文件选择；覆盖语义副行常显
    const importRow = document.createElement("button");
    importRow.type = "button";
    importRow.className = "skc-setting-row skc-setting-row--link";
    importRow.disabled = importing;
    importRow.append(
      settingRow(t("backup.import"), t("backup.import.hint")),
      (() => { const c = document.createElement("span"); c.className = "skc-setting-chev"; c.append(iconEl(document, "chev-right")); return c; })(),
    );
    importRow.addEventListener("click", () => fileInput.click());
    el.append(importRow, fileInput);

    if (parseError) {
      const err = document.createElement("div");
      err.className = "skc-error";
      err.textContent = parseError;
      el.append(err);
    }
    if (pending) {
      const confirmBox = document.createElement("div");
      confirmBox.className = "skc-confirm";
      const line = document.createElement("div");
      line.textContent = t("backup.confirm", { n: pending.count, m: business.symbols.length });
      const note = document.createElement("div");
      note.className = "skc-hint";
      note.textContent = t("backup.privacy-note");
      const actions = document.createElement("div");
      actions.className = "skc-backup-row";
      const overwrite = document.createElement("button");
      overwrite.className = "skc-btn skc-btn-danger";
      overwrite.type = "button";
      overwrite.disabled = importing;
      overwrite.textContent = t("backup.overwrite");
      overwrite.addEventListener("click", confirmImport);
      const cancel = document.createElement("button");
      cancel.className = "skc-btn";
      cancel.type = "button";
      cancel.disabled = importing;
      cancel.textContent = t("backup.cancel");
      cancel.addEventListener("click", cancelImport);
      actions.append(overwrite, cancel);
      confirmBox.append(line, note, actions);
      el.append(confirmBox);
    }
  };

  const update = (next) => {
    if (disposed) return;
    snapshot = next;
    render();
  };

  const dispose = () => {
    disposed = true;
    el.replaceChildren();
    el.remove();
  };

  return { el, update, dispose };
}
