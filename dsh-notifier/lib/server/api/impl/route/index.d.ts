/**
 * api 域路由块：注册端点并给每条请求套上围栏——回环围栏（非回环一律 403，必须用共享层默认参数：放行 `no-cors` 的开关
 * 只给资源伺服路由）、方法围栏（方法不在表里给 405 而不是 404）、异常收口（漏出去的异常留下的不是错误页，是一个挂住的连接）。
 */
import type { ServerResponse } from "node:http";
import type { LoggerPort, RegisterRoute } from "../../deps.ts";
import type { Endpoint } from "./type.ts";
/**
 * 写一个 JSON 响应。泛型而不是固定形状：响应体有设置视图、历史数组、状态表各不相同的形状，
 * 而序列化只关心它能被 JSON 表达。
 */
export declare function sendJson<T>(res: ServerResponse, status: number, body: T, headers?: Record<string, string>): void;
/**
 * 失败负载。三个字段分开不是冗余：客户端把 `error` 当提示文本、把 `code` 当分流依据（版本冲突靠
 * `SETTINGS_CONFLICT` 判，不靠中文文案），`details` 给结构化细节——合成一个字符串就等于让客户端
 * 去匹配文案，而文案是本地化的。
 */
interface FailureBody {
    /** 面向用户的失败原因。 */
    error?: string;
    /** 结构化细节（请求体非法等）。 */
    details?: string;
    /** 补充说明（如合法取值范围）；客户端不读它，用它的是直接看响应的排查者。 */
    hint?: string;
    /** 机器可判的失败类别。 */
    code?: string;
}
/** 写一个失败响应：`{ ok: false, error: {...} }`，与端点的成功体同族。 */
export declare function sendFailure(res: ServerResponse, status: number, failure: FailureBody, headers?: Record<string, string>): void;
/** 注册端点组，返回摘除器清单（与装配顺序相反地释放）。 */
export declare function registerEndpoints(register: RegisterRoute, endpoints: Endpoint[], logger: LoggerPort): Array<() => void>;
export {};
