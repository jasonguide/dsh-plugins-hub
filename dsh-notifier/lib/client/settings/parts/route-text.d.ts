/**
 * 设置卡投递摘要 / 脏状态纯决策函数（M2：原内联在 SettingsCard 闭包里，
 * 逻辑改坏时源码扫描型测试全绿——抽到此处配可执行断言）。
 *
 * 零依赖（t 由调用方注入），不 import server 面，client-unit node 直跑。
 */
import type { Translate } from "../../locale.ts";
/**
 * 投递摘要文案：默认收成一行。
 * - 点亮且启用的频道按名点名（真实投递面 = 启用 ∩ 点亮，停用频道不点名）；
 * - 无点名但已自定义 → 自定义态（N = 快照内现存候选数，stale 残留另以独立
 *   chip 呈现，不重复计入 N）；
 * - 跟随默认 → 默认态。
 */
export declare function routeSummaryText(litLabels: string[], isCustom: boolean, liveCount: number, t: Translate): string;
/**
 * 底栏脏文案：按域表述。channels 域负载是顶层单键（{} 或 {channels}），
 * 故只判「域是否脏」不数 N；事件域脏数 = 全量顶层键数 − 频道域（0/1）。
 * 无脏时返回 null（调用方不渲染）。
 */
export declare function dirtyStatusText(dirtyCount: number, channelsDirty: boolean, otherDirtyCount: number, t: Translate): string | null;
