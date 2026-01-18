export type CheckpointRow = {
    thread_id: string;
    checkpoint_ns: string;
    checkpoint_id: string;
    parent_checkpoint_id: string | null;
    checkpoint: string;
    metadata: string;
};

export type CheckpointWriteRow = {
    thread_id: string;
    checkpoint_ns: string;
    checkpoint_id: string;
    task_id: string;
    write_idx: number;
    channel: string;
    value: string;
};

export type ListCheckpointOptions = {
    limit?: number;
};

export type HistoryRepo = {
    getCheckpoint: (params: {
        threadId: string;
        checkpointNs: string;
        checkpointId?: string;
    }) => Promise<CheckpointRow | undefined>;
    listCheckpoints: (params: {
        threadId: string;
        checkpointNs?: string;
        options?: ListCheckpointOptions;
    }) => Promise<CheckpointRow[]>;
    upsertCheckpoint: (row: CheckpointRow) => Promise<void>;
    listCheckpointWrites: (params: {
        threadId: string;
        checkpointNs: string;
        checkpointId: string;
    }) => Promise<CheckpointWriteRow[]>;
    upsertCheckpointWrites: (rows: CheckpointWriteRow[]) => Promise<void>;
};
