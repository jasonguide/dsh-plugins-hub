import type { ChannelPort, ConfigPort, PipelinePort } from "../../../deps.ts";
import type { DryRunResult } from "./type.ts";
/** dry-run 的域能力：只有组合根够得着的三个端口（与 ProbeEndpoints 的入参同源）。 */
export interface DryRunDeps {
    readonly config: ConfigPort;
    readonly pipeline: PipelinePort;
    readonly channels: ChannelPort;
}
/**
 * 并发门：同时在飞的 dry-run 上限（提案 B5）。实例字段而非模块级计数——模块级 let 是门禁红线，
 * 状态必须收进实例（ProbeEndpoints 每挂载一份门，计数器与真实投递的节奏表相互独立）。
 */
export declare class DryRunGate {
    private readonly max;
    private active;
    constructor(max?: number);
    /** 尝试占一个槽位：满了即 false（调用方回 429，不排队）。 */
    tryAcquire(): boolean;
    /** 释放一个槽位：settle 与超时都要走这里（finally），不按子进程退出——否则泄漏（B7）。 */
    release(): void;
    /** 在飞计数：只给单测读，生产路径不按它做判断（判断只认 tryAcquire 的原子结果）。 */
    get inflight(): number;
}
/**
 * 执行一次 dry-run：抛 DryRunInputError（调用方转 400），其余异常一律冒给预算层
 * （调用方按 500 收口，不记日志——禁写面）。成功即 B3 schema 的同步结果。
 */
export declare function executeDryRun(deps: DryRunDeps, channelId: string, draft: unknown): Promise<DryRunResult>;
/**
 * 总预算：15s 内未 settle 即按超时拒绝（调用方回 408）。超时不取消在飞的投递——
 * bark / webhook 的单跳各有自己的 fetch 超时，system 的 spawn 靠出口的 KILL 8s 回收，
 * 它们结算后写不进任何地方（无 stores 引用），结果自然丢弃（B7「abort 残留声明」）。
 */
export declare function withDryRunBudget<T>(work: Promise<T>): Promise<T>;
