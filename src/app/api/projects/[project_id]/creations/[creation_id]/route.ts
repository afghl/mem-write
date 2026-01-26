import { NextRequest } from 'next/server';
import { getCreationDetail, updateCreation } from '@/server/services/creationService';

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
    const result = await getCreationDetail(projectId, creationId);
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
    console.error('Get creation failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch creation.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(
  request: NextRequest,
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

  let payload: { style?: string; source_ids?: string[] } | null = null;
  try {
    payload = (await request.json()) as { style?: string; source_ids?: string[] };
  } catch {
    payload = null;
  }

  const style = payload?.style?.trim();
  const sourceIds = payload?.source_ids;
  if (sourceIds && sourceIds.length === 0) {
    return new Response(JSON.stringify({ error: 'At least one source is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await updateCreation(projectId, creationId, {
      ...(style ? { style } : {}),
      ...(sourceIds ? { sourceIds } : {}),
    });
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
    console.error('Update creation failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to update creation.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
