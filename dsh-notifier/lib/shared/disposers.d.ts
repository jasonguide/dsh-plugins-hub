/**
 * dsh-notifier —— 两端共享的「清理栈」。
 *
 * 为什么做成共享面：宿主端 assemble() 与客户端 apply() 是同一件事的两半——按依赖顺序建立资源、
 * 卸载时全部释放。两边各写一份「收集 + 逆序吞错释放」的实现，就一定会有一处先腐烂（宿主端原先
 * 那份私有 safeDisposeAll 就是第一份，客户端此前甚至是正序、且一条抛错就跳过其余）。
 *
 * 为什么 attach 要写在 finally 里（而不是「构造时就登记」）：cordis 按 LIFO 释放同一 fiber 上的
 * effect。宿主端一旦把本栈的 effect 登记在服务 provisioning 之前，整条栈就会在「服务面已撤」之后
 * 才释放各域——api 域在别人已放开的入参上继续服务（real-context 的「卸载逆序」判据实测判红）。
 * 所以登记点必须留在采集之后；而 finally 保证装配中途抛错时，已采集的 teardown 也有释放点。
 *
 * 零 import、零模块级可变状态（本目录参与两端打包：宿主经 tsc emit 后 esbuild 内联，客户端由
 * esbuild 直接解析 .ts）。
 */
/** 清理登记宿主：cordis ctx 的最小面，两端各用自己的那一个。 */
export interface DisposerHost {
    effect(callback: () => () => void, id: string): void;
}
export interface DisposerStack {
    /** 登记一处资源的清理动作（可在 attach 之前调用：采集与登记点是两件事）。 */
    own(teardown: () => void): void;
    /** 建立一处资源并当场登记它的清理；make 抛错则不留登记（资源没建成，就没有要释放的东西）。 */
    acquire<T>(make: () => T, release: (value: T) => void): T;
    /**
     * 登记 ctx.effect（整个生命周期只调用一次）。见文件头：调用点应在 finally 里。
     *
     * @param onError 单条清理抛错时的留痕出口；不传 = 保持宿主端「卸载阶段不上报」的既有语义。
     */
    attach(host: DisposerHost, id: string, onError?: (error: unknown) => void): void;
}
export declare function createDisposerStack(): DisposerStack;
