import { NextRequest } from 'next/server';
import { getSupabaseSourceRepo } from '@/server/infra/supabaseSourceRepo';

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

    const repo = getSupabaseSourceRepo();
    if (!repo) {
        return new Response(JSON.stringify({ error: 'Supabase is not configured.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const sources = await repo.listSourcesByProjectId(projectId);
        return new Response(JSON.stringify({ sources }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('List sources failed:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch sources.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
