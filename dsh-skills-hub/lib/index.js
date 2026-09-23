// dsh-skills-hub Host half：跨平台 AI Skills 统一管理器后端
//
// 以 ~/.agents/skills 为中心技能库（唯一数据源），通过系统符号链接把同一份技能
// 安装到多个 Agent 工具的技能目录；扫描本机实际存在的平台并只展示它们。
//
// 关键设计：
// - 零第三方运行时依赖：仅 node: 内置模块 + DSH 的 webServer 服务。
// - 跨平台链接：Windows 用 Junction（目录联接，免管理员权限）；macOS/Linux 用
//   标准目录符号链接（本就免权限）。
// - 卸载语义区分：
//     * 链接条目 → 只删链接，不动中心数据源。
//     * 本地真实目录（Agent 专属技能）→ 删除该平台下的数据源。
// - 中心技能库自身是数据源，不提供删除；只读平台（如 Claude Code）仅展示。
// - 元数据实时扫描自文件系统，无需数据库；仅"自定义平台"落盘到
//   ~/.skillsmanage/config.json（本地优先、轻量）。
//
// HTTP 路由（loopback-only + 写接口要求自定义标记头，防 DNS rebinding）：
//   GET  /api/dsh-skills-hub/state        -> { central, platforms }
//   POST /api/dsh-skills-hub/install      -> { platform, skill }
//   POST /api/dsh-skills-hub/uninstall    -> { platform, skill }   // 链接=删链接 / 本地=删数据源
//   POST /api/dsh-skills-hub/add-dir      -> { dir, name?, readonly? }
//   POST /api/dsh-skills-hub/remove-dir   -> { id }

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";

const name = "skills-hub";
const inject = ["webServer"];
const CLIENT_MARKER_HEADER = "x-dsh-skills-hub";

// 跨平台链接类型：
// - Windows 用 Junction（目录联接）：免管理员权限，且对目标目录读写无权限提升问题。
// - macOS / Linux 用 dir（标准目录符号链接）：本就无需管理员权限。
const IS_WINDOWS = platform() === "win32";
const LINK_TYPE = IS_WINDOWS ? "junction" : "dir";

// 内置平台映射表（含类别）。目录为常规约定；扫描时只展示本机实际存在的平台。
// role: central=数据源 / agent=可写平台 / custom=用户自定义平台
// readonly: 只读平台仅展示，不提供安装/卸载（如 Claude Code 官方限制）。
const PLATFORMS = [
  // Central
  { id: "agents", category: "Central", name: "中心技能库", dir: "~/.agents/skills", role: "central", readonly: false, exclude: [] },

  // Coding
  { id: "claude", category: "Coding", name: "Claude Code", dir: "~/.claude/skills", role: "agent", readonly: true, exclude: [] },
  { id: "codex", category: "Coding", name: "Codex CLI", dir: "~/.codex/skills", role: "agent", readonly: false, exclude: [".system"] },
  { id: "cursor", category: "Coding", name: "Cursor", dir: "~/.cursor/skills-cursor", role: "agent", readonly: false, exclude: [] },
  { id: "gemini", category: "Coding", name: "Gemini CLI", dir: "~/.gemini/skills", role: "agent", readonly: false, exclude: [] },
  { id: "trae", category: "Coding", name: "Trae", dir: "~/.trae/skills", role: "agent", readonly: false, exclude: [] },
  { id: "factory", category: "Coding", name: "Factory Droid", dir: "~/.factory/skills", role: "agent", readonly: false, exclude: [] },
  { id: "junie", category: "Coding", name: "Junie", dir: "~/.junie/skills", role: "agent", readonly: false, exclude: [] },
  { id: "qwen", category: "Coding", name: "Qwen", dir: "~/.qwen/skills", role: "agent", readonly: false, exclude: [] },
  { id: "trae-cn", category: "Coding", name: "Trae CN", dir: "~/.trae-cn/skills", role: "agent", readonly: false, exclude: [] },
  { id: "windsurf", category: "Coding", name: "Windsurf", dir: "~/.windsurf/skills", role: "agent", readonly: false, exclude: [] },
  { id: "qoder", category: "Coding", name: "Qoder", dir: "~/.qoder/skills", role: "agent", readonly: false, exclude: [] },
  { id: "augment", category: "Coding", name: "Augment", dir: "~/.augment/skills", role: "agent", readonly: false, exclude: [] },
  { id: "opencode", category: "Coding", name: "OpenCode", dir: "~/.opencode/skills", role: "agent", readonly: false, exclude: [] },
  { id: "kilocode", category: "Coding", name: "KiloCode", dir: "~/.kilocode/skills", role: "agent", readonly: false, exclude: [] },
  { id: "ob1", category: "Coding", name: "OB1", dir: "~/.ob1/skills", role: "agent", readonly: false, exclude: [] },
  { id: "amp", category: "Coding", name: "Amp", dir: "~/.amp/skills", role: "agent", readonly: false, exclude: [] },
  { id: "kiro", category: "Coding", name: "Kiro", dir: "~/.kiro/skills", role: "agent", readonly: false, exclude: [] },
  { id: "codebuddy", category: "Coding", name: "CodeBuddy", dir: "~/.codebuddy/skills", role: "agent", readonly: false, exclude: [] },
  { id: "hermes", category: "Coding", name: "Hermes", dir: "~/.hermes/skills", role: "agent", readonly: false, exclude: [] },
  { id: "copilot", category: "Coding", name: "Copilot", dir: "~/.copilot/skills", role: "agent", readonly: false, exclude: [] },
  { id: "aider", category: "Coding", name: "Aider", dir: "~/.aider/skills", role: "agent", readonly: false, exclude: [] },

  // Lobster
  { id: "openclaw", category: "Lobster", name: "OpenClaw", dir: "~/.openclaw/skills", role: "agent", readonly: false, exclude: [] },
  { id: "qclaw", category: "Lobster", name: "QClaw", dir: "~/.qclaw/skills", role: "agent", readonly: false, exclude: [] },
  { id: "autoclaw", category: "Lobster", name: "AutoClaw", dir: "~/.openclaw-autoclaw/skills", role: "agent", readonly: false, exclude: [] },
  { id: "workbuddy", category: "Lobster", name: "WorkBuddy", dir: "~/.workbuddy/skills-marketplace/skills", role: "agent", readonly: false, exclude: [] },
];

