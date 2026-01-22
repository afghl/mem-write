create extension if not exists "pgcrypto";

create table if not exists projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text null,
    created_at timestamp with time zone default now()
);

insert into projects (id, name)
values ('00000000-0000-0000-0000-000000000000', 'Demo Project')
on conflict (id) do nothing;

create table if not exists sources (
    id uuid primary key,
    project_id uuid not null references projects (id) on delete cascade,
    source_type text not null,
    title text not null,
    source_url text null,
    filename text null,
    status text not null default 'processing',
    chunk_count integer null,
    created_at timestamp with time zone default now()
);

create index if not exists idx_sources_project
    on sources (project_id, created_at desc);

create index if not exists idx_sources_status
    on sources (status);
