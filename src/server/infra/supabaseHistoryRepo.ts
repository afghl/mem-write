import { getSupabaseRestConfig, supabaseRequest, type SupabaseRestConfig } from './supabaseRest';
import type {
    CheckpointRow,
    CheckpointWriteRow,
    HistoryRepo,
    ListCheckpointOptions,
} from '../repo/historyRepo';

type SupabaseHistoryRepoOptions = {
    tableName?: string;
    writesTableName?: string;
};

const DEFAULT_TABLE = 'langgraph_checkpoints';
const DEFAULT_WRITES_TABLE = 'langgraph_checkpoint_writes';

const buildQuery = (params: Record<string, string>) => {
    const search = new URLSearchParams(params);
    const query = search.toString();
    return query ? `?${query}` : '';
};

const createSupabaseHistoryRepo = (
    restConfig: SupabaseRestConfig,
    options?: SupabaseHistoryRepoOptions,
): HistoryRepo => {
    const tableName = options?.tableName ?? DEFAULT_TABLE;
    const writesTableName = options?.writesTableName ?? DEFAULT_WRITES_TABLE;

    return {
        async getCheckpoint({ threadId, checkpointNs, checkpointId }) {
            const params: Record<string, string> = {
                select:
                    'thread_id,checkpoint_ns,checkpoint_id,parent_checkpoint_id,checkpoint,metadata',
                thread_id: `eq.${threadId}`,
                checkpoint_ns: `eq.${checkpointNs}`,
            };

            if (checkpointId) {
                params.checkpoint_id = `eq.${checkpointId}`;
            } else {
                params.order = 'created_at.desc';
                params.limit = '1';
            }

            const rows = await supabaseRequest<CheckpointRow[]>(
                restConfig,
                `/${tableName}${buildQuery(params)}`,
            );

            return rows[0];
        },
        async listCheckpoints({ threadId, checkpointNs, options }) {
            const params: Record<string, string> = {
                select:
                    'thread_id,checkpoint_ns,checkpoint_id,parent_checkpoint_id,checkpoint,metadata',
                thread_id: `eq.${threadId}`,
                order: 'created_at.desc',
            };

            if (checkpointNs !== undefined) {
                params.checkpoint_ns = `eq.${checkpointNs}`;
            }

            const rows = await supabaseRequest<CheckpointRow[]>(
                restConfig,
                `/${tableName}${buildQuery(params)}`,
            );

            const limit = options?.limit;
            if (typeof limit === 'number') {
                return rows.slice(0, limit);
            }

            return rows;
        },
        async upsertCheckpoint(row) {
            await supabaseRequest<CheckpointRow[]>(
                restConfig,
                `/${tableName}?on_conflict=thread_id,checkpoint_ns,checkpoint_id`,
                {
                    method: 'POST',
                    headers: { Prefer: 'resolution=merge-duplicates' },
                    body: row,
                },
            );
        },
        async listCheckpointWrites({ threadId, checkpointNs, checkpointId }) {
            const params = buildQuery({
                select: 'thread_id,checkpoint_ns,checkpoint_id,task_id,channel,value,write_idx',
                thread_id: `eq.${threadId}`,
                checkpoint_ns: `eq.${checkpointNs}`,
                checkpoint_id: `eq.${checkpointId}`,
                order: 'write_idx.asc',
            });

            return supabaseRequest<CheckpointWriteRow[]>(
                restConfig,
                `/${writesTableName}${params}`,
            );
        },
        async upsertCheckpointWrites(rows) {
            if (rows.length === 0) return;

            await supabaseRequest<CheckpointWriteRow[]>(
                restConfig,
                `/${writesTableName}?on_conflict=thread_id,checkpoint_ns,checkpoint_id,task_id,write_idx`,
                {
                    method: 'POST',
                    headers: { Prefer: 'resolution=merge-duplicates' },
                    body: rows,
                },
            );
        },
    };
};

export const getSupabaseHistoryRepo = (
    options?: SupabaseHistoryRepoOptions,
): HistoryRepo | null => {
    const restConfig = getSupabaseRestConfig();
    if (!restConfig) return null;
    return createSupabaseHistoryRepo(restConfig, options);
};
