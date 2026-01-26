import { getSupabaseCreationRepo } from '@/server/infra/supabaseCreationRepo';
import type { ArticleRow, CreationRow } from '@/server/repo/creationRepo';

type CreateCreationParams = {
  projectId: string;
  style: string;
  sourceIds: string[];
  title?: string;
};

type CreationListItem = {
  creation: CreationRow;
  article_title: string;
  article_updated_at?: string | null;
};

const buildDefaultTitle = (style: string) => {
  const date = new Date().toISOString().slice(0, 10);
  const trimmed = style.trim();
  return trimmed ? `${trimmed} - ${date}` : `Untitled - ${date}`;
};

const requireRepo = () => {
  const repo = getSupabaseCreationRepo();
  if (!repo) {
    throw new Error('Supabase is not configured for creation storage.');
  }
  return repo;
};

export async function createCreation({ projectId, style, sourceIds, title }: CreateCreationParams) {
  const repo = requireRepo();
  const article = await repo.createArticle({
    project_id: projectId,
    title: title?.trim() || buildDefaultTitle(style),
  });
  const creation = await repo.createCreation({
    project_id: projectId,
    article_id: article.id,
    style,
    source_ids: sourceIds,
  });
  const thread = await repo.getThreadByCreationId(creation.id);
  return { creation, article, thread_id: thread?.thread_id ?? null };
}

export async function listCreations(projectId: string): Promise<CreationListItem[]> {
  const repo = requireRepo();
  const creations = await repo.listCreationsByProjectId(projectId);
  const articleIds = creations.map((creation) => creation.article_id);
  const articles = await repo.listArticlesByIds(projectId, articleIds);
  const articleMap = new Map(articles.map((article) => [article.id, article]));
  return creations.map((creation) => {
    const article = articleMap.get(creation.article_id);
    return {
      creation,
      article_title: article?.title ?? 'Untitled',
      article_updated_at: article?.updated_at ?? null,
    };
  });
}

export async function getCreationDetail(projectId: string, creationId: string) {
  const repo = requireRepo();
  const creation = await repo.getCreationById(projectId, creationId);
  if (!creation) return null;
  const article = await repo.getArticleById(projectId, creation.article_id);
  const thread = await repo.getThreadByCreationId(creation.id);
  return {
    creation,
    article: article as ArticleRow,
    thread_id: thread?.thread_id ?? null,
  };
}

export async function updateCreation(
  projectId: string,
  creationId: string,
  input: { style?: string; sourceIds?: string[] },
) {
  const repo = requireRepo();
  const creation = await repo.updateCreation({
    id: creationId,
    project_id: projectId,
    ...(input.style ? { style: input.style } : {}),
    ...(input.sourceIds ? { source_ids: input.sourceIds } : {}),
  });
  if (!creation) return null;
  const article = await repo.getArticleById(projectId, creation.article_id);
  const thread = await repo.getThreadByCreationId(creation.id);
  return {
    creation,
    article: article as ArticleRow,
    thread_id: thread?.thread_id ?? null,
  };
}

export async function getArticle(projectId: string, articleId: string) {
  const repo = requireRepo();
  return repo.getArticleById(projectId, articleId);
}

export async function updateArticleContent(
  projectId: string,
  articleId: string,
  content_markdown: string,
) {
  const repo = requireRepo();
  return repo.updateArticleContent({
    id: articleId,
    project_id: projectId,
    content_markdown,
  });
}

export async function listCreationMessages(projectId: string, creationId: string) {
  const repo = requireRepo();
  const creation = await repo.getCreationById(projectId, creationId);
  if (!creation) return null;
  const thread = await repo.getThreadByCreationId(creationId);
  const messages = await repo.listMessagesByCreationId(creationId);
  return { thread_id: thread?.thread_id ?? null, messages };
}
