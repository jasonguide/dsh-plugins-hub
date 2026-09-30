import type { DeliverResult, HttpFetch, NotifyMessage } from "../deliver/type.ts";
import type { BarkTarget } from "./type.ts";
export declare function sendBark(target: BarkTarget, message: NotifyMessage, fetchImpl?: HttpFetch): Promise<DeliverResult>;
/** 调用方给了可用的超时就照用，否则用出口的硬超时。
 *
 * 导出给草稿测试（dry-run）复用同一 clamp 口径：它在出口硬超时之外再压一条 15s 上限
 * （提案 B4），基数必须与这里同源，否则「已保存 10s、草稿 30s」这种分叉迟早出现。 */
export declare function timeoutMsOf(target: BarkTarget): number;
