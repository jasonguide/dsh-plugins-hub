/**
 * 设置卡 icon 原子：事件 kind / 分段 tab / 历史 severity 的单色线稿。
 *
 * kind id 事实源 = src/shared/kinds.ts 的 BUILTIN_KINDS
 * （ask | question | done | subagent-done | error | turn-end | test），
 * 与开关键名 notifyTaskDone 无关。内联 SVG 零外部资源；三页共用 CSS .dn-ico。
 */
import * as React from "react";
/** 事件 kind → 图标（键必须与 BUILTIN_KINDS / 外部 kind 字符串一致）。 */
export declare function kindIcon(kind: string, extraCls?: string): React.JSX.Element;
/** 分段 tab 图标。 */
export declare function tabIcon(which: "events" | "channels" | "history"): React.JSX.Element;
/** 历史 severity → 图标（色相只作图标描边，不靠左侧色条）。 */
export declare function sevIcon(sev: string, extraCls?: string): React.JSX.Element;
