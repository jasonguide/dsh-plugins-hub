import type { KindPort } from "../../deps.ts";
import type { RouteHandler } from "../route/type.ts";
/** 动态种类端点。能力在装配期接上，此后每个请求只读实例字段。 */
export declare class KindsEndpoints {
    private readonly kinds;
    constructor(kinds: KindPort);
    /** GET /kinds：清单（登记项 × 确认态）。 */
    readonly read: RouteHandler;
    /**
     * POST /kinds：确认 / 撤销一个动态种类。四态逐态映射而不是压成一两个状态码（未登记 404、
     * 参数非法 400、版本冲突 409、服务不可用 503）——压扁之后用户看到的就只剩「操作失败」。
     * 成功体带回**新修订号**：客户端确认之后要同步自己那份 meta，否则紧接着的一次保存会拿着旧
     * 修订号提交、凭空造出一次冲突，而用户会以为自己刚才的确认没生效。
     */
    readonly confirm: RouteHandler;
}
