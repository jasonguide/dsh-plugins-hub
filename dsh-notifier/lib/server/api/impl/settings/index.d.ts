import type { ConfigPort } from "../../deps.ts";
import type { RouteHandler } from "../route/type.ts";
/**
 * 设置端点。用类而不是返回闭包的工厂：闭包会把「这个处理函数从哪拿到 config 域」藏进词法环境，
 * 而类把它摊在构造签名上，于是「这个端点依赖什么」在文件里就能读到。
 */
export declare class SettingsEndpoints {
    private readonly config;
    constructor(config: ConfigPort);
    /** GET /config：一次取齐视图的四个事实（分开取会让界面拿旧修订号提交，凭空造出冲突）。 */
    readonly read: RouteHandler;
    /**
     * PUT /config：写用户设置。四态逐态映射而不是压成一两个状态码：`invalid` 要让界面定位到出错的
     * 那一行，`conflict` 要触发「加载最新 / 覆盖提交」的恢复流程，`unavailable` 要把表单整体置灰
     * ——压扁之后用户看到的就只剩「保存失败」，而三种原因要做的事完全不同。
     */
    readonly write: RouteHandler;
}
