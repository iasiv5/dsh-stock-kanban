// node:module resolve 钩子：把 "react" 重定向到假实现（tests/helpers/react-stub.mjs）。
// URL 的 .href 已是 file:// 字符串，直接用；经 pathToFileURL 二次编码会产生畸形 URL 致 ENOENT（评审 R1 实证）。
export async function resolve(specifier, context, next) {
  if (specifier === "react") {
    return { url: new URL("./react-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