// ---- 基础工具 -----------------------------------------------------------------

/** 展开路径开头的 ~ 为用户主目录。 */
function expandDir(dir) {
  if (dir === "~") return homedir();
  if (dir.startsWith("~/") || dir.startsWith("~\\")) return join(homedir(), dir.slice(2));
  return dir;
}

/** 技能名只允许安全的目录名，杜绝路径穿越。 */
function validSkillName(s) {
  return typeof s === "string" && /^[a-zA-Z0-9._-]+$/.test(s) && s !== "." && s !== "..";
}

// ---- 配置（本地优先，仅自定义平台） ---------------------------------------------

const CONFIG_DIR = join(homedir(), ".skillsmanage");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

function readConfig() {
  try {
    const obj = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    return obj && typeof obj === "object" ? obj : { customDirs: [] };
  } catch {
    return { customDirs: [] };
  }
}

function writeConfig(cfg) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

// ---- 扫描 ---------------------------------------------------------------------

/** 扫描一个目录，返回技能列表（含是否链接及链接目标）。 */
function scanDir(dir, exclude) {
  const real = expandDir(dir);
  let entries = [];
  try {
    entries = readdirSync(real, { withFileTypes: true });
  } catch {
    return { exists: false, skills: [] };
  }
  const excl = new Set(exclude || []);
  const skills = [];
  for (const e of entries) {
    if (excl.has(e.name)) continue;
    if (!e.isDirectory() && !e.isSymbolicLink()) continue; // 跳过普通文件
    let linkType = "";
    let target = "";
    if (e.isSymbolicLink()) {
      linkType = IS_WINDOWS ? "Junction" : "Symlink";
      try {
        target = readlinkSync(join(real, e.name));
      } catch {
        target = "";
      }
    }
    skills.push({ name: e.name, linkType, target });
  }
  return { exists: true, skills };
}

/** 合并内置平台 + 自定义平台。 */
function combinedPlatforms() {
  const cfg = readConfig();
  const custom = (Array.isArray(cfg.customDirs) ? cfg.customDirs : []).map((d) => ({
    id: d.id,
    category: "自定义",
    name: d.name || "自定义目录",
    dir: d.dir,
    role: "custom",
    readonly: !!d.readonly,
    exclude: [],
    custom: true,
  }));
  return PLATFORMS.concat(custom);
}

function platformById(id) {
  for (const p of combinedPlatforms()) if (p.id === id) return p;
  return undefined;
}

