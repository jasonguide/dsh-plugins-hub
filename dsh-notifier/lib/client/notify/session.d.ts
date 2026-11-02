/**
 * dsh-notifier 客户端 —— SSE 通知流会话。
 *
 * 连接、看门狗、断线重连与 seq 去重原先直接 new EventSource 并用真实的 setTimeout/Date.now，
 * 于是「重连是否带上 since」「重复帧有没有被丢」「半开连接能不能被发现」全都测不到——而这三条
 * 正是断线窗口里丢通知的三个成因。时间与连接都从端口进来之后，它们可以用假时钟与假
 * EventSource 精确驱动。
 *
 * 三条语义是刻意的，别在重写时简化：
 * 1. 重连必须带 since：EventSource 自动重连不携带 query，不带就等于把断线期间的事件丢掉；
 * 2. 只有**解析成功**的帧才刷新 lastActivity——畸形帧不该让半开检测失效；
 * 3. 重连有最小间隔：onerror 与看门狗会互相触发，不设间隔就是重连风暴。
 */
/** 看门狗窗口：这么久没有任何帧（notify 或心跳 ping）就主动重建。 */
export declare const WATCHDOG_MS = 60000;
/** 通知流连接的最小可判别面。 */
export interface EventSourceLike {
    onmessage: ((event: {
        data: string;
    }) => void) | null;
    onerror: (() => void) | null;
    close(): void;
}
export interface SessionPorts {
    /** 通知流地址（不含 since 查询参数）。 */
    url: string;
    createSource(url: string): EventSourceLike;
    now(): number;
    setTimer(fn: () => void, ms: number): number;
    clearTimer(handle: number): void;
    /** 非致命问题的留痕出口（解析失败、关闭失败、EventSource 不可用）。 */
    warn(message: string, cause: unknown): void;
    /**
     * 序号水位的持久化读写（可选）：刷新页面、重新挂载都是新实例，内存里的 lastSeq 会归零。
     * 归零后首次请求不带 `?since=`，服务端就会把整个补拉缓冲回放一遍——历史通知被当成
     * 刚发生的又弹一次。持久化后重连能带上正确水位。
     *
     * 缺省（未提供）时退回纯内存语义：仍可用，只是每次重挂载都从头回放，由展示层的
     * 陈旧帧护栏兜底不打扰用户。
     */
    readSeq?(): string | null;
    writeSeq?(value: string): void;
    /** 水位的保存时刻（毫秒时间戳字符串）；与服务端序号是否「新鲜」配套，见 SEQ_TTL_MS。 */
    readSeqSavedAt?(): string | null;
    writeSeqSavedAt?(value: string): void;
}
/**
 * 持久化水位的有效期。
 *
 * 服务端序号来自 `seq.json`，被清掉后从 1 重新计数；客户端若一直沿用旧的高水位，此后所有
 * 新通知都会被当成「已见过」静默丢弃。24 小时是个保守折中：正常使用下水位每次推送都会
 * 刷新（远不会过期），而隔夜后首次打开页面即使服务端重置过也已自然作废。
 */
export declare const SEQ_TTL_MS: number;
export interface NotifySession {
    close(): void;
    reconnect(): void;
}
export declare function startNotifySession(ports: SessionPorts, onFrame: (frame: Record<string, unknown>) => void): NotifySession;
