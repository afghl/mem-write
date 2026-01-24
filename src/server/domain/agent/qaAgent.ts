import { readFile } from 'fs/promises';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createRetrieveTool } from '../retrieval/tool';
import { ChromaRetrievalRepo } from '../../infra/chromaRetrievalRepo';
import { MockRetrievalRepo } from '../../infra/mockRetrievalRepo';
import { createSupabaseCheckpointSaver } from './checkpointSaver';
import { getSupabaseSourceRepo } from '../../infra/supabaseSourceRepo';
import type { SourceRow } from '../source/entity';
import type { RetrievalFilters } from '../../repo/retrievalRepo';

type QaAgentStreamParams = {
    threadId: string;
    message: string;
    filters?: RetrievalFilters;
};

export type QaAgentStreamEvent = {
    event: string;
    data: {
        chunk?: unknown;
    };
};

const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_SYSTEM_PROMPT = [
    'You are a MemWrite QA agent.',
    'Use tools to retrieve knowledge when helpful.',
    'Answer in Chinese unless the user explicitly requests another language.',
    'Source context:',
    '{{SOURCE_CONTEXT}}',
].join('\n');
const SYSTEM_PROMPT_PATH = path.join(process.cwd(), 'src/server/domain/agent/qaAgent.system.md');
const SOURCE_UPDATE_TAG = '[[sources:update]]';
const SOURCE_CONTEXT_PLACEHOLDER = '{{SOURCE_CONTEXT}}';

let systemPromptPromise: Promise<string> | null = null;

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const getSystemPrompt = async () => {
    if (!systemPromptPromise) {
        systemPromptPromise = readFile(SYSTEM_PROMPT_PATH, 'utf8')
            .then((content) => content.trim())
            .then((content) => (content.length > 0 ? content : DEFAULT_SYSTEM_PROMPT))
            .catch((error) => {
                console.warn('Failed to load QA system prompt:', error);
                return DEFAULT_SYSTEM_PROMPT;
            });
    }
    return systemPromptPromise;
};

const renderSystemPrompt = (template: string, sourceContext: string) => {
    if (!template.includes(SOURCE_CONTEXT_PLACEHOLDER)) {
        console.warn('System prompt missing source context placeholder.');
        return template;
    }
    const replacement = sourceContext.trim().length > 0 ? sourceContext : '无';
    return template.replace(SOURCE_CONTEXT_PLACEHOLDER, replacement);
};

const normalizeSourceIds = (sourceIds?: string[]) => {
    if (!sourceIds) return [];
    const unique = new Set(
        sourceIds.map((id) => id.trim()).filter((id) => id.length > 0),
    );
    return Array.from(unique).sort();
};

const isSameSourceIds = (left: string[] | null, right: string[]) => {
    if (!left) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) return false;
    }
    return true;
};

const getMessageText = (message?: BaseMessage) => {
    if (!message || typeof message !== 'object') return '';
    if (!('content' in message)) return '';
    const content = (message as { content?: unknown }).content;
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

const parseSourceIdsFromMessage = (message: BaseMessage) => {
    const text = getMessageText(message);
    if (!text.includes(SOURCE_UPDATE_TAG)) return null;
    const tagIndex = text.indexOf(SOURCE_UPDATE_TAG);
    const jsonStart = text.indexOf('{', tagIndex);
    const jsonEnd = text.indexOf('}', jsonStart);
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const jsonText = text.slice(jsonStart, jsonEnd + 1);
    try {
        const parsed = JSON.parse(jsonText) as { source_ids?: unknown };
        if (!Array.isArray(parsed.source_ids)) return null;
        const normalized = normalizeSourceIds(parsed.source_ids as string[]);
        return normalized;
    } catch (error) {
        console.warn('Failed to parse source ids from message:', error);
        return null;
    }
};

const getLatestSourceIds = (messages: BaseMessage[]) => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const parsed = parseSourceIdsFromMessage(messages[i]);
        if (parsed) return parsed;
    }
    return null;
};

const getSourceLabel = (source: SourceRow) => {
    return (
        source.title?.trim() ||
        source.filename?.trim() ||
        source.source_url?.trim() ||
        source.id
    );
};

