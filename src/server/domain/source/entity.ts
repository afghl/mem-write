export type SourceStatus = 'processing' | 'ready' | 'failed';

export type SourceRow = {
    id: string;
    project_id: string;
    source_type: string;
    title: string;
    description?: string | null;
    source_url?: string | null;
    filename?: string | null;
    status: SourceStatus;
    chunk_count?: number | null;
    created_at?: string;
};
