import { type FileWrite } from "../../../shared/interface.ts";
/** 读取器接缝只为稳定覆盖 Node 文件错误码；生产默认直接同步读取。 */
type ReadVersionFile = (file: string) => string;
/** 读存储版本。仅目标文件精确不存在时从零起跑；读错、空值或坏内容都必须让启动中止，不能把坏源伪装成全新安装。 */
export declare function readStoredVersion(read?: ReadVersionFile): string;
/** 写存储版本：一步升级完成即推进一档；写不进去就停在原处，下次重跑该步。 */
export declare function writeStoredVersion(version: string): FileWrite;
export {};
