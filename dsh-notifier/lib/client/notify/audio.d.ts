/**
 * 音频面的原始事实（只有页面读得到；判定在 capabilities.ts）。
 *
 * 形状定义在**生产者**这一侧：本模块的 facts() 产出它，判定面（capabilities.ts 的 audioStateOf
 * 与 ClientFacts）只是消费它。反过来声明会让生产者 import 消费者，依赖方向反了——本文件里
 * 其它端口类型（AudioContextLike / AudioEngine）本来就是这么定义的。
 */
export interface AudioFacts {
    /** `window.AudioContext` 是否存在——只有它不存在才是「Web Audio 不可用」。 */
    supported: boolean;
    /** 当前 state；`null` = 尚未构造（用户还没点过页面）。 */
    state: "running" | "suspended" | "closed" | null;
    /** 是否曾成功跑到 `running`（已解锁的唯一凭据）。 */
    hasEverRun: boolean;
    /** 最近一次 `resume()` 是否被 reject（浏览器明确拒绝，而不是「还没轮到」）。 */
    resumeRejected: boolean;
}
/** 统一播放节流窗口（毫秒）：覆盖全部自播路径（通知音 + 只响不弹），试听不经本门。 */
export declare const PLAY_THROTTLE_MS = 1500;
/** 音频上下文的最小可判别面（真实 AudioContext 与测试替身都实现它）。 */
export interface AudioContextLike {
    state: string;
    currentTime: number;
    destination: unknown;
    createBuffer(channels: number, length: number, sampleRate: number): unknown;
    createBufferSource(): {
        buffer: unknown;
        connect(target: unknown): void;
        start(when: number): void;
    };
    createOscillator(): {
        type: string;
        frequency: {
            value: number;
        };
        connect(target: unknown): void;
        start(when: number): void;
        stop(when: number): void;
    };
    createGain(): {
        gain: {
            setValueAtTime(value: number, when: number): void;
            exponentialRampToValueAtTime(value: number, when: number): void;
        };
        connect(target: unknown): void;
    };
    resume(): Promise<void> | void;
}
export interface AudioEnginePorts {
    /** 平台的 AudioContext 构造器（含老 Safari 的 webkit 前缀名）；没有即不支持 Web Audio。 */
    ctor(): (new () => AudioContextLike) | undefined;
    now(): number;
}
export interface AudioEngine {
    /** 必须在用户手势内调用：后台播放提示音需要已解锁的 AudioContext。 */
    unlock(): void;
    /** 自播节流门：同一窗口内只放行一次，防通知风暴叠播。 */
    gate(): boolean;
    playTone(tone: string | undefined): void;
    /** 试听：显式解锁 + 绕过统一节流（用户手势内直接试听不受限制）。 */
    playPreview(tone: string | undefined): void;
    facts(): AudioFacts;
}
export declare function createAudioEngine(ports: AudioEnginePorts): AudioEngine;
