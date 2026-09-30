/**
 * 频道类型图标原子：三张频道卡（内置 / bark / webhook）共用的卡头图标。
 *
 * 为什么单独成模块：三张卡都要它，任何一张卡持有都会让另两张反向依赖那张卡；它是纯渲染原子，
 * 只由 channelType 决定输出，没有卡片状态可读。
 */
import * as React from "react";
/**
 * 频道类型图标（设计上刻意保留；内联 SVG 零外部资源）。
 * browser=地球 / system=显示器 / webhook=闪电 / 其余（bark）=铃铛。
 */
export declare function iconEl(channelType: string): React.JSX.Element;
