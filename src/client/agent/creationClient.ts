import { fetchJson } from '../http';
import type { Article } from '@/types/creation';

type CreationChatResponse = {
  thread_id: string;
  response: string;
  article: Article;
};

type CreationChatParams = {
  projectId: string;
  creationId: string;
  message: string;
};

export async function sendCreationChat({ projectId, creationId, message }: CreationChatParams) {
  return fetchJson<CreationChatResponse>('/api/agent/creation/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      creation_id: creationId,
      message,
    }),
  });
}
