/** api 域流块：SSE 连接、序号与断线补拉（共享层枢纽只管连接表、心跳与主动回收）。**序号**持久化在 `seq.json` 且重启后
 * 接着数——重置会让重连客户端把旧帧当新的，表现为「偶尔少一条通知」；**补拉**走 `?since=N`（EventSource 自动重连不带 query）。 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { type SseEvictStats } from "../../../../vendor/sse-hub.js";
import type { OutgoingFrame } from "../../deps.ts";
import type { StreamDeps } from "./type.ts";
/** 流枢纽：连接表在共享层，序号与补拉在本块。 */
declare class StreamHub {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 装配入参（失败出口）。 */
    private deps;
    /** 枢纽：心跳与回收由共享层跑。 */
    private hub;
    /** 单调序号：上次进程留下的值往后接着数。 */
    private seq;
    /** 补拉缓冲：只留最近 `REPLAY_LIMIT` 条。 */
    private replay;
    /** 序号落盘位置：DSH home 由环境决定、进程内不变，故随实例一次性定下。 */
    private readonly file;
    /** 装配：读回上次的序号，建起连接表与心跳。 */
    install(deps: StreamDeps): void;
    /** 卸载：停心跳、关连接、忘掉缓冲。序号留在盘上，下次接着数。 */
    release(): void;
    /** 当前连接数。语义是**服务端未释放的句柄数**，不是「在线设备数」：两者混起来会让刷新页面的残留句柄看起来像多了
     * 一台设备。 */
    size(): number;
    /** 回收原因计数：`/health` 的 `sseEvicts` 观测面（常量大小的聚合）。per-conn 明细（`connHealth`）
     * 故意不上去——它随连接数增长，而 `/health` 经 lan-proxy 对局域网可见。 */
    evictStats(): SseEvictStats;
    /** GET /events：接上一条 SSE 连接，并回放 `?since` 之后的帧。 */
    handle(req: IncomingMessage, res: ServerResponse): void;
    /**
     * 广播一条通知帧：翻成线协议 → 编号 → 入缓冲 → 落序号 → 推给所有连接。翻译（`body`→`message`、
     * `pop`→`playOnly`）在这里而不在裁决管线：线协议是**浏览器出口**的约定，管线对外给的是内部帧，
     * 翻译上移会让内部词汇被线协议反向锁死。
     */
    publish(payload: OutgoingFrame): void;
    /** 序号大于 `since` 的帧，按序。 */
    private since;
}
/** 本域唯一的流实例：类不外放，外面 `new` 不出第二份序号。 */
export declare const streamHub: StreamHub;
export {};
