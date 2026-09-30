import type { UpgradeDeps } from "../../deps.ts";
/** 本域唯一的装配实例：闭包持有「已装配」标记，外面拿不到第二份升级流程。 */
export declare const upgradeRunner: import("../../../../vendor/upgrade-chain.js").UpgradeRunner<UpgradeDeps>;
