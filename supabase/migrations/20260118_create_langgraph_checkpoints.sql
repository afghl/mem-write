create table if not exists langgraph_checkpoints (
    thread_id text not null,
    checkpoint_ns text not null default '',
    checkpoint_id text not null,
    parent_checkpoint_id text null,
    checkpoint text not null,
    metadata text not null,
    created_at timestamp with time zone default now(),
    primary key (thread_id, checkpoint_ns, checkpoint_id)
);

create table if not exists langgraph_checkpoint_writes (
    thread_id text not null,
    checkpoint_ns text not null default '',
    checkpoint_id text not null,
    task_id text not null,
    write_idx integer not null,
    channel text not null,
    value text not null,
    created_at timestamp with time zone default now(),
    primary key (thread_id, checkpoint_ns, checkpoint_id, task_id, write_idx),
    foreign key (thread_id, checkpoint_ns, checkpoint_id)
        references langgraph_checkpoints (thread_id, checkpoint_ns, checkpoint_id)
        on delete cascade
);

create index if not exists idx_langgraph_checkpoints_thread
    on langgraph_checkpoints (thread_id, checkpoint_ns, created_at desc);

create index if not exists idx_langgraph_writes_thread
    on langgraph_checkpoint_writes (thread_id, checkpoint_ns, checkpoint_id);
