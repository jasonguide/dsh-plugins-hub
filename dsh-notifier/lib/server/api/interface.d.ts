/** api 域对外契约：**浏览器出口**——把宿主端的事实经 HTTP 与 SSE 送到页面、把页面提交的设置写回去，本域不判业务。
 * 它是**唯一**的浏览器入口，所以围栏（回环判定、方法判定、异常收口）也只有一份实现，少写一处就是多开一个洞。 */
import type { ApiDeps } from "./deps.ts";
/** 装配浏览器出口（组合根在 `apply` 期调用一次）。 */
export declare function installApi(deps: ApiDeps): void;
/** 卸载浏览器出口，与 `installApi` 配对：摘路由、关连接、停心跳全部由本域自己收口。 */
export declare function releaseApi(): void;
