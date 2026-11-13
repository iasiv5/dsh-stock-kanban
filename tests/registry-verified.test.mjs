import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

/** registry 防污染守卫（know-how 022 铁律本地化；2026-11-13 0.3.0 发版实录）：
 *  verified 只记实测 DSH 运行时版本，插件自身 npm 版本严禁混入。
 *  dsh-m 侧门禁在 validate-registry 网络段且可被离线跳过，本仓本地补零依赖硬断言；
 *  dsh-m 仓库未 clone 时守卫跳过，保持 npm test 全离线绿。 */
const registryPath = new URL("../../dsh-m/registry.json", import.meta.url);

test("registry · verified 不含插件自身版本（know-how 022 铁律）", () => {
  if (!existsSync(registryPath)) return; // dsh-m 未 clone：跳过
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const entry = (registry.plugins ?? []).find((p) => p.id === "dsh-stock-kanban");
  assert.ok(entry, "registry 存在 dsh-stock-kanban 条目");
  const verified = entry.verified ?? [];
  assert.ok(!verified.includes(pkg.version), `verified 不得含插件自身版本 ${pkg.version}——只记实测 DSH 版本（know-how 022/008）`);
  for (const v of verified) {
    assert.match(v, /^\d+\.\d+\.\d+(-rc\.\d+)?$/, `verified 须为精确 semver（禁 range）：${v}`);
  }
});
