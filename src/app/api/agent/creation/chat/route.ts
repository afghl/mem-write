import { NextRequest } from 'next/server';
import { runCreationChat } from '@/server/services/creationChatService';

export async function POST(request: NextRequest) {
  let payload: { project_id?: string; creation_id?: string; message?: string } | null = null;
  try {
    payload = (await request.json()) as {
      project_id?: string;
      creation_id?: string;
      message?: string;
    };
  } catch {
    payload = null;
  }

  const projectId = payload?.project_id?.trim();
  const creationId = payload?.creation_id?.trim();
  const message = payload?.message?.trim();

  if (!projectId || !creationId || !message) {
    return new Response(
      JSON.stringify({ error: 'project_id, creation_id, and message are required.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const result = await runCreationChat({ projectId, creationId, message });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Creation chat failed:', error);
    return new Response(JSON.stringify({ error: 'Creation chat failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
