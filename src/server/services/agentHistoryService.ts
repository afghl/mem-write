import { getCreationEditorHistoryByThreadId, getQaChatHistory } from '@/server/domain/agent/history';

type QaHistoryParams = {
  agent: 'qa';
  threadId: string;
};

type CreationEditorHistoryParams = {
  agent: 'creation-editor';
  threadId: string;
};

type AgentHistoryParams = QaHistoryParams | CreationEditorHistoryParams;

type AgentHistoryResult = {
  threadId: string | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
  latestCheckpointId: string | null;
};

export async function fetchAgentHistory(params: AgentHistoryParams): Promise<AgentHistoryResult | null> {
  if (params.agent === 'qa') {
    const history = await getQaChatHistory(params.threadId);
    return {
      threadId: params.threadId,
      messages: history.messages,
      latestCheckpointId: history.latestCheckpointId ?? null,
    };
  }

  const history = await getCreationEditorHistoryByThreadId(params.threadId);

  return {
    threadId: params.threadId,
    messages: history.messages,
    latestCheckpointId: history.latestCheckpointId ?? null,
  };
}
