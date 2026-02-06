import type { RunnableConfig } from '@langchain/core/runnables';
import {
    BaseCheckpointSaver,
    type Checkpoint,
    type CheckpointListOptions,
    type CheckpointMetadata,
    type CheckpointTuple,
    type CheckpointPendingWrite,
    type PendingWrite,
    copyCheckpoint,
    getCheckpointId,
    MemorySaver,
    WRITES_IDX_MAP,
} from '@langchain/langgraph-checkpoint';
import { TASKS, type SendProtocol } from '@langchain/langgraph-checkpoint';
import { getSupabaseHistoryRepo } from '../../infra/supabaseHistoryRepo';
import type { CheckpointRow, CheckpointWriteRow, HistoryRepo } from '../../repo/historyRepo';

type SupabaseCheckpointSaverOptions = {
    tableName?: string;
    writesTableName?: string;
};

const encodeBytes = (value: Uint8Array) => Buffer.from(value).toString('base64');

const decodeBytes = (value: string) => Buffer.from(value, 'base64');

const serialize = async (saver: CheckpointSaver, value: unknown) => {
    const [, serialized] = saver.serde.dumpsTyped(value);
    return encodeBytes(serialized);
};

const deserialize = async <T>(saver: CheckpointSaver, value: string) =>
    (await saver.serde.loadsTyped('json', decodeBytes(value))) as T;

export class CheckpointSaver extends BaseCheckpointSaver {
    private repo: HistoryRepo;

    constructor(repo: HistoryRepo) {
        super();
        this.repo = repo;
    }

    private async ensureCheckpointRow(
        threadId: string,
        checkpointNs: string,
        checkpointId: string,
    ): Promise<void> {
        const existing = await this.repo.getCheckpoint({
            threadId,
            checkpointNs,
            checkpointId,
        });
        if (existing) return;

        const placeholderCheckpoint: Partial<Checkpoint> & { id: Checkpoint['id'] } = {
            id: checkpointId,
        };
        const placeholderMetadata: Partial<CheckpointMetadata> = {};

        await this.repo.upsertCheckpoint({
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: checkpointId,
            parent_checkpoint_id: null,
            checkpoint: await serialize(this, placeholderCheckpoint),
            metadata: await serialize(this, placeholderMetadata),
        });
    }

    private async getPendingSends(
        threadId: string,
        checkpointNs: string,
        parentCheckpointId?: string | null,
    ): Promise<SendProtocol[]> {
        if (!parentCheckpointId) return [];

        const parentWrites = await this.repo.listCheckpointWrites({
            threadId,
            checkpointNs,
            checkpointId: parentCheckpointId,
        });
        const taskWrites = parentWrites.filter((row) => row.channel === TASKS);
        const pending = await Promise.all(
            taskWrites.map((row) => deserialize<SendProtocol>(this, row.value)),
        );

        return pending;
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const threadId = config.configurable?.thread_id;
        if (!threadId) return undefined;

        const checkpointNs = config.configurable?.checkpoint_ns ?? '';
        const checkpointId = getCheckpointId(config);
        const row = await this.repo.getCheckpoint({
            threadId,
            checkpointNs,
            checkpointId,
        });

        if (!row) return undefined;

        const pendingWritesRows = await this.repo.listCheckpointWrites({
            threadId,
            checkpointNs,
            checkpointId: row.checkpoint_id,
        });
        const pendingWrites = await Promise.all(
            pendingWritesRows.map(async (write) => {
                const value = await deserialize<unknown>(this, write.value);
                return [write.task_id, write.channel, value] as CheckpointPendingWrite;
            }),
        );

        const pendingSends = await this.getPendingSends(
            threadId,
            checkpointNs,
            row.parent_checkpoint_id,
        );

        const checkpoint = {
            ...(await deserialize<Checkpoint>(this, row.checkpoint)),
            pending_sends: pendingSends,
        };

        const metadata = await deserialize<CheckpointMetadata>(this, row.metadata);

        const checkpointTuple: CheckpointTuple = {
            config: {
                configurable: {
                    thread_id: threadId,
                    checkpoint_ns: checkpointNs,
                    checkpoint_id: row.checkpoint_id,
                },
            },
            checkpoint,
            metadata,
            pendingWrites,
        };

        if (row.parent_checkpoint_id) {
            checkpointTuple.parentConfig = {
                configurable: {
                    thread_id: threadId,
                    checkpoint_ns: checkpointNs,
                    checkpoint_id: row.parent_checkpoint_id,
                },
            };
        }

        return checkpointTuple;
    }

