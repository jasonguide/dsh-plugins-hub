import type { ConfigDeps } from "../../deps.ts";
import type { NotifyConfig, SettingsPatch } from "../model/type.ts";
import type { SettingsView, WriteResult } from "./type.ts";
/** 新增频道提交掩码占位时的拒绝理由（掩码只表达「未修改」，新实例没有原值可还原）。
 *
 * 导出给草稿测试（dry-run）复用同一句话：id 改名带掩码、无源新频道带掩码都是「没有原值可还原」
 * 的同一种失败，两处各写一句迟早漂成两种说法。 */
export declare const NEW_CHANNEL_MASK_HINT = "\u65B0\u589E\u9891\u9053\u4E0D\u80FD\u63D0\u4EA4\u63A9\u7801\u5360\u4F4D\uFF0C\u8BF7\u586B\u5199\u771F\u5B9E\u51ED\u636E";
/** 通知设置：本插件配置文件的唯一存取点。 */
declare class ConfigStore {
    /** 是否已装配；单例实例重复装配是编程错误，当场暴露。 */
    private installed;
    /** 落盘路径：DSH home 由环境决定、进程内不变，故随实例一次性定下。 */
    private readonly file;
    /** 装配入参（失败出口）。 */
    private deps;
    /** 文件内容原样镜像：写回时以它为基底，才不会被一次保存抹掉不认识的键。 */
    private stored;
    /** 用户层（净化后）：写面做掩码还原、视图做回显都要它。 */
    private user;
    /** 生效设置：用户层归一化后的形态，读面直接给它。 */
    private effective;
    /** 用户层修订号（内容摘要）：乐观并发的比较依据。 */
    private revision;
    /** 写队列尾：新写挂在它后面，「读-改-写」不会交错。 */
    private tail;
    /** 装配：读一次文件定下初值；此后只经 `write` 变更。 */
    install(deps: ConfigDeps): void;
    /** 卸载：放开装配入参并丢掉用户层快照——它同时是「用户层」与「磁盘状态」的记忆。 */
    release(): void;
    /** 当前生效设置（含明文凭据；不外发）。 */
    current(): NotifyConfig;
    /** 设置页视图：脱敏后的用户层与生效值 + 修订号 + 可写性，同一刻取齐。 */
    view(): SettingsView;
    /**
     * 写：掩码还原 → 校验 → 合并 → 落盘 → 刷新快照。
     *
     * 顺序不可换：掩码不是合法密钥值，未还原就被校验拦死；校验早于落盘，否则非法值会先写进文件。
     * 校验与合并之间不净化：陌生键是透传保留的，一次保存不该把它们抹掉。0.2.3 的顶层渠道键已由
     * upgrade 域在装配期搬走，写面收到它们会被校验直接拒（退役键清单），不在这里做二次翻译。
     */
    write(patch: SettingsPatch, expectedRevision?: number): Promise<WriteResult>;
    /**
     * 提交：版本比对 → 合并 → 原子落盘 → 采纳。
     *
     * 整段在写队列内执行：比对与写入之间若能被另一次写插入，乐观并发就形同虚设
     * ——两次写都读到同一旧版本、都判定通过，后写的把先写的悄悄覆盖。
     */
    private commit;
    /** 文件内容到达：镜像原样留下，用户层与生效值由它派生。 */
    private adopt;
    /** 掩码还原：patch 里等于掩码的密钥字段按 id 换回用户层原值；只有带了频道才需要这一步。 */
    private restoreSecrets;
    /** 把一次写挂到队列尾；前一次无论成败，后一次都照常执行。 */
    private enqueue;
}
/** 本域唯一的存取点实例：类不外放，外面 `new` 不出第二份设置状态。 */
export declare const configStore: ConfigStore;
export {};
