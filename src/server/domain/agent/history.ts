import {
    AIMessage,
    HumanMessage,
    SystemMessage,
    AIMessageChunk,
    type BaseMessage,
} from '@langchain/core/messages';
import { getQaAgentApp } from './qaAgent';

export type QaChatHistoryMessage = {
    role: 'user' | 'assistant';
    content: string;
};

const getMessageText = (content: BaseMessage['content']): string => {
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

const getMessageRole = (message: BaseMessage): QaChatHistoryMessage['role'] | null => {
    if (message instanceof SystemMessage) return null;
    if (message instanceof HumanMessage) return 'user';
    if (message instanceof AIMessage) return 'assistant';
    if (message instanceof AIMessageChunk) return 'assistant';
    console.log("message: %s, role not found", message);
    return null;
};

const mapMessageToChat = (message: BaseMessage): QaChatHistoryMessage | null => {
    const role = getMessageRole(message);

    if (!role) return null;
    return { role, content: getMessageText(message.content) };
};

export async function getQaChatHistory(threadId: string): Promise<{
    messages: QaChatHistoryMessage[];
    latestCheckpointId?: string;
}> {
    const app = await getQaAgentApp();
    const config = { configurable: { thread_id: threadId } };
    const latestState = (await app.getState(config)) as
        | {
            values?: { messages?: BaseMessage[] };
            config?: { configurable?: { checkpoint_id?: string } };
        }
        | null;

    const existingMessages = Array.isArray(latestState?.values?.messages)
        ? (latestState?.values?.messages as BaseMessage[])
        : [];
    const messages = existingMessages
        .map(mapMessageToChat)
        .filter((message): message is QaChatHistoryMessage => Boolean(message))
        .filter((message) => message.content.trim().length > 0);

    return {
        messages,
        latestCheckpointId: latestState?.config?.configurable?.checkpoint_id,
    };
}
