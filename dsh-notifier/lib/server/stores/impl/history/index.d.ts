import type { HistoryDeps, HistoryEntry } from "./type.ts";
/** 通知历史：jsonl 追加写，读时滚动截断与按天过滤。 */
declare class HistoryStore {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 落盘路径：DSH home 由环境决定、进程内不变，故随实例一次性定下。 */
    private readonly file;
    /** 装配入参（失败出口）。 */
    private deps;
    /** 写队列串行化：并发「读-改-写」会互相覆盖丢记录。 */
    private queue;
    /** 装配：单次生效。 */
    install(deps: HistoryDeps): void;
    /** 卸载：放开装配入参。在飞的写入不等待——它们各有自己的失败出口。 */
    release(): void;
    /** 追加一条记录：入队即返回（不阻塞通知主流程），失败仅经日志出口告警。 */
    append(entry: HistoryEntry): void;
    /** 最近记录（尾部最多 `HISTORY_LIMIT` 条；保留期 > 0 时先按天过滤）。 */
    read(): Promise<HistoryEntry[]>;
    /** 清空全部记录，返回被清空条数。 */
    clear(): Promise<number>;
    /** 现有行：读不到文件即空列表（首次写入从零开始，与读语义一致）。 */
    private currentLines;
}
/** 本域唯一的存储实例：类不外放，外面 `new` 不出第二份写队列。 */
export declare const historyStore: HistoryStore;
export {};
