import { NextRequest } from 'next/server';
import { getArticle, updateArticleContent } from '@/server/services/creationService';

export async function GET(
  _request: NextRequest,
  context: { params: { project_id?: string; article_id?: string } },
) {
  const projectId = context.params.project_id?.trim();
  const articleId = context.params.article_id?.trim();
  if (!projectId || !articleId) {
    return new Response(JSON.stringify({ error: 'Project id and article id are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const article = await getArticle(projectId, articleId);
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ article }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get article failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch article.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { project_id?: string; article_id?: string } },
) {
  const projectId = context.params.project_id?.trim();
  const articleId = context.params.article_id?.trim();
  if (!projectId || !articleId) {
    return new Response(JSON.stringify({ error: 'Project id and article id are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: { content_markdown?: string } | null = null;
  try {
    payload = (await request.json()) as { content_markdown?: string };
  } catch {
    payload = null;
  }

  const content = payload?.content_markdown;
  if (typeof content !== 'string') {
    return new Response(JSON.stringify({ error: 'content_markdown is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const article = await updateArticleContent(projectId, articleId, content);
    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ article }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update article failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to update article.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
