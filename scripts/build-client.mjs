// 客户端构建：esbuild 打包 client/main.mjs → lib/client.js（window.__ModuleLoader__ 包装）。
// vanilla 重写后客户端零 react 引用：不再需要构建期 react external。
// __APP_VERSION__：package.json 版本注入（设置页页尾版本号；2026-11-10）。
import { mkdir, readFile, writeFile } from "node:fs/promises";
import esbuild from "esbuild";

const { version } = JSON.parse(await readFile("package.json", "utf8"));

const result = await esbuild.build({
  entryPoints: ["client/main.mjs"],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  write: false,
  minify: false,
  legalComments: "none",
  loader: { ".mjs": "js" },
  resolveExtensions: [".mjs", ".js"],
  define: { __APP_VERSION__: JSON.stringify(version) },
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
