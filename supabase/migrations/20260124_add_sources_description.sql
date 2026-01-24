alter table if exists sources
    add column if not exists description text null;
