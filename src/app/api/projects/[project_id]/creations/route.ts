import { NextRequest } from 'next/server';
import { createCreation, listCreations } from '@/server/services/creationService';

export async function GET(
  _request: NextRequest,
  context: { params: { project_id?: string } },
) {
  const projectId = context.params.project_id?.trim();
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Project id is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const creations = await listCreations(projectId);
    return new Response(JSON.stringify({ creations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('List creations failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch creations.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { project_id?: string } },
) {
  const projectId = context.params.project_id?.trim();
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Project id is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: { style?: string; source_ids?: string[]; title?: string } | null = null;
  try {
    payload = (await request.json()) as { style?: string; source_ids?: string[]; title?: string };
  } catch {
    payload = null;
  }

  const style = payload?.style?.trim();
  const sourceIds = Array.isArray(payload?.source_ids) ? payload?.source_ids : [];
  if (!style) {
    return new Response(JSON.stringify({ error: 'Style is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (sourceIds.length === 0) {
    return new Response(JSON.stringify({ error: 'At least one source is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await createCreation({
      projectId,
      style,
      sourceIds,
      title: payload?.title,
    });
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create creation failed:', error);
    return new Response(JSON.stringify({ error: 'Failed to create creation.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
