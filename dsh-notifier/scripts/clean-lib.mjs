#!/usr/bin/env node
/**
 * clean-lib — 删除上次构建产物，保证 tsc -b 与 esbuild 看到干净的 lib/。
 *
 * 独立包版本：不依赖任何仓库级脚本，只清本包的 lib/ 与 tsbuildinfo。
 */
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

for (const target of ["lib", "tsconfig.tsbuildinfo", "lib/.tsbuildinfo"]) {
  const abs = join(PKG, target);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    console.log(`[clean-lib] 已删除 ${target}`);
  }
}
