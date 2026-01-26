import { NextRequest } from 'next/server';
import { listCreationMessages } from '@/server/services/creationService';

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
    const result = await listCreationMessages(projectId, creationId);
    if (!result) {
      return new Response(JSON.stringify({ error: 'Creation not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('List creation messages failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch creation messages.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
