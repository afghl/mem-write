import { fetchJson } from './http';

export type SourceSummary = {
    id: string;
    project_id: string;
    source_type: string;
    title: string;
    source_url?: string | null;
    filename?: string | null;
    status: string;
    chunk_count?: number | null;
    created_at?: string;
};

type SourcesResponse = {
    sources: SourceSummary[];
};

export async function fetchProjectSources(projectId: string) {
    const encoded = encodeURIComponent(projectId);
    return fetchJson<SourcesResponse>(`/api/projects/${encoded}/sources`);
}
