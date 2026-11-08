/**
 * 备份导入／导出（vanilla）：
 *   - 导出：下载结构化 JSON（schemaVersion 1），包含自选/持仓/目标价/隐私设置；
 *   - 导入：文件选择 → 预读计数 → 覆盖语义显式确认（可取消）→ 服务端再次全量校验；
 *   - 明确提示：备份含持仓明文；隐私开关不等于加密。
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

    const title = document.createElement("div");
    title.className = "skc-section-title";
    title.textContent = t("backup.title");
    const row = document.createElement("div");
    row.className = "skc-backup-row";
    const exportLink = document.createElement("a");
    exportLink.className = "skc-btn skc-btn-ghost";
    exportLink.href = api.exportUrl;
    exportLink.setAttribute("download", "");
    exportLink.textContent = t("backup.export");
    const importBtn = document.createElement("button");
    importBtn.className = "skc-btn";
    importBtn.type = "button";
    importBtn.textContent = t("backup.import");
    importBtn.addEventListener("click", () => fileInput.click());
    row.append(exportLink, importBtn, fileInput);

    el.append(title, row);

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
