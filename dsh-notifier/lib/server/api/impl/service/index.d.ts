/**
 * api 域编排：把端点挂上宿主、把帧接进流，卸载时全部收回。端点表是本域对外的**完整承诺**（路径由客户端锁定，
 * 改一处就要两端同改）；它在装配期构造而不是模块级常量——写成常量各端点就得自己去别处找依赖，而症状是测试里换不掉真实现。
 */
import type { ApiDeps } from "../../deps.ts";
/** 浏览器出口：路由注册与帧订阅的生命周期。 */
declare class ApiService {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 摘除器：路由与帧订阅混在一起，卸载时逐个调用。 */
    private disposers;
    /** 装配：挂路由、接帧。 */
    install(deps: ApiDeps): void;
    /** 卸载：摘路由、退订帧、停掉流。重复调用无害——卸载链可能走到不止一次。 */
    release(): void;
}
/** 本域唯一的编排实例：类不外放，外面 `new` 不出第二份路由表。 */
export declare const apiService: ApiService;
export {};
