import type { BarkTarget } from "../bark/type.ts";
import type { BrowserTarget } from "../browser/type.ts";
import type { SystemTarget } from "../system/type.ts";
import type { WebhookTarget } from "../webhook/type.ts";
import type { DeliverResult, NotifyMessage } from "./type.ts";
/** 投递目标：出口类型 + 该出口的投递参数（联合在聚合点声明，各出口只交出自己的那一路）。 */
export type DeliveryTarget = BarkTarget | WebhookTarget | BrowserTarget | SystemTarget;
/** 投递能力实现：并行投递，逐目标分派，结果与 `targets` 下标同序。 */
export declare function deliverImpl(message: NotifyMessage, targets: DeliveryTarget[]): Promise<DeliverResult[]>;
