/**
 * 设置项输入原子：switch / 文本 / 数字的纯渲染函数。
 *
 * settings 与 patch 由调用方传入——客户端唯一的 settings 写入口是卡片里的 patch（updater 内
 * 同步 settingsRef），原子层不持有写路径，也不读卡片状态。
 */
import * as React from "react";
import type { SettingsView } from "../types.ts";
/** switch 开关底层（track 40×22 + 透明 input 覆盖 44×32 触控区；
 *  aria-label 提供可访问名——switch 无内联文本，WCAG 4.1.2）。 */
export declare function switchToggle(checked: boolean, onChange: (v: boolean) => void, ariaLabel: string): React.JSX.Element;
/** 顶层布尔设置键的 switch（switchToggle 的设置键薄封装）。
 *  统一走 patch 写入口（settingsRef 同步），不再裸 setSettings。 */
export declare function switchControl(key: string, ariaLabel: string, settings: SettingsView, patch: (p: (prev: SettingsView) => SettingsView) => void): React.JSX.Element;
export declare function textInput(value: unknown, onChange: (v: string) => void, opts?: {
    type?: string;
    placeholder?: string;
    ariaLabel?: string;
}): React.JSX.Element;
export declare function numInput(value: unknown, onChange: (v: number | undefined) => void, opts?: {
    ariaLabel?: string;
    min?: number;
    max?: number;
}): React.JSX.Element;
