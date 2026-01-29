alter table if exists creations
    add column if not exists thread_id text;

update creations
set thread_id = creation_threads.thread_id
from creation_threads
where creations.id = creation_threads.creation_id
  and creations.thread_id is null;

create index if not exists idx_creations_thread
    on creations (thread_id);

drop policy if exists "creation_messages_read_all" on creation_messages;
drop policy if exists "creation_messages_write_all" on creation_messages;
drop policy if exists "creation_messages_update_all" on creation_messages;

drop policy if exists "creation_threads_read_all" on creation_threads;
drop policy if exists "creation_threads_write_all" on creation_threads;
drop policy if exists "creation_threads_update_all" on creation_threads;

drop table if exists creation_messages;
drop table if exists creation_threads;
