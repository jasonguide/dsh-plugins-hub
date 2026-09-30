import type { UpgradeDeps } from "../../deps.ts";
/**
 * 装配前跑一遍升级链（组合根在 `apply` 期 `await`）。必须在各域装配**之前**：升级会重写配置文件与
 * 存储文件，先装配就等于让各域先读到旧形态，再让它们带着旧形态继续跑。
 *
 * 刻度原语在本包是**同步 + 返回值**语义（`writeStoredVersion` 失败给 `{ok:false}` 而不是抛），而共享
 * 执行器靠抛错感知失败——故接缝在这里转一层：失败转成抛，抛的**只有原始 reason**（包名前缀与目标版本
 * 由共享层统一包装成「存储版本号回写失败（版本）— 原因」，这里再拼一遍就成了同一句话说两次）。
 */
export declare function runUpgradeChain(deps: UpgradeDeps): Promise<void>;