/** 全量扫描：只返回本机实际存在的平台；另返回中心技能名供安装下拉。 */
function scanAll() {
  const platforms = [];
  let centralSkills = [];
  for (const p of combinedPlatforms()) {
    const r = scanDir(p.dir, p.exclude);
    if (p.role === "central") centralSkills = r.skills.map((s) => s.name);
    if (!r.exists) continue; // 不存在的平台不展示
    platforms.push({
      id: p.id,
      name: p.name,
      dir: p.dir,
      role: p.role,
      category: p.category,
      readonly: p.readonly,
      exists: true,
      skills: r.skills,
    });
  }
  return { central: centralSkills, platforms };
}

// ---- 安装 / 卸载 ---------------------------------------------------------------

/** 安装：在目标平台创建指向中心技能库的 Junction。 */
function installSkill(platformId, skill) {
  if (!validSkillName(skill)) return { ok: false, error: "非法技能名: " + skill };
  const p = platformById(platformId);
  if (!p) return { ok: false, error: "未知平台: " + platformId };
  if (p.role === "central") return { ok: false, error: "中心技能库是数据源，不是安装目标" };
  if (p.readonly) return { ok: false, error: p.name + " 是只读平台" };

  const src = join(expandDir("~/.agents/skills"), skill);
  if (!existsSync(src)) return { ok: false, error: "中心技能库不存在该技能: " + skill };

  const destDir = expandDir(p.dir);
  try {
    mkdirSync(destDir, { recursive: true });
  } catch (e) {
    return { ok: false, error: "无法创建目标目录: " + String(e && e.message ? e.message : e) };
  }

  const link = join(destDir, skill);
  if (existsSync(link)) {
    let st = null;
    try {
      st = lstatSync(link);
    } catch {
      st = null;
    }
    if (st && st.isSymbolicLink()) return { ok: true, status: "ALREADY_LINKED" };
    return { ok: false, status: "EXISTS_REAL", error: "目标已存在真实目录，拒绝覆盖: " + link };
  }

  try {
    symlinkSync(src, link, LINK_TYPE);
  } catch (e) {
    return { ok: false, error: "创建链接失败: " + String(e && e.message ? e.message : e) };
  }
  return { ok: true, status: "INSTALLED" };
}

/**
 * 卸载：按条目类型区分语义。
 *   - 链接条目（Junction）→ 只删链接，不动中心数据源。
 *   - 本地真实目录（Agent 专属技能）→ 删除该平台下的数据源。
 */
function uninstallSkill(platformId, skill) {
  if (!validSkillName(skill)) return { ok: false, error: "非法技能名: " + skill };
  const p = platformById(platformId);
  if (!p) return { ok: false, error: "未知平台: " + platformId };
  if (p.readonly) return { ok: false, error: p.name + " 是只读平台" };
  if (p.role === "central") return { ok: false, error: "中心技能库是数据源，不提供删除" };

  const target = join(expandDir(p.dir), skill);
  if (!existsSync(target)) return { ok: true, status: "NOT_FOUND" };

  let st = null;
  try {
    st = lstatSync(target);
  } catch (e) {
    return { ok: false, error: "无法读取目标: " + String(e && e.message ? e.message : e) };
  }

  if (st.isSymbolicLink()) {
    try {
      unlinkSync(target); // 只删链接，不递归到中心数据源
    } catch (e) {
      return { ok: false, error: "删除链接失败: " + String(e && e.message ? e.message : e) };
    }
    return { ok: true, status: "UNLINKED", kind: "link" };
  }

  if (st.isDirectory()) {
    try {
      rmSync(target, { recursive: true, force: true }); // 删除该平台下的专属数据源
    } catch (e) {
      return { ok: false, error: "删除数据源失败: " + String(e && e.message ? e.message : e) };
    }
    return { ok: true, status: "DELETED", kind: "real" };
  }

  return { ok: false, error: "目标既非目录也非链接，拒绝删除: " + target };
}

// ---- 自定义平台 -----------------------------------------------------------------

function addDir(name, dir, readonly) {
  if (!dir || typeof dir !== "string" || dir.trim() === "") return { ok: false, error: "目录不能为空" };
  const cfg = readConfig();
  const dirs = Array.isArray(cfg.customDirs) ? cfg.customDirs.slice() : [];
  const id = "custom-" + Date.now().toString(36);
  dirs.push({ id, name: (name && name.trim()) || dir.trim(), dir: dir.trim(), readonly: !!readonly });
  cfg.customDirs = dirs;
  try {
    writeConfig(cfg);
  } catch (e) {
    return { ok: false, error: "写入配置失败: " + String(e && e.message ? e.message : e) };
  }
  return { ok: true, id };
}

