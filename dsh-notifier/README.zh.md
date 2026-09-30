# dsh-notifier

[English](./README.md) · **简体中文**

> 面向 [DSH](https://www.npmjs.com/package/@deepseek-ai/dsh) Web GUI 的**原生桌面通知**插件：DSH 需要你的那一刻——向你提问、等你审批、任务完成、任务出错——你会收到一条真正的系统通知，扫一眼就知道该不该切回来。

DSH 跑的任务往往很长。你交代下去，然后切到别的标签页或别的软件忙自己的事。问题是：它什么时候做完你不知道，更糟的是——它可能已经卡在那里等你回答很久了。这个插件补上的就是这一环：把「DSH 需要你」变成操作系统主动告诉你的事，无论你当前在看哪块屏幕。

```
  你：  「DSH，重构一下 auth 模块」  ──►  切到别的窗口
                                              │
  DSH： 执行中… ──► 需要你决策 ──► ╔═══════════════════════════╗
                                  ║  DSH — 需要审批            ║
                                  ║  工具：shell 命令          ║
                                  ║  理由：需要提权            ║
                                  ╚═══════════════════════════╝
                                              │
  你：  注意到 → 切回来 → 处理
```

## 功能

| 事件 | 默认 | 你会收到什么 |
| --- | --- | --- |
| **向你提问** | 开 | 任务标题 + 问题正文，便于判断是否必须现在处理 |
| **审批请求** | 开 | 任务标题、工具中文名、申请理由、以及该怎么处理 |
| **任务完成** | 开 | 任务标题与耗时 |
| **任务出错** | 开 | 出错轮次/步骤与错误信息；同类错误 60 秒内自动合并 |
| **子任务完成** | 关 | 独立开关，委派出去的子任务不会冒充你的主任务完成 |
| **轮次完成** | 关 | `agent/turn-stopping` 时触发，给想更细粒度提醒的人 |

事件表之外还有：

- **两条投递通道，各自独立开关。** 系统通知走操作系统原生气泡——Windows PowerShell WinRT、macOS `osascript`、Linux `notify-send`，**三者都无需额外安装**。浏览器通知走 SSE 推帧进入 Notification API。
- **每通道三个开关**——*启用*（到底发不发）、*弹窗*（弹不弹通知）、*声音*（响不响、用哪个音色）。关掉「启用」完全不投递；「弹窗」与「声音」此后互相独立。
- **4 个内置音色**——`ding`、`bell`、`chime`、`pop`——每个都可试听，另有「跟随系统默认」与静音。
- **免打扰时段**——最多 5 个时间窗，支持跨午夜，可为「无论如何都想收到」的事件单独设豁免。
- **推送频道**——iOS 走 Bark；安卓走可自定义模板的 Webhook 频道（ntfy / Gotify / 自建网关）。
- **审批超时二次提醒**——审批超过设定时长仍未处理时再提醒一次。
- **完成风暴聚合**——多个任务同时收尾合并成一行，而不是刷十条。
- **非安全上下文降级**——非安全源下浏览器禁止系统级弹窗，插件自动降级为页面内横幅 + 提示音 + 标题闪烁。
- **通知历史**——最近 200 条记录，每条都带逐出口投递明细。
- **能力自检**——设置卡片会告诉你本机弹窗与发声实际能不能用，不能用时给出处置建议。
- **敏感信息脱敏**——通知文本离开进程前先过脱敏规则表，缩小错误消息里内嵌路径与凭据的外泄面。

## 平台与要求

- DSH **0.2.x**，以 `web` profile 运行
- Node.js ≥ 20
- Windows / macOS / Linux 均可。Windows 上系统通知走 Windows PowerShell 5.1 的 WinRT 绑定，无需额外安装任何东西。

## 安装

### 方式一：从 Git 仓库安装

```sh
dsh plugin --profile web add github:<owner>/<repo>#path:dsh-notifier
```

### 方式二：link 本地目录（开发调试用）

```sh
# 1. 把插件放到任意目录，例如 E:\plugins\dsh-notifier
# 2. 装进 web profile
dsh plugin --profile web add link:E:/plugins/dsh-notifier
```

### 生效

重启 `dsh web`。插件 bundle 只在启动时组合一次，运行中的实例不会自动加载新插件。

```sh
dsh web
```

然后确认它挂上了：

```sh
curl http://127.0.0.1:3080/api/dsh-notifier/health
```

正常返回长这样：

```json
{
  "ok": true,
  "plugin": "dsh-notifier",
  "platform": "win32",
  "capabilities": {
    "host": {
      "verdict": "ok",
      "unknownDimensions": [],
      "popup": { "state": "ok" },
      "sound": { "state": "ok" }
    }
  }
}
```

## 使用

打开 **设置 → 插件 → dsh-notifier**。事件开关、两条内置通道、推送频道列表、免打扰时段、通知历史全在这一张卡片上。卡片顶部有**发送测试通知**按钮——在你把要紧的事托付给它之前，先按一下。

### 到底是哪台机器在响

这点值得说清楚，因为两条通道到达的地方不一样：

- **系统通知**弹在**运行 `dsh web` 的那台机器**桌面上。如果 DSH 跑在无桌面的 Linux 服务器上，气泡就出现在那台服务器上，而不是你的笔记本上。设置卡片与 `/health` 会如实报告这条通道在宿主所在处到底能不能用。
- **浏览器通知**弹在你正在使用的浏览器里，浏览器在哪台机器就在哪台。只要浏览器给了权限，即便宿主在别处，通知也会送到你自己的机器上。

Windows 上你要的是第一条通道，也正是上面那份能力报告在检查的东西。

## 配置

配置存在插件自己的文件里：

```
$DSH_HOME/dsh-notifier/config.json        # 默认：~/.dsh/dsh-notifier/config.json
```

同目录下还有：`history.jsonl`（通知历史）、`status.json`（逐通道投递状态）、`seq.json`（SSE 序号计数器）、`version`（迁移链刻度）。

推荐用设置卡片改。若手工编辑该文件：插件**容忍未知键**（写入时保留而非丢弃），但已知键的非法值会在读取时回落默认。

凭据字段（Bark 的 `deviceKey`，Webhook 的 `token` / `password` / `headerValue`）在接口响应里一律掩码。把掩码原样提交回来表示「保持不变」，按频道 id 对齐，因此重排频道顺序不会串凭据。

## 接口

所有路由都受 **loopback 围栏**保护：只接受 `127.0.0.1` / `::1` 且 origin 匹配的调用。

| 路由 | 方法 | 用途 |
| --- | --- | --- |
| `/api/dsh-notifier/config` | GET / PUT | 读取或增量更新配置 |
| `/api/dsh-notifier/events` | GET | SSE 通知流；`?since=<seq>` 断线补拉 |
| `/api/dsh-notifier/test` | POST | 发送测试通知；可选 `draft` 体用于实测尚未保存的频道改动，全程零落盘 |
| `/api/dsh-notifier/history` | GET / DELETE | 通知历史 |
| `/api/dsh-notifier/status` | GET | 逐通道投递状态与连续失败计数 |
| `/api/dsh-notifier/kinds` | GET / POST | 动态事件类型及其确认态 |
| `/api/dsh-notifier/health` | GET | 健康与精简能力摘要 |
| `/api/dsh-notifier/diagnostics` | GET | 完整宿主能力探测，含逐维度明细与处置建议 |

> **局域网访问注意。** 用浏览器直连 `http://<主机IP>:3080` 时，上述路由一律返回 **403**。这是 loopback 围栏在正常工作，不是故障。请改用 `http://127.0.0.1:3080`、SSH 隧道或 TLS 反向代理。此外浏览器通知要求安全上下文，因此纯 HTTP 的局域网源无论如何都会落到横幅降级路径。

## 工作原理

**宿主端。** 插件注册到 DSH 的宿主服务上，监听那些意味着「需要人介入」的事件：`user-questions/request`、`approval/request`、`agent/error`、`agent/status`、`agent/turn-stopping`、`session/event`。一条精简管线把宿主事件翻译成插件自己的词汇、做判定（免打扰、事件开关、路由），再交给已启用的若干投递通道。

任务完成由**两个来源**共同判定，而不是一个：`session/event` 实时推送流是主证据；从会话回读的快照是兜底，覆盖插件挂载较晚或重载的那个窗口。因用户中断、被打断或出错而结束的轮次**刻意保持静默**——出错路径已经单独报过了，对同一个轮次既说「完成」又说「出错」，比只说一件真事更糟。

**浏览器端。** 宿主经 SSE 推送通知帧；浏览器端用 `EventSource` 订阅、按序号去重，并以 `?since=` 重连，因此刷新页面不会丢帧。同时只有一个标签页真正弹通知——标签页之间用租约协调，开第二个标签页不会让每条提醒都翻倍。

**投递与失败。** 投递失败只记日志，绝不抛出。原生二进制缺失会被捕获并上报，不会冒泡上去把宿主进程打挂。

## 开发

```sh
pnpm install
pnpm run build      # clean-lib → tsc → esbuild 打包
pnpm run typecheck
pnpm test
```

`pnpm run build` 产出：

| 产物 | 内容 |
| --- | --- |
| `lib/index.js` | 宿主端，自包含：只 `import node:*` 内置模块，无运行时 npm 依赖 |
| `lib/client.js` | 浏览器端，包在 `__ModuleLoader__.load` 契约外壳里；React 由宿主注入 |
| `lib/server/channels/impl/system/toast.ps1` | Windows toast 脚本，随包分发，构建期补 UTF-8 BOM |
| `lib/**/*.d.ts` | 类型声明 |

浏览器端由 esbuild 打成单个契约外壳；React 与 DSH 客户端包保持 external，由 loader 注入的 `require` 解析。产物里 load id 不等于包名时构建**直接失败**，接线错的 bundle 不可能流到发布。

### 目录结构

```
src/
  index.ts                 宿主入口：组合根
  server/
    api/                   受 loopback 围栏保护的 HTTP 路由
    channels/              投递通道：system、browser、bark、webhook、dry-run
    config/                配置模型、校验、脱敏
    events/                宿主事件适配与翻译
    pipeline/              判定与路由
    stores/                历史与状态持久化
    upgrade/               存储迁移链
    sdk/                   对其它插件开放的服务面
  client/                  设置卡片、通知逻辑、音频、多语言
  vendor/                  共享基元（路径、原子 IO、SSE hub、升级链）
test/
  unit/ integration/ client-unit/ client-dom/ bundle/ e2e/
```

### 测试分层

| 层 | 目录 | 环境 |
| --- | --- | --- |
| unit | `test/unit/**` | node |
| integration | `test/integration/**` | node |
| client-unit | `test/client-unit/**` | node |
| client-dom | `test/client-dom/**` | happy-dom |
| bundle | `test/bundle/**` | node |
| e2e | `test/e2e/**` | node |

有少量用例只在 POSIX 上有意义——它们靠 `chmod` 权限位注入失败、运行 `#!/bin/sh` 桩脚本、或驱动 D-Bus 命令行工具。在 Windows 上这些用例会显式跳过，而不是误报失败。

## 已知限制

- **仅限回环。** 接口按设计拒绝非回环调用方。远程使用需要隧道或 TLS 反向代理。
- **浏览器通知需要安全上下文。** `http://127.0.0.1` 算；纯 HTTP 的局域网源不算，会落到横幅降级路径。
- **iOS Safari。** 普通标签页没有 Web Notifications；把页面「添加到主屏幕」才能拿到 PWA 级通知。在此之前横幅 + 提示音路径仍然可用。
- **浏览器发声需要一次交互。** 自动播放策略意味着从未被交互过的页面可能保持静音。通知本身照常弹出。
- **首次能力探测最多需要 8 秒。** 之后读缓存。
