// @ts-nocheck
"use strict";

/**
 * smoke-lib — 本包测试共用的契约断言工具。
 *
 * 覆盖三个面：客户端产物的源形态、真实 cordis Context 的语义、事件可达性。
 * 自包含、不依赖任何仓库级门禁脚本。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** 客户端产物源形态契约断言（兼容 legacy 手写 IIFE 与 wrapper 生成两种产物）。
 *  @param pkgDir 插件包目录（fs 路径）。 */
export function assertClientSourceContract(pkgDir) {
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const clientCode = readFileSync(join(pkgDir, "lib", "client.js"), "utf8");
  assert.strictEqual(
    clientCode.match(/__ModuleLoader__\.load\(\s*\{\s*id:\s*"([^"]+)"/)?.[1],
    pkg.name,
    "客户端注册 id 必须等于包名（浏览器 arrive 契约）",
  );
  assert.ok(clientCode.includes('"use strict"'), "use strict");
  // 契约外壳：legacy/wrapper 是 IIFE 包裹；externals(cjs factory) 是顶层 load。
  // 两者都经 window.__ModuleLoader__.load 注册（已有 load id 断言兜底）——
  // 此处断言外壳存在即可，兼容三种产物形态。
  assert.ok(
    /\(\(\)\s*=>|\(function\s*\(\)\s*\{/.test(clientCode) ||
      /window\.__ModuleLoader__\.load\s*\(/.test(clientCode),
    "契约外壳（IIFE 或顶层 load）",
  );
  // exports 装配：legacy/wrapper 产物是 `exports.apply =` 直接赋值；externals(factory)
  // 产物经 esbuild cjs __export 装配——功能契约由执行断言硬保证，此处仅确认导出名存在。
  assert.ok(
    /exports\.apply\s*=|export \{|apply:/.test(clientCode) && /\bapply\b/.test(clientCode),
    "exports.apply 装配",
  );
  assert.ok(
    /exports\.inject\s*=|export \{|inject:/.test(clientCode) && /\binject\b/.test(clientCode),
    "exports.inject 装配",
  );
  assert.ok(clientCode.includes("Symbol.toStringTag"), "Symbol.toStringTag");
  assert.ok(/factory:\s*function\s*\(/.test(clientCode), "factory 函数形态（含 esbuild 重命名）");
  // 结尾兼容三种产物：legacy/wrapper 是 `})();`，externals(factory) 是 `})`（顶层 load 闭合）。
  // esbuild 会把第三方库的 legal 注释追加到文件末尾——剥离后再校验「load 注册在文件末尾」。
  let trimmedEnd = clientCode.trimEnd();
  if (trimmedEnd.endsWith("*/")) {
    const open = trimmedEnd.lastIndexOf("/*");
    if (open !== -1 && trimmedEnd.slice(open).startsWith("/*!")) {
      trimmedEnd = trimmedEnd.slice(0, open).trimEnd();
    }
  }
  assert.ok(trimmedEnd.endsWith("})") || trimmedEnd.endsWith("})();"), "load 注册在文件末尾");
  const codeOnly = clientCode
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
    .join("\n");
  assert.equal((codeOnly.match(/__ModuleLoader__\.load/g) || []).length, 1, "load 恰好一次");
}

/**
 * 真实 cordis Context 形态断言工具。
 *
 * 断言真实 cordis Context 的三项核心语义——与 fake-ctx 对拍，堵住测试盲区
 * （fake-ctx 曾把 agents 作普通属性注入，未注入访问不抛错）：
 *   ① 未注入服务访问抛 `cannot get property ... without inject`；
 *   ② `ctx.get(name, false)` 缺位安全返回 `undefined`；
 *   ③ `ctx.effect(fn)` 返回 disposer，disposer 触发真实清理语义。
 *
 * @param ctx 真实 cordis 的「运行时上下文」——必须是已激活的插件 fiber
 *   context（fiber.runtime 为 truthy），否则未注入访问按 root 语义静默返回
 *   undefined，断言①会红（调用方负责在插件回调内取 ctx）。
 */
export function assertRealCordisContextSemantics(ctx) {
  // ① 未注入服务访问抛错（cordis 严格属性检查）
  assert.throws(
    () => void ctx.agents,
    /cannot get property "agents" without inject/,
    "未注入服务访问必须抛 cannot get property ... without inject",
  );
  // ② ctx.get(name, false) 缺位安全返回 undefined
  assert.strictEqual(
    ctx.get("agents", false),
    undefined,
    "ctx.get(name, false) 缺位安全返回 undefined",
  );
  // ③ effect(fn) 返回 disposer 且触发真实清理
  let cleaned = 0;
  const disposer = ctx.effect(() => () => {
    cleaned++;
  });
  assert.strictEqual(typeof disposer, "function", "ctx.effect 返回 disposer 函数");
  disposer();
  assert.strictEqual(cleaned, 1, "disposer 触发真实清理语义");
  disposer(); // 二次调用应 no-op（单次清理）
  assert.strictEqual(cleaned, 1, "disposer 二次调用 no-op");
}

/**
 * 事件可达性契约断言。
 *
 * 把「依赖宿主 untagged listener ctx 放行」这一未文档化假设固化为可检测契约：
 * 真实 cordis Context（无 kScope 标签、平铺挂载形态）注册 untagged 与
 * `{ global: true }` 双监听，依次以三种派发形态验证：
 *   (a) 裸 emit（无 scope filter）→ 双监听均收到（基础可达）；
 *   (b) untagged 放行 filter → untagged 收到（宿主现状契约）；
 *   (c) scope 收紧 filter（untagged 不再放行）→ untagged 被拒、global 仍收到
 *       （{global:true} 消费端防御语义）。
 * 全程硬断言、无 skip/容错吞错：宿主 scope 语义收紧时 (b) 先红（fail-closed），
 * 而不是静默漏检。
 *
 * @param ctx 真实 cordis 插件 fiber context。
 * @param ContextClass cordis 的 Context 构造器（取 Context.filter symbol 构造
 *   scopeTarget 模拟 dsh-scope 派发形态；本模块不直接依赖 cordis 运行时）。
 * @param name 事件名（agent/status、session/event）。
 * @param payload 派发载荷。
 */
export function assertEventReachability(ctx, ContextClass, name, payload) {
  const received = [];
  ctx.on(name, (arg) => received.push(["untagged", arg]));
  ctx.on(name, (arg) => received.push(["global", arg]), { global: true });

  // (a) 裸 emit：无 filter → 双监听均可达
  received.length = 0;
  ctx.emit(name, payload);
  assert.ok(
    received.some(([tag]) => tag === "untagged"),
    `裸 emit 后 untagged listener 收到 ${name}`,
  );
  assert.ok(
    received.some(([tag]) => tag === "global"),
    `裸 emit 后 global listener 收到 ${name}`,
  );

  // (b) 宿主 untagged 放行契约：filter 对无 scope 标签的 listener ctx 放行
  received.length = 0;
  ctx.emit({ [ContextClass.filter]: () => true }, name, payload);
  assert.ok(
    received.some(([tag]) => tag === "untagged"),
    `untagged 放行语义下 untagged listener 收到 ${name}`,
  );
  assert.ok(
    received.some(([tag]) => tag === "global"),
    `untagged 放行语义下 global listener 收到 ${name}`,
  );

  // (c) fail-closed 反证 + {global:true} 防御：scope 收紧（untagged 不再放行）
  //     → untagged 被拒、global 仍收到
  received.length = 0;
  ctx.emit({ [ContextClass.filter]: () => false }, name, payload);
  assert.ok(
    !received.some(([tag]) => tag === "untagged"),
    `scope 收紧时 untagged listener 必须被拒（${name}）`,
  );
  assert.ok(
    received.some(([tag]) => tag === "global"),
    `scope 收紧时 global listener 仍收到（{global:true} 防御语义）`,
  );
}