/**
 * 频道卡体行原子：纯渲染函数（返回 JSX），依赖一律显式传参。
 *
 * 为什么保持普通函数而不改成组件：这些是卡体排版原子，调用点在渲染期直接调用；改成组件会
 * 引入组件边界与新的 reconciliation 语义（key/位置、hooks 归属），本批只做搬家、行为零变化。
 */
import * as React from "react";
import type { Translate } from "../../locale.ts";
/** 频道卡体行（cap + 控件 + 可选 hint；CSS dn-ch-row/dn-ch-cap/dn-ch-ctl）。 */
export declare function chRow(cap: string, control: React.ReactNode, hint?: string): React.JSX.Element;
/** 折叠区行（cap + 控件；CSS dn-adv-row）。 */
export declare function advRow(cap: string, control: React.ReactNode): React.JSX.Element;
/**
 * 逐出口投递明细：状态标签 + 主理由 + 宿主原文（原文折叠，并标注它的来源）。
 * 数据本来就随 `/history` 到了客户端（`archive(..., { channels })`），此前只是没人渲染——
 * 「投递成功却没声音」这类结论因此完全不可见，状态行在 `skipped` 后还不会变。
 */
export declare function deliveryLines(r: {
    channels?: unknown;
}, t: Translate): React.JSX.Element | null;
