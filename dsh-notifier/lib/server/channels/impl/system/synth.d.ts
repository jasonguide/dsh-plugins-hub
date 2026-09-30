/**
 * 合成指定音色的 WAV 字节。
 *
 * 未知音色返回 null（**不猜一个默认音顶替**，与 `toneFileCandidates` 的候选同口径）：
 * 静默比放错音更容易被发现，也更诚实。
 */
export declare function synthToneWav(tone: string): Buffer | null;
