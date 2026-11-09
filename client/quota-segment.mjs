/**
 * 额度段纯模型（合并胶囊 ADR 0003 第 3 条；方案③ S3）。
 * 「显示什么」由本函数决定，DOM 只负责落地（quota-embed 的 renderSegment）。
 * - 有数：percent 为有限数字（与 qw 胶囊判定一致）；null 或非有限值视为无数。
 * - 待处理：outcomePending === true（与 qw 同规则：manualOutcome 或 manualOutcomeError 任一存在）。
 * - 语气阈值与 qw 一致：> 95 为 danger（琥珀脉冲），> 80 为 warn，其余 normal。
 */

/** 额度来源，固定顺序（GLM 在前）。label 是条上的字母标签，name 是悬停文案。 */
const PROVIDERS = [
  { key: "glm", label: "G", name: "GLM" },
  { key: "copilot", label: "C", name: "Copilot" },
];

const hasNumber = (provider) =>
  typeof provider?.percent === "number" && Number.isFinite(provider.percent);

function toneOf(percent) {
  if (percent > 95) return "danger";
  if (percent > 80) return "warn";
  return "normal";
}

export function quotaSegmentModel({ glm, copilot, outcomePending } = {}) {
  const inputs = { glm, copilot };
  const bars = [];
  const tooltip = [];
  for (const { key, label, name } of PROVIDERS) {
    const provider = inputs[key];
    if (!hasNumber(provider)) continue;
    bars.push({
      key,
      label,
      percent: provider.percent,
      tone: toneOf(provider.percent),
      stale: provider.stale === true,
    });
    tooltip.push({ label: name, percent: provider.percent });
  }
  const dot = outcomePending === true;
  const segment = bars.length > 0 || dot;
  return { segment, dot, divider: segment, bars, tooltip };
}
