/**
 * 频道状态呈现原子：时间戳格式化、状态摘要/状态点、per-channel 测试按钮、失败徽标。
 *
 * statusMap / sendTest / t 由调用方显式传入：原子层不读卡片状态，否则「搬走的函数捕获的仍是
 * 旧 state」这类闭包语义变化不会有任何编译期信号。
 */
import * as React from "react";
import type { Translate } from "../../locale.ts";
import type { HistoryRecordView } from "../types.ts";
/** 频道状态表（键 = 频道 id；/status 载荷逐项透传，读侧只取自己认识的字段）。 */
interface ChannelStatus {
    lastTs?: number;
    lastStatus?: string;
    lastError?: unknown;
}
export type ChannelStatusMap = Record<string, ChannelStatus | undefined>;
export declare function padTime(ts: number): string;
/** 频道状态摘要（上提卡头 statusDot + statusTxt；完整错误经 title 提示）。 */
export declare function statusText(channelKey: string, statusMap: ChannelStatusMap, t: Translate, history?: HistoryRecordView[] | null): string;
export declare function statusDotClass(channelKey: string, statusMap: ChannelStatusMap): string;
/**
 * per-channel 测试按钮：dirty 时切文案 + 脏徽标 + title（#912 症状1 B-S1-3）。
 * dirty 缺省 false——无脏时渲染与此前逐字一致（client-dom 旧断言不动）。
 */
export declare function testBtn(channelId: string | undefined, sendTest: (id?: string) => void, t: Translate, dirty?: boolean): React.JSX.Element;
/**
 * 删除二次确认按钮：bark / webhook / 内置三张卡的这段逐字相同（一次点击上膛，3 秒后自动
 * 解除），故收成一个原子——三处各留一份时，改确认时长只会改到其中一张卡。
 *
 * 定时器仍在 onClick 闭包里就地创建（不持 ref、不走 effect）：这三张卡都不持有 state/ref，
 * 上膛状态由 SettingsCard 顶层的 delArmedId 反传，闭包捕获的只有 setter 与 id。
 */
export declare function delArmedBtn(armed: boolean, channelId: string, remove: () => void, setArmedId: (v: string | null) => void, t: Translate): React.JSX.Element;
/** 投递失败徽标：最近投递失败时上提至卡头 summary 行，收起态仍可见。 */
export declare function failBadge(channelKey: string, statusMap: ChannelStatusMap, t: Translate): React.JSX.Element | null;
export {};
