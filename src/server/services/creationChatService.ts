import { randomUUID } from 'crypto';
import { generateCreationArticle } from '@/server/domain/agent/creationAgent';
import { getSupabaseSourceRepo } from '@/server/infra/supabaseSourceRepo';
import { getSupabaseCreationRepo } from '@/server/infra/supabaseCreationRepo';

type CreationChatParams = {
  projectId: string;
  creationId: string;
  message: string;
};

export async function runCreationChat({ projectId, creationId, message }: CreationChatParams) {
  const repo = getSupabaseCreationRepo();
  if (!repo) {
    throw new Error('Supabase is not configured for creation storage.');
  }

  const creation = await repo.getCreationById(projectId, creationId);
  if (!creation) {
    throw new Error('Creation not found.');
  }

  const article = await repo.getArticleById(projectId, creation.article_id);
  if (!article) {
    throw new Error('Article not found for creation.');
  }

  const sourceRepo = getSupabaseSourceRepo();
  const sourceIds = creation.source_ids ?? [];
  const sources = sourceRepo
    ? await sourceRepo.listSourcesByIds(projectId, sourceIds)
    : [];

  const content = await generateCreationArticle({
    message,
    style: creation.style,
    sources,
    sourceIds,
  });

  const updatedArticle =
    (await repo.updateArticleContent({
      id: article.id,
      project_id: projectId,
      content_markdown: content,
    })) ?? article;

  const existingThread = await repo.getThreadByCreationId(creation.id);
  const threadId = existingThread?.thread_id ?? randomUUID();
  if (!existingThread) {
    await repo.upsertThread({ creation_id: creation.id, thread_id: threadId });
  }

  await repo.appendMessage({
    creation_id: creation.id,
    thread_id: threadId,
    role: 'user',
    content: message,
  });

  await repo.appendMessage({
    creation_id: creation.id,
    thread_id: threadId,
    role: 'assistant',
    content,
  });

  return {
    thread_id: threadId,
    article: updatedArticle,
    response: content,
  };
}
