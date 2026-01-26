import { readFile } from 'fs/promises';
import path from 'path';
import { getResponse } from '@/server/common/llm';
import type { SourceRow } from '@/server/domain/source/entity';

type GenerateCreationArticleParams = {
  message: string;
  style: string;
  sources: SourceRow[];
  sourceIds: string[];
};

const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_SYSTEM_PROMPT = [
  'You are a MemWrite creation agent.',
  'Write a complete article based on the user request and the provided sources.',
  'Follow the requested writing style.',
  'Answer in Chinese unless the user explicitly requests another language.',
  'Use Markdown formatting.',
  'Source context:',
  '{{SOURCE_CONTEXT}}',
].join('\n');
const SYSTEM_PROMPT_PATH = path.join(
  process.cwd(),
  'src/server/domain/agent/creationAgent.system.md',
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
        console.warn('Failed to load creation system prompt:', error);
        return DEFAULT_SYSTEM_PROMPT;
      });
  }
  return systemPromptPromise;
};

const renderSystemPrompt = (template: string, sourceContext: string) => {
  if (!template.includes(SOURCE_CONTEXT_PLACEHOLDER)) {
    console.warn('Creation system prompt missing source context placeholder.');
    return template;
  }
  const replacement = sourceContext.trim().length > 0 ? sourceContext : '无';
  return template.replace(SOURCE_CONTEXT_PLACEHOLDER, replacement);
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

export async function generateCreationArticle({
  message,
  style,
  sources,
  sourceIds,
}: GenerateCreationArticleParams) {
  const lines = buildSourceLines(sources, sourceIds);
  const context = lines.length > 0 ? ['Sources:', ...lines].join('\n') : '';
  const systemPrompt = await getSystemPrompt();
  const systemInstructions = renderSystemPrompt(systemPrompt, context);

  const input = [
    `写作风格: ${style}`,
    `用户需求: ${message}`,
    '请输出完整文章。',
  ].join('\n');

  const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('Missing LLM API key in environment variables.');
  }

  return getResponse({
    apiKey,
    modelName: getEnvValue('LLM_MODEL') ?? DEFAULT_MODEL,
    baseUrl: getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL'),
    input,
    temperature: 0.6,
    systemInstructions,
  });
}
