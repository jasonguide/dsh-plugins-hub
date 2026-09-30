/**
 * 通知记录 tab 内容片：工具行（清理记录两段确认 / 发送测试 / 刷新并排）+ 历史列表
 * （severity 色点 + kind 文案 + 时间 + 免打扰标记 + 逐出口投递明细）。
 *
 * 普通函数返回 JSX（卡片对它做**条件调用**——非 active tab 根本不调用；改成组件会引入
 * 挂载/卸载语义）。history / clearArmed / confirmClear / sendTest / loadHistory / severityOf / t
 * 一律显式传参——本模块零 state、零 ref、零定时器、零模块级可变状态。
 */
import * as React from "react";
import type { NotifySeverity } from "../../../shared/interface.ts";
import type { Translate } from "../../locale.ts";
import type { HistoryRecordView } from "../types.ts";
/**
 * 历史列表片：清理/测试/刷新工具行 + 最近记录列表。
 * deliveryLines 的调用点在本模块内（reason-text 契约断言按此读文件）。
 */
export declare function historyPane(history: HistoryRecordView[] | null, clearArmed: boolean, confirmClear: () => void, sendTest: (id?: string) => void, loadHistory: (alive: {
    value: boolean;
}) => void, severityOf: (kind: string) => NotifySeverity, t: Translate): React.JSX.Element;
