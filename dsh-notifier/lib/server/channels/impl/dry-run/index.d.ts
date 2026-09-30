import type { DeliveryTarget } from "../deliver/index.ts";
import type { DeliverResult, NotifyMessage } from "../deliver/type.ts";
import type { SecureFetchPorts } from "./secure-fetch.ts";
/** dry-run 单跳出站超时上限（毫秒）：提案 B4「fetch 强制≤15s」。 */
export declare const DRY_RUN_FETCH_CAP_MS = 15000;
/**
 * 单跳超时：复用各出口自己的 clamp（与已保存路径同源），再压 15s 上限。
 * 导出是为了让这条口径可表驱动：超时只落在请求的 deadline 上，从外面读不出来——
 * 「上限被改宽」在行为用例里是绿的（与 clampTimeoutSec 的导出理由同族）。
 */
export declare function dryRunFetchTimeoutMs(target: Extract<DeliveryTarget, {
    type: "bark";
} | {
    type: "webhook";
}>): number;
/**
 * 单目标出站：按目标类型分派，bark / webhook 经安全 fetch，browser / system 直调原函数。
 *
 * @param ports 安全 fetch 的注入面（缺省即真实 DNS + 真实建连；单测注入桩，全程离线）。
 */
export declare function dryRunTarget(target: DeliveryTarget, message: NotifyMessage, ports?: SecureFetchPorts): Promise<DeliverResult>;
