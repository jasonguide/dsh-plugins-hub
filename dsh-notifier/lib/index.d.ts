/**
 * 宿主端组合根：收窄宿主上下文、按依赖顺序装配各域（`upgrade` 最先因其动磁盘、`api` 最后因其读现值）、卸载逆序释放。
 * 交付的是能力对象而非装配期快照——设置是活的，快照看起来与实时读取一模一样。
 */
import type { Context } from "@deepseek-ai/cordis";
import * as sdkApi from "./server/sdk/interface.ts";
import type { NotifierService } from "./server/sdk/interface.ts";
/**
 * 对外服务面类型：消费方要写 `const n: NotifierService = ctx["dsh-notifier.service"]` 就得能命名它，
 * 它同时是下面声明合并的载荷。
 */
export type { NotifierService } from "./server/sdk/interface.ts";
/** 稳定的 cordis 插件名。 */
export declare const name = "notifier";
/**
 * 依赖的宿主服务。`settings` 是**必需**依赖而不是可选探测：0.2.3 把配置存在它那里，装配期要读一次存量。
 * 声明成依赖之后，宿主保证服务就绪才装配本插件——顺序由框架保证，比「先试一次、再监听晚到的」可靠。
 */
export declare const inject: string[];
/**
 * 组合层入口配置（插件挂载点传入）。只有总开关：设置项全部住在本插件自己的配置文件里，
 * 这里再开一层默认值只会让人以为某处配过什么，而它永远是空的。
 */
export interface NotifierApplyConfig {
    /** 总开关；`false` 时一律不投递。不落盘、不进设置层。 */
    enabled?: boolean;
}
/**
 * 挂载 dsh-notifier。**异步**：升级域的存储迁移是异步链，调用方（宿主或测试）必须 `await`——
 * 不等待就等于让各域在迁移跑完之前去读磁盘，读到的是被搬走一半的旧形态。
 */
export declare function apply(ctx: Context, config?: NotifierApplyConfig): Promise<void>;
/**
 * 对外名字的声明合并。必须写在包入口：`declare module` 是全局增强，入口声明面不可达时
 * `lib/index.d.ts` 里就没有它（`pack:check` 的「声明合并可达性」判据盯这条）；键引用 sdk 域的
 * 常量，服务名只留一个物理定义——抄一份字面量同样能编译，改名漏改时只会在运行时的另一头暴露。
 */
declare module "@deepseek-ai/cordis" {
    interface Context {
        /** 通知中心服务面：兄弟插件经它登记自己的通知种类、发送通知。 */
        [sdkApi.NOTIFIER_SERVICE]: NotifierService;
    }
}
