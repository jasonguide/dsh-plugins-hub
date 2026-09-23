// 核心逻辑单元测试：验证 node:fs 的链接行为与卸载语义依赖的原语。
// 运行：node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, lstatSync, readlinkSync, symlinkSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expandDir, validSkillName, uninstallSkill, LINK_TYPE, IS_WINDOWS } from "../lib/index.js";

test("链接类型随平台选择（Windows=Junction / 其他=dir）", () => {
  if (IS_WINDOWS) {
    assert.equal(LINK_TYPE, "junction", "Windows 应使用 Junction（免管理员）");
  } else {
    assert.equal(LINK_TYPE, "dir", "macOS/Linux 应使用目录符号链接");
  }
});

test("expandDir 展开 ~ 为用户主目录", () => {
  const home = expandDir("~");
  assert.ok(home && home.length > 1 && !home.includes("~"), "应展开为绝对路径");
  assert.ok(expandDir("~/foo").endsWith(join("foo")), "~ 后接路径应正确拼接");
  assert.equal(expandDir("C:\\x"), "C:\\x", "非 ~ 路径原样返回");
});

test("validSkillName 拒绝非法技能名", () => {
  assert.ok(validSkillName("code-review"));
  assert.ok(validSkillName("a.b_c-1"));
  assert.ok(!validSkillName("../evil"));
  assert.ok(!validSkillName(".."));
  assert.ok(!validSkillName("has space"));
  assert.ok(!validSkillName("中文"));
  assert.ok(!validSkillName(""));
  assert.ok(!validSkillName(null));
});

test("Junction：创建/检测/读取/删除（node:fs 原语）", () => {
  const base = mkdtempSync(join(tmpdir(), "skhub-test-"));
  try {
    const src = join(base, "src-skill");
    mkdirSync(src);
    writeFileSync(join(src, "SKILL.md"), "---\nname: demo\n---\n");

    const link = join(base, "linked-skill");
    symlinkSync(src, link, "junction");

    // 检测：lstat 不跟随链接，isSymbolicLink 为 true
    const st = lstatSync(link);
    assert.ok(st.isSymbolicLink(), "Junction 应被识别为 symbolic link");
    assert.ok(!st.isDirectory(), "lstat 不应跟随 Junction 到目标目录");

    // 读取 target
    assert.equal(readlinkSync(link), src, "readlink 应返回中心目录目标");

    // 删除：unlink 只删链接，不动目标
    unlinkSync(link);
    assert.ok(!existsSync(link), "链接应被删除");
    assert.ok(existsSync(join(src, "SKILL.md")), "中心目录内容不应被删除");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("Junction 目标目录内容可见（一份数据源驱动）", () => {
  const base = mkdtempSync(join(tmpdir(), "skhub-test-"));
  try {
    const src = join(base, "src-skill");
    mkdirSync(src);
    writeFileSync(join(src, "SKILL.md"), "hello from source");

    const link = join(base, "linked");
    symlinkSync(src, link, "junction");

    // 通过 Junction 读取目标内容
    assert.equal(readFileSync(join(link, "SKILL.md"), "utf8"), "hello from source", "经 Junction 应能读到中心目录内容");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("卸载语义原语：rmSync 递归删除真实目录（专属技能数据源）", () => {
  const base = mkdtempSync(join(tmpdir(), "skhub-test-"));
  try {
    const real = join(base, "local-skill");
    mkdirSync(real);
    writeFileSync(join(real, "SKILL.md"), "local data");

    // 模拟 uninstallSkill 对真实目录的分支
    const st = lstatSync(real);
    assert.ok(st.isDirectory(), "真实目录应识别为 directory");
    assert.ok(!st.isSymbolicLink(), "真实目录不应是链接");

    rmSync(real, { recursive: true, force: true });
    assert.ok(!existsSync(real), "真实目录数据源应被删除");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("uninstallSkill 拒绝删除中心技能库（数据源保护）", () => {
  const r = uninstallSkill("agents", "code-review");
  assert.equal(r.ok, false, "中心技能库应拒绝删除");
  assert.match(r.error, /数据源/, "错误信息应说明是数据源");
});

test("uninstallSkill 拒绝只读平台", () => {
  // claude 是只读平台（若目录不存在会先走到 readonly 校验，仍应拒绝）
  const r = uninstallSkill("claude", "anything");
  assert.equal(r.ok, false, "只读平台应拒绝删除");
  assert.match(r.error, /只读/, "错误信息应说明只读");
});
