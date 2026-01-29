import { NextRequest } from 'next/server';
import { fetchAgentHistory } from '@/server/services/agentHistoryService';

export async function GET(request: NextRequest) {
    const threadId = request.nextUrl.searchParams.get('thread_id')?.trim();
    if (!threadId) {
        return new Response(JSON.stringify({ error: 'Thread id is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const history = await fetchAgentHistory({ agent: 'qa', threadId });
        return new Response(
            JSON.stringify({
                thread_id: history?.threadId ?? threadId,
                messages: history?.messages ?? [],
                latest_checkpoint_id: history?.latestCheckpointId ?? null,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        console.error('History route failed:', error);
        return new Response(JSON.stringify({ error: 'History request failed.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
