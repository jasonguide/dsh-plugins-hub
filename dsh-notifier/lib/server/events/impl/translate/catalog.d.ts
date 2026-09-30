/**
 * dsh-notifier events 域 —— 通知文案单表（本域翻得出来的 6 个内置 kind），标题与正文逐字沿用旧实现。
 * `test` 不在这里：它不对应任何宿主事件，文案归唯一产出方（api 域的测试端点）。
 */
import type { NotifyDetail } from "./type.ts";
/** 毫秒 → 人类可读耗时（如 "45 秒" / "2 分 15 秒" / "1 小时 2 分 5 秒"）。
 *  导出是为了让这条口径可表驱动：它的产物是纯字符串，走宿主事件断言要造一整条事件链。 */
export declare function formatDuration(ms: number): string;
/**
 * 工具名美化：常见工具查上表；`mcp__server__tool` 展开成「MCP 服务器 "server" 的工具 "tool"」；
 * 其余原样。导出是为了让映射表可表驱动：它不是事件的产物，而是文案口径。
 */
export declare function prettyToolName(name?: string): string;
/**
 * kind → 文案单表：杜绝「表 + switch 分支」双份维护的漂移；时间由系统通知呈现，正文不重复时间戳。
 */
export declare const NOTIFY_KINDS: {
    ask: {
        title: string;
        body: (detail: NotifyDetail) => string;
    };
    question: {
        title: string;
        body: (detail: NotifyDetail) => string;
    };
    done: {
        title: string;
        body: (detail: NotifyDetail) => string;
    };
    "subagent-done": {
        title: string;
        body: (detail: NotifyDetail) => string;
    };
    error: {
        title: string;
        body: (detail: NotifyDetail) => string;
    };
    "turn-end": {
        title: string;
        body: (detail: NotifyDetail) => string;
    };
};
/** 表里有的种类，也就是本域翻得出来的那些。 */
export type TranslatedKind = keyof typeof NOTIFY_KINDS;
