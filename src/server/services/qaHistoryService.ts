import { getQaChatHistory } from '@/server/domain/agent/history';

type QaHistoryParams = {
    threadId: string;
};

export async function fetchQaHistory({ threadId }: QaHistoryParams) {
    return getQaChatHistory(threadId);
}
