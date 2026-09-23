# dsh-process-manager

[English](./README.md) · **简体中文**

> 面向 [DSH](https://www.npmjs.com/package/@deepseek-ai/dsh) Web GUI 的 **Windows 进程 / 监听端口管理面板**：侧边栏一个入口，列出本机所有正在监听的端口（程序名、PID、协议、本地地址、可执行文件路径），并可以直接结束占用某个端口的进程。

它的定位是「资源监视器 → 网络」那张表的可操作版本：同样按端口看服务，但多了一个能直接按下去的「终止」按钮。

```
侧边栏                                    主面板
┌────────────────────────┐   ┌──────────────────────────────────────────────┐
│  ↑ 新会话               │   │ 进程管理                 [管理员权限] [刷新]  │
│  ▣ 任务看板             │   │ 本机监听端口 · 按端口合并  [107 个端口 / 192  │
│  ▣ SSH                 │   │                          个端点 · 61 TCP]    │
│  ▣ 技能中心             │   ├──────────────────────────────────────────────┤
│  ▣ 进程管理   ← 本插件  │   │ 🔍 搜索 程序名 / PID / 端口 / 路径           │
│  ─────────────────────  │   ├──────────────────────────────────────────────┤
│  工作区                 │   │ 程序名 ▲  PID   协议  本地地址:端口 …  操作   │
│  ...                   │   │ node.exe  26864 TCP   :47894    LISTENING 终止│
│                        │   │ D:\...\nodejs\node.exe                       │
└────────────────────────┘   └──────────────────────────────────────────────┘
```

## 功能

| 能力 | 说明 |
| --- | --- |
| 监听端口总览 | TCP `LISTENING` + 全部 UDP 绑定端点，等价于 `netstat -ano` 的监听视图 |
| 按端口合并 | `0.0.0.0:8080`、`127.0.0.1:8080`、`[::]:8080` 合并成一行；一个端口多个进程时展开选择 |
| 列表排序 | 点击任意列标题按该列排序：升序 → 降序 → 恢复默认；默认按端口从小到大 |
| 搜索过滤 | 按程序名 / PID / 端口 / 可执行文件路径即时过滤 |
| 结束进程 | 先请求优雅关闭，超过宽限期才强制结束；结果就地展示（成功 / 无权限 / 已退出 / 受保护…） |
| 安全护栏 | 系统关键进程与 DSH 自身进程受保护；终止前重新校验「该 PID 是否仍占用该端口」，防止 PID 复用误杀 |
| 权限提示 | 面板顶部徽章显示当前 DSH 是否以管理员身份运行 |

列表列为 **程序名**（下方一行显示可执行文件路径）、**PID**、**协议**、**本地地址:端口**、**状态**、**操作**。表头与数据严格左对齐；两个需要快速定位的字段被刻意做成行内最醒目的元素——**程序名**用主题最亮色 16px 加粗，**端口号**用主题的成功色（绿）16px 加粗，其后的地址文字降为三级文字色后退，避免抢走注意力。

面板形态与 DSH 自带的 **SSH** 面板一致：侧边栏一个入口，点击后接管中间主区域，跟随当前皮肤与深/浅色主题。

## 平台与要求

- **仅 Windows**（依赖 `Get-NetTCPConnection` / `Get-NetUDPEndpoint` / `Get-CimInstance Win32_Process`）。
- DSH `>= 0.1.2-rc.1`，Web 端。已在 DSH `0.1.6-alpha.2` + Node 24 上验证。
- 无运行时依赖、无构建步骤：仓库里的 JavaScript 就是最终产物。
- Windows PowerShell 5.1 与 PowerShell 7 均已验证（自动探测 `pwsh.exe`，回退 `powershell.exe`）。

> 权限说明：能看到哪些进程、能否结束别的用户/更高权限的进程，取决于 DSH 宿主进程自身的权限。以管理员身份启动 `dsh web` 时能力最完整；普通权限下，受保护或跨权限的进程会返回明确的失败原因，而不是静默失败。

## 安装

### 方式一：直接从 GitHub 安装

```powershell
dsh plugin --profile web add github:<你的GitHub用户名>/dsh-process-manager
```

本包声明了 `dsh.bundle.patch` 且没有构建步骤，pnpm 可以直接安装——不需要 allowBuilds，也不需要编译。

### 方式二：link 本地目录（开发调试用）

```powershell
# 1. 把插件放到任意目录，例如 E:\plugins\dsh-process-manager
# 2. 装进 web profile（link 依赖 + 插入 bundle 行）
dsh plugin --profile web add link:E:/plugins/dsh-process-manager
```

`dsh plugin add` 会把该包加入 `~/.dsh/profiles/web/package.json`，并因为它在 `package.json` 里声明了 `dsh.bundle.patch`，自动把这一层挂进 `dsh.profile.bundles`。

### 方式三：手工挂载

编辑 `~/.dsh/profiles/web/package.json`：

```jsonc
{
  "dependencies": {
    "dsh-process-manager": "link:E:/plugins/dsh-process-manager"
  },
  "dsh": {
    "profile": {
      "bundles": [
        // ...原有层...
        "dsh-process-manager"
      ]
    }
  }
}
```

然后在 `~/.dsh/profiles/web` 下执行 `pnpm install`。

### 生效

```powershell
dsh web
```

重启后侧边栏会出现「进程管理」入口（位于「技能中心」下方）。

> 这是宿主进程级插件：**修改代码后必须重启 `dsh web`** 才会重新加载 host 半边与浏览器 bundle。

## 使用

1. 点击侧边栏 **进程管理**。
2. 面板自动扫描一次；工具栏 **刷新** 重新扫描（会绕过 1.2 秒缓存强制重扫）。
3. 用搜索框定位端口，例如输入 `8080` 或 `node`。
4. 点击该行的 **终止** → 在确认框核对「程序 / PID / 端口 / 路径」→ **确认终止**。
5. 顶部横幅给出结果，并自动刷新列表（端口应当消失）。

一个端口被多个进程占用时，PID 列会出现 `▸ 3` 展开按钮，展开后每个进程单独一行、各自带终止按钮。

### 排序

点击任意列标题即可按该列排序，多次点击循环切换：**升序 → 降序 → 恢复默认**（默认 = 按端口号从小到大，即首次加载的顺序）。当前排序列会显示 `▲` / `▼` 并加粗，`aria-sort` 同步给辅助技术。「操作」列不参与排序。

## 关于「无主端点」

面板默认**不列出**那些所属进程已经退出的端点，并在顶部徽章上如实标注「已隐藏 N 个无主端点」。

原因是 Windows 的行为：进程异常结束时，内核有时不会立即回收它的 UDP 端点记录，这些条目会长期残留在端点表里（可观察到创建时间为数天前），而进程本身已经不存在——既查不到进程名，也没有对象可以终止。它们通常落在临时端口段（49xxx–65xxx），不对应任何可用服务。

若确实需要查看，把 `hideOrphanedEndpoints` 设为 `false` 即可列出，此时程序名列会显示「进程已退出（残留端点）」。

## 终止语义

终止分两级，目标只有一个 PID，**从不杀进程树**：

1. **优雅关闭**：对拥有顶层窗口的进程发送 `WM_CLOSE`（等同于点窗口的 ✕），给它 `graceMs`（默认 3000 ms）保存并退出。
2. **强制结束**：宽限期内没有退出，或该进程根本没有窗口/消息循环（控制台程序、服务、`node.exe` 等），则执行 `Stop-Process -Force`。

可能的结果：

| outcome | 含义 |
| --- | --- |
| `closed` | 接受关闭请求并正常退出 |
| `killed` | 无优雅通道，直接结束 |
| `killed-after-request` | 忽略关闭请求，宽限期后被强制结束 |
| `already-exited` | 目标此前已退出（视为成功） |
| `still-running` | 已发指令但进程仍在（可能受系统保护/等待驱动） |
| `denied` | 权限不足，Windows 拒绝 |
| `protected` | 命中保护名单，未尝试 |
| `identity-changed` | PID 已复用为其它进程，操作取消 |

## 安全设计

进程终止是本机高危操作，护栏全部落在 **host 侧**，不依赖界面自觉：

1. **回环 + 同源围栏**：两个接口都要求请求来自回环地址且 Host 为回环名（浏览器另校验同源标记）。把 dsh web 暴露到局域网时，这些接口默认不可用。
2. **保护名单**：`PID ≤ 4`，以及以下 19 个进程名（忽略大小写与 `.exe` 后缀）一律拒绝：`system`、`idle`、`registry`、`memory compression`、`secure system`、`smss`、`csrss`、`wininit`、`winlogon`、`services`、`lsass`、`lsaiso`、`fontdrvhost`、`dwm`、`audiodg`、`svchost`、`sihost`、`wudfhost`、`explorer`。这些是 Windows 的承重墙——`lsass`、`wininit`、`services`、`csrss` 被结束后不可恢复，`svchost` 承载着成组服务（要停应该去停对应服务），`audiodg` / `sihost` / `wudfhost` 则会带走音频、外壳或设备宿主。完整名单见 `lib/index.js` 的 `CRITICAL_NAMES`。
3. **DSH 自身谱系**：DSH 宿主进程（`process.pid`）及其全部祖先进程都标记为受保护——结束它们等于掐断你正在用的这个会话。
4. **防 PID 复用**：终止前重新扫描，要求「该 PID 此刻仍然占用你点的那个端口」且进程名未变，否则取消。
5. **先软后硬**：见上一节。
6. **可配置收紧**：`protectedNames` 可追加保护名单（例如 `["nginx","java"]`），`allowNonLoopback` 可显式放开回环限制（默认关闭，不建议）。

## 配置

`cordis.patch.yml`（或 profile 里该行的 `config`）支持以下字段：

```yaml
- insert:
    - id: process-manager
      name: 'dsh-process-manager'
      config:
        graceMs: 3000               # 优雅关闭宽限期（毫秒）
        cacheMs: 1200               # 快照缓存，避免短时间内重复扫描
        collectTimeoutMs: 30000     # 单次采集超时
        terminateTimeoutMs: 30000
        powershellPath: ''          # 留空自动探测 pwsh.exe -> powershell.exe
        protectedNames: []          # 追加保护名单，例如 ['nginx', 'java']
        allowNonLoopback: false     # 生产环境请保持 false
        hideOrphanedEndpoints: true # 隐藏所属进程已退出的残留端点
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/dsh-process-manager/list` | 返回按端口合并后的快照（`?fresh=1` 绕过缓存） |
| `POST` | `/api/dsh-process-manager/terminate` | body：`{ pid, port, transport, name, graceMs? }` |

两者都要求回环来源，未授权返回 `403`。快照的 `summary` 里 `ports` 是列出的端口数、`orphaned` 是被隐藏的无主端点数、`protectedPids` 是受保护进程数。

## 工作原理

```
浏览器                          DSH host 进程
┌──────────────────────┐        ┌────────────────────────────────────────┐
│ lib/client.js        │  HTTP  │ lib/index.js                           │
│  · 侧边栏入口（DOM）  │ ─────► │  · /api/dsh-process-manager/*  路由     │
│  · 中列面板（React）  │        │  · 回环围栏 / 保护名单 / PID 校验        │
└──────────────────────┘        │  · 快照缓存                            │
                                └───────────────┬────────────────────────┘
                                                │ -File 调用，读取 NDJSON
                                ┌───────────────▼────────────────────────┐
                                │ lib/scripts/collect.ps1                │
                                │ lib/scripts/terminate.ps1              │
                                └────────────────────────────────────────┘
```

- **host 半边**（`lib/index.js`）：注册两个路由，负责信任围栏、保护判定、端口合并、PID 复用校验、缓存，并把 PowerShell 的 NDJSON 输出解析成面板要的行。
- **PowerShell 脚本**（`lib/scripts/*.ps1`）：真正读取系统状态 / 执行终止。手写 JSON 编码，因此在 Windows PowerShell 5.1 与 PowerShell 7 下输出完全一致。
- **浏览器半边**（`lib/client.js`）：DSH 的侧边栏与主区域没有对外开放的 slot，所以按社区通行做法做 DOM 注入——入口行插在「新会话」按钮之后、同级插件行（任务看板 / SSH / 技能中心）之后，并用 `MutationObserver` 自愈 React 重渲染；面板容器作为中列额外子节点挂载，通过 `<html>` 上的 `data-dsh-procmgr-active` 显隐，与 SSH / 任务看板面板互斥。

## 开发

```powershell
node test/host.test.mjs      # 或 npm test
```

测试直接以假 cordis 上下文驱动**真实的**路由处理器与 PowerShell 脚本，覆盖：列表与分组、活进程不被误判、无主端点的隐藏与放开、PID 4 / DSH 自身保护、非回环与跨源拒绝、方法校验、陈旧端口拒绝、以及一条真实的「起监听 → 列表发现 → 终止 → 端口释放」端到端路径。

样式跟随主题：面板只用 `--dsw-alias-*` 设计变量（`bg-base` / `label-primary` / `label-tertiary` / `border-l1` / `state-*`），不写死颜色，因此深色、浅色与皮肤都能正确显示。

## 已知限制

- 仅 Windows。Linux / macOS 需要另写采集脚本（`ss -tulpn` / `lsof -i`）。
- 只列**监听**端点，不列 `ESTABLISHED` 等已建立连接（与「谁占了我的端口」这一目标对齐）。
- 不显示流量统计；快照是刷新时刻的瞬时状态。
- 采集脚本每次全量执行（150+ 端点约 2–3 秒），因此有 1.2 秒缓存与「按需刷新」策略；没有后台轮询。
- 无主端点（所属进程已退出）默认不列出，见上文；这是 Windows 的端点表行为，不是采集失败。
- 受系统保护或跨权限的进程会显示为不可终止或返回 `denied`，这是 Windows 的限制，不是插件缺陷。

## 许可证

[MIT](./LICENSE)