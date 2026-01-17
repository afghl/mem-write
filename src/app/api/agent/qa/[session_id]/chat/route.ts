import { NextRequest } from 'next/server';
import { streamQaChat } from '@/server/services/qaChatService';

type ChatRequest = {
    message: string;
};

export async function POST(request: NextRequest) {
    const { message } = (await request.json()) as ChatRequest;
    if (!message || typeof message !== 'string' || !message.trim()) {
        return new Response(JSON.stringify({ error: 'Message is required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const stream = await streamQaChat({ message });
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
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
