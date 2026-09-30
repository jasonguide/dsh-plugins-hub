/** 落盘 IO 的单一实现（原子写 + 容错读）：先写同目录临时文件、再 `rename` 覆盖目标——同一文件系统内 `rename` 是原子的，读到的
 * 要么旧内容要么新内容、不会是写了一半的 JSON（直接 `writeFile` 到目标则在截断与写入之间有窗口）；失败用返回值表达而不是抛出。 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** 读取结果：文件不存在、不可读、是目录都归为「没有内容」。 */
type FileRead = { ok: true; text: string } | { ok: false };

/** 写入结果：失败带回原因文本（不含路径之外的敏感信息）。 */
export type FileWrite = { ok: true } | { ok: false; reason: string };

/** 唯一临时名：pid+时间戳+随机后缀，同进程并发双写不再共用同一 tmp；rename 先后仍无保证 R11，但内容各自完整。 */
function temporaryNameFor(file: string): string {
  return `${file}.tmp-${process.pid}.${Date.now().toString(36)}.${randomBytes(6).toString("hex")}.tmp`;
}

/**
 * Windows 上 rename 的瞬时失败码：杀毒/索引/搜索索引器会短暂持有目标句柄，重试即过。
 *
 * 注意：目标位置被**目录**占住时 Windows 也回 `EPERM`——与瞬时锁同码。故不能只看错误码，
 * 还要排除「目标本身是目录」这一结构性不可能（见 `isRetryableRenameFailure`）。
 */
const TRANSIENT_RENAME_CODES: readonly string[] = ["EPERM", "EBUSY", "EACCES"];

/**
 * rename 的瞬时失败重试上限与退避基数。
 *
 * 预算口径：20 次、基数 10ms、线性退避 ⇒ 最坏约 **2.1 秒**（10 × (1+2+…+20)）。
 *
 * 取值理由：Defender 对刚落盘文件的实时扫描在负载高的机器上可持续数百毫秒。退避必须
 * **先快后慢**——绝大多数瞬时锁在头几次重试内就放行，前几次等 10~50ms 即可，把预算留给
 * 真正顽固的少数。上界压在 2 秒附近还有一层原因：消费方的轮询判据（测试与界面回显）
 * 通常按 2000ms 设窗口，重试若常态性超过它，会把「写入失败」误报成「超时」。
 *
 * 永久性失败由 `isRetryableRenameFailure` 提前判掉、不走满重试，故上界只在罕见路径上体现。
 */
const RENAME_ATTEMPTS = 20;
const RENAME_BACKOFF_MS = 10;

/** 目标位置是不是已被一个目录占住：这种 rename 永远不会成功，重试只是白等。 */
function targetIsDirectory(file: string): boolean {
  try {
    return statSync(file).isDirectory();
  } catch {
    return false; // 不存在（正常路径）或不可 stat：交给 rename 自己报错
  }
}

/**
 * 判定一次 rename 失败是否值得重试。
 *
 * 两类失败在 Windows 上同码（`EPERM`）却性质相反：
 *   - **瞬时锁**：目标被别的进程短暂打开（Defender 扫描、索引服务）→ 重试即过；
 *   - **结构性不可能**：目标位置被一个目录占住 → 重试多少次都不会成功。
 * 后者必须先排除，否则「写入失败」这条判据会被重试拖成超时（测试与真实告警都受影响）。
 */
function isRetryableRenameFailure(cause: unknown, file: string): boolean {
  const code = (cause as { code?: unknown }).code;
  if (typeof code !== "string" || !TRANSIENT_RENAME_CODES.includes(code)) return false;
  return !targetIsDirectory(file);
}

/**
 * 原子替换，带 Windows 瞬时失败重试。
 *
 * 为什么需要它：POSIX 上 `rename` 覆盖已存在目标是原子的、不会失败；Windows 上目标文件
 * 被任何进程短暂打开（Defender 扫描刚落盘的文件、索引服务、编辑器）时 `rename` 会抛
 * `EPERM`/`EBUSY`/`EACCES`。实测同进程 20 路并发写同一文件时，未重试的版本稳定失败
 * 9~14 路——即「通知历史/配置在 Windows 上偶发写入失败」，而不是理论风险。
 * 这三类错误在本语义下都是「稍后重试即可」，非这三类（如 ENOSPC、EROFS）立即上抛。
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (cause) {
      if (attempt >= RENAME_ATTEMPTS || !isRetryableRenameFailure(cause, to)) throw cause;
      await new Promise((resolve) => setTimeout(resolve, RENAME_BACKOFF_MS * (attempt + 1)));
    }
  }
}

/** 读全文。只在装配路径上使用：设置必须在 `apply` 返回时就已是最终值，否则「读面第一次被调用」与「文件加载完成」
 * 之间会开一个窗口。不区分「不存在」与「读失败」——两者处置一致（调用方回落空值），区分只会多一个分支。 */
export function readTextFileSync(file: string): FileRead {
  try {
    return { ok: true, text: readFileSync(file, "utf8") };
  } catch {
    return { ok: false };
  }
}

/** 原子写全文：补齐父目录 → 写临时文件 → `rename` 覆盖。父目录在这里补齐而不是要求调用方先建：目录是路径的一部分，
 * 谁给出路径谁负责让它可写。 */
export async function writeTextAtomic(file: string, text: string): Promise<FileWrite> {
  const temporary = temporaryNameFor(file);
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(temporary, text, "utf8");
    await renameWithRetry(temporary, file);
    return { ok: true };
  } catch (cause) {
    // 不做临时文件清理（本补丁不动错误模型；随机后缀残留不再被覆盖）。
    return { ok: false, reason: cause instanceof Error ? cause.message : "写入失败" };
  }
}

/** 原子写全文（同步版）。只给装配路径上的小文件用（升级链每次推进都要落一次版本号）：同步写换掉的是「装配还没
 * 返回，磁盘上却已是新版本」这类顺序问题。 */
export function writeTextAtomicSync(file: string, text: string): FileWrite {
  const temporary = temporaryNameFor(file);
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(temporary, text, "utf8");
    renameSyncWithRetry(temporary, file);
    return { ok: true };
  } catch (cause) {
    return { ok: false, reason: cause instanceof Error ? cause.message : "写入失败" };
  }
}

/**
 * `renameSync` 的瞬时失败重试（与异步版同语义）。
 *
 * 同步路径只用于装配期的小文件（配置、升级刻度），但同样落在 Windows 上：杀毒扫描
 * 刚落盘的临时文件会让 `renameSync` 抛 EPERM。忙等而非 `Atomics.wait`——退避总量
 * 有上界（约 2.3s）、且只在装配期失败路径上发生，不占用事件循环的稳定时延预算。
 */
function renameSyncWithRetry(from: string, to: string): void {
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (cause) {
      if (attempt >= RENAME_ATTEMPTS || !isRetryableRenameFailure(cause, to)) throw cause;
      const until = Date.now() + RENAME_BACKOFF_MS * (attempt + 1);
      while (Date.now() < until) {
        /* 同步退避：装配期短临界区，阻塞可接受 */
      }
    }
  }
}
