import type { DeliverResult, NotifyMessage } from "../deliver/type.ts";
import type { PlayerSpec } from "./players.ts";
import type { PlatformProbe, SystemCommandOptions, SystemTarget } from "./type.ts";
/** 探测本平台能力（异步一次；不用 spawnSync 阻塞事件循环）。 */
export declare function probePlatform(toastScript: string): Promise<PlatformProbe>;
/**
 * 该播放器是否**不依赖声音服务**（能力面据此把 linux 判成 `ok` / `degraded`）。
 *
 * 数据只有一处：`LINUX_PLAYERS` 那一行的 `needsServer`。表里没有的 bin 一律回 `false`——
 * 「不在表里」不等于「不需要声音服务」，而 `ok` 的语义恰恰是「命中的播放器里至少有一个**已知**
 * 能直连出声」；把不认识的算作 serverless，就是本增量要消灭的那种「把测不准的事写成 ok」。
 * linux 上这一分支结构上不可达（`probePlayers` 探的就是这张表），故它只是一条不制造假 ok 的兜底。
 */
export declare function isServerlessPlayer(bin: string): boolean;
/**
 * 构造弹窗命令；空数组 = 本平台给不出这条命令。
 * silent = 声音关闭或出口要自播（自播时不静音会响两声）。
 */
export declare function buildSystemCommand(probe: PlatformProbe, title: string, message: string, options: SystemCommandOptions): readonly string[];
/** 一条自播命令：argv + 它的判据来源（Linux 播放器表上的那一行；darwin/win32 只看退出码）。 */
export interface ToneCommand {
    readonly command: readonly string[];
    readonly player?: PlayerSpec;
}
/**
 * 构造自播命令链：Linux 上链上每个命中候选各一条命令（argv 随播放器不同），darwin/win32 是平台
 * 播放器的一条。`file` 必须是**已存在**的绝对路径（主题文件或本次落的临时合成文件），
 * 「素材有没有」由 `prepareSound` 判，不在这里重判。
 */
export declare function buildSoundCommands(probe: PlatformProbe, file: string): readonly ToneCommand[];
/**
 * 自播判定：linux 任何非静音都自播（DE 的 sound hint 不可依赖）；darwin 只在只响不弹
 * 时自播；win32 指定音色或只响不弹时自播。
 */
export declare function shouldSelfPlay(pop: boolean, tone: boolean | string, platform: string): boolean;
/**
 * 弹窗与提示音是两个独立动作，但**终态只有一个**：执行过动作而它失败了就翻转终态，一条命令都
 * 构造不出来才是空动作。弹窗场景下自播失败不改终态——toast 已经出去了，声音是尽力而为。
 */
export declare function sendSystem(target: SystemTarget, message: NotifyMessage): Promise<DeliverResult>;
