/** upgrade 域升级链的步骤表。**新增版本时必须在此追加一项**，哪怕这一步没有数据要改（`run` 给空实现）：链的推进
 * 以步骤为刻度，漏掉的版本会让存储刻度永久停在旧值上。 */
import type { UpgradeStep } from "../../../../vendor/upgrade-chain.js";
import type { UpgradeDeps } from "../../deps.ts";
/** 按目标版本升序维护；执行顺序由链驱动排序决定，此处顺序只为便于阅读。 */
export declare const STEPS: readonly UpgradeStep<UpgradeDeps>[];
