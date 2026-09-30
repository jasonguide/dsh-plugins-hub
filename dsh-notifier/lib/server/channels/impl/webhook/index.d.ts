import type { DeliverResult, HttpFetch, NotifyMessage, NotifySeverity } from "../deliver/type.ts";
import type { WebhookPreset, WebhookRenderVars, WebhookTarget } from "./type.ts";
/** `{{priority}}` 渲染值；severity 非法（跨边界值不受编译期约束）视同未提供。 */
export declare function priorityFor(preset: WebhookPreset, severity?: NotifySeverity): string;
/** 渲染 body；模板非法 JSON 即抛错（调用方转成这次投递失败，绝不降级成文本发送）。 */
export declare function renderWebhookBody(template: string, preset: WebhookPreset, vars: WebhookRenderVars): string;
/** 请求体由模板渲染；任何失败都不重试（模板或凭据写错，重投三次还是同样的结论）。 */
export declare function sendWebhook(target: WebhookTarget, message: NotifyMessage, fetchImpl?: HttpFetch): Promise<DeliverResult>;
/**
 * 投递超时 clamp 到 1..60 秒（缺省 10）：配置层已归一，这里兜跨边界值。
 *
 * 导出是为了让这条口径可表驱动：clamp 的产物只落在 `AbortSignal` 的 deadline 上，从外面读不出来
 * ——「上界被改宽」与「下界被改成 0」在行为用例里都是绿的。
 */
export declare function clampTimeoutSec(value?: number): number;
