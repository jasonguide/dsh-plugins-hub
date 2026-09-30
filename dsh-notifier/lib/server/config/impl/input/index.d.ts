import type { NotifyConfig, RawSettingValue, SettingsPatch, StoredSettings } from "../model/type.ts";
import type { ValidationResult } from "./type.ts";
/** `"HH:MM"` 二十四小时制：事实源在 src/shared/quiet.ts（`isClockText`），两端同源。 */
/**
 * 频道实例里**合法的凭据只能走已知字段**（bark 的 `deviceKey`、webhook 的 `token`/`password`/`headerValue`），
 * 这些凭据别名键在写入口径直接**拒绝**而不是静默剔除——静默剔除会让用户以为设置生效了。
 *
 * 导出是为了让判据按清单表驱动：README 的「保留键写拒」与这份清单必须是同一份事实源。
 */
export declare const BARK_RESERVED_KEYS: readonly string[];
/** webhook 侧的凭据别名键；与 `BARK_RESERVED_KEYS` 同语义（见上）。 */
export declare const WEBHOOK_RESERVED_KEYS: readonly string[];
/**
 * 只接受布尔值的键。
 *
 * 导出而非私有：门禁 `config-matrix` 要按真实取值断言「这份清单是默认设置的子集且值都是布尔」，
 * 让它读定义处才是唯一事实源——照抄一份给门禁，两边迟早各说各话。
 */
export declare const BOOLEAN_KEYS: readonly string[];
/**
 * 退役键：**曾经**是合法配置键、现已没有值语义的键，写面一律 400 拒收，且每键自带拒收话术。
 *
 * 为什么拒而不是当陌生键放行：陌生键是留给未来版本的空间，而这一批是**已经搬走 / 已经删除**的键——
 * 静默放行会让停留在升级前页面上的旧客户端以为保存成功了。话术逐键给出而不是共用一句：0.2.3 那批只是
 * 搬了家，`maxConnections` 是机制整体移除，共用一句会把后者引到错误的原因上。
 */
export declare const RETIRED_KEYS: Readonly<Record<string, string>>;
/**
 * 非负整数键及其上界（越界视为非法而不是截断——静默改写用户的输入比拒绝更糟）。
 *
 * 导出理由同 `BOOLEAN_KEYS`：门禁要按真实取值断言「每个键都在默认设置里且上界是非负整数」。
 */
export declare const COUNT_LIMITS: Record<string, number>;
/**
 * 文本 → 原始设置。坏 JSON 与非对象（数组、标量）一律得到空设置：配置文件被手改成不合法
 * 内容时读面该回落默认值，而不是让整个插件装配失败——设置坏掉不该拖垮通知。
 */
export declare function parseJsonObject(text: string): StoredSettings;
/**
 * 归一化：把任意输入收敛成一份完整设置，缺键补默认、非法值回落合法域——**永不失败**，
 * 是读路径的必经工序。输出是**全量**的（可选字段也写出来，空串 / 空对象表达「没有」）：
 * 让形状随输入变化会迫使下游到处判键在不在，而这里正是唯一能把这件事做掉的地方。
 */
export declare function normalizeConfig(input: StoredSettings): NotifyConfig;
/**
 * 校验：给出首个非法键与提示。只对**显式提交**的键负责——缺键不是错误，由归一化补默认；
 * 一次只报首个非法键，因为设置页的定位光标只能落在一个字段上。陌生键不参与校验：拦下它们
 * 等于替未来的版本拒绝今天的用户（退役键是例外，见 RETIRED_KEYS）。
 */
export declare function validateSettings(raw: SettingsPatch): ValidationResult;
/** `level` 与 `preset` 是可选键：缺省各有明确语义（前者让「severity → level」映射生效，后者归一到 custom），
 * 客户端新建频道时本就不带它们——照必填拦下等于让用户的合法提交保存不了。
 *
 * 导出给草稿测试（dry-run）逐项复用：它只审单条、不审「内置必须在场」（见 requireBuiltinsPresent），
 * 草稿里可以只有目标频道一条。 */
export declare function validateChannel(raw: RawSettingValue): ValidationResult;
/**
 * 净化：只保留契约认识的键。陌生键一律剔除而不是拒绝——配置文件是共享的，别的东西写进来的
 * 键不该让设置读取失败，也不该被原样带进用户层再写回去。**不归一化**：净化只回答「这个键归
 * 不归我」，在这里顺手归一化会让写路径把用户的原始提交偷偷改写掉。
 *
 * @returns 净化后的部分设置；输入不是对象时得到空设置——「一个键都不认识」与「没有键」对
 *   调用方是同一件事，不必再给一个空值语义让它自己判。
 */
export declare function sanitizeSettings(raw: StoredSettings): Partial<NotifyConfig>;