const buildSourceLines = (sources: SourceRow[], sourceIds: string[]) => {
    const sourceMap = new Map(sources.map((source) => [source.id, source]));
    return sourceIds.map((sourceId) => {
        const source = sourceMap.get(sourceId);
        if (!source) return `- ${sourceId}`;
        const title = getSourceLabel(source);
        const description = source.description?.trim();
        return description ? `- ${title}: ${description}` : `- ${title}`;
    });
};

const buildSourceContext = async (filters?: RetrievalFilters) => {
    const projectId = filters?.projectId?.trim();
    const sourceIds = normalizeSourceIds(filters?.sourceIds);
    if (!projectId || sourceIds.length === 0) {
        return { sourceIds, sources: [], context: '' };
    }

    const sourceRepo = getSupabaseSourceRepo();
    if (!sourceRepo) {
        console.warn('Supabase is not configured; skipping source context.');
        return { sourceIds, sources: [], context: '' };
    }

    const sources = await sourceRepo.listSourcesByIds(projectId, sourceIds);
    const lines = buildSourceLines(sources, sourceIds);
    const context = lines.length > 0 ? ['当前对话限定的来源：', ...lines].join('\n') : '';
    return { sourceIds, sources, context };
};

const buildSourceUpdateMessage = (sourceIds: string[], context: string) => {
    if (sourceIds.length === 0) {
        return `${SOURCE_UPDATE_TAG}\n${JSON.stringify({ source_ids: [] })}\n已清空来源。`;
    }
    const payload = JSON.stringify({ source_ids: sourceIds });
    return context
        ? `${SOURCE_UPDATE_TAG}\n${payload}\n${context}`
        : `${SOURCE_UPDATE_TAG}\n${payload}\n来源已更新。`;
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

const createRetrievalTool = (filters?: RetrievalFilters) => {
    const retrieveTool = createRetrieveTool(createRetrievalRepo());

    return tool(
        async ({ query, limit }: { query: string; limit?: number }) => {
            const result = await retrieveTool.run({ query, limit, filters });
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

const buildQaAgentApp = async (filters?: RetrievalFilters) => {
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

    const tools = [createRetrievalTool(filters)];
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

const cachedApps = new Map<string, ReturnType<typeof buildQaAgentApp>>();

export const getQaAgentApp = (filters?: RetrievalFilters) => {
    const key = JSON.stringify(filters ?? {});
    const existing = cachedApps.get(key);
    if (existing) return existing;
    const app = buildQaAgentApp(filters);
    cachedApps.set(key, app);
    return app;
};

export async function streamQaAgentEvents({
    threadId,
    message,
    filters,
}: QaAgentStreamParams): Promise<AsyncIterable<QaAgentStreamEvent>> {
    const app = await getQaAgentApp(filters);
    const basePrompt = await getSystemPrompt();
    const sourceContextResult = await buildSourceContext(filters);
    const systemMessage = new SystemMessage(
        renderSystemPrompt(basePrompt, sourceContextResult.context),
    );

    const config = { configurable: { thread_id: threadId } };
    const state = await app.getState(config);
    const existingMessages = Array.isArray(state?.values?.messages)
        ? (state.values.messages as BaseMessage[])
        : [];
    const hasSystemMessage = existingMessages.some(
        (existing) => existing instanceof SystemMessage,
    );
    const latestSourceIds = getLatestSourceIds(existingMessages);
    const shouldInsertSourceUpdate =
        (latestSourceIds === null && sourceContextResult.sourceIds.length > 0) ||
        (latestSourceIds !== null &&
            !isSameSourceIds(latestSourceIds, sourceContextResult.sourceIds));
    const inputMessages = [
        ...(hasSystemMessage ? [] : [systemMessage]),
        ...(shouldInsertSourceUpdate
            ? [
                new HumanMessage(
                    buildSourceUpdateMessage(
                        sourceContextResult.sourceIds,
                        sourceContextResult.context,
                    ),
                ),
            ]
            : []),
        new HumanMessage(message),
    ];
    // for await (const state of app.getStateHistory(config)) {
    //     console.log(state);
    // }
    // console.log("app.streamEvents... inputMessages: %s", inputMessages);
    return app.streamEvents(
        { messages: inputMessages },
        { version: 'v2', ...config },
    );
}
