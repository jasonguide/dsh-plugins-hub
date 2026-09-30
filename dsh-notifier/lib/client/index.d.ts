import { type NotifierLocaleKey } from "./locales.ts";
declare module "@deepseek-ai/dsh-client-ui-slots" {
    interface LocaleNamespaceMap {
        /** dsh-notifier 设置卡/历史列表/权限降级说明文案。 */
        notifier: NotifierLocaleKey;
    }
}
/**
 * 浏览器端上下文的窄面（本包实际使用的面：get + effect），与 inject 声明的
 * ["slots", "locale"] 对齐；slots/locale 各自的读形态见上。effect 面与 DisposerHost
 * 同形（finally 里 stack.attach 直接消费）。
 */
interface ClientContext {
    get: (name: string) => unknown;
    effect: (callback: () => () => void, id: string) => void;
}
export declare function apply(ctx: ClientContext): void;
export declare const inject: string[];
export {};