    async *list(
        config: RunnableConfig,
        options?: CheckpointListOptions,
    ): AsyncGenerator<CheckpointTuple> {
        const threadId = config.configurable?.thread_id;
        if (!threadId) return;

        const checkpointNs = config.configurable?.checkpoint_ns;
        const rows = await this.repo.listCheckpoints({
            threadId,
            checkpointNs,
            options: { limit: options?.limit },
        });

        let remaining = options?.limit ?? rows.length;
        for (const row of rows) {
            if (remaining <= 0) break;
            remaining -= 1;

            const metadata = await deserialize<CheckpointMetadata>(this, row.metadata);
            if (
                options?.filter &&
                !Object.entries(options.filter).every(([key, value]) => metadata[key] === value)
            ) {
                continue;
            }

            const pendingWritesRows = await this.repo.listCheckpointWrites({
                threadId: row.thread_id,
                checkpointNs: row.checkpoint_ns,
                checkpointId: row.checkpoint_id,
            });
            const pendingWrites = await Promise.all(
                pendingWritesRows.map(async (write) => {
                    const value = await deserialize<unknown>(this, write.value);
                    return [write.task_id, write.channel, value] as CheckpointPendingWrite;
                }),
            );

            const pendingSends = await this.getPendingSends(
                row.thread_id,
                row.checkpoint_ns,
                row.parent_checkpoint_id,
            );

            const checkpoint = {
                ...(await deserialize<Checkpoint>(this, row.checkpoint)),
                pending_sends: pendingSends,
            };

            const tuple: CheckpointTuple = {
                config: {
                    configurable: {
                        thread_id: row.thread_id,
                        checkpoint_ns: row.checkpoint_ns,
                        checkpoint_id: row.checkpoint_id,
                    },
                },
                checkpoint,
                metadata,
                pendingWrites,
            };

            if (row.parent_checkpoint_id) {
                tuple.parentConfig = {
                    configurable: {
                        thread_id: row.thread_id,
                        checkpoint_ns: row.checkpoint_ns,
                        checkpoint_id: row.parent_checkpoint_id,
                    },
                };
            }

            yield tuple;
        }
    }

    async put(
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
    ): Promise<RunnableConfig> {
        const preparedCheckpoint = copyCheckpoint(checkpoint);
        delete preparedCheckpoint.pending_sends;

        const threadId = config.configurable?.thread_id;
        const checkpointNs = config.configurable?.checkpoint_ns ?? '';

        if (!threadId) {
            throw new Error(
                'Failed to put checkpoint. Missing "thread_id" in configurable config.',
            );
        }

        const serializedCheckpoint = await serialize(this, preparedCheckpoint);
        const serializedMetadata = await serialize(this, metadata);
        const row: CheckpointRow = {
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: checkpoint.id,
            parent_checkpoint_id: config.configurable?.checkpoint_id ?? null,
            checkpoint: serializedCheckpoint,
            metadata: serializedMetadata,
        };

        await this.repo.upsertCheckpoint(row);

        return {
            configurable: {
                thread_id: threadId,
                checkpoint_ns: checkpointNs,
                checkpoint_id: checkpoint.id,
            },
        };
    }

    async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
        const threadId = config.configurable?.thread_id;
        const checkpointNs = config.configurable?.checkpoint_ns ?? '';
        const checkpointId = config.configurable?.checkpoint_id;

        if (!threadId) {
            throw new Error(
                'Failed to put writes. Missing "thread_id" in configurable config.',
            );
        }
        if (!checkpointId) {
            throw new Error(
                'Failed to put writes. Missing "checkpoint_id" in configurable config.',
            );
        }

        await this.ensureCheckpointRow(threadId, checkpointNs, checkpointId);

        const rows: CheckpointWriteRow[] = await Promise.all(
            writes.map(async ([channel, value], idx) => {
                const writeIdx = WRITES_IDX_MAP[channel] ?? idx;
                const serializedValue = await serialize(this, value);
                return {
                    thread_id: threadId,
                    checkpoint_ns: checkpointNs,
                    checkpoint_id: checkpointId,
                    task_id: taskId,
                    write_idx: writeIdx,
                    channel,
                    value: serializedValue,
                };
            }),
        );

        await this.repo.upsertCheckpointWrites(rows);
    }
}

export const createSupabaseCheckpointSaver = (
    options?: SupabaseCheckpointSaverOptions,
): CheckpointSaver | null => {
    const repo = getSupabaseHistoryRepo(options);
    if (!repo) return null;
    return new CheckpointSaver(repo);
};

export const createCheckpointer = (label: string) => {
    const supabaseSaver = createSupabaseCheckpointSaver();
    if (!supabaseSaver) {
        console.warn(
            `Supabase config missing; falling back to in-memory checkpointer for ${label}.`,
        );
        return new MemorySaver();
    }
    return supabaseSaver;
};
