/**
 * dsh-notifier pipeline 域 —— 路由：这条通知该发给谁（纯函数，判据全来自设置）。
 * 目标身份由客户端锁定：`bark:<id>` / `webhook:<id>` / 内置 `browser`、`system`。
 *
 * 本块对每个频道**只有一个判断：`enabled`**（发不发）。发什么——弹窗、声音、只响不弹、还是什么都
 * 不发——由出口按传到手上的配置自己决定；管线只搬配置，不预设形态。
 */
import type { EffectiveConfig } from "../../deps.ts";
import type { NotifyKind } from "../service/kinds.ts";
import type { NotifyRequest } from "../service/type.ts";
import type { BarkConfig, BarkTarget, BrowserConfig, RouteDeps, RouteOutcome, RoutedTarget, SystemConfig, WebhookConfig, WebhookTarget } from "./type.ts";
/** 路由：按 kind 与设置选出本次要投递的目标。 */
export declare function routeTargets(deps: RouteDeps, config: EffectiveConfig, request: NotifyRequest): RouteOutcome;
/** 浏览器内置频道 → 目标：配置原样搬运，播放决议由出口解析。
 *
 * 导出给草稿测试（dry-run）复用同一份映射：它跳过 enabled 门直构单目标，映射本身必须与
 * 路由一致，否则「测得通、存下来不通」。 */
export declare function browserTarget(channel: BrowserConfig, deps: RouteDeps, kind: NotifyKind): RoutedTarget;
/** 系统内置频道 → 目标；脚本路径由组合层推导后传入，出口不做路径猜测。
 *
 * 导出理由同 browserTarget：dry-run 直构单目标时复用同一份映射。 */
export declare function systemTarget(channel: SystemConfig, deps: RouteDeps): RoutedTarget;
/** bark 配置 → 投递参数；空串是归一化表达「没配置」，投递层的缺省才是真缺省。
 *
 * 导出理由同 browserTarget：dry-run 直构单目标时复用同一份映射。 */
export declare function barkTarget(channel: BarkConfig, kind: NotifyKind): BarkTarget;
/** webhook 配置 → 投递参数；凭据在这里解析成投递层的对象。
 *
 * 导出理由同 browserTarget：dry-run 直构单目标时复用同一份映射。 */
export declare function webhookTarget(channel: WebhookConfig): WebhookTarget;
