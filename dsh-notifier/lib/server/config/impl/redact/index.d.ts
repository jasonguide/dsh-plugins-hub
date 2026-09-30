/**
 * config 域凭据的掩码往返（安全模块）：**读出去一律掩码，写回来按 id 还原**——没有这条对称，凭据只有两种结局：
 * 明文出到界面与日志，或被掩码覆盖成字面量。`CHANNEL_SECRET_FIELDS` 是唯一扩展点，两处各写一份清单一定会漂移。
 */
import type { NotifyConfig, RawSettingValue, StoredSettings } from "../model/type.ts";
/** 掩码还原结果：成功带回还原后的频道数组；失败 = 有实例提交了掩码却无原值。 */
type UnmaskResult = {
    ok: true;
    channels: RawSettingValue;
} | {
    ok: false;
};
/** 读出口脱敏：深拷贝后把密钥字段掩码。拷贝而非原地改，是因为它作用于**即将外发的视图**，而同一份设置在域内还要以
 * 明文参与投递；频道项按**原始值**处理——存储层不受契约约束，里面可能躺着更高版本写的频道类型。 */
export declare function redactConfig(value: Partial<NotifyConfig>): Partial<NotifyConfig>;
/**
 * 存储层的读出口脱敏：视图的 `user` 要**原样带陌生键**（只掩码凭据），所以不能先过净化——
 * 净化会把用户手写的未来键从视图里摘掉，而它们其实还在文件里，界面与文件就此各说各话。
 */
export declare function redactStored(stored: StoredSettings): StoredSettings;
/**
 * 写入口还原：patch 里等于掩码的字段，按 **id** 对齐取回原值——按下标对齐时数组顺序一变，
 * 就会把 A 实例的凭据回填进 B。
 *
 * @param patchChannels 提交上来的频道数组。
 * @param userChannels 已存储的频道数组（原值来源）；缺省视为没有原值。
 * @returns 还原后的频道数组；`ok: false` = 有实例提交了掩码却没有对应原值，调用方应当拒绝
 *   ——掩码只能表达「未修改」，不能凭空造出一个凭据。
 */
export declare function unmaskChannels(patchChannels: RawSettingValue, userChannels?: RawSettingValue): UnmaskResult;
/**
 * 还原后是否还残留掩码字面量（跨 type 残留 / 改名残留）：还原只处理「当前 type 的密钥字段」，
 * `bark → webhook` 后残留的 `deviceKey: "********"` 这类字面量不会被还原——把它当真实凭据
 * 发出去等于把占位符写进对端日志，静默剥离等于替用户改配置，两条路都不对，由调用方整体拒绝。
 *
 * 扫的是**全部已知类型的密钥字段**而不只是当前 type 的：残留恰恰发生在「字段不属于当前
 * type」时，只扫当前 type 永远扫不到它。未知类型的密钥字段不在表里，扫不到——那种频道连
 * 校验都过不了，到不了这一步。
 */
export declare function hasResidualMask(channel: RawSettingValue): boolean;
export {};
