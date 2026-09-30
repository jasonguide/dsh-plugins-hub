/**
 * dsh-notifier pipeline 域 —— 裁决：这条通知现在该不该发（唯一裁决点，别处不许再判）。
 * 判据不实现为抛错：本块挂在活的调用链上。
 */
import type { EffectiveConfig } from "../../deps.ts";
import type { NotifyRequest } from "../service/type.ts";
import type { Verdict } from "./type.ts";
/**
 * 单个窗口是否命中（纯函数：只看分钟数与起止，不读当前时间，方便逐分钟单测）。
 *
 * 事实源在 src/shared/quiet.ts（`inWindowMinutes`）：客户端本机回显与服务端裁决同源，
 * 改动只改共享处。这里保留名字，兼容既有 `judge/index.ts` 引用面与单测表驱动。
 */
export declare function inWindow(minutes: number, start: string, end: string): boolean;
/**
 * 裁决。判据顺序即短路顺序：**总开关 → kind 开关 → 动态 kind 确认 → 免打扰**。
 *
 * 每条规则写成一个有名函数、顺序在这四行里读得出来：此前四条规则混在一个函数体里、
 * 「`test` 不受约束」这个例外散在三处判断里，想插一条规则的人只能从中间猜位置。
 */
export declare function judgeRequest(config: EffectiveConfig, request: NotifyRequest, enabled: boolean): Verdict;
