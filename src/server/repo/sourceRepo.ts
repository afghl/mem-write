import type { SourceRow, SourceStatus } from '@/server/domain/source/entity';

export type CreateSourceInput = {
    id: string;
    project_id: string;
    source_type: string;
    title: string;
    description?: string | null;
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
