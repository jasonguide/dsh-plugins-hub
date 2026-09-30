/** 读取结果：文件不存在、不可读、是目录都归为「没有内容」。 */
type FileRead = {
    ok: true;
    text: string;
} | {
    ok: false;
};
/** 写入结果：失败带回原因文本（不含路径之外的敏感信息）。 */
export type FileWrite = {
    ok: true;
} | {
    ok: false;
    reason: string;
};
/** 读全文。只在装配路径上使用：设置必须在 `apply` 返回时就已是最终值，否则「读面第一次被调用」与「文件加载完成」
 * 之间会开一个窗口。不区分「不存在」与「读失败」——两者处置一致（调用方回落空值），区分只会多一个分支。 */
export declare function readTextFileSync(file: string): FileRead;
/** 原子写全文：补齐父目录 → 写临时文件 → `rename` 覆盖。父目录在这里补齐而不是要求调用方先建：目录是路径的一部分，
 * 谁给出路径谁负责让它可写。 */
export declare function writeTextAtomic(file: string, text: string): Promise<FileWrite>;
/** 原子写全文（同步版）。只给装配路径上的小文件用（升级链每次推进都要落一次版本号）：同步写换掉的是「装配还没
 * 返回，磁盘上却已是新版本」这类顺序问题。 */
export declare function writeTextAtomicSync(file: string, text: string): FileWrite;
export {};
