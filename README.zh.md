# dsh-plugins-hub

[English](./README.md) · **简体中文**

一个 DeepSeek Harness (DSH) 插件中心，包含一些日常使用中的想法实现。

每个插件都放在自己的顶层目录里，可独立安装——这个仓库是它们的家，本身不是一个包。

## 插件

| 插件 | 说明 | 许可 |
| --- | --- | --- |
| [`dsh-process-manager`](./dsh-process-manager) | DSH Web GUI 的 Windows 进程 / 监听端口面板：侧边栏一个入口，列出本机所有监听端口（程序名、PID、协议、地址、路径），并能直接结束占用某个端口的进程——先优雅关闭再强制。 | MIT |
| [`dsh-skills-hub`](./dsh-skills-hub) | 跨平台 AI Skills 统一管理器：以 `~/.agents/skills` 为中心技能库，通过符号链接把同一份技能安装到 Claude Code、Cursor、Codex、Gemini CLI、Trae、Windsurf 等工具，在一处完成安装、卸载与查看。 | MIT |

每个目录都是一个完整、独立的插件包，自带 `package.json`、`README.md`、`LICENSE` 与测试。

## 安装某个插件

每个插件都可以直接从本仓库单独安装，使用 pnpm 的 git 子目录写法（`#path:<目录名>`）：

```powershell
dsh plugin --profile web add github:jasonguide/dsh-plugins-hub#path:dsh-process-manager
```

把 `#path:` 换成另一个插件的目录名即可安装它。

也可以克隆后本地 link 子目录（开发调试时更方便）：

```powershell
git clone https://github.com/jasonguide/dsh-plugins-hub
dsh plugin --profile web add link:E:/path/to/dsh-plugins-hub/dsh-process-manager
```

安装后需要重启 `dsh web`——DSH 插件是宿主进程级的，host 半边与浏览器 bundle 都在启动时合成。

各插件的要求、配置与用法见它自己的 README。

## 仓库结构

```
dsh-plugins-hub/
├── dsh-process-manager/     # 独立插件包
│   ├── lib/                 # host 半边、浏览器半边、PowerShell 脚本
│   ├── test/                # host 侧测试
│   ├── cordis.patch.yml     # 把插件行插入 profile 的 bundle 补丁
│   └── package.json         # 声明 dsh.bundle.patch 与 dsh.client
├── dsh-skills-hub/          # 独立插件包
└── README.md
```

每个插件形态一致：包内声明 `dsh.bundle.patch`（它的行如何加入 DSH profile）与 `dsh.client`（它有浏览器半边）。没有任何中心化配置——加一个插件就是加一个目录。

## 本仓库的插件约定

- **自包含。** 插件的源码、测试、文档、许可证全在自己的目录内，不跨插件 import。
- **优先零构建。** 仓库里的 JavaScript 就是最终产物，`dsh plugin add` 不需要编译，也不需要批准 pnpm 的构建脚本。
- **自带 README 与 LICENSE。** 每个目录自己说明自己、自己授权；本根 README 只做索引。
- **测试在插件目录内运行**，一条 `node test/...` 即可，不依赖仓库级工具链，因此任何单个插件都能被单独拎出去。

## 不在本仓库中的内容

有两个插件被刻意排除在版本控制之外，由根 `.gitignore` 强制：

- `dsh-mcp` —— [ArvinQi/dsh-mcp](https://github.com/ArvinQi/dsh-mcp)，他人项目。
- `dsh-pocket-pro` —— [shaobeichen/dsh-pocket](https://github.com/shaobeichen/dsh-pocket) 的 fork，采用 GPL-2.0。

它们可以留在工作目录里供本地开发，但不是本仓库的代码；把一个 GPL-2.0 代码库挡在 MIT 仓库之外，也避免许可证冲突。

## 许可证

每个插件按各自目录内的许可条款单独授权。本仓库当前的所有插件均为 MIT。
