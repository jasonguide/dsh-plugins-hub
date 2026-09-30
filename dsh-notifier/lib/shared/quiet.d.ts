/**
 * dsh-notifier —— 免打扰共享面（纯函数 + 纯数据，无 import，两端同源）。
 *
 * 为什么落在共享面：免打扰的「上限几个窗口」「HH:MM 长什么样」「某分钟落不落在窗口里」
 * 此前在三处各写一份（服务端裁决 judge、服务端输入闸门 input、客户端本机回显 events.tsx），
 * 口径一致全靠人工同步。改一边就是「页面回显命中、服务端不压制」这类两端各说各话。
 * 放进包内共享面，是为了让宿主端与浏览器端都不必 import 对方的实现文件。
 *
 * 约束（见 src/shared/interface.ts 头注）：本目录参与两端打包，故本文件零 import。
 */
/** 免打扰时间窗上限：写面超限 400 拒收（静默截断会让用户以为配好的时段生效了）。 */
export declare const QUIET_WINDOWS_LIMIT = 5;
/** 是否为合法时钟文本（写面与读面的形状闸门都走这里）。 */
export declare function isClockText(text: string): boolean;
/** `"HH:MM"` → 当日分钟数；形状非法或越界返回 NaN（脏设置不吃掉所有通知，见下）。 */
export declare function clockToMinutes(text: string): number;
/**
 * 单个窗口是否命中（纯函数：只看分钟数与起止，不读当前时间，方便逐分钟单测）。
 * 支持跨午夜（start 大于 end）；start 等于 end（零长窗口）与解析失败一律算未命中——
 * 脏设置不该把通知全部吃掉。两端都是闭开 [start, end)。
 */
export declare function inWindowMinutes(minutes: number, start: string, end: string): boolean;
