/**
 * dsh-notifier —— 投递理由的 code 闭集（纯数据，无 import）。
 *
 * 为什么两端共用一份：`reasonLegacy` 此前在客户端是一份**靠注释维系的同值字面量**
 * （`const LEGACY_CODE = "reasonLegacy"`，注释自述「与服务端 REASON_LEGACY 同值」），而没有任何
 * 断言锁住两者相等——改一边就是一个读不出来的历史行。收口后客户端只消费这里这个值。
 *
 * 值函数（reason / normalizeReason / reasonFromCause / clampReasonDetail / sameReasonShape）不在这里：
 * 它们依赖 src/server/shared/text.ts 的截断实现，属宿主端，进不了零 import 的共享面。
 *
 * 生产侧闭集在本地，读侧仍是开放 string（磁盘上的旧行与跨版本数据不受本版编译期约束）。
 * 客户端字典必须覆盖 REASON_CODES 的每一项，跨端一致性由 test/client-unit/reason-text.test.ts 的
 * 直连断言守（客户端只把 REASON_LEGACY 当值用，REASON_CODES 只作类型来源）。
 */
/**
 * 升级前的散文理由。这一条是唯一「code 不含文案」的取值：原文整句进 `detail`，客户端逐字渲染。
 * 它只在割接产物上出现（见 upgrade 域的 reason 形态迁移），但会随历史记录长期留在磁盘上。
 */
export declare const REASON_LEGACY = "reasonLegacy";
/**
 * 本版会生产的 code 清单。命名即字典 key：`t(code, params)` 直接取文案，不另建一张
 * code → key 的映射表，少一处能漂的地方。
 */
export declare const REASON_CODES: readonly ["reasonLegacy", "reasonSkipConfig", "reasonSkipEnvironment", "reasonSystemPopupFailed", "reasonSystemSoundFailed", "reasonSystemToastScriptMissing", "reasonSystemToneUnwritable", "reasonBarkRequestFailed", "reasonBarkHttp", "reasonBarkRejected", "reasonBarkBodyUnreadable", "reasonWebhookTemplateInvalid", "reasonWebhookRequestFailed", "reasonWebhookHttp", "reasonUnknownTarget", "reasonChannelThrew", "reasonThrottled"];
export type ReasonCode = (typeof REASON_CODES)[number];
/** 理由参数：只收能被字典插值的标量——对象与数组进不来，文案层不必再判嵌套。 */
export type ReasonParams = Readonly<Record<string, string | number>>;
