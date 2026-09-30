import type { SessionEvent } from "@deepseek-ai/dsh-session";
import type { ApprovalRequest } from "@deepseek-ai/dsh-user-approval";
import type { AskUserQuestionRequest } from "@deepseek-ai/dsh-user-questions";
import type { AgentDisposedPayload, AgentErrorPayload, AgentStatusPayload, AgentTurnStoppingPayload } from "../../deps.ts";
import type { Translation } from "./type.ts";
/** 审批请求 → `ask`（工具名 + 理由 + 任务名）。 */
export declare function translateApproval(request: ApprovalRequest): Translation;
/** 用户提问 → `question`（首问摘要 + 任务名）。 */
export declare function translateUserQuestion(request: AskUserQuestionRequest): Translation;
/** 会话内事件 → 通知请求：只认 `turn/end`，只记账不产出。 */
export declare function translateSessionEvent(sessionId: string, event: SessionEvent): Translation;
/** agent 生命周期迁移 → 完成通知；`idle` 是判据，`running` 只记账。 */
export declare function translateAgentStatus(payload: AgentStatusPayload): Translation;
/** agent 被销毁 → 清账（不产出：完成与否已由 `idle` 判过）。 */
export declare function translateAgentDisposed(payload: AgentDisposedPayload): Translation;
/** turn 到停止边界 → `turn-end`（同一 turn 只发一次）。 */
export declare function translateTurnStopping(payload: AgentTurnStoppingPayload): Translation;
/** agent 出错 → `error`（错误文本 + turn + step + 任务名）。 */
export declare function translateAgentError(payload: AgentErrorPayload): Translation;
