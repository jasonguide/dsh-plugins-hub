/**
 * 割接：旧 start/end 搬进 windows[0] 并删除旧键。
 *
 * 只搬「两个键都在」的完整旧形：缺了一半的文件不动（读面 legacy 回落会把它看成默认窗口，
 * 而搬一半等于替用户编半个窗口——割接不替用户决定取值，见 config-shape.ts 的同款纪律）。
 */
export declare function migrateQuietWindows(): void;
