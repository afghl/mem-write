import { fetchEventStream, fetchJson } from '../http';
import type { ChatMessage } from '@/types/chat';

type StreamQaChatParams = {
    threadId?: string | null;
    message: string;
    projectId: string;
    sourceIds?: string[];
    onChunk: (chunk: string) => void;
    onThreadId?: (threadId: string) => void;
};

type QaHistoryResponse = {
    thread_id: string;
    messages: ChatMessage[];
    latest_checkpoint_id?: string | null;
};

export async function fetchQaHistory(threadId: string) {
    const encoded = encodeURIComponent(threadId);
    return fetchJson<QaHistoryResponse>(`/api/agent/qa/history?thread_id=${encoded}`);
}

export async function streamQaChat({
    threadId,
    message,
    projectId,
    sourceIds,
    onChunk,
    onThreadId,
}: StreamQaChatParams) {
    const body = {
        ...(threadId ? { thread_id: threadId } : {}),
        message,
        project_id: projectId,
        ...(sourceIds && sourceIds.length > 0
            ? { source_ids: sourceIds }
            : {}),
    };
    return fetchEventStream(
        `/api/agent/qa/chat`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },
            body: JSON.stringify(body),
        },
        {
            onChunk,
            onOpen: (response) => {
                const nextThreadId = response.headers.get('x-thread-id')?.trim();
                if (nextThreadId) onThreadId?.(nextThreadId);
            },
        },
    );
}
