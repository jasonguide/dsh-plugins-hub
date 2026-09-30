/**
 * 能力自检与浏览器权限的呈现原子。
 *
 * 判定与文案都在 capabilities.ts / reason-text.ts：这里只把视图模型投影成 JSX。t、平台、诊断
 * 视图与授权回调全部显式传参——原子层不读卡片状态，也不自取浏览器事实（安全上下文由调用方
 * 传入，与卡片内其他判定同源）。
 */
import * as React from "react";
import type { ClientDiagnosticsView } from "../../capabilities.ts";
import type { Translate } from "../../locale.ts";
/**
 * 浏览器通知权限状态行（从全局降级区移入「浏览器通知」频道卡）。
 * 三态文案 + 未授权时的「请求通知权限」按钮（手势内请求，完成后刷新状态）；
 * 非安全上下文/无 Notification API 时返回 null（对应降级文案仍在全局 notes）。
 */
export declare function browserPermLine(t: Translate, secureContext: boolean, onRequestPermission: () => void): React.JSX.Element | null;
/** 平台提示行：宿主平台差异说明——Windows SoundPlayer 语义、macOS
 *  NSSound、Linux 自播；/health 拉取失败/未知平台回落通用说明。 */
export declare function systemPlatformHint(hostPlatform: string | null, t: Translate): React.JSX.Element;
/**
 * 宿主能力自检块（系统频道卡体）。为什么落在卡体而不是卡头 `.dn-ch-statusTxt`：窄屏下
 * 卡头那行被 display:none 收起，而手机恰是最需要知道「为什么没响」的地方。
 * 这里只做机械投影——结论、处置建议、明细的文案都来自 capabilities.ts。
 */
export declare function hostDiagnosticsBlock(diag: ClientDiagnosticsView): React.JSX.Element | null;
/** 浏览器面自检行（浏览器频道卡体）：宿主算不出来的那几个事实（权限、音频解锁）在这里成一句话。 */
export declare function browserDiagnosticsLine(diag: ClientDiagnosticsView): React.JSX.Element;
