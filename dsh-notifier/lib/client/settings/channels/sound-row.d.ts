/**
 * 单通道声音行：开关 + 音色下拉 + 试听。
 *
 * 音频出口（audioEngine）、频道字段写入口（chPatch）、文案函数（t）与「声音是否开」都由调用方
 * 传入：音频解锁与播放节流窗口是全页一份的闭包状态，原子层不得自取。
 */
import * as React from "react";
import type { AudioEngine } from "../../notify/audio.ts";
import type { SettingsChannelView } from "../types.ts";
import type { Translate } from "../../locale.ts";
/** 单通道声音行：开关（false/true 切换）+ 展开音色下拉 + ▶试听。
 *  开关语义：off=false（静音）；on=true（跟随系统默认）；on 后选择音色 =
 *  SoundId（显式音色）。交互全部显式 audioEngine.unlock() 兜底（autoplay 策略下
 *  纯后台页面自播需此前任意手势解锁；试听点击本身即手势）。 */
export declare function soundRow(index: number, ch: SettingsChannelView, channelLabel: string, soundOn: boolean, t: Translate, chPatch: (idx: number, part: Record<string, unknown>) => void, audioEngine: AudioEngine): React.JSX.Element;
