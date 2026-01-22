import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { streamQaChat } from '@/server/services/qaChatService';

type ChatRequest = {
    message: string;
    thread_id?: string;
    project_id?: string;
    selectedDocumentIds?: string[];
};

export async function POST(request: NextRequest) {
    const { message, thread_id, project_id, selectedDocumentIds } =
        (await request.json()) as ChatRequest;
    if (!message || typeof message !== 'string' || !message.trim()) {
        return new Response(JSON.stringify({ error: 'Message is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    if (!project_id || typeof project_id !== 'string' || !project_id.trim()) {
        return new Response(JSON.stringify({ error: 'Project id is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (selectedDocumentIds && !Array.isArray(selectedDocumentIds)) {
        return new Response(JSON.stringify({ error: 'selectedDocumentIds must be an array.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const threadId = thread_id?.trim() || randomUUID();
    const selectedIds = selectedDocumentIds
        ?.filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean);

    try {
        const stream = await streamQaChat({
            threadId,
            message,
            filters: {
                projectId: project_id.trim(),
                sourceIds: selectedIds && selectedIds.length > 0 ? selectedIds : undefined,
            },
        });
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'X-Thread-Id': threadId,
            },
        });
    } catch (error) {
        console.error('Chat route failed:', error);
        return new Response(JSON.stringify({ error: 'LLM request failed.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
