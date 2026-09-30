import type { ChannelPort, ConfigPort, LoggerPort, PipelinePort } from "../../deps.ts";
import type { RouteHandler } from "../route/type.ts";
/** 自检端点。能力在装配期接上，此后每个请求只读实例字段。 */
export declare class ProbeEndpoints {
    private readonly pipeline;
    private readonly channels;
    private readonly logger;
    private readonly config;
    /** 能力自检的共享缓存。两条路由共用同一次探测：探测会起子进程，每请求各探一次就是拿用户机器当靶场。 */
    private hostCapabilities?;
    /** dry-run 并发门：实例字段（与真实投递的节奏表相互独立，见 DryRunGate）。 */
    private readonly dryRunGate;
    constructor(pipeline: PipelinePort, channels: ChannelPort, logger: LoggerPort, config: ConfigPort);
    /**
     * 取（必要时首次发起）能力自检。
     *
     * 兜底必须在**这里**：`/health` 是探活面，探测失败若继续往上抛，端点会连 `ok`/`platform`/`sseEvicts`
     * 一起丢掉，一个诊断附属面把主面拖成 500——那比「暂时不知道宿主能力」糟得多。
     */
    private capabilities;
    private probeWithinBudget;
    /**
     * POST /test：造一条 `test` 通知交给裁决管线。只承诺「已受理」：`submit` 不返回结果，投递结果
     * 要去频道状态里看。响应里的 `sseConnections` 是**服务端未释放的句柄数**而不是投递计数——两者
     * 混起来，会让「测试发出去了但计数没动」这种正常现象看起来像故障。
     */
    readonly test: RouteHandler;
    /**
     * POST /test 的 dry-run 分支：单频道实测，同步返回 B3 schema。
     *
     * 禁写面落实在本函数：400 / 408 / 429 / 500 全部经 sendFailure / sendJson 直接回，
     * 永不调 logger（含路由收口的 500 兜底——execute 只抛 DryRunInputError 与预算超时，
     * 其余异常在这里就地收成固定文案的 500，不进日志）；stores / frames 本就没有入参，
     * 结构上够不着。槽位按 settle / 超时释放（finally），不按子进程退出（B7）。
     */
    private readonly testDraft;
    /**
     * GET /health：宿主平台 + 连接回收计数 + 能力面**摘要**。平台值供客户端写系统通道提示（不能拿浏览器 OS 猜）；
     * `sseEvicts` 是 README 承诺的 churn 排障面——只有聚合计数（常量大小），per-conn 明细不上这里。
     * 能力面同样只给结论与维度状态（常量大小），明细（探测了哪些维度、缺哪个包）归 `/diagnostics`。
     */
    readonly health: RouteHandler;
    /** GET /diagnostics：完整探测面。与 `/health` **共用同一次探测**，不在这里各探各的。 */
    readonly diagnostics: RouteHandler;
}
