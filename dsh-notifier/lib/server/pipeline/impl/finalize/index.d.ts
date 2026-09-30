/**
 * dsh-notifier pipeline 域 —— 定稿：把请求加工成待投递消息。强度按 kind 补缺省（外部
 * kind 没有缺省），标题按展示上限截断；正文不截断——它的长度权威在各出口自己那里。
 */
import type { NotifyMessage } from "../../deps.ts";
import type { NotifyRequest } from "../service/type.ts";
/**
 * 定稿：组装待投递消息；强度缺席就不写这个键。
 * `ts` 由编排层取一次并同时喂给归档——投递载荷与历史记录必须是同一个时刻。
 */
export declare function finalizeRequest(request: NotifyRequest, ts: number): NotifyMessage;
