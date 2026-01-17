import { fetchEventStream } from '../http';

type StreamQaChatParams = {
    sessionId: string;
    message: string;
    onChunk: (chunk: string) => void;
};

export async function streamQaChat({ sessionId, message, onChunk }: StreamQaChatParams) {
    return fetchEventStream(
        `/api/agent/qa/${sessionId}/chat`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({ message }),
        },
        { onChunk },
    );
}
