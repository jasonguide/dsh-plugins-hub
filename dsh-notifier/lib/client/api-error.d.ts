import type { NotifierLocaleKey } from "./locales.ts";
/** 翻译函数：宿主 locale 服务产物，或未装配时回落 key 本体的那个。 */
export type FailureTranslator = (key: NotifierLocaleKey) => string;
/** 失败的可操作结论：界面只消费这三个字段，业务判断不再散落在各 catch 里。 */
export interface ApiFailure {
    /** 是否属围栏拒答（回环围栏或方法围栏）。 */
    refused: boolean;
    /** 可操作引导；只有回环围栏拒答非空（非 403 一律空串，不给普通失败粘贴无关提示）。 */
    hint: string;
    /** 展示正文。 */
    message: string;
}
/** 已构造的失败错误上被判读的结构化字段（挂载点见 markHttpFailure）。 */
export interface HttpFailure {
    code?: string;
    status?: number;
}
/**
 * 判定一次失败的结论。
 *
 * 输入可以是 catch 到的东西（新宿主挂过 `code`/`status` 的 Error、旧宿主的裸字符串、`null`），
 * 也可以是裸响应体（围栏体把 `code`/`status` 与 `error` 平铺）。形状再怪也只是判不出来，
 * 一律不抛——判定函数的职责是给结论，不是替调用方处理畸形输入。
 */
export declare function apiFailureOf(error: unknown, t: FailureTranslator): ApiFailure;
/**
 * 把失败响应的结构化字段挂到已构造的 Error 上：就地挂、原样返回，throw 点的写法不变。
 *
 * 为什么这一步最要紧：字段没挂上，判定侧就只能退回文案兜底，结构化判定等于没做。两种形状都取
 * 是因为围栏拒答体把它们平铺（`{error, code, status}`），而端点失败体把 `code` 嵌在 `error` 里
 * （`{ok:false, error:{error, code}}`）；形状认不出时只挂得到状态码，判定侧照旧走兜底。
 *
 * `body` 可选：有的调用点只有响应码——例如 DELETE /history 的失败体未必是 JSON，为了挂
 * `code` 去解析它会让一条失败请求变成两条（读体再抛）。让调用点少传一个参数，比逼它造一个
 * 假 body 诚实。
 */
export declare function markHttpFailure<T extends Error>(error: T, status: number, body?: unknown): T & HttpFailure;
