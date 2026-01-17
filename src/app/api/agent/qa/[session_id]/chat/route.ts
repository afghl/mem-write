import { NextRequest } from 'next/server';

type ChatRequest = {
    message: string;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
    const { message } = (await request.json()) as ChatRequest;
    const echoText = `echo: ${message ?? ''}`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            const send = async () => {
                console.log('sending message:', echoText);
                const parts = echoText.split(' ');
                for (let index = 0; index < parts.length; index += 1) {
                    const chunk = `${parts[index]}${index < parts.length - 1 ? ' ' : ''}`;
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                    await sleep(40);
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            };

            void send();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
