import type { StorePort } from "../../deps.ts";
import type { RouteHandler } from "../route/type.ts";
/** 历史与状态端点。能力在装配期接上，此后每个请求只读实例字段。 */
export declare class JournalEndpoints {
    private readonly stores;
    constructor(stores: StorePort);
    /** GET /history：最近记录（截断与倒序由客户端做，它要的条数由界面决定）。 */
    readonly read: RouteHandler;
    /** DELETE /history：清空，返回被清空条数（键名 `removed` 是客户端锁定的契约）。 */
    readonly clear: RouteHandler;
    /** GET /status：各频道最近一次投递终态。 */
    readonly readStatus: RouteHandler;
}
