/** sdk 域服务面与生命周期：把服务对象挂上宿主上下文、把外部请求送进裁决管线、管好动态种类的确认态（本域只是**边界**）。
 * **对外**只有登记与发送，**对内**才是清单与确认——合成一个对象交出去，兄弟插件就能替用户确认自己的通知种类。 */
import type { ConfigPort, SdkDeps } from "../../deps.ts";
import type { RegisteredKind } from "../registry/type.ts";
type WriteOutcome = Awaited<ReturnType<ConfigPort["writeConfig"]>>;
/** 服务名：本插件对兄弟插件开放的 ABI 名。事实源在这里而不在组合根——组合根硬编码字面量，改名漏改时消费方
 * `ctx.get` 会拿到空，一个本包门禁照不到的失败。包入口的声明合并仍要写一遍字面量（TS 接口成员名不能是变量）。 */
export declare const NOTIFIER_SERVICE: "dsh-notifier.service";
/** sdk 域：生命周期与**对内**的管理面。清单与确认留在这里而不是服务面上：它们回答的是「用户答不答应」，只有设置页该问。 */
declare class SdkService {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 装配入参：宿主出口与两个域的能力面。 */
    private deps;
    /** 摘除器：本域挂在宿主上的东西只有服务面一件，但按清单收口，将来多一件不用改结构。 */
    private disposers;
    /** 装配：构造服务对象并交出去。 */
    install(deps: SdkDeps): void;
    /** 卸载：把服务面从上下文上收回来。重复调用无害——卸载链可能走到不止一次。 */
    release(): void;
    /** 清单：登记项合并确认名单（确认名单实时读设置，不取装配期快照）。 */
    listKinds(): RegisteredKind[];
    /** 确认 / 撤销一个动态种类。确认态落在设置的 `allowKinds` 里（跨重启保留）而不是注册表（它随进程生灭）；写的是
     * **整份名单**而不是增量——设置写面按「这一份是当前想要的」理解，传增量会让两次并发写互相覆盖。不传期望修订号：
     * 这是一次点击，为它引入「基于旧内容」的失败只会让用户看到莫名其妙的冲突。
     * @throws 该种类未登记时抛错——设置端点会先查清单以给出 404，走到这里说明有人绕过它。 */
    confirmKind(id: string, confirmed: boolean): Promise<WriteOutcome>;
}
/** 本域唯一的装配实例：类不外放，外面 `new` 不出第二份服务面。 */
export declare const sdkService: SdkService;
export {};
