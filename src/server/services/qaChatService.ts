import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';

type QaChatStreamParams = {
    message: string;
};

const DEFAULT_MODEL = 'gpt-5-mini';

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
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

export async function streamQaChat({ message }: QaChatStreamParams) {
    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    const baseURL = getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL');
    const modelName = getEnvValue('LLM_MODEL') ?? DEFAULT_MODEL;

    if (!apiKey) {
        throw new Error('Missing LLM API key in environment variables.');
    }

    const model = new ChatOpenAI({
        modelName,
        temperature: 0.2,
        streaming: true,
        openAIApiKey: apiKey,
        configuration: baseURL ? { baseURL } : undefined,
    });

    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
        start(controller) {
            const send = async () => {
                try {
                    const stream = await model.stream([new HumanMessage(message)]);
                    for await (const chunk of stream) {
                        const text = getChunkText(chunk);
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
