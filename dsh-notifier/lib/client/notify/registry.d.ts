/**
 * dsh-notifier 客户端 —— 已弹出的系统通知登记。
 *
 * 保留最近 NOTIFICATION_KEEP 条、超出即关最旧的；卸载时只关**自己登记的**那些。通知是瞬时
 * 提醒，插件卸载后没有可归属的宿主；但热更或重复 apply 时旧实例的 disposer 仍会执行，全关会
 * 连带关掉新实例正在显示的弹窗（跨实例串味），故按归属者分账。
 *
 * **上限仍是页面级的**：NOTIFICATION_KEEP 说的是「整个页面同时留几条弹窗」，超限淘汰永远挤掉
 * 页面上最旧的那条，不按归属分账——按实例各算一份会让「最多 5 条」变成「每实例 5 条」。
 *
 * 用模块级 const 容器承载：同一页面只有一组弹出通知。
 */
/** 同时保留的弹出通知条数。 */
export declare const NOTIFICATION_KEEP = 5;
/** 登记一条已弹出的通知，超出页面上限即关掉最旧的那条（不分归属）。 */
export declare function trackNotification(notification: {
    close(): void;
}, owner: object): void;
/**
 * 关闭并摘除 owner 自己登记的通知（卸载路径）。别的实例登记的弹窗不动，关闭失败的单个通知也
 * 不影响其余——但登记项一律摘除：注册表不再持有即将卸载的实例的资源。
 */
export declare function closeNotificationsOf(owner: object): void;
