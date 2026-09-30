import type { ChannelDelivery, NotifyMessage } from "../../deps.ts";
import type { RoutedTarget } from "../route/type.ts";
import type { DispatchPort } from "./type.ts";
/** 投递器：节奏策略表 + 每频道节奏状态。单例，装配与卸载必须成对。 */
declare class Dispatcher {
    /** 单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 装配入参：投递出口与频道状态写面。 */
    private port;
    /** 逐频道的门与节流状态；`release` 时整表清空。 */
    private rhythms;
    /** 装配。 */
    install(port: DispatchPort): void;
    /** 卸载：放开能力面并清空全部节奏状态（门与节流都不跨装配期存活）。 */
    release(): void;
    /** 投递：逐目标 fail-soft（出口承诺失败是返回值），结果与 `targets` 同序同长。 */
    dispatch(message: NotifyMessage, targets: RoutedTarget[]): Promise<ChannelDelivery[]>;
    /**
     * 单目标的违约收口：一个目标违约只产出它自己的失败明细。
     * 违约若冒给 `dispatch` 里的 `Promise.all`，整批一起拒绝，调用方连健康频道的明细都拿不到，
     * 只能记一条「投递失败」——一次出口打洞就抹掉整批故障现场。
     */
    private dispatchSafely;
    /** 违约频道的状态写面：状态只是观测面，它自己违约也不能再升级为抛出——明细已经成立。 */
    private recordFailure;
    /** 单目标：节流 → 在途门 → 重试，然后写频道状态并返回归档明细。 */
    private dispatchOne;
    /** 取（必要时创建）频道的节奏状态。 */
    private rhythmOf;
    /** 在途门：槽位满时排队等待，队列无上限。 */
    private withGate;
    /** 让出一个在途槽位并唤醒队首。 */
    private releaseSlot;
    /** 单目标投递 + 重试：只对出口标注 `retryable` 的失败重试，线性退避。 */
    private deliverWithRetry;
    /** 单次投递：一次只投一个目标，结果与目标唯一对应。 */
    private deliverOnce;
    /** 写频道状态并返回归档明细。 */
    private settle;
}
/** 本域唯一的投递器：类不外放，外面造不出第二份节奏状态。 */
export declare const notificationDispatcher: Dispatcher;
export {};
