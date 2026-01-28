import { NextRequest } from 'next/server';
import { streamCreationEditorChat } from '@/server/services/creationEditorService';

export async function POST(
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

  let payload: { message?: string } | null = null;
  try {
    payload = (await request.json()) as { message?: string };
  } catch {
    payload = null;
  }
  const message = payload?.message?.trim();
  if (!message) {
    return new Response(JSON.stringify({ error: 'Message is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { stream, threadId } = await streamCreationEditorChat({
      projectId,
      creationId,
      message,
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Thread-Id': threadId,
      },
    });
  } catch (error) {
    console.error('Creation editor stream failed:', error);
    return new Response(JSON.stringify({ error: 'Creation editor stream failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
