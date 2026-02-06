import { NextRequest } from 'next/server';
import { fetchAgentHistory } from '@/server/services/agentHistoryService';
import { getCreationDetail } from '@/server/services/creationService';

export async function GET(
  _request: NextRequest,
  context: { params: { project_id?: string; creation_id?: string } },
) {
  const projectId = context.params.project_id?.trim();
  const creationId = context.params.creation_id?.trim();
  if (!projectId || !creationId) {
    return new Response(JSON.stringify({ error: 'Project id and creation id are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const detail = await getCreationDetail(projectId, creationId);
    if (!detail) {
      return new Response(JSON.stringify({ error: 'Creation not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const threadId = detail.thread_id ?? null;
    if (!threadId) {
      return new Response(
        JSON.stringify({
          thread_id: null,
          messages: [],
          latest_checkpoint_id: null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const result = await fetchAgentHistory({ agent: 'creation-editor', threadId });
    return new Response(
      JSON.stringify({
        thread_id: result?.threadId ?? threadId,
        messages: result?.messages ?? [],
        latest_checkpoint_id: result?.latestCheckpointId ?? null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('List creation messages failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch creation messages.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
