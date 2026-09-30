/**
 * dsh-notifier channels 域 system 块 —— Linux 自播播放器的事实表与运行期判据。
 *
 * 为什么是表：链序（先试哪个播放器）不是散在 `sendSystem` 里的分支串，而是这张表的**行序**；
 * 新增播放器 = 加一行，改序 = 挪一行。探测参数、命令行、能力面判据（`needsServer`）与运行期
 * 判据（`fatalMarkers`）都从同一行读，不再有第二份名单。
 *
 * 运行期判据为什么不是「stderr 必须为空」：本机实测（Ubuntu 22.04 / ffplay 4.4.2-0ubuntu0.22.04.1 /
 * 2026-09-14）40 次成功播放里有 **3 次** stderr 非空——libasound 直写
 * `ALSA lib pcm.c:8568:(snd_pcm_recover) underrun occurred`，且不受 `-loglevel` 约束（换
 * `-loglevel quiet` 再跑 30 次仍有 2 次）。真成功会被判失败 ⇒ 链继续 ⇒ 双响，或终态 `failed`
 * 而声音其实已经出去了。判据因此是「退出码 + 实测致命标记」。
 */
import type { CommandFacts } from "./type.ts";
/** 播放器候选：一行数据就是它在链上的全部事实。 */
export interface PlayerSpec {
    readonly bin: string;
    /** 探测参数：**任一**成功即命中（各播放器的版本参数不统一，实测 ffplay 的 `--version` exit 1）。 */
    readonly probeArgs: readonly (readonly string[])[];
    /** 播放一条音频文件的参数（文件名由调用方接在最后，仍是参数数组，不经 shell）。 */
    readonly fileArgs: (file: string) => readonly string[];
    /** 无声音服务时必失败：能力面据此把「只命中服务型候选」判成 degraded 而不是 ok。 */
    readonly needsServer: boolean;
    /** 命中即判失败的 stderr 标记（判据用；只收实测样本，见下方常量）。 */
    readonly fatalMarkers: readonly string[];
}
/**
 * Linux 自播回退链（维护者裁决的链序 = 本表行序）：
 * `paplay` → `pw-play` → `aplay` → `ffplay`（先服务型、再直接怼 ALSA 的轻量播放器、
 * 最后 ffplay——它最不挑环境但最重）。
 */
export declare const LINUX_PLAYERS: readonly PlayerSpec[];
/** 按 bin 取表行：命中的播放器名是探测产出，命令行与判据都要回到表上。 */
export declare function playerSpec(bin: string): PlayerSpec | undefined;
/** 判据结论：命令的原始结局，或「退出码 0 却命中了致命标记」——两者都是失败成因。 */
export type PlayFailure = {
    readonly kind: "exit";
    readonly code: number;
} | {
    readonly kind: "killed";
} | {
    readonly kind: "timeout";
} | {
    readonly kind: "spawn-threw";
    readonly cause: string;
} | {
    readonly kind: "spawn-error";
    readonly cause: string;
} | {
    readonly kind: "marker";
    readonly marker: string;
};
/**
 * 音频路径的具名判据：`exit≠0` / 被信号杀死 / 超时兜底 / 启动失败 / 命中实测致命标记 ⇒ 失败，
 * 其余 ⇒ 成功。`spec === undefined` 表示这条命令不在播放器表上（darwin 的 `afplay`、win32 的
 * PowerShell），此时**只判退出码**——ffplay 上量到的标记不是它们的成败语义。
 */
export declare function playFailure(spec: PlayerSpec | undefined, facts: CommandFacts): PlayFailure | undefined;
/**
 * 这次失败要不要在日志里出声：被信号杀死多数是我们自己的超时兜底（主动行为），按异常刷屏会淹掉
 * 真失败；超时兜底是例外——那一格旧实现零日志零结算，必须留痕（见 `run` 的兜底杀进程）。
 */
export declare function warnWorthy(failure: PlayFailure): boolean;
/** 一个候选失败的可读摘要（进 warn，也进 `reason.detail`）：`bin 成因`。 */
export declare function playFailureSummary(bin: string, failure: PlayFailure, tail: string): string;
