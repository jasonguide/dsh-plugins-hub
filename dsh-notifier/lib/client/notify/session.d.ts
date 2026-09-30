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
}
export interface NotifySession {
    close(): void;
    reconnect(): void;
}
export declare function startNotifySession(ports: SessionPorts, onFrame: (frame: Record<string, unknown>) => void): NotifySession;
