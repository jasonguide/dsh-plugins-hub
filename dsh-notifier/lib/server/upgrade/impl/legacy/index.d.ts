import type { LegacySettingsFace, LegacyStoredSettings } from "./type.ts";
/**
 * 读存量设置。空对象只在所有正式来源、describe 与 V0 都没有可迁数据时返回。
 * @throws 正式来源或 V0 文件存在但无法读取、解析、校验或序列化时。
 */
export declare function readLegacySettings(settings: LegacySettingsFace): LegacyStoredSettings;
