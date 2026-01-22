alter table if exists sources enable row level security;

drop policy if exists "sources_read_all" on sources;
create policy "sources_read_all"
    on sources
    for select
    using (true);

drop policy if exists "sources_write_all" on sources;
create policy "sources_write_all"
    on sources
    for insert
    with check (true);

drop policy if exists "sources_update_all" on sources;
create policy "sources_update_all"
    on sources
    for update
    using (true)
    with check (true);
