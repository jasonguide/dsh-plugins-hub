/**
 * 通知事件 tab 内容片：事件开关卡 + 动态 kind 待确认/已确认区 + 资源上限折叠区 + 免打扰卡。
 *
 * 普通函数返回 JSX 数组（与搬走前的 eventsPane 变量同形）：卡片对三个 pane 做**条件调用**
 * （非 active tab 根本不调用），改成组件会引入挂载/卸载语义。卡片状态（settings / kindsList /
 * patch / confirmOne / routeChipsRow / severityOf / t）一律显式传参——本模块零 state、零 ref、
 * 零定时器、零模块级可变状态；依赖不从 SettingsCard 闭包取值。
 */
import * as React from "react";
import type { NotifySeverity } from "../../../shared/interface.ts";
import type { Translate } from "../../locale.ts";
import type { RegisteredKindView, SettingsPatch, SettingsView } from "../types.ts";
/**
 * 事件 tab 内容片：内置事件卡（sev 色点 + kind 码 + switch + 路由 chips）+ 动态 kind
 * 清单（待确认 = 允许/拒绝；已确认 = 撤销 + 路由 chips）+ 资源上限折叠区 + 免打扰卡。
 *
 * routeChipsRow 与 severityOf 都留在卡片（前者是路由闭包，后者为事件/历史两个 pane 共用），
 * 由调用方显式传入。
 */
export declare function eventsPane(settings: SettingsView, kindsList: RegisteredKindView[], patch: (p: SettingsPatch) => void, confirmOne: (kind: string, confirmed: boolean) => void, routeChipsRow: (kind: string) => React.ReactNode, severityOf: (kind: string) => NotifySeverity, t: Translate): (React.JSX.Element | React.ReactNode[])[];
