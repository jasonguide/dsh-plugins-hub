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
export const WATCHDOG_MS = 60000;

/** 看门狗检查的起始延迟：比窗口长 5 秒，避免恰好在边界上误判。 */
const WATCHDOG_ARM_MS = WATCHDOG_MS + 5000;

/** 重连最小间隔（毫秒）。 */
const RECONNECT_MIN_GAP_MS = 5000;

/** 通知流连接的最小可判别面。 */
export interface EventSourceLike {
  onmessage: ((event: { data: string }) => void) | null;
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
export const SEQ_TTL_MS = 24 * 60 * 60 * 1000;

export interface NotifySession {
  close(): void;
  reconnect(): void;
}

export function startNotifySession(
  ports: SessionPorts,
  onFrame: (frame: Record<string, unknown>) => void,
): NotifySession {
  let source: EventSourceLike | null = null;
  let lastActivity = 0;
  // lastSeq 既是去重水位又是 since 的起点：两者必须同源，否则要么重复提醒、要么漏帧。
  // 初值优先取持久化水位：新实例（刷新、重挂载）内存里是空的，不读回来就会以 since=0
  // 重连、让服务端回放整个缓冲。
  let lastSeq = restoreSeq();
  let watchdog: number | null = null;
  let lastReconnectAt = 0;

  /**
   * 读回持久化水位；任何异常（storage 不可用、脏值）都当 0 处理，绝不让它挡住启动。
   *
   * 只认「新鲜」的水位：服务端序号来自 `seq.json`，一旦该文件被清掉（重置 DSH_HOME、
   * 换机器、手工清理），服务端会从 1 重新计数，而客户端手里的高水位会把此后所有新通知
   * 都判成「已见过」静默丢弃——那比重复弹一次严重得多。故水位带时间戳，超过
   * `SEQ_TTL_MS` 一律作废、从 0 起算（代价只是多回放一次缓冲，由展示层陈旧帧护栏兜底）。
   */
  function restoreSeq(): number {
    try {
      const raw = ports.readSeq?.() ?? null;
      if (raw === null) return 0;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) return 0;
      const savedAtRaw = ports.readSeqSavedAt?.() ?? null;
      const savedAt = savedAtRaw === null ? NaN : Number.parseInt(savedAtRaw, 10);
      if (!Number.isFinite(savedAt) || savedAt <= 0) return 0;
      if (ports.now() - savedAt > SEQ_TTL_MS) return 0;
      return parsed;
    } catch {
      return 0;
    }
  }

  /** 推进水位并尽力持久化；写失败不影响本次会话（内存水位仍然有效）。 */
  function advanceSeq(seq: number): void {
    lastSeq = seq;
    const at = ports.now();
    try {
      ports.writeSeq?.(String(seq));
      ports.writeSeqSavedAt?.(String(at));
    } catch {
      /* 水位写不进去只是下次重连多回放几条，不值得打断通知 */
    }
  }

  function armWatchdog(): void {
    if (watchdog !== null) ports.clearTimer(watchdog);
    watchdog = ports.setTimer(() => {
      if (ports.now() - lastActivity > WATCHDOG_MS) forceReconnect();
      else armWatchdog();
    }, WATCHDOG_ARM_MS);
  }

  function forceReconnect(): void {
    const now = ports.now();
    if (now - lastReconnectAt < RECONNECT_MIN_GAP_MS) return;
    lastReconnectAt = now;
    closeSource();
    connect();
  }

  function closeSource(): void {
    if (source === null) return;
    try {
      source.close();
    } catch (error) {
      ports.warn("关闭旧 SSE 连接失败", error);
    }
    source = null;
  }

  function connect(): void {
    closeSource();
    try {
      const url = ports.url + (lastSeq > 0 ? "?since=" + lastSeq : "");
      const next = ports.createSource(url);
      source = next;
      lastActivity = ports.now();
      next.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          lastActivity = ports.now();
          if (data.type === "ping") return;
          if (data.type === "notify") {
            if (typeof data.seq === "number") {
              if (lastSeq > 0 && data.seq <= lastSeq) return;
              advanceSeq(data.seq);
            }
            onFrame(data);
          }
        } catch (error) {
          ports.warn("帧解析失败", error);
        }
      };
      next.onerror = () => {
        // 主动重建（带 since 补拉）：EventSource 自动重连不携带 query，无法回放
        forceReconnect();
      };
      armWatchdog();
    } catch (error) {
      ports.warn("EventSource 不可用", error);
    }
  }

  connect();
  return {
    close(): void {
      if (watchdog !== null) ports.clearTimer(watchdog);
      closeSource();
    },
    reconnect: forceReconnect,
  };
}
