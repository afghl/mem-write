import { fetchJson } from './http';
import type { Article, Creation, CreationMessage } from '@/types/creation';

export type CreationListItem = {
  creation: Creation;
  article_title: string;
  article_updated_at?: string | null;
};

type CreationListResponse = {
  creations: CreationListItem[];
};

export type CreationDetailResponse = {
  creation: Creation;
  article: Article;
  thread_id?: string | null;
};

type CreationMessagesResponse = {
  thread_id?: string | null;
  messages: CreationMessage[];
};

export type CreateCreationPayload = {
  style: string;
  source_ids: string[];
  title?: string;
};

export async function fetchProjectCreations(projectId: string) {
  const encoded = encodeURIComponent(projectId);
  return fetchJson<CreationListResponse>(`/api/projects/${encoded}/creations`);
}

export async function createCreation(projectId: string, payload: CreateCreationPayload) {
  const encoded = encodeURIComponent(projectId);
  return fetchJson<CreationDetailResponse>(`/api/projects/${encoded}/creations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchCreation(projectId: string, creationId: string) {
  const encodedProject = encodeURIComponent(projectId);
  const encodedCreation = encodeURIComponent(creationId);
  return fetchJson<CreationDetailResponse>(
    `/api/projects/${encodedProject}/creations/${encodedCreation}`,
  );
}

export async function updateCreation(projectId: string, creationId: string, payload: Partial<CreateCreationPayload>) {
  const encodedProject = encodeURIComponent(projectId);
  const encodedCreation = encodeURIComponent(creationId);
  return fetchJson<CreationDetailResponse>(
    `/api/projects/${encodedProject}/creations/${encodedCreation}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchCreationMessages(projectId: string, creationId: string) {
  const encodedProject = encodeURIComponent(projectId);
  const encodedCreation = encodeURIComponent(creationId);
  return fetchJson<CreationMessagesResponse>(
    `/api/projects/${encodedProject}/creations/${encodedCreation}/messages`,
  );
}

export async function fetchArticle(projectId: string, articleId: string) {
  const encodedProject = encodeURIComponent(projectId);
  const encodedArticle = encodeURIComponent(articleId);
  return fetchJson<{ article: Article }>(
    `/api/projects/${encodedProject}/articles/${encodedArticle}`,
  );
}

export async function updateArticle(projectId: string, articleId: string, content_markdown: string) {
  const encodedProject = encodeURIComponent(projectId);
  const encodedArticle = encodeURIComponent(articleId);
  return fetchJson<{ article: Article }>(
    `/api/projects/${encodedProject}/articles/${encodedArticle}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_markdown }),
    },
  );
}
