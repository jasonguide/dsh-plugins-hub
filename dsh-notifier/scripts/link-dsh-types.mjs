#!/usr/bin/env node
/**
 * link-dsh-types — 把本机 DSH 安装里的 @deepseek-ai/* 类型包软链进 node_modules。
 *
 * 为什么需要它：DSH 0.2.x 的官方包（@deepseek-ai/dsh-* 0.2.0-rc.2）**未发布到 npm**
 * （registry 上只有陈旧的 0.0.1-rc.1）。本插件在编译期只 `import type` 这些包，
 * 因此直接从本机 dsh 运行时的 node_modules 建立软链即可，无需联网、也无需发包。
 *
 * 用法：node scripts/link-dsh-types.mjs [dsh安装目录]
 * 默认自动探测：$DSH_DSH_ROOT → 本机全局 @deepseek-ai/dsh。
 */
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, lstatSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** 从本机全局 node_modules 定位 dsh 包内嵌的 @deepseek-ai 目录。 */
function findDshTypes() {
  const candidates = [];
  if (process.env.DSH_DSH_ROOT) candidates.push(process.env.DSH_DSH_ROOT);
  if (process.argv[2]) candidates.push(process.argv[2]);
  try {
    const root = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    candidates.push(join(root, "@deepseek-ai", "dsh", "node_modules", "@deepseek-ai"));
  } catch {
    /* npm 不可用时跳过 */
  }
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return undefined;
}

const typesDir = findDshTypes();
if (!typesDir) {
  console.error("[link-dsh-types] 未找到 DSH 类型包目录。请传入路径：node scripts/link-dsh-types.mjs <dir>");
  process.exit(1);
}
console.log(`[link-dsh-types] 类型源: ${typesDir}`);

const scope = join(PKG, "node_modules", "@deepseek-ai");
mkdirSync(scope, { recursive: true });

let linked = 0;
for (const name of readdirSync(typesDir)) {
  if (!name.startsWith("dsh") && name !== "cordis" && name !== "schemastery" && name !== "cosmokit") continue;
  const from = join(typesDir, name);
  if (!existsSync(join(from, "package.json"))) continue;
  const to = join(scope, name);
  try {
    if (lstatSync(to)) rmSync(to, { recursive: true, force: true });
  } catch {
    /* 不存在则直接建链 */
  }
  try {
    symlinkSync(from, to, "junction");
    linked++;
  } catch (error) {
    console.warn(`[link-dsh-types] 跳过 ${name}: ${error.message}`);
  }
}
console.log(`[link-dsh-types] 已链接 ${linked} 个类型包 → node_modules/@deepseek-ai/`);
