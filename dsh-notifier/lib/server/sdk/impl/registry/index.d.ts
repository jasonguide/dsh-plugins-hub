/** sdk 域动态种类注册表：只有**进程报上来的声明**（id → 展示名），确认态属于用户、落在设置的 `allowKinds` 里
 * （注册表随进程生灭，确认态跨重启保留）。按 id 覆盖，表插入有序，故它同时决定设置页上的展示顺序。 */
import type { KindRegistration, RegisteredKind } from "./type.ts";
/** 注册表：谁登记过哪些种类。确认态经参数传入，本表不持有它。 */
declare class KindRegistry {
    private readonly labels;
    register(registration: KindRegistration): void;
    /** 是否登记过。确认动作只对登记过的种类成立。 */
    has(id: string): boolean;
    /** 清单：登记项合并已确认名单（确认名单来自设置）。 */
    list(confirmed: readonly string[]): RegisteredKind[];
}
/** 本域唯一的注册表：类不外放，外面 `new` 不出第二份。 */
export declare const kindRegistry: KindRegistry;
export {};
