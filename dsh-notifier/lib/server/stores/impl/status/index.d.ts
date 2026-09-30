import type { ProducedReason } from "../../../shared/interface.ts";
import type { ChannelStatusEntry, StatusDeps } from "./type.ts";
/** 频道投递终态：内存镜像即时更新，落盘延后合并。 */
declare class StatusStore {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 落盘路径：DSH home 由环境决定、进程内不变，故随实例一次性定下。 */
    private readonly file;
    private deps;
    /** 内存镜像：本类的单一事实源，冷启动从文件加载；空表即「尚未加载」。 */
    private mirror;
    /** 落盘 debounce：窗口内多次 record 合并为一次整文件写。 */
    private flush;
    /** 写队列串行化：整文件重写若并发交错，后写的会把先写的整份内容覆盖掉。 */
    private queue;
    install(deps: StatusDeps): void;
    /** 卸载：放开装配入参并丢掉内存镜像。镜像要一起丢——它是「磁盘状态」的记忆。 */
    release(): void;
    /** 记录一次投递终态：内存立即更新，落盘延后合并（失败仅经日志出口告警）。 */
    record(channelId: string, status: "ok" | "failed", error?: ProducedReason): void;
    /** 读取全部频道状态（内存镜像优先，冷启动回落文件）。 */
    read(): Promise<Record<string, ChannelStatusEntry>>;
    /**
     * 冷启动懒加载：把文件读进镜像。
     *
     * 必须同步读：`record` 是 fire-and-forget，异步加载会与它抢跑，让磁盘上的旧值把刚记下的
     * 投递盖回去。空表即「尚未加载」，读不出内容时下一次再读一遍。
     */
    private loadFromDisk;
    private scheduleFlush;
    /** 丢掉待写定时器：卸载后这次落盘已没有要表达的事实。 */
    private clearPendingFlush;
    private flushToDisk;
    private evictOldest;
}
/** 本域唯一的存储实例：类不外放，外面 `new` 不出第二份内存镜像。 */
export declare const statusStore: StatusStore;
export {};
