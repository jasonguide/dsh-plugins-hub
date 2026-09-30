/**
 * dsh-notifier 客户端 —— 页面内即时反馈（横幅 + 短提示）。
 *
 * 非安全上下文（局域网 http）下系统级通知不可用，本模块是唯一的降级提醒通道。
 *
 * 裁剪做成纯函数不是为了复用，而是为了**可判据**：旧实现在 querySelectorAll 的静态快照上写
 * `while (banners.length >= 3) banners[0].remove()`，而 Element.remove() 不改变那个数组的长度，
 * 条件恒真。页面可见 + 系统通知不可用时，第 4 条不同 kind 的通知会让主线程同步忙等、整页冻结。
 * trimBanners 按算好的条数从最旧端淘汰，天然有界。
 */
/** 同屏最多保留的横幅条数（追加一条后不超过它）。 */
export declare const BANNER_CAP = 3;
/** 可移除节点：本模块只用到 remove，测试因此不必造真实 DOM。 */
export interface Removable {
    remove(): void;
}
/** 追加一条之前需要淘汰的条数；0 表示还有空位。 */
export declare function bannerTrimCount(existing: number, cap: number): number;
/** 从最旧端淘汰，使追加一条后总数不超过 cap。 */
export declare function trimBanners(banners: readonly Removable[], cap: number): void;
/** 页面内横幅（点击聚焦，自动消失，最多 BANNER_CAP 条）。
 *  kind 由帧携带、可含任意字符，因此按 dataset 比对而不拼 CSS 选择器——拼选择器遇引号/反斜杠
 *  会抛错，而抛错会让整帧静默丢弃。 */
export declare function showBanner(kind: string, title: string, message: string): void;
/** 页面内短提示（操作反馈）。 */
export declare function toast(message: string): void;
