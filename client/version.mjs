/** 包版本：构建期由 scripts/build-client.mjs 经 esbuild define 注入 __APP_VERSION__；
 *  非构建环境（node --test 直跑源码）typeof 守卫回落 "dev"。仅设置页页尾安静展示。 */
const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

export const VERSION_LABEL = `dsh-stock-kanban v${APP_VERSION}`;
