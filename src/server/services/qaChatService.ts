import { streamQaAgentEvents } from '@/server/domain/agent/qaAgent';
import type { QaAgentStreamEvent } from '@/server/domain/agent/qaAgent';

type QaChatStreamParams = {
    threadId: string;
    message: string;
};

const getChunkText = (chunk: unknown) => {
    if (!chunk || typeof chunk !== 'object') return '';
    if (!('content' in chunk)) return '';
    const content = (chunk as { content?: unknown }).content;

    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === 'string') return part;
                if (!part || typeof part !== 'object') return '';
                if ('text' in part && typeof part.text === 'string') return part.text;
                return '';
            })
            .join('');
    }
    return '';
};

const isChatModelStreamEvent = (event: QaAgentStreamEvent) =>
    event.event === 'on_chat_model_stream';

const getLanggraphNode = (event: QaAgentStreamEvent) => {
    const metadata = (event as QaAgentStreamEvent & { metadata?: { langgraph_node?: string } })
        .metadata;
    return metadata?.langgraph_node;
};

export async function streamQaChat({ threadId, message }: QaChatStreamParams) {
    const encoder = new TextEncoder();
    const streamEvents = await streamQaAgentEvents({ threadId, message });

    return new ReadableStream<Uint8Array>({
        start(controller) {
            const send = async () => {
                try {
                    for await (const event of streamEvents) {
                        if (!isChatModelStreamEvent(event)) continue;
                        const node = getLanggraphNode(event);
                        if (node && node !== 'agent') continue;
                        const text = getChunkText(event.data.chunk);
                        if (!text) continue;
                        const lines = text.split(/\r?\n/);
                        for (const line of lines) {
                            controller.enqueue(encoder.encode(`data: ${line}\n`));
                        }
                        controller.enqueue(encoder.encode('\n'));
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } catch (error) {
                    console.error('LLM stream failed:', error);
                    controller.enqueue(
                        encoder.encode('data: [ERROR] LLM stream failed.\n\n'),
                    );
                } finally {
                    controller.close();
                }
            };

            void send();
        },
    });
}
