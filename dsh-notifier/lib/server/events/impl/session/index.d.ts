/**
 * dsh-notifier events 域 —— 会话日志读取与子代理归属判定（只读宿主对象，不改写）。
 * payload 跨宿主边界不受信，读取一律防御性收窄。
 */
import type { Agent } from "@deepseek-ai/dsh-agent";
import type { SessionEvent } from "@deepseek-ai/dsh-session";
import type { AgentRegistryPort } from "../../deps.ts";
import type { SessionTitle, TurnEndRead } from "./type.ts";
/** 会话标题：日志里最后一个 `session/title`，trim 后截断 40 字符。 */
export declare function sessionTitleOf(agent: Agent): SessionTitle;
/**
 * 从一条会话事件里读 turn 证据；`turn` 非有限数必须跳过——返回 NaN 会被完成判定当成合法
 * 证据推进，此后真实完成因 `x > NaN` 恒为假被永久吞掉。
 */
export declare function turnEndEvidenceOf(event: SessionEvent): TurnEndRead;
/** 日志里最新一条 `turn/end`；倒序扫，因为 `turn/end` 之后可能尾随别的追加。 */
export declare function lastTurnEndOf(agent: Agent): TurnEndRead;
/**
 * 是否子代理：`origin` 命中即真；否则要运行时归属确凿成立（父 agent 在活体注册表里，
 * 且确由它创建）。任一环不成立都走主任务分支——宁可多报一条 done，不静默用户自己的任务。
 */
export declare function isSubagentOf(agent: Agent, agents: AgentRegistryPort): boolean;
