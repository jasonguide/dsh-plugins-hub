# dsh-skills-hub

[![npm version](https://img.shields.io/npm/v/dsh-skills-hub.svg?style=flat-square)](https://www.npmjs.com/package/dsh-skills-hub)

> **English:** [README.md](./README.md)

跨平台 AI Skills 统一管理器（DeepSeek Harness 插件）。

把同一份技能从**中心技能库 `~/.agents/skills`** 通过**系统符号链接**一键安装到多个 Agent 工具，实现"一份数据源驱动多工具"——不再因为切换 Agent 而重复拷贝技能。

> 一个数据源，驱动多个 AI 编码工具。

## 支持的操作系统

| 系统 | 链接类型 | 权限要求 |
|---|---|---|
| **Windows** | 目录联接（Junction） | 免管理员权限 |
| **macOS** | 目录符号链接（Symlink） | 免管理员权限 |
| **Linux** | 目录符号链接（Symlink） | 免管理员权限 |

插件运行时零第三方依赖（仅 Node.js 内置模块），DSH 本身支持 Windows / macOS / Linux，因此本插件同样跨平台可用。Windows 上使用 Junction 是因为它对目录联接无需管理员权限；macOS / Linux 使用标准符号链接。

## 功能

- **中心技能库管理**：以 `~/.agents/skills` 为唯一数据源，实时扫描技能清单。
- **只展示本机已安装的平台**：内置 26 个常见 Agent 工具的目录映射，扫描后仅显示实际存在的平台，未安装的工具不占用界面。
- **一键安装**：把任意中心技能通过符号链接安装到各 Agent 平台（跨平台、免管理员权限）。
- **卸载语义区分**：
  - **链接条目**（指向中心技能库）→ 只删链接，不动数据源。
  - **本地专属技能**（Agent 工具自己的真实目录）→ 删除该平台下的数据源。
- **只读平台**：Claude Code 等只读平台仅展示，不提供安装/卸载。
- **自定义平台**：可在设置中添加任意本地 Skills 目录统一管理，配置持久化到 `~/.skillsmanage/config.json`。
- **本地优先、无数据库**：元数据实时扫描自文件系统，不引入 SQLite，轻量为主。

## 截图

**设置 → 技能中心**：中心技能库与各平台卡片按类别分组展示，仅显示本机已安装的平台。

<p align="center">
  <img src="docs/01管理入口.png" alt="管理入口" width="540" />
</p>

把中心技能安装到目标平台 —— 创建指向中心技能库的链接：

<p align="center">
  <img src="docs/02安装新技能.png" alt="安装新技能" width="720" />
</p>

卸载**链接**条目 —— 只删链接，中心数据源不受影响：

<p align="center">
  <img src="docs/03卸载技能.png" alt="卸载技能" width="720" />
</p>

删除**本地**技能 —— 移除该平台自己的数据源：

<p align="center">
  <img src="docs/04删除技能.png" alt="删除技能" width="720" />
</p>

## 环境要求

| 项 | 最低要求 |
|---|---|
| 操作系统 | Windows / macOS / Linux |
| Node.js | **>= 20**（`package.json` 的 `engines` 声明） |
| DSH（DeepSeek Harness） | 已安装，`dsh` 命令在 PATH 中 |
| pnpm | 已安装（`dsh plugin` 内部使用） |

插件自身零运行时依赖；Node.js 由 DSH 宿主进程提供。

## 工作原理

```
~/.agents/skills/            ← 中心技能库（唯一数据源）
├── code-review/
├── book-to-skill/
└── ...

~/.codex/skills/             ← Codex 技能目录
├── book-to-skill/           → 链接 → ~/.agents/skills/book-to-skill   （链接：卸载=删链接）
└── ddm-bigscreen/                                                    （本地：卸载=删数据源）
```

- **Windows**：Junction（目录联接，免管理员权限）；**macOS / Linux**：目录符号链接。
- 链接条目卸载调用 `unlink`（只删链接）；本地真实目录卸载调用 `rm -rf`（删除该平台数据源）。

## 安装

### 前置条件

- 已安装 **DeepSeek Harness (DSH)**，且 `dsh` 命令在 PATH 中（安装 DSH 后自带）。
- 已安装 **pnpm**（`dsh plugin` 内部调用 pnpm 管理 profile 依赖）：

  ```powershell
  npm install -g pnpm
  ```

### 方式一：一键安装脚本（推荐）

在克隆/解压的仓库根目录执行：

**Windows（PowerShell）**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install.ps1
# 或
pwsh scripts/install.ps1
```

**macOS / Linux**

```bash
bash scripts/install.sh
```

脚本会调用 `dsh plugin --profile web add <本目录>` 完成安装（自动 pnpm 安装并挂载），无需手动改任何配置。

### 方式二：`dsh plugin add` 命令

**从本地源码（在仓库根目录）：**

```powershell
dsh plugin --profile web add .
```

**从 npm 安装：**

```powershell
dsh plugin --profile web add dsh-skills-hub
```

> `dsh plugin add` 会自动把声明了 `dsh.bundle.patch` 的包加入 `dsh.profile.bundles`，并应用插件自带的 `cordis.patch.yml`，无需手动编辑 profile 配置。重新运行同一命令可升级。

### 方式三：手动安装（开发调试）

```powershell
# 1. 编辑 ~/.dsh/profiles/web/package.json
#    dependencies 增加：  "dsh-skills-hub": "link:<本目录绝对路径>"
# 2. 在 profile 目录安装
cd ~/.dsh/profiles/web
pnpm install
# 3. 确认 cordis.patch.yml 中有 insert 条目（或依赖 bundles 自动挂载）
```

> 无论哪种方式，安装后都需**重启 DSH** 才能生效。

## 使用

进入 DSH **设置 → 技能中心**：

- 平台按类别（Central / Coding / Lobster / 自定义）分组，仅显示本机已安装的平台。
- 中心技能库卡片展示全部可用技能（数据源，不可删除）。
- 每个 Agent 平台卡片显示已装技能（区分「链接」与「本地」），提供安装下拉框：
  - 链接条目 →「卸载」按钮（只删链接）。
  - 本地条目 →「删除」按钮（删除该平台数据源）。
- 底部可添加自定义平台（目录路径 + 可选显示名称）。

## 平台映射

内置映射（仅列出常规目录；扫描后只显示本机实际存在的平台）：

| 类别 | 平台 | Skills 目录 | 可写 |
|---|---|---|---|
| Central | 中心技能库 | `~/.agents/skills` | 数据源 |
| Coding | Claude Code | `~/.claude/skills` | 只读 |
| Coding | Codex CLI | `~/.codex/skills` | ✅（排除 `.system`） |
| Coding | Cursor | `~/.cursor/skills-cursor` | ✅ |
| Coding | Gemini CLI | `~/.gemini/skills` | ✅ |
| Coding | Trae | `~/.trae/skills` | ✅ |
| Coding | Factory Droid | `~/.factory/skills` | ✅ |
| Coding | Junie | `~/.junie/skills` | ✅ |
| Coding | Qwen | `~/.qwen/skills` | ✅ |
| Coding | Trae CN | `~/.trae-cn/skills` | ✅ |
| Coding | Windsurf | `~/.windsurf/skills` | ✅ |
| Coding | Qoder | `~/.qoder/skills` | ✅ |
| Coding | Augment | `~/.augment/skills` | ✅ |
| Coding | OpenCode | `~/.opencode/skills` | ✅ |
| Coding | KiloCode | `~/.kilocode/skills` | ✅ |
| Coding | OB1 | `~/.ob1/skills` | ✅ |
| Coding | Amp | `~/.amp/skills` | ✅ |
| Coding | Kiro | `~/.kiro/skills` | ✅ |
| Coding | CodeBuddy | `~/.codebuddy/skills` | ✅ |
| Coding | Hermes | `~/.hermes/skills` | ✅ |
| Coding | Copilot | `~/.copilot/skills` | ✅ |
| Coding | Aider | `~/.aider/skills` | ✅ |
| Lobster | OpenClaw | `~/.openclaw/skills` | ✅ |
| Lobster | QClaw | `~/.qclaw/skills` | ✅ |
| Lobster | AutoClaw | `~/.openclaw-autoclaw/skills` | ✅ |
| Lobster | WorkBuddy | `~/.workbuddy/skills-marketplace/skills` | ✅ |

> 提示：内置平台映射在 `lib/index.js` 的 `PLATFORMS` 常量中，可按需增删改；也可以在设置界面添加自定义平台（持久化到 `~/.skillsmanage/config.json`），无需改代码。

## 目录结构

```
dsh-skills-hub/
├── package.json          # 插件清单（dsh.client / dsh.bundle.patch 声明）
├── cordis.patch.yml      # bundle patch（insert 条目，dsh plugin add 自动应用）
├── lib/
│   ├── index.js          # Host half：node:fs 符号链接 + webServer 路由
│   └── client.js         # Client half：设置页 UI（__ModuleLoader__.load）
├── scripts/
│   ├── install.ps1       # Windows 一键安装脚本
│   └── install.sh        # macOS / Linux 一键安装脚本
├── test/core.test.js     # 单元测试（链接原语 + 卸载语义 + 跨平台链接类型）
├── README.md             # 英文版（GitHub 主页默认显示）
├── README.zh.md          # 中文版（本文件）
├── LICENSE
└── CHANGELOG.md
```

## 安全

- 写接口仅接受 loopback Host（`localhost` / `127.0.0.1`），并要求自定义标记头，防 DNS rebinding。
- 技能名校验白名单 `[a-zA-Z0-9._-]`，杜绝路径穿越。
- 中心技能库自身永不删除；链接卸载只删链接、不动数据源。
- 本地真实目录删除为显式用户操作，且在 UI 上以「删除」（红色）区别于「卸载」（链接）。

## License

MIT
