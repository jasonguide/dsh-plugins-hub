import type { DimensionChecks } from "./table.ts";
import type { CapabilityDimension, CheckedDimension, HostCapabilities } from "./type.ts";
/** 本平台的合法 `checked` 子集。认不出的平台退到 POSIX 一档，不借别的平台的词。 */
export declare function checksFor(platform: string): DimensionChecks;
/**
 * 实际产出是否落在「平台 × 维度」允许集内。
 *
 * 只有测试消费它（断言「探测产出 ⊆ 该平台允许集」），实现自己不调用；也**没有门禁**消费它——
 * 那条不变量要在每个平台上真跑一次探测，CI 做不到。注释原先写成「门禁与测试用它判红」，与事实不符。
 */
export declare function checkedWithin(platform: string, dimension: CapabilityDimension, dims: readonly CheckedDimension[]): boolean;
/** 宿主能力面（一次探测，由调用方负责缓存）。 */
export declare function probeHostCapabilities(): Promise<HostCapabilities>;
/**
 * 探测没能给出结论时的诚实回答：两个维度都「无法判定」，也不给任何处置建议。
 * 单独成函数而不是就地写字面量，是为了让「无法判定」在所有调用方眼里都是同一份形状。
 */
export declare function undeterminedCapabilities(): HostCapabilities;
