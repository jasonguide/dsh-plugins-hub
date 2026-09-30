import type { RawSettingValue } from "../model/type.ts";
/** 草稿解析结论：成功带回还原后的频道数组（原始形态，调用方再归一化）；失败只带一句话。 */
export type ResolvedDraft = {
    readonly ok: true;
    readonly channels: readonly RawSettingValue[];
} | {
    readonly ok: false;
    readonly hint: string;
};
/**
 * 解析 dry-run 草稿：draft 必须是对象，其 channels 必须是数组；数组逐项校验、按 id
 * 还原掩码、再扫残留。三步任一失败即整体拒绝——半条还原的草稿没有「测一半」的语义。
 *
 * @param draft 请求体里的 draft（顶层其它键与 revision 由调用方忽略，不进这里）。
 * @param secrets 掩码还原的原值来源（调用方传已生效设置的 channels，含明文凭据、不外发）。
 */
export declare function resolveDraftChannels(draft: unknown, secrets: readonly RawSettingValue[] | undefined): ResolvedDraft;
