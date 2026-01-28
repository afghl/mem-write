import { readFile } from 'fs/promises';
import path from 'path';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { createSupabaseCheckpointSaver } from './checkpointSaver';
import { getSupabaseSourceRepo } from '../../infra/supabaseSourceRepo';
import type { SourceRow } from '../source/entity';
import type { RetrievalFilters } from '../../repo/retrievalRepo';
import { createArticleTools } from '../article_creation/tools';

type CreationEditorStreamParams = {
  threadId: string;
  message: string;
  projectId: string;
  articleId: string;
  sourceIds?: string[];
};

export type CreationEditorStreamEvent = {
  event: string;
  name?: string;
  data: {
    chunk?: unknown;
    output?: unknown;
  };
  metadata?: { langgraph_node?: string };
};

const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_SYSTEM_PROMPT = [
  'You are a MemWrite creation editor agent.',
  'Your job is to ask the user about the article structure, topic, and core content.',
  'Do not output the full article directly.',
  'Use tools to update the article content when needed.',
  'Answer in Chinese unless the user explicitly requests another language.',
  'Source context:',
  '{{SOURCE_CONTEXT}}',
].join('\n');
const SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  'src/server/domain/agent/creationEditorAgent.system.md',
);
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
        console.warn('Failed to load creation editor system prompt:', error);
        return DEFAULT_SYSTEM_PROMPT;
      });
  }
  return systemPromptPromise;
};

const renderSystemPrompt = (template: string, sourceContext: string) => {
  if (!template.includes(SOURCE_CONTEXT_PLACEHOLDER)) {
    console.warn('Creation editor system prompt missing source context placeholder.');
    return template;
  }
  const replacement = sourceContext.trim().length > 0 ? sourceContext : '无';
  return template.replace(SOURCE_CONTEXT_PLACEHOLDER, replacement);
};

const getSourceLabel = (source: SourceRow) =>
  source.title?.trim() || source.filename?.trim() || source.source_url?.trim() || source.id;

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

const buildSourceContext = async (projectId: string, sourceIds: string[]) => {
  if (!projectId || sourceIds.length === 0) {
    return '';
  }
  const sourceRepo = getSupabaseSourceRepo();
  if (!sourceRepo) {
    console.warn('Supabase is not configured; skipping source context.');
    return '';
  }
  const sources = await sourceRepo.listSourcesByIds(projectId, sourceIds);
  const lines = buildSourceLines(sources, sourceIds);
  return lines.length > 0 ? ['Sources:', ...lines].join('\n') : '';
};

const createCheckpointer = () => {
  const supabaseSaver = createSupabaseCheckpointSaver();
  if (!supabaseSaver) {
    console.warn(
      'Supabase config missing; falling back to in-memory checkpointer for creation editor.',
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


const buildCreationEditorApp = async (
  projectId: string,
  articleId: string,
  filters?: RetrievalFilters,
) => {
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

  const tools = createArticleTools(projectId, articleId, filters);
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

const cachedApps = new Map<string, ReturnType<typeof buildCreationEditorApp>>();

export const getCreationEditorApp = (
  projectId: string,
  articleId: string,
  filters?: RetrievalFilters,
) => {
  const key = JSON.stringify({ projectId, articleId, filters: filters ?? {} });
  const existing = cachedApps.get(key);
  if (existing) return existing;
  const app = buildCreationEditorApp(projectId, articleId, filters);
  cachedApps.set(key, app);
  return app;
};

export async function streamCreationEditorEvents({
  threadId,
  message,
  projectId,
  articleId,
  sourceIds,
}: CreationEditorStreamParams): Promise<AsyncIterable<CreationEditorStreamEvent>> {
  const filters =
    projectId && sourceIds && sourceIds.length > 0
      ? ({ projectId, sourceIds } satisfies RetrievalFilters)
      : ({ projectId } satisfies RetrievalFilters);
  const app = await getCreationEditorApp(projectId, articleId, filters);
  const basePrompt = await getSystemPrompt();
  const sourceContext = await buildSourceContext(projectId, sourceIds ?? []);
  const systemMessage = new SystemMessage(renderSystemPrompt(basePrompt, sourceContext));

  const config = { configurable: { thread_id: threadId, checkpoint_ns: 'creation_editor' } };
  const state = await app.getState(config);
  const existingMessages = Array.isArray(state?.values?.messages)
    ? (state.values.messages as BaseMessage[])
    : [];
  const hasSystemMessage = existingMessages.some(
    (existing) => existing instanceof SystemMessage,
  );

  const inputMessages = [
    ...(hasSystemMessage ? [] : [systemMessage]),
    new HumanMessage(message),
  ];

  return app.streamEvents(
    { messages: inputMessages },
    { version: 'v2', ...config },
  );
}
