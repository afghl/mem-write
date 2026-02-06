import { getSupabaseRestConfig, supabaseRequest, type SupabaseRestConfig } from './supabaseRest';
import type {
  ArticleRow,
  CreateArticleInput,
  CreateCreationInput,
  CreationRepo,
  CreationRow,
  UpdateArticleContentInput,
  UpdateCreationInput,
} from '@/server/repo/creationRepo';

const buildQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  const query = search.toString();
  return query ? `?${query}` : '';
};

const TABLES = {
  articles: 'articles',
  creations: 'creations',
};

const createSupabaseCreationRepo = (restConfig: SupabaseRestConfig): CreationRepo => ({
  async createArticle(input: CreateArticleInput) {
    const rows = await supabaseRequest<ArticleRow[]>(
      restConfig,
      `/${TABLES.articles}?on_conflict=id`,
      {
        method: 'POST',
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
        body: {
          ...input,
          content_markdown: input.content_markdown ?? '',
          status: input.status ?? null,
          summary: input.summary ?? null,
        },
      },
    );
    return rows[0];
  },
  async getArticleById(projectId: string, articleId: string) {
    const params = buildQuery({
      select: 'id,project_id,title,content_markdown,status,summary,created_at,updated_at',
      project_id: `eq.${projectId}`,
      id: `eq.${articleId}`,
      limit: '1',
    });
    const rows = await supabaseRequest<ArticleRow[]>(restConfig, `/${TABLES.articles}${params}`);
    return rows[0];
  },
  async updateArticleContent(input: UpdateArticleContentInput) {
    const params = buildQuery({
      id: `eq.${input.id}`,
      project_id: `eq.${input.project_id}`,
    });
    const rows = await supabaseRequest<ArticleRow[]>(
      restConfig,
      `/${TABLES.articles}${params}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: {
          content_markdown: input.content_markdown,
          updated_at: new Date().toISOString(),
        },
      },
    );
    return rows[0];
  },
  async listArticlesByIds(projectId: string, articleIds: string[]) {
    if (articleIds.length === 0) return [];
    const params = buildQuery({
      select: 'id,project_id,title,content_markdown,status,summary,created_at,updated_at',
      project_id: `eq.${projectId}`,
      id: `in.(${articleIds.join(',')})`,
    });
    return supabaseRequest<ArticleRow[]>(restConfig, `/${TABLES.articles}${params}`);
  },
  async createCreation(input: CreateCreationInput) {
    const rows = await supabaseRequest<CreationRow[]>(
      restConfig,
      `/${TABLES.creations}?on_conflict=id`,
      {
        method: 'POST',
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
        body: {
          ...input,
          source_ids: input.source_ids ?? [],
          ...(input.thread_id !== undefined ? { thread_id: input.thread_id } : {}),
        },
      },
    );
    return rows[0];
  },
  async getCreationById(projectId: string, creationId: string) {
    const params = buildQuery({
      select: 'id,project_id,article_id,style,source_ids,thread_id,created_at,updated_at',
      project_id: `eq.${projectId}`,
      id: `eq.${creationId}`,
      limit: '1',
    });
    const rows = await supabaseRequest<CreationRow[]>(restConfig, `/${TABLES.creations}${params}`);
    return rows[0];
  },
  async getCreationByThreadId(threadId: string) {
    const params = buildQuery({
      select: 'id,project_id,article_id,style,source_ids,thread_id,created_at,updated_at',
      thread_id: `eq.${threadId}`,
      limit: '1',
    });
    const rows = await supabaseRequest<CreationRow[]>(restConfig, `/${TABLES.creations}${params}`);
    return rows[0];
  },
  async listCreationsByProjectId(projectId: string) {
    const params = buildQuery({
      select: 'id,project_id,article_id,style,source_ids,thread_id,created_at,updated_at',
      project_id: `eq.${projectId}`,
      order: 'updated_at.desc',
    });
    return supabaseRequest<CreationRow[]>(restConfig, `/${TABLES.creations}${params}`);
  },
  async updateCreation(input: UpdateCreationInput) {
    const params = buildQuery({
      id: `eq.${input.id}`,
      project_id: `eq.${input.project_id}`,
    });
    const rows = await supabaseRequest<CreationRow[]>(
      restConfig,
      `/${TABLES.creations}${params}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: {
          ...(input.style ? { style: input.style } : {}),
          ...(input.source_ids ? { source_ids: input.source_ids } : {}),
          ...(input.thread_id !== undefined ? { thread_id: input.thread_id } : {}),
          updated_at: new Date().toISOString(),
        },
      },
    );
    return rows[0];
  },
});

export const getSupabaseCreationRepo = (): CreationRepo | null => {
  const restConfig = getSupabaseRestConfig();
  if (!restConfig) return null;
  return createSupabaseCreationRepo(restConfig);
};
