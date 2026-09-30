/**
 * dsh-notifier events 域 —— 订阅宿主事件、转交翻译、把请求递给下游。
 * 本块只做搬运不含判断；状态机的装配与卸载也在这里成对发生。
 */
import type { EventsDeps } from "../../deps.ts";
/** 宿主事件的订阅集合：装配时装上，卸载时全部摘除。 */
declare class EventListener {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 退订句柄；卸载期逐个调用。 */
    private readonly releases;
    /** 装配：装状态机，再订阅宿主事件。 */
    install(deps: EventsDeps): void;
    /** 摘除全部订阅并卸载状态机。重复调用无害——卸载链可能走到不止一次。 */
    release(): void;
}
/** 本域唯一的订阅点：类不外放，外面 `new` 不出第二份订阅。 */
export declare const eventListener: EventListener;
export {};
