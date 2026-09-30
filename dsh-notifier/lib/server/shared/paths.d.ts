/** 用户设置文件名。 */
export declare const CONFIG_FILE_NAME = "config.json";
/** 通知历史文件名（jsonl 追加写）。 */
export declare const HISTORY_FILE_NAME = "history.jsonl";
/** 频道投递状态文件名。 */
export declare const STATUS_FILE_NAME = "status.json";
/** SSE 序号计数器文件名（重启后续计数）。 */
export declare const SEQ_FILE_NAME = "seq.json";
/** 存储版本文件名：内容只有一行版本号，是**升级链的刻度**（存储已经升到哪版）而不是插件版本（后者读 package.json）。 */
export declare const VERSION_FILE_NAME = "version";
/** 存储根下的一个文件路径。 */
export declare function notifierFile(fileName: string): string;
/** 旧版存储位置：DSH home 根目录。「旧文件在哪」与「新文件在哪」分开放会各自漂移——漂移的那次就是迁移读空。 */
export declare function legacyFile(fileName: string): string;
/** 系统通知脚本（Windows 的 WinRT toast）在本包产物里的位置：它随包分发、不在 DSH home 下，只能从本模块位置反推。 */
export declare function toastScriptPath(): string;
