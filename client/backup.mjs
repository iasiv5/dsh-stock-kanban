/**
 * 备份导入／导出（vanilla，行式设置列表——2026-11-11 方案 B；第三轮 2026-11-10 文案与警示分层）：
 *   - 动作区：导出（<a download>，下载结构化 JSON，schemaVersion 1）+ 导入（文件选择）双钮；
 *   - 导出说明：文件含持仓明文（未加密），常显；
 *   - 导入警示：覆盖语义常显（warn 色），与导出说明分开呈现，不混在同一行小字里；
 *   - 导入链路：文件选择 → 预读计数 → 覆盖式显式确认（可取消）→ 服务端再次全量校验。
 * DOM 契约：a[href="/stock-kanban/export"]（download 属性）+ input[type=file]。
 */

import { api } from "./api.mjs";
import { t, tErr } from "./i18n.mjs";

export function createBackup({ store }) {
  let disposed = false;
  let snapshot = null;
  let pending = null; // {payload, count}
  let importing = false;
  let parseError = null;

  const el = document.createElement("div");
  el.className = "skc-backup";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.addEventListener("change", () => onFile());

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

    // 动作区：一行双钮（qw .dqw-panel-actions 同款 grid）——按钮形态比行式省空间（主人反馈）
    const actionsGrid = document.createElement("div");
    actionsGrid.className = "skc-backup-actions";
    const exportLink = document.createElement("a");
    exportLink.className = "skc-btn";
    exportLink.href = api.exportUrl;
    exportLink.setAttribute("download", "");
    exportLink.textContent = t("backup.export");
    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.className = "skc-btn";
    importBtn.disabled = importing;
    importBtn.textContent = importing ? t("backup.importing") : t("backup.import");
    importBtn.addEventListener("click", () => fileInput.click());
    actionsGrid.append(exportLink, importBtn);
    // 说明分层：导出说明（中性，含持仓明文提醒）/ 导入警示（warn 色，覆盖语义常显）
    const exportHint = document.createElement("div");
    exportHint.className = "skc-setting-sub";
    exportHint.textContent = t("backup.export.hint");
    const importHint = document.createElement("div");
    importHint.className = "skc-warn-text";
    importHint.textContent = t("backup.import.hint");
    el.append(actionsGrid, exportHint, importHint, fileInput);

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
