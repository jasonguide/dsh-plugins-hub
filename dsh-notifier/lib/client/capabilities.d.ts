/**
 * dsh-notifier — 能力自检面的客户端投影（宿主面读侧归一化 + 浏览器面本地判定）。
 *
 * 为什么浏览器面在客户端算：`Notification.permission` 与音频上下文的解锁状态只存在于本页，
 * 服务端探的是宿主机器。两组事实源不同，混进一个接口就再也分不清「这句话说的是哪半边」。
 *
 * 为什么归一化必须宽容但绝不猜：值域外的结论一律降级为 `unknown`——猜成 `ok` 是把「没验过」
 * 说成「能用」，猜成 `unreachable` 是假警报，两者都会把用户支到错误的方向去排查。
 *
 * 为什么文案表写成**显式完整表** + `satisfies Record<…, NotifierLocaleKey>`：服务端加一个 code
 * 而这里漏配文案，必须在编译期就红，而不是等用户看到一行英文标识符（同 reason-text.ts 的范式）。
 * 类型只 `import type`（编译期擦除，浏览器包里没有服务端实现），且指向 src/shared/interface.ts
 * 这个跨端共享面——干净模块的类型面不指向宿主实现目录。
 */
import type { HostCapabilities, RemediationParams, Verdict } from "../shared/interface.ts";
import type { ReasonTranslator } from "./reason-text.ts";
import type { AudioFacts } from "./notify/audio.ts";
/** 四态在界面上的着色档：JSX 只做 className 拼接，不再自己判 verdict。 */
export type DiagnosticTone = "ok" | "warn" | "error" | "unknown";
/** 折叠区的一行明细：标签与取值都在这里定好，界面逐行投影。 */
export interface DiagnosticDetailRow {
    label: string;
    value: string;
}
/**
 * 归一化后的处置建议。`code` 保持 `string` 而不是 `RemediationCode`：更新版本的服务端写下的陌生
 * code 也要能带到这里，由文案层给中性回退——把它挡在归一化外面，等于让整块结论跟着一起消失。
 */
export interface RemediationView {
    code: string;
    params?: RemediationParams;
}
/** 归一化后的宿主面：形状与契约一致，只有 `remediation[].code` 放宽（见上）。 */
export interface HostCapabilitiesView extends Omit<HostCapabilities, "remediation"> {
    remediation: readonly RemediationView[];
}
/**
 * 浏览器面 code 闭集（本地判定，服务端没有这一面）。不设 iOS 专用 code、不嗅探 UA：
 * 「通知 API 不存在」在哪个浏览器上都是同一件事，按型号编名字只会在下一个版本里烂掉。
 */
export type BrowserCode = "browser-no-notification-api" | "browser-insecure-context" | "browser-permission-denied" | "browser-permission-default" | "browser-audio-never-unlocked" | "browser-audio-auto-suspended" | "browser-audio-closed" | "browser-audio-unsupported";
/**
 * 归一化 `/diagnostics` 响应里的宿主面。
 *
 * 缺字段 / 畸形载荷返回 `undefined`（调用方据此整块不渲染）：这里唯一的判据是三条结论
 * （`verdict` + 两个维度状态），缺一条就说不出一句真话，渲染半句比不渲染更坏；
 * 而 `capabilities` 整体缺席（旧服务端）与「值域外的取值」都是正常的读侧输入，前者同样返回
 * `undefined`，后者降级为 `unknown`。
 */
export declare function hostCapabilitiesOf(payload: unknown): HostCapabilitiesView | undefined;
/** 音频上下文的四个状态。`suspended` 必须带成因：两种成因的下一步动作完全不同。 */
export type AudioState = {
    kind: "running";
} | {
    kind: "suspended";
    cause: "never-unlocked" | "auto-suspended";
} | {
    kind: "closed";
} | {
    kind: "unsupported";
};
/**
 * 归一化音频事实。
 *
 * 为什么 `state === null` 归到「尚未解锁」而不是「不支持」：构造不出 AudioContext 是环境缺能力，
 * 而 `null` 只说明还没有人在这个页面上点过——说成不支持会把用户支去排查一个不存在的问题。
 * 为什么成因要看 `resumeRejected`：`suspended` 自身分不出「没解锁」与「解锁后被挂起」，
 * 只有真实的 resume 结果能区分，事后从 state 反推不出来。
 */
export declare function audioStateOf(facts: AudioFacts): AudioState;
/** 浏览器面的原始事实。`permission` 用 `string` 而不是三态联合：读侧的值域永远比我们写的宽。 */
export interface ClientFacts {
    notificationApi: boolean;
    secureContext: boolean;
    /** `Notification.permission` 原值；读不到时给 `"unknown"`。 */
    permission: string;
    audio: AudioFacts;
}
export interface BrowserDimensionState {
    state: Verdict;
    code?: BrowserCode;
}
export interface BrowserGroupStates {
    verdict: Verdict;
    popup: BrowserDimensionState;
    sound: BrowserDimensionState;
    audio: AudioState;
}
/** 组级结论取各维度里最严重者。 */
export declare function worstVerdict(states: readonly Verdict[]): Verdict;
/**
 * 浏览器面判定（本页事实，服务端算不出来）。
 *
 * 非安全上下文只降级 `popup`：本仓的局域网明文降级链恰恰靠 Web Audio 发声，把 `sound` 一起
 * 判成不可用，会让降级链在唯一还需要它的场景里自我否定。
 */
export declare function browserStatesOf(facts: ClientFacts): BrowserGroupStates;
export interface HostDiagnosticsView {
    verdict: Verdict;
    tone: DiagnosticTone;
    /** 结论行：verdict + 两个维度状态。 */
    line: string;
    /** `unknownDimensions` 非空时说清哪个维度无法判定；否则空串。 */
    unknownLine: string;
    remediationTitle: string;
    /** 处置建议逐条；认不出的 code 已回退为中性文案。 */
    remediationLines: readonly string[];
    detailsLabel: string;
    sourceLabel: string;
    details: readonly DiagnosticDetailRow[];
}
export interface BrowserDiagnosticsView {
    verdict: Verdict;
    tone: DiagnosticTone;
    /** 浏览器面的一行结论。 */
    line: string;
    sourceLabel: string;
}
export interface ClientDiagnosticsView {
    /** 宿主面；旧服务端或读不出形态时为 `undefined`（调用方据此不渲染这一块）。 */
    host?: HostDiagnosticsView;
    browser: BrowserDiagnosticsView;
}
/** 界面消费的唯一入口：宿主面与浏览器面各自成一组字符串，JSX 里不再留任何业务判断。 */
export declare function clientDiagnosticsOf(payload: unknown, facts: ClientFacts, t: ReasonTranslator): ClientDiagnosticsView;
/** 一条处置建议的文案。认不出的 code 给中性回退，且不回显 params 原文。 */
export declare function remediationTextOf(remediation: RemediationView, t: ReasonTranslator): string;
