/**
 * Webhook 实例卡（新增频道位，安卓经 ntfy / Gotify / 自建网关推送；默认停用）。
 *
 * 卡头同 Bark 实例卡形态；卡体：预设 / 名称 / 目标 URL / 认证（凭据掩码 + 显隐）/ 超时 / JSON 模板编辑器。
 * 依赖一律显式传参（瞬态草稿 delArmedId / revealMap / secretEdited 仍由 SettingsCard 顶层持有）：
 * 卡体不持有 state/ref/定时器，删除二次确认的 3 秒定时器也照搬原形态留在卡内 onClick 闭包里。
 */
import * as React from "react";
import type { Translate } from "../../locale.ts";
import type { ChannelStatusMap } from "../parts/status.tsx";
import type { HistoryRecordView, SettingsChannelView } from "../types.ts";
/**
 * Webhook 实例卡（新增频道位，安卓经 ntfy / Gotify / 自建网关推送；默认停用）。
 * 卡头同 Bark 实例卡形态；卡体：预设（填充认证/模板，URL 不覆盖）/ 名称 / 目标 URL /
 * 认证（none|bearer|basic|header，动态字段凭据掩码）/ 投递超时（1-60s clamp）/
 * JSON 模板编辑器（占位符 chips 光标处插入）。渲染契约见 channel-webhook.ts。
 */
export declare function webhookCard(ch: SettingsChannelView, idx: number, delArmedId: string | null, setDelArmedId: (v: string | null) => void, revealMap: Record<string, boolean>, setRevealMap: (next: Record<string, boolean>) => void, secretEdited: Record<string, boolean>, markSecretEdited: (key: string) => void, chPatch: (idx: number, part: Record<string, unknown>) => void, chRemove: (idx: number) => void, sendTest: (id?: string) => void, statusMap: ChannelStatusMap, t: Translate, history: HistoryRecordView[] | null, testDirty?: boolean): React.JSX.Element;
