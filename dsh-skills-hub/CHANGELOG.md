# Changelog

## [0.3.1] - 2026-08-28

- 开源仓库完备化：LICENSE copyright 归 jason；`package.json` 补 `author` / `repository` / `homepage` / `bugs`。
- README 主文档改为英文版（`README.md`），中文版移至 `README.zh.md`。
- 文档补充环境要求（Node.js >= 20 / DSH / pnpm）与支持的操作系统说明。

## [0.3.0] - 2026-08-28

- 跨平台链接支持：Windows 用 Junction（免管理员），macOS/Linux 用目录符号链接。
- 新增一键安装脚本 `scripts/install.ps1`（Windows）与 `scripts/install.sh`（macOS/Linux）。
- README 补全开源文档：支持的操作系统、前置条件、一键安装 / `dsh plugin add` / 手动安装三种方式、文件结构、能力说明。
- 单元测试新增跨平台链接类型断言。

## [0.2.0] - 2026-08-28

- 内置平台映射扩展为 26 个常规 Agent 工具（含类别 Central/Coding/Lobster）。
- 扫描后**仅展示本机实际存在的平台**，未安装的工具不再占用界面。
- 去掉独立「中心目录」区域，中心技能库作为平台卡片展示（数据源，不可删除）。
- 卸载语义区分：
  - 链接条目 → 只删链接、不动数据源。
  - 本地专属技能 → 删除该平台下的数据源。
- UI 按类别分组；「卸载」（链接）与「删除」（本地数据源）按钮区分。
- 新增自定义平台（原自定义目录）支持。

## [0.1.0] - 2026-08-19

- 初版：跨平台 Skills Hub。
- 中心目录 `~/.agents/skills` 扫描 + 各 Agent 平台技能清单展示。
- Windows Junction 一键安装 / 卸载（只删链接、不动数据源）。
- 内置 8 个平台映射（Claude Code 只读）。
- 自定义技能目录管理，配置持久化到 `~/.skillsmanage/config.json`。
- 零第三方运行时依赖、无数据库，轻量优先。
