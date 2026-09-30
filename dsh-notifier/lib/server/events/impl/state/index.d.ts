import type { AgentStatusPayload, AgentTurnStoppingPayload } from "../../deps.ts";
import type { TurnEndEvidence } from "../session/type.ts";
import type { DoneOutcome, StateDeps, TurnStoppingOutcome } from "./type.ts";
/** 完成判定与 turn 去重的状态机。 */
declare class AgentStateMachine {
    private installed;
    private deps;
    private readonly runs;
    /** 键是 agent id，也就是会话 id：`session/event` 只给得到会话 id。 */
    private readonly turnEnds;
    private readonly notifiedTurns;
    /** 装配：重复装配是编程错误。 */
    install(deps: StateDeps): void;
    /** 卸载：清掉全部状态与集合，并复位装配标记——同进程的下一次装配不能撞上「只能装配一次」。 */
    release(): void;
    /** 记下一次推送来的 `turn/end`（idle 判定优先用它）。 */
    rememberTurnEnd(agentId: string, evidence: TurnEndEvidence): void;
    /** agent 生命周期迁移：running 起记，idle 判定完成。 */
    observeStatus(payload: AgentStatusPayload): DoneOutcome;
    /** turn 到停止边界：同一 agent 的同一 turn 只放行一次。 */
    observeTurnStopping(payload: AgentTurnStoppingPayload): TurnStoppingOutcome;
    /** agent 消亡：清掉它的运行足迹、turn 证据与去重记录（不产出请求）。 */
    forget(agentId: string): void;
    private runOf;
    private markRunning;
    private settleIdle;
    /** 推送证据优先、快照兜底；不比进入 running 时更新的快照是上一轮的（冻结）。 */
    private resolveEvidence;
    /** 完成判定跳过时的诊断——「为什么没发 done」的唯一线索；文本与旧实现逐字一致。 */
    private warnIdleSkipped;
}
/** 本域唯一的状态机实例：类不外放，外面 `new` 不出第二份。 */
export declare const agentStates: AgentStateMachine;
export {};
