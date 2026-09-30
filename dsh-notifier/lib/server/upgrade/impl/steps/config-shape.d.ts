import type { LegacySettingsFace } from "../../deps.ts";
/**
 * 割接：宿主 settings 里的存量与当前配置文件合并，再把顶层渠道键搬进两条内置条目。
 *
 * 合并顺序与旧写面同口径（文件为基底、存量覆盖）：「设置回到更早的样子」比「保留当前值」糟得多。
 */
export declare function migrateConfigShape(settings: LegacySettingsFace): void;
