import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createRetrieveTool } from '../retrieval/tool';
import { ChromaRetrievalRepo } from '../../infra/chromaRetrievalRepo';
import { MockRetrievalRepo } from '../../infra/mockRetrievalRepo';
import { createSupabaseCheckpointSaver } from './history';

type QaAgentStreamParams = {
    sessionId: string;
    message: string;
};

export type QaAgentStreamEvent = {
    event: string;
    data: {
        chunk?: unknown;
    };
};

const DEFAULT_MODEL = 'gpt-5-mini';

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const createRetrievalRepo = () => {
    const chromaUrl = getEnvValue('CHROMA_URL');
    const chromaCollection = getEnvValue('CHROMA_COLLECTION');
    if (!chromaUrl || !chromaCollection) {
        return new MockRetrievalRepo();
    }

    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
        console.warn('Missing embedding API key; falling back to mock retrieval repo.');
        return new MockRetrievalRepo();
    }

    return new ChromaRetrievalRepo({
        url: chromaUrl,
        collection: chromaCollection,
        apiKey,
        baseUrl: getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL'),
        embeddingModel: getEnvValue('EMBEDDING_MODEL'),
        chromaToken: getEnvValue('CHROMA_TOKEN') ?? getEnvValue('CHROMA_API_KEY'),
        chromaTenant: getEnvValue('CHROMA_TENANT'),
        chromaDatabase: getEnvValue('CHROMA_DATABASE'),
    });
};

const createRetrievalTool = () => {
    const retrieveTool = createRetrieveTool(createRetrievalRepo());

    return tool(
        async ({ query, limit }: { query: string; limit?: number }) => {
            const result = await retrieveTool.run({ query, limit });
            return result.content;
        },
        {
            name: 'retrieve_knowledge',
            description: 'Search the knowledge base for relevant context.',
            schema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Query to search in the knowledge base.',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of documents to retrieve.',
                    },
                },
                required: ['query'],
            },
        },
    );
};

const createCheckpointer = () => {
    const supabaseSaver = createSupabaseCheckpointSaver();
    if (!supabaseSaver) {
        console.warn(
            'Supabase config missing; falling back to in-memory checkpointer for QA agent.',
        );
        return new MemorySaver();
    }
    return supabaseSaver;
};

const hasToolCalls = (message?: BaseMessage) => {
    if (!message || typeof message !== 'object') return false;
    if (!('tool_calls' in message)) return false;
    const calls = (message as { tool_calls?: unknown }).tool_calls;
    return Array.isArray(calls) && calls.length > 0;
};

const buildQaAgentApp = async () => {
    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    const baseURL = getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL');
    const modelName = getEnvValue('LLM_MODEL') ?? DEFAULT_MODEL;

    if (!apiKey) {
        throw new Error('Missing LLM API key in environment variables.');
    }

    const llm = new ChatOpenAI({
        modelName,
        temperature: 0.2,
        streaming: true,
        openAIApiKey: apiKey,
        configuration: baseURL ? { baseURL } : undefined,
    });

    const tools = [createRetrievalTool()];
    const toolNode = new ToolNode(tools);
    const modelWithTools = llm.bindTools(tools);

    const callModel = async (state: typeof MessagesAnnotation.State) => {
        const response = await modelWithTools.invoke(state.messages);
        return { messages: [response] };
    };

    const workflow = new StateGraph(MessagesAnnotation)
        .addNode('agent', callModel)
        .addNode('tools', toolNode)
        .addEdge(START, 'agent')
        .addConditionalEdges('agent', (state) => {
            const lastMessage = state.messages[state.messages.length - 1];
            return hasToolCalls(lastMessage) ? 'tools' : END;
        })
        .addEdge('tools', 'agent');

    const checkpointer = createCheckpointer();
    return workflow.compile({ checkpointer });
};

let cachedApp: ReturnType<typeof buildQaAgentApp> | null = null;

const getQaAgentApp = () => {
    if (!cachedApp) {
        cachedApp = buildQaAgentApp();
    }

    return cachedApp;
};

export async function streamQaAgentEvents({
    sessionId,
    message,
}: QaAgentStreamParams): Promise<AsyncIterable<QaAgentStreamEvent>> {
    const app = await getQaAgentApp();
    const systemMessage = new SystemMessage(
        [
            'You are a MemWrite QA agent.',
            'Use tools to retrieve knowledge when helpful.',
            'Answer in Chinese unless the user explicitly requests another language.',
        ].join(' '),
    );

    const config = { configurable: { thread_id: sessionId } };
    const state = await app.getState(config);
    const existingMessages = Array.isArray(state?.values?.messages)
        ? (state.values.messages as BaseMessage[])
        : [];
    const hasSystemMessage = existingMessages.some(
        (existing) => existing instanceof SystemMessage,
    );

    const inputMessages = hasSystemMessage
        ? [new HumanMessage(message)]
        : [systemMessage, new HumanMessage(message)];
    // for await (const state of app.getStateHistory(config)) {
    //     console.log(state);
    // }
    return app.streamEvents(
        { messages: inputMessages },
        { version: 'v2', ...config },
    );
}
