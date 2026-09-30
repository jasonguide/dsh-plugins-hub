import type { DeliverResult, NotifyMessage } from "../deliver/type.ts";
import type { BrowserTarget } from "./type.ts";
/**
 * 投递一帧到浏览器出口。
 *
 * 弹窗与声音都关掉时**不发帧**：帧一旦出去就会推进序号、进重放缓冲、并让页面认领主标签租约——
 * 用一次真实投递去换一个空动作，代价比什么都不做大得多。这不是「要不要投递」的判断（那在管线，
 * 只看 `enabled`），而是本出口对「发什么」的回答：这一次没有可发的内容。
 */
export declare function sendBrowser(target: BrowserTarget, message: NotifyMessage): DeliverResult;
