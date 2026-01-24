import { getSupabaseRestConfig, supabaseRequest, type SupabaseRestConfig } from './supabaseRest';
import type { SourceRow } from '@/server/domain/source/entity';
import type { CreateSourceInput, SourceRepo, UpdateSourceStatusInput } from '../repo/sourceRepo';

type SupabaseSourceRepoOptions = {
    tableName?: string;
};

const DEFAULT_TABLE = 'sources';

const buildQuery = (params: Record<string, string>) => {
    const search = new URLSearchParams(params);
    const query = search.toString();
    return query ? `?${query}` : '';
};

const createSupabaseSourceRepo = (
    restConfig: SupabaseRestConfig,
    options?: SupabaseSourceRepoOptions,
): SourceRepo => {
    const tableName = options?.tableName ?? DEFAULT_TABLE;

    return {
        async createSource(input: CreateSourceInput) {
            await supabaseRequest<SourceRow[]>(
                restConfig,
                `/${tableName}?on_conflict=id`,
                {
                    method: 'POST',
                    headers: { Prefer: 'resolution=merge-duplicates' },
                    body: {
                        ...input,
                        status: input.status ?? 'processing',
                    },
                },
            );
        },
        async updateSourceStatus(input: UpdateSourceStatusInput) {
            await supabaseRequest<SourceRow[]>(
                restConfig,
                `/${tableName}?id=eq.${input.id}`,
                {
                    method: 'PATCH',
                    headers: { Prefer: 'return=representation' },
                    body: {
                        status: input.status,
                        chunk_count:
                            typeof input.chunk_count === 'number'
                                ? input.chunk_count
                                : input.chunk_count ?? null,
                    },
                },
            );
        },
        async listSourcesByProjectId(projectId: string) {
            const params = buildQuery({
                select:
                    'id,project_id,source_type,title,description,source_url,filename,status,chunk_count,created_at',
                project_id: `eq.${projectId}`,
                order: 'created_at.desc',
            });
            return supabaseRequest<SourceRow[]>(
                restConfig,
                `/${tableName}${params}`,
            );
        },
        async listSourcesByIds(projectId: string, sourceIds: string[]) {
            if (!sourceIds || sourceIds.length === 0) return [];
            const params = buildQuery({
                select:
                    'id,project_id,source_type,title,description,source_url,filename,status,chunk_count,created_at',
                project_id: `eq.${projectId}`,
                id: `in.(${sourceIds.join(',')})`,
            });
            return supabaseRequest<SourceRow[]>(
                restConfig,
                `/${tableName}${params}`,
            );
        },
    };
};

export const getSupabaseSourceRepo = (
    options?: SupabaseSourceRepoOptions,
): SourceRepo | null => {
    const restConfig = getSupabaseRestConfig();
    if (!restConfig) return null;
    return createSupabaseSourceRepo(restConfig, options);
};
