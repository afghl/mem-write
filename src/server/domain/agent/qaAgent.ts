import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { createRagTool } from '../retrieval/tool';
import { MockRetrievalRepo } from '../../infra/mockRetrievalRepo';

type QaAgentStreamParams = {
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

const createRetrievalTool = () => {
    const ragTool = createRagTool(new MockRetrievalRepo());

    return tool(
        async ({ query, limit }: { query: string; limit?: number }) => {
            const result = await ragTool.run({ query, limit });
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

    return workflow.compile();
};

let cachedApp: ReturnType<typeof buildQaAgentApp> | null = null;

const getQaAgentApp = () => {
    if (!cachedApp) {
        cachedApp = buildQaAgentApp();
    }

    return cachedApp;
};

export async function streamQaAgentEvents({
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

    return app.streamEvents(
        { messages: [systemMessage, new HumanMessage(message)] },
        { version: 'v2' },
    );
}
