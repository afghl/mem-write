import { tool } from '@langchain/core/tools';
import { createRetrieveTool } from '../retrieval/tool';
import { ChromaRetrievalRepo } from '../../infra/chromaRetrievalRepo';
import { MockRetrievalRepo } from '../../infra/mockRetrievalRepo';
import { getSupabaseCreationRepo } from '../../infra/supabaseCreationRepo';
import type { RetrievalFilters } from '../../repo/retrievalRepo';
import { applyTextPatch, type TextPatch } from './textPatch';

type TextPatchOutput = {
  type: 'text_patch';
  patch: TextPatch;
  applied: boolean;
  content: string;
  match_index?: number;
  reason?: 'empty_pattern' | 'pattern_not_found';
};

type ContentSetOutput = {
  type: 'content_set';
  content: string;
};

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

export const createArticleTools = (
  projectId: string,
  articleId: string,
  filters?: RetrievalFilters,
) => {
  const repo = getSupabaseCreationRepo();
  if (!repo) {
    throw new Error('Supabase is not configured for creation storage.');
  }

  const getArticleContentTool = tool(
    async () => {
      const article = await repo.getArticleById(projectId, articleId);
      if (!article) {
        return 'Article not found.';
      }
      return article.content_markdown ?? '';
    },
    {
      name: 'get_article_content',
      description: 'Load the current article content.',
      schema: { type: 'object', properties: {} },
    },
  );

  const setArticleContentTool = tool(
    async ({ content }: { content: string }) => {
      const trimmed = typeof content === 'string' ? content : '';
      const updated = await repo.updateArticleContent({
        id: articleId,
        project_id: projectId,
        content_markdown: trimmed,
      });
      return {
        type: 'content_set',
        content: updated?.content_markdown ?? trimmed,
      } satisfies ContentSetOutput;
    },
    {
      name: 'set_article_content',
      description: 'Set the full article content for initial creation.',
      schema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Full article content string.' },
        },
        required: ['content'],
      },
    },
  );

  const applyArticlePatchTool = tool(
    async ({ pattern, replacement }: { pattern: string; replacement: string }) => {
      console.log("applyArticlePatchTool... pattern: %s, replacement: %s", pattern, replacement);
      const article = await repo.getArticleById(projectId, articleId);
      if (!article) {
        return {
          type: 'text_patch',
          patch: { pattern, replacement },
          applied: false,
          content: '',
          reason: 'pattern_not_found',
        } satisfies TextPatchOutput;
      }
      const original = article.content_markdown ?? '';
      const result = applyTextPatch(original, { pattern, replacement });
      if (!result.applied) {
        return {
          type: 'text_patch',
          patch: { pattern, replacement },
          applied: false,
          content: original,
          reason: pattern ? 'pattern_not_found' : 'empty_pattern',
        } satisfies TextPatchOutput;
      }
      const updated = await repo.updateArticleContent({
        id: articleId,
        project_id: projectId,
        content_markdown: result.content,
      });
      return {
        type: 'text_patch',
        patch: { pattern, replacement },
        applied: true,
        content: updated?.content_markdown ?? result.content,
        match_index: result.matchIndex,
      } satisfies TextPatchOutput;
    },
    {
      name: 'apply_article_patch',
      description: 'Apply a literal text patch (first match only) to the article content.',
      schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Literal pattern to replace.' },
          replacement: { type: 'string', description: 'Replacement text.' },
        },
        required: ['pattern', 'replacement'],
      },
    },
  );

  const tools = [getArticleContentTool, setArticleContentTool, applyArticlePatchTool];
  if (filters) {
    tools.push(createRetrievalTool(filters));
  }
  return tools;
};
