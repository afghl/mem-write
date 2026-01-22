export type SourceStatus = 'processing' | 'ready' | 'failed';

export type SourceRow = {
    id: string;
    project_id: string;
    source_type: string;
    title: string;
    source_url?: string | null;
    filename?: string | null;
    status: SourceStatus;
    chunk_count?: number | null;
    created_at?: string;
};

export type CreateSourceInput = {
    id: string;
    project_id: string;
    source_type: string;
    title: string;
    source_url?: string | null;
    filename?: string | null;
    status?: SourceStatus;
};

export type UpdateSourceStatusInput = {
    id: string;
    status: SourceStatus;
    chunk_count?: number | null;
};

export type SourceRepo = {
    createSource: (input: CreateSourceInput) => Promise<void>;
    updateSourceStatus: (input: UpdateSourceStatusInput) => Promise<void>;
    listSourcesByProjectId: (projectId: string) => Promise<SourceRow[]>;
};