function removeDir(id) {
  if (!id || typeof id !== "string") return { ok: false, error: "缺少 id" };
  const cfg = readConfig();
  const dirs = Array.isArray(cfg.customDirs) ? cfg.customDirs.slice() : [];
  cfg.customDirs = dirs.filter((d) => d.id !== id);
  try {
    writeConfig(cfg);
  } catch (e) {
    return { ok: false, error: "写入配置失败: " + String(e && e.message ? e.message : e) };
  }
  return { ok: true, status: "REMOVED" };
}

// ---- HTTP 层 -------------------------------------------------------------------

function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let settled = false;
    const chunks = [];
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on("data", (c) => {
      if (settled) return;
      size += c.length;
      if (size > limit) {
        const error = new Error("body too large");
        error.statusCode = 413;
        error.code = "error.proto.bodyTooLarge";
        fail(error);
        req.resume();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (settled) return;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        settled = true;
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        const error = new Error(`invalid JSON body: ${e.message}`);
        error.statusCode = 400;
        error.code = "error.proto.invalidJson";
        fail(error);
      }
    });
    req.on("error", fail);
  });
}

/** 只允许 loopback Host，避免 DNS rebinding。 */
function validateLoopbackHost(req) {
  const host = String(req.headers.host || "").toLowerCase();
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    return { statusCode: 403, code: "error.proto.forbiddenHost", error: "forbidden host" };
  }
  return null;
}

/** 写接口额外要求自定义头与 JSON。 */
function validateMutationRequest(req) {
  const hostError = validateLoopbackHost(req);
  if (hostError) return hostError;
  if (req.headers[CLIENT_MARKER_HEADER] !== "1") {
    return { statusCode: 403, code: "error.proto.forbidden", error: "forbidden mutation request" };
  }
  const contentType = String(req.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return { statusCode: 415, code: "error.proto.contentType", error: "content-type must be application/json" };
  }
  return null;
}

function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function run(res, task) {
  return Promise.resolve().then(task).then((r) => {
    if (r && r.ok === false) json(res, 400, r);
    else json(res, 200, { ok: true, data: r });
  }).catch((e) => {
    json(res, Number.isInteger(e && e.statusCode) ? e.statusCode : 500, {
      ok: false,
      ...(e && e.code ? { code: e.code } : {}),
      error: String(e && e.message ? e.message : e),
    });
  });
}

function apply(ctx) {
  const route = ctx.webServer.register({
    kind: "prefix",
    path: "/api/dsh-skills-hub",
    handler: async (req, res) => {
      const u = new URL(req.url, "http://localhost");
      const path = u.pathname.replace(/\/+$/, "");
      try {
        const hostError = validateLoopbackHost(req);
        if (hostError) {
          json(res, hostError.statusCode, { ok: false, code: hostError.code, error: hostError.error });
          return;
        }
        if (req.method === "GET" && path === "/api/dsh-skills-hub/state") {
          return run(res, () => scanAll());
        }
        if (req.method !== "POST") {
          json(res, 405, { ok: false, code: "error.proto.method", error: `method not allowed: ${req.method}` });
          return;
        }
        const requestError = validateMutationRequest(req);
        if (requestError) {
          json(res, requestError.statusCode, { ok: false, code: requestError.code, error: requestError.error });
          return;
        }
        const body = await readBody(req);
        switch (path) {
          case "/api/dsh-skills-hub/install":
            return run(res, () => installSkill(String(body.platform || ""), String(body.skill || "")));
          case "/api/dsh-skills-hub/uninstall":
            return run(res, () => uninstallSkill(String(body.platform || ""), String(body.skill || "")));
          case "/api/dsh-skills-hub/add-dir":
            return run(res, () => addDir(body.name, body.dir, body.readonly));
          case "/api/dsh-skills-hub/remove-dir":
            return run(res, () => removeDir(body.id));
          default:
            json(res, 404, { ok: false, code: "error.proto.unknownAction", error: `unknown action: ${path}` });
        }
      } catch (e) {
        json(res, Number.isInteger(e && e.statusCode) ? e.statusCode : 500, {
          ok: false,
          ...(e && e.code ? { code: e.code } : {}),
          error: String(e && e.message ? e.message : e),
        });
      }
    },
  });
  return route;
}

// 导出核心纯函数供单元测试与复用（apply/inject/name 为 Cordis 插件契约）。
export {
  apply,
  inject,
  name,
  IS_WINDOWS,
  LINK_TYPE,
  expandDir,
  validSkillName,
  scanDir,
  scanAll,
  combinedPlatforms,
  platformById,
  installSkill,
  uninstallSkill,
  addDir,
  removeDir,
  readConfig,
  writeConfig,
};
