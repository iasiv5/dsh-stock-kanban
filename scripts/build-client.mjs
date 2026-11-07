// 客户端构建：esbuild 打包 client/main.mjs → lib/client.js（window.__ModuleLoader__ 包装）。
// 构建模式对齐 dsh-quota-watch（构建期 react external，运行时由宿主 require 提供）。
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

// 守卫：已移除/重命名的符号不得残留在产物（防止渲染期 ReferenceError 卸载整个插槽）
const FORBIDDEN = ["MARKET_LABELS"];
for (const sym of FORBIDDEN) {
  if (new RegExp(`\\b${sym}\\b`).test(body)) {
    console.error(`build guard: forbidden symbol "${sym}" leaked into the bundle`);
    process.exit(1);
  }
}

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
