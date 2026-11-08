// 客户端构建：esbuild 打包 client/main.mjs → lib/client.js（window.__ModuleLoader__ 包装）。
// 构建模式对齐 dsh-quota-watch（构建期 react external，运行时由宿主 require 提供）。
// 泄漏类守卫已退役：由 tests/client-contract.test.mjs（插槽契约烟测）执有，npm test 为发布门。
import { mkdir, writeFile } from "node:fs/promises";
import esbuild from "esbuild";

const result = await esbuild.build({
  entryPoints: ["client/main.mjs"],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  write: false,
  minify: false,
  legalComments: "none",
  external: ["react"],
  loader: { ".mjs": "js" },
  resolveExtensions: [".mjs", ".js"],
});

const body = result.outputFiles[0].text;

const output = "window.__ModuleLoader__.load({\n"
  + '\tid: "dsh-stock-kanban",\n'
  + "\tfactory: (require) => {\n"
  + "\t\tvar module = { exports: {} };\n"
  + "\t\tvar exports = module.exports;\n"
  + '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n'
  + "\t\t" + body.replace(/\n/g, "\n\t\t") + "\n"
  + "\t\treturn module.exports;\n"
  + "\t}\n"
  + "});\n";

await mkdir("lib", { recursive: true });
await writeFile("lib/client.js", output, "utf8");
console.log(`wrote lib/client.js (${(output.length / 1024).toFixed(1)} KB)`);
