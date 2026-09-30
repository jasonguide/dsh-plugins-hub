/**
 * Bark 实例卡：卡头 = 图标 + 名称 + 类型徽标 + 状态点/摘要 + 失败徽标 + 启用 switch；
 * 卡体 = 基本行 + 高级参数折叠（含 levels 矩阵）+ 测试/删除。
 *
 * 依赖一律显式传参（瞬态草稿 delArmedId / levelsNew / secretEdited 仍由 SettingsCard 顶层持有）：
 * 卡体不持有 state/ref/定时器，删除二次确认的 3 秒定时器也照搬原形态留在卡内 onClick 闭包里。
 */
import * as React from "react";
import type { Translate } from "../../locale.ts";
import type { ChannelStatusMap } from "../parts/status.tsx";
import type { HistoryRecordView, RegisteredKindView, SettingsChannelView } from "../types.ts";
/**
 * Bark 实例卡：卡头 = 图标 + 名称 + 类型徽标 + 状态点/摘要 +
 * 失败徽标 + 启用 switch；卡体 = 基本行 + 高级参数折叠（含 levels 矩阵）+ 测试/删除。
 * 整卡 details 可折叠（非受控 + key remount），未启用默认收起。
 */
export declare function barkCard(ch: SettingsChannelView, idx: number, kindsList: RegisteredKindView[], delArmedId: string | null, setDelArmedId: (v: string | null) => void, levelsNew: Record<string, {
    kind: string;
    level: string;
}>, setLevelsNew: (next: Record<string, {
    kind: string;
    level: string;
}>) => void, secretEdited: Record<string, boolean>, markSecretEdited: (key: string) => void, chPatch: (idx: number, part: Record<string, unknown>) => void, chLevelsSet: (idx: number, kind: string, level: string) => void, chRemove: (idx: number) => void, sendTest: (id?: string) => void, statusMap: ChannelStatusMap, t: Translate, history: HistoryRecordView[] | null, testDirty?: boolean): React.JSX.Element;
