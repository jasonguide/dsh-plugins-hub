/**
 * dsh-notifier pipeline 域 —— 编排：一条通知从「发生」到「出去」的全程。
 * 本块只串流程，另做一件事是归档——记录这条通知走到了哪一步、为什么没走完。
 */
import type { PipelineDeps } from "../../deps.ts";
import type { NotifyRequest } from "./type.ts";
/** 裁决管线：唯一裁决点，以及一条通知的生命周期。 */
declare class NotificationPipeline {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 装配入参：宿主能力、挂载点值，以及本域依赖的那几个域。 */
    private deps;
    /** 装配。重复装配是编程错误，当场暴露。 */
    install(deps: PipelineDeps): void;
    /** 卸载：清空投递节奏状态、放开对宿主面的引用。此后到达的请求一律丢弃。 */
    release(): void;
    /**
     * 提交一条通知请求。
     * 未装配时静默丢弃，不抛错：本方法挂在宿主事件链上，在这里抛会打断别人的流程。
     */
    submit(request: NotifyRequest): void;
    /** 定稿，投递，归档。 */
    private send;
    /** 归档：一次通知写一条记录，发出与压制只在载荷上分叉。 */
    private archive;
}
/** 本域唯一的裁决点：类不外放，外面 `new` 不出第二份。 */
export declare const notificationPipeline: NotificationPipeline;
export {};
