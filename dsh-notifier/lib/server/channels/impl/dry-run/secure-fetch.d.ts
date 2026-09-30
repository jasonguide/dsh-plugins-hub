/** DNS 单条应答（getaddrinfo 的原始形态）。 */
export interface DnsAnswer {
    readonly address: string;
    readonly family: number;
}
/** DNS 解析口：默认走系统 getaddrinfo，单测注入桩。 */
export interface SecureDns {
    resolveAll(hostname: string): Promise<DnsAnswer[]>;
}
/** 单跳建连入参（超时已由调用方 clamp，逐跳生效）。 */
export interface PinnedInit {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: string;
    readonly timeoutMs: number;
}
/** 单跳结论：响应（状态 + 至多 16K 的正文）或重定向（只带 Location，不跟）。 */
export type PinnedOutcome = {
    readonly kind: "response";
    readonly status: number;
    readonly body: string;
} | {
    readonly kind: "redirect";
    readonly location: string;
};
/** 建连口：默认是钉死 IP 的真实建连，单测注入桩。 */
export interface PinnedTransport {
    (url: URL, ip: string, family: 4 | 6, init: PinnedInit): Promise<PinnedOutcome>;
}
/** 安全 fetch 的注入面（两口都缺省即真实 DNS + 真实建连）。 */
export interface SecureFetchPorts {
    readonly dns?: SecureDns;
    readonly transport?: PinnedTransport;
}
/** 安全 fetch 的出站入参。 */
export interface SecureFetchInit {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: string;
    /** 单跳超时（毫秒）：调用方已按「出口 clamp ∩ 15s 上限」算好，这里只执行。 */
    readonly timeoutMs: number;
}
/** 安全 fetch 结论：成功带状态与正文，失败只带一句话（调用方按出口 code 包装进 reason.detail）。 */
export type SecureFetchOutcome = {
    readonly ok: true;
    readonly status: number;
    readonly body: string;
} | {
    readonly ok: false;
    readonly cause: string;
};
/** 解析后的 IP 字面量（v4 按 inet_aton 展开成 4 个字节，v6 展开成 8 个 16 位字）。 */
export type ParsedIp = {
    readonly family: 4;
    readonly octets: readonly [number, number, number, number];
    readonly text: string;
} | {
    readonly family: 6;
    readonly words: readonly number[];
    readonly text: string;
};
/**
 * 安全 fetch：整单只做一次「解析—核验—建连—读数」的循环，重定向每跳重来一遍。
 * 302/303 也按 POST 原样重发（307/308 语义）：测试投递的 body 不能在跳转里丢，丢了等于
 * 「测的是 A、打的是 B 的空包」。上限 5 跳，超了即失败（不是静默停在最后一跳）。
 *
 * 母体只留编排：一跳之内做「URL 准入 → 主机钉死 → 建连 → 落地下一跳」四步，
 * 每步的判据各自成函数（urlGate / pinHost / dialPinned / redirectNext）。
 * 顺序即安全语义——URL 准入与主机核验都必须在建连之前完成，故四步不可调换。
 */
export declare function secureFetch(input: string, init: SecureFetchInit, ports?: SecureFetchPorts): Promise<SecureFetchOutcome>;
/**
 * IP 字面量解析：先按 inet_aton 语义试 v4（十进制/八进制/十六进制/1~4 段缩写全认——
 * getaddrinfo 全认，少认一种就等于给那种写法开旁路），再试标准 v6。都不是即不是字面量
 * （调用方走 DNS）。FQDN 尾点先剥掉：解析器认它，分类器不能因为多个点就认不出回环。
 */
export declare function parseIpLiteral(text: string): ParsedIp | undefined;
/**
 * IP 分类：返回阻断原因，是 undefined 即公开可连。v4 按字节判，v6 按 16 位字判
 * （三类内嵌 v4——映射/兼容/6to4——拆包后按内层判：外层全球可达不代表内层也是）。
 *
 * 未逐项注释「为什么是这个前缀」：前缀与掩码即判据本身，注释复述一遍只是第二份事实源；
 * 每个分支的文案带前缀写法，改前缀时文案与判据在同一行一起改。
 */
export declare function ipBlockCause(parsed: ParsedIp): string | undefined;
/**
 * 钉死建连：lookup 回调直接交出核验过的 IP（不再二次解析，关 TOCTOU），连上后验
 * remoteAddress（防 lookup 与建连之间地址被换），TLS 的 SNI 与证书校验仍走原始主机名
 * （只钉地址，不替身份——钉身份等于自签信任）。响应体按 RESPONSE_CAP 截流，3xx 只读
 * Location 不跟（跟不跟由外层循环逐跳复检后决定）。
 */
/**
 * 真实钉死建连（realTransport 的本体）：导出给单测直测传输层——对回环起真实建连，
 * 全程离线（不断言公网）。生产路径经 SecureFetchPorts.transport 默认值走同一条。
 */
export declare function realTransport(url: URL, ip: string, family: 4 | 6, init: PinnedInit): Promise<PinnedOutcome>;
