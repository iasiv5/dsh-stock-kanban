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
  minify: true,
  legalComments: "none",
  loader: { ".mjs": "js" },
  resolveExtensions: [".mjs", ".js"],
  define: { __APP_VERSION__: JSON.stringify(version) },
});

const body = result.outputFiles[0].text;

// 版本注入断言（2026-11-10 retro；minify 适配 2026-11-11）：define 链路断了会静默回落 "dev"
// （设置页版本号错），在构建期就炸出来。检查两点，均 minify 免疫（字符串字面量内容不受压缩影响）：
//   ① 版本字面量在 = define 已注入；② __APP_VERSION__ 标识符不在 = 没有未替换残留。
if (!body.includes(`"${version}"`) || body.includes("__APP_VERSION__")) {
  throw new Error(`build: 版本注入断言失败（期望 ${version}）——esbuild define 链路异常`);
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
