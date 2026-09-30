#!/usr/bin/env node
"use strict";

/**
 * bundle-host — 宿主端与客户端发布构建（独立包版本）。
 *
 * 用法：node scripts/bundle-host.mjs .      （在包根目录执行）
 *
 * 步骤：
 * 1. esbuild 把 lib/index.js 打成自包含单文件（内置模块自动 external）。
 * 2. 客户端产物 lib/client.js：契约外壳（__ModuleLoader__.load）由构建期生成，
 *    React 作为宿主注入 external 经 factory(require) 解析。
 * 3. 复制 src/ 下运行时资源（toast.ps1）→ lib/ 同相对路径，.ps1 强制 UTF-8 BOM。
 * 4. 清理游离产物：只保留顶层 index.js / client.js 与全部 .d.ts。
 *
 * 共享层位于 src/vendor/，随 tsc 一并产出声明，构建期无需额外搬运。
 *
 * 前置：tsc -b tsconfig.json 已产出 lib/**\/*.js + *.d.ts。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libDir = join(PKG, "lib");
const pkgDir = resolve(process.cwd());

if (pkgDir !== PKG) {
  console.error(`[bundle-host] 请在包根目录执行（期望 ${PKG}，实际 ${pkgDir}）`);
  process.exit(1);
}
if (!existsSync(libDir)) {
  console.error("[bundle-host] lib/ 不存在——先跑 tsc -b tsconfig.json");
  process.exit(1);
}

const pkgJson = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));

// ---------- 1. 宿主端自包含单文件 ----------
const tmpBundle = join(libDir, ".index.bundle.js");
const bannerJs = pkgJson?.dsh?.bundle?.bannerJs;
try {
  await build({
    entryPoints: [join(libDir, "index.js")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: tmpBundle,
    logLevel: "warning",
    charset: "utf8",
    banner: typeof bannerJs === "string" && bannerJs.length > 0 ? { js: bannerJs } : undefined,
  });
} catch (error) {
  console.error(`[bundle-host] 宿主端 esbuild 失败: ${error.message}`);
  process.exit(1);
}
renameSync(tmpBundle, join(libDir, "index.js"));
rmSync(join(libDir, "index.js.map"), { force: true });
console.log("[bundle-host] 宿主端已内联（lib/index.js 自包含）");

// ---------- 2. 客户端契约产物 ----------
const clientSrc = ["src/client/index.tsx", "src/client/index.ts", "src/client.tsx", "src/client.ts"]
  .map((rel) => join(PKG, rel))
  .find((abs) => existsSync(abs));

if (clientSrc) {
  const code = await buildClient(clientSrc, join(libDir, "client.js"), pkgJson.name);
  writeFileSync(join(libDir, "client.js"), code);
  rmSync(join(libDir, "client.js.map"), { force: true });
  console.log(`[bundle-host] 客户端构建完成（load id=${pkgJson.name}）`);
}

/**
 * 客户端契约外壳：干净模块（导出 apply/inject）以 cjs 内联进
 * `window.__ModuleLoader__.load({ id, factory })` 的 factory 函数体。
 * React 等宿主注入依赖编译成 `require("react")`，由 factory 注入的 require 解析。
 */
async function buildClient(entry, outfile, packageName) {
  const sourceText = readFileSync(entry, "utf8");
  const externals = bareImports(sourceText);
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "browser",
    target: "es2020",
    charset: "utf8",
    external: externals,
    logLevel: "warning",
    loader: { ".css": "text" },
  });
  const clean = result.outputFiles[0].text;
  const indented = clean
    .split("\n")
    .map((line) => (line.length ? "    " + line : ""))
    .join("\n");
  const wrapped = `"use strict";
// 契约外壳（scripts/bundle-host.mjs 生成）：external 依赖（React 等）经 factory 注入的 require 解析
window.__ModuleLoader__.load({
  id: ${JSON.stringify(packageName)},
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
${indented}
    Object.defineProperty(module.exports, Symbol.toStringTag, { value: 'Module' })
    return module.exports
  }
})
`;
  // 契约校验：load id 必须等于包名，且 apply/inject 装配必须存在——构建即失败，不等运行期。
  const found = wrapped.match(/__ModuleLoader__\.load\(\s*\{\s*id:\s*"([^"]+)"/);
  if (!found || found[1] !== packageName) {
    throw new Error(`客户端契约校验失败：load id 须等于包名 ${packageName}（实际: ${found ? found[1] : "缺失"}）`);
  }
  if (!/apply/.test(wrapped) || !/inject/.test(wrapped)) {
    throw new Error("客户端契约校验失败：产物缺少 apply/inject 装配");
  }
  return wrapped;
}

/** 顶层 bare import（非相对路径）→ 宿主注入 external。 */
function bareImports(text) {
  const out = new Set();
  for (const m of text.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("/")) continue;
    out.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
  }
  return [...out];
}

// ---------- 3. 运行时资源 → lib/ ----------
const CODE_FILE = /\.(ts|tsx|mts|cts|js|mjs|cjs|css)$/;
const copied = [];
const walkResources = (dir, prefix) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walkResources(join(dir, entry.name), rel);
      continue;
    }
    if (CODE_FILE.test(entry.name)) continue;
    const target = join(libDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(dir, entry.name), target);
    // Windows PowerShell 5.1 对无 BOM 文件按 ANSI 码页解码，非 ASCII 注释即解析失败。
    if (rel.endsWith(".ps1")) ensureUtf8Bom(target);
    copied.push(rel);
  }
};
const srcDir = join(PKG, "src");
if (existsSync(srcDir)) walkResources(srcDir, "");
for (const rel of copied) console.log(`[bundle-host] 资源 ${rel} → lib/`);

/** 确保 .ps1 带 UTF-8 BOM；已带则原样返回 false。 */
function ensureUtf8Bom(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return false;
  const text = buf.toString("utf8").replace(/^\uFEFF/, "");
  writeFileSync(filePath, "\uFEFF" + text, "utf8");
  return true;
}

// ---------- 4. 清理游离产物 ----------
// 多模块 src 的 tsc 会逐个 emit lib/**/*.js：宿主已内联为单文件、客户端由 esbuild 生成，
// 其余 .js / .js.map 均为游离物；保留顶层 index.js、client.js 与全部 .d.ts（类型 re-export 需要）。
const cleanFreeFloating = (dir, isRoot) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanFreeFloating(abs, false);
      continue;
    }
    const isTopEntry = isRoot && (entry.name === "index.js" || entry.name === "client.js");
    if (entry.name.endsWith(".js") && !isTopEntry) rmSync(abs, { force: true });
    else if (entry.name.endsWith(".map") && !isTopEntry) rmSync(abs, { force: true });
  }
};
cleanFreeFloating(libDir, true);
console.log("[bundle-host] 游离产物已清理");
