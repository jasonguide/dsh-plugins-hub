/**
 * 内置频道卡（browser / system）：卡头三态 + 启用 switch，卡体 = 弹窗/可见时/声音行 + 诊断行 + 测试按钮。
 *
 * 与实例卡同源——它们都是 settings.channels 里的一项，只是不渲染删除入口、也没有凭据。
 * 依赖一律显式传参（statusMap / hostPlatform / diag / chPatch / sendTest / 安全上下文 / 授权回调 /
 * audioEngine / t）：卡体不持有 state/ref/定时器，也不读 SettingsCard 的闭包——搬走的函数若仍捕获旧
 * state，编译期不会有任何信号，故一律不从闭包取值。
 */
import * as React from "react";
import type { ClientDiagnosticsView } from "../../capabilities.ts";
import type { Translate } from "../../locale.ts";
import type { AudioEngine } from "../../notify/audio.ts";
import type { ChannelStatusMap } from "../parts/status.tsx";
import type { HistoryRecordView, SettingsChannelView } from "../types.ts";
/**
 * 内置频道卡（browser/system）：三开关（启用 / 弹窗 / 声音）+ 状态行 + per-channel 测试。
 * 与实例卡同源——两者都是 `settings.channels` 里的一项，只是本卡不渲染删除入口、也没有凭据。
 *
 * 谁决定什么：**启用**决定「发不发」（关掉 = 完全不投递，声音也不发）；**弹窗 + 声音**决定
 * 「怎么发」（弹窗关而声音开 = 只响不弹；两者都关 = 本频道不会有任何提醒，卡体给出提示）。
 * 三态摘要：启用开 + 弹窗开 = 启用；启用开 + 弹窗关 + 声音开 = 仅声音；启用关 = 已停用。
 *
 * 卡头 = 类型图标 + 名称 + 内置徽标 + 状态摘要 + 状态点 + 失败徽标 + 启用 switch；卡体 =
 * 弹窗行 +（浏览器另有「页面可见时也弹」）+ 声音行（开关 + 音色下拉 + ▶试听）+（浏览器）
 * 权限状态行 + 平台提示 + 测试按钮。
 *
 * 整卡 details 可折叠——非受控 + key remount 形态（key 含 enabled，open 仅 mount 生效），
 * 未启用默认收起、启用默认展开；手动开合完全交 DOM，无受控时序坑；启停切换重挂载重置折叠态
 * （预期行为）。summary 内 enable checkbox 依赖 HTML 规范豁免（点击 interactive content
 * 不触发 summary 激活）。
 */
export declare function builtinCard(index: number, ch: SettingsChannelView, label: string, statusMap: ChannelStatusMap, hostPlatform: string | null, diag: ClientDiagnosticsView, chPatch: (idx: number, part: Record<string, unknown>) => void, sendTest: (id?: string) => void, isSecureContext: () => boolean, requestNotificationPermission: () => void, audioEngine: AudioEngine, t: Translate, history: HistoryRecordView[] | null, testDirty?: boolean): React.JSX.Element;
