import type { NotifierLocaleKey } from "./locales.ts";
/** 翻译函数：宿主 locale 服务产物，或未装配时回落 key 本体的那个。 */
export type ReasonTranslator = (key: NotifierLocaleKey, params?: Readonly<Record<string, string | number>>) => string;
/**
 * 理由的主文案。读侧对形态是**宽容**的：磁盘上的旧行（散文）、手改过的值、更新版本写下的
 * 陌生 code 都会到这里。宽容不等于含糊——认不出来时宁可给一句中性文案或宿主原文，也不猜。
 */
export declare function reasonText(value: unknown, t: ReasonTranslator): string;
/** 宿主原文（没有就空串）：界面把它放进可折叠区并标注「来自宿主原文」，不作主文案。 */
export declare function reasonDetail(value: unknown): string;
/** 一条逐出口明细的视图：界面只消费它，于是「渲染成什么」在 node 环境里就能断言。 */
export interface DeliveryView {
    channelId: string;
    status: DeliveryStatus;
    /** 状态标签文案。 */
    statusText: string;
    /** 主理由文案；`ok` 那一支为空串（成功没有理由可说）。 */
    reason: string;
    /** 宿主原文（折叠展示）；没有、或与主文案重复时为空串。 */
    detail: string;
}
/**
 * 归一化一条投递明细（`/history` 里 `channels` 的一项）。
 *
 * 值域外的一律判读不出：`status` 是这一行的判据，认不出来就不能交给界面去猜（猜错的代价是
 * 把一次真实的失败画成成功）。判据与渲染分开，界面那侧才只剩一层机械投影。
 */
export declare function deliveryViewOf(value: unknown, t: ReasonTranslator): DeliveryView | undefined;
/** 明细行的状态闭集：`status` 是这一行的判据，值域外一律读不出。 */
type DeliveryStatus = "ok" | "failed" | "skipped";
/**
 * dry-run 结果行的理由文案（#912 F1 回归 pin）：`ok` 那一支为空串——成功没有理由可说，
 * 与 DeliveryView 同口径；非 ok 走 reasonText。调用方（index.tsx sendTest）不得直调
 * reasonText，否则 ok 行必挂“原因未知”。
 */
export declare function dryRunReasonText(status: string, reason: unknown, t: ReasonTranslator): string;
export {};
