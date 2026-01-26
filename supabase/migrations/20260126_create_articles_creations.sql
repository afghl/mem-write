create extension if not exists "pgcrypto";

create table if not exists articles (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null,
    title text not null,
    content_markdown text not null default '',
    status text null,
    summary text null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_articles_project
    on articles (project_id, updated_at desc);

create table if not exists creations (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null,
    article_id uuid not null,
    style text not null,
    source_ids uuid[] not null default '{}'::uuid[],
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create index if not exists idx_creations_project
    on creations (project_id, updated_at desc);

create index if not exists idx_creations_article
    on creations (article_id);

create table if not exists creation_threads (
    id uuid primary key default gen_random_uuid(),
    creation_id uuid not null,
    thread_id text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique (creation_id)
);

create index if not exists idx_creation_threads_thread
    on creation_threads (thread_id);

create table if not exists creation_messages (
    id uuid primary key default gen_random_uuid(),
    creation_id uuid not null,
    thread_id text not null,
    role text not null,
    content text not null,
    created_at timestamp with time zone default now()
);

create index if not exists idx_creation_messages_creation
    on creation_messages (creation_id, created_at desc);

create index if not exists idx_creation_messages_thread
    on creation_messages (thread_id);

alter table if exists articles enable row level security;
alter table if exists creations enable row level security;
alter table if exists creation_threads enable row level security;
alter table if exists creation_messages enable row level security;

drop policy if exists "articles_read_all" on articles;
create policy "articles_read_all"
    on articles
    for select
    using (true);

drop policy if exists "articles_write_all" on articles;
create policy "articles_write_all"
    on articles
    for insert
    with check (true);

drop policy if exists "articles_update_all" on articles;
create policy "articles_update_all"
    on articles
    for update
    using (true)
    with check (true);

drop policy if exists "creations_read_all" on creations;
create policy "creations_read_all"
    on creations
    for select
    using (true);

drop policy if exists "creations_write_all" on creations;
create policy "creations_write_all"
    on creations
    for insert
    with check (true);

drop policy if exists "creations_update_all" on creations;
create policy "creations_update_all"
    on creations
    for update
    using (true)
    with check (true);

drop policy if exists "creation_threads_read_all" on creation_threads;
create policy "creation_threads_read_all"
    on creation_threads
    for select
    using (true);

drop policy if exists "creation_threads_write_all" on creation_threads;
create policy "creation_threads_write_all"
    on creation_threads
    for insert
    with check (true);

drop policy if exists "creation_threads_update_all" on creation_threads;
create policy "creation_threads_update_all"
    on creation_threads
    for update
    using (true)
    with check (true);

drop policy if exists "creation_messages_read_all" on creation_messages;
create policy "creation_messages_read_all"
    on creation_messages
    for select
    using (true);

drop policy if exists "creation_messages_write_all" on creation_messages;
create policy "creation_messages_write_all"
    on creation_messages
    for insert
    with check (true);

drop policy if exists "creation_messages_update_all" on creation_messages;
create policy "creation_messages_update_all"
    on creation_messages
    for update
    using (true)
    with check (true);
