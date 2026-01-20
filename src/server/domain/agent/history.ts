import {
    AIMessage,
    HumanMessage,
    SystemMessage,
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

const mapMessageToChat = (message: BaseMessage): QaChatHistoryMessage | null => {
    if (message instanceof SystemMessage) return null;
    if (message instanceof HumanMessage) {
        return { role: 'user', content: getMessageText(message.content) };
    }
    if (message instanceof AIMessage) {
        return { role: 'assistant', content: getMessageText(message.content) };
    }
    return null;
};

export async function getQaChatHistory(threadId: string): Promise<{
    messages: QaChatHistoryMessage[];
    latestCheckpointId?: string;
}> {
    const app = await getQaAgentApp();
    const config = { configurable: { thread_id: threadId } };
    let latestState: {
        values?: { messages?: BaseMessage[] };
        config?: { configurable?: { checkpoint_id?: string } };
    } | null = null;

    for await (const state of app.getStateHistory(config)) {
        latestState = state as typeof latestState;
        break;
    }

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
