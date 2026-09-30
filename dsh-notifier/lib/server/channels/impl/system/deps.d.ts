import type { NotificationNameProbe, OsReleaseProbe, PlatformProbe, ToneStage } from "./type.ts";
/** 子进程退出事实。`exited` 为假 = 被信号杀死（多数是我们自己的超时兜底），是主动行为不是异常。 */
export type ProcessExit = {
    readonly exited: true;
    readonly code: number;
} | {
    readonly exited: false;
};
/** 子进程句柄：只暴露本块用得着的四样。 */
export interface ChildHandle {
    /** stderr 数据；stdio 没接管道时不会有回调。 */
    onStderr(handler: (chunk: Buffer) => void): void;
    onExit(handler: (exit: ProcessExit) => void): void;
    /** 启动失败（二进制缺失、权限不足）。没人接住的 error 事件会把宿主进程打挂。 */
    onError(handler: (cause: Error) => void): void;
    kill(): void;
}
/** 起进程的选项：本块只关心要不要接 stderr（Windows 的 PS 诊断只在 stderr 上）。 */
export interface SpawnOptions {
    readonly collectStderr: boolean;
}
/** 进程事实端口：本块对进程与 Node 的全部依赖。 */
export interface SystemDeps {
    /** 当前平台（`process.platform` 的取值）。 */
    readonly platform: string;
    /** 起一条命令；同步抛错即启动失败。 */
    spawn(command: readonly string[], options: SpawnOptions): ChildHandle;
    /** 探测一条命令是否可用：只回答成败，`failed` 即执行失败。 */
    execFile(bin: string, args: readonly string[], options: {
        readonly timeout: number;
    }, done: (failed: boolean) => void): void;
    existsSync(path: string): boolean;
    /**
     * 通知守护进程名的具名探测（语义端口，不是通用命令执行口）。
     *
     * 为什么不做成 `{code, stdout}` 这种通用形状：`NameHasOwner` 的答案在 stdout 而 exit 恒 0，
     * `ListActivatableNames` 的输出是名字数组——通用形状会把三种 CLI 的格式差异外泄给每个调用方，
     * 且逼调用方按字节数截断（截断即漏项）。这里只回结论，格式与解析留在实现内。
     */
    probeNotificationName(): Promise<NotificationNameProbe>;
    /** 读发行版标识（只取 `ID=`）。never-throw：缺文件与读失败都回 `{ ok: false }`。 */
    readOsRelease(): OsReleaseProbe;
    /**
     * 把合成音写进本进程的临时目录（0700，文件名带实例内序号，0600 + `wx`）。
     * 失败即回原因（`/tmp` 只读挂载、符号链接占位）——**判定逻辑不在这里**：本文件被排除在变异面外，
     * 策略放进来等于永远没有判据。
     */
    stageToneAudio(bytes: Buffer): ToneStage;
    /** 删掉本次的临时音频文件；**目录留到 `releaseToneTemps`**。never-throw。 */
    unstageToneAudio(path: string): void;
    /** 删掉本进程建过的临时音频目录（卸载与进程退出各一次）。幂等、never-throw。 */
    releaseToneTemps(): void;
}
/**
 * 只取 `ID=` 一行：整份文件是宿主原文，任何一行都不该进响应体。
 *
 * 路径是入参而不是闭包里的常量：**never-throw 是端口的契约**（调用侧没有 `try/catch`），而这份契约
 * 只有「文件缺失」与「读取抛错」两条路都能被注入才判得住——写死路径的那一版在 CI 上永远读到真文件，
 * 把 `try/catch` 整段删掉都没有一条用例会红。
 */
export declare function readOsReleaseFile(path: string): OsReleaseProbe;
/**
 * 真实临时音频目录。目录与序号都收在实例字段（模块级 `let`/`var` 是门禁红线：状态会跨实例共享）。
 *
 * 文件名带实例内序号 + `wx` + 0600：`wx` 拒符号链接与陈旧文件（实测预置符号链接时报 `EEXIST`
 * 且目标文件未被改写），0600/0700 收住同机其它用户。
 *
 * 目录**不按次删**（`unstage` 只 unlink 本次文件）：并发两笔投递时先完成的那一笔会把整目录收走，
 * 另一笔的播放随即复现「spawn 后立即 unlink」的失败。目录只在释放面（卸载 / 进程退出）删。
 *
 * `baseDir` 是入参而不是闭包里的 `os.tmpdir()`：`stage` 的 never-throw 与两个权限位只有
 * 「可写基目录」「不可写基目录」两条路都能被注入才判得住（与 `readOsReleaseFile(path)` 同款理由）；
 * 生产恒用默认值。
 */
export declare class RealToneTemps {
    private readonly baseDir;
    /** 本进程的临时音频目录；未建或已释放时为 undefined。 */
    private dir?;
    /** 实例内序号：`wx` 下重名即 `EEXIST`，序号让正常路径永不撞名。 */
    private seq;
    /** 退出钩子只挂一次（释放本身幂等，重复挂载不该叠监听）。 */
    private exitHook;
    constructor(baseDir?: string);
    stage(bytes: Buffer): ToneStage;
    unstage(path: string): void;
    release(): void;
    /** 取（必要时建）临时目录。建目录即挂退出钩子：宿主直接退出而插件从未卸载时只剩这一条清理路径。 */
    private directory;
}
/** 平台能力缓存：探一次即复用（同进程内通知脚本路径固定）。 */
declare class ProbeCache {
    private probe?;
    /** 取本进程的平台能力；`probe` 只在首次调用时使用。 */
    get(toastScript: string, probe: (toastScript: string) => Promise<PlatformProbe>): Promise<PlatformProbe>;
    reset(): void;
}
export declare const platformCapabilities: ProbeCache;
/** 本块的进程事实：调用点每次现取，装/卸之后即刻生效。 */
export declare function systemDeps(): SystemDeps;
/** 装载进程事实端口（只给测试用；生产不调用——默认值就是真实进程事实）。 */
export declare function installSystemDeps(deps: SystemDeps): void;
/** 复位端口与探测缓存，与 `installSystemDeps` 配对；重复调用无害。 */
export declare function releaseSystemDeps(): void;
export {};
