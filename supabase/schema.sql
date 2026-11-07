-- =============================================================
-- Next Play Kanban: database schema
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> Run.
-- It is safe to re-run (it uses "if not exists" / "drop ... if exists").
-- =============================================================

-- ---------- tasks ----------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  description text,
  status      text not null default 'todo'
              check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high')),
  due_date    date,
  -- Owner of the task. Defaults to the signed-in (guest) user, so the
  -- frontend never has to send it and cannot fake someone else's id.
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Speeds up "load my board" (every query filters by user_id).
create index if not exists tasks_user_id_idx on public.tasks (user_id);

-- ---------- Row Level Security ----------
-- With RLS on, Postgres itself checks every row. Even if someone calls the
-- API directly with the public anon key, they only ever see their own rows.
alter table public.tasks enable row level security;

drop policy if exists "Users can read their own tasks"   on public.tasks;
drop policy if exists "Users can create their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;

create policy "Users can read their own tasks"
  on public.tasks for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create their own tasks"
  on public.tasks for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own tasks"
  on public.tasks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own tasks"
  on public.tasks for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================
-- Team members & assignees (advanced feature #1)
-- =============================================================

-- A guest's own small "team". Members are just names + a color,
-- they are not real accounts.
create table if not exists public.team_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 40),
  color      text not null default '#5b5bd6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists team_members_user_id_idx on public.team_members (user_id);

-- Which members are assigned to which task (many-to-many).
-- Deleting a task or a member automatically removes its assignments.
create table if not exists public.task_assignees (
  task_id   uuid not null references public.tasks (id) on delete cascade,
  member_id uuid not null references public.team_members (id) on delete cascade,
  user_id   uuid not null default auth.uid()
            references auth.users (id) on delete cascade,
  primary key (task_id, member_id)
);
create index if not exists task_assignees_user_id_idx on public.task_assignees (user_id);
create index if not exists task_assignees_member_id_idx on public.task_assignees (member_id);

alter table public.team_members  enable row level security;
alter table public.task_assignees enable row level security;

-- team_members: same "only my rows" rules as tasks.
drop policy if exists "Users manage their own team members" on public.team_members;
create policy "Users manage their own team members"
  on public.team_members for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- task_assignees: you can read/delete your own rows, and you can only
-- create an assignment when BOTH the task and the member are yours.
-- (Without the extra checks, someone could link their row to another
-- user's task id if they guessed it.)
drop policy if exists "Users read their own assignments"   on public.task_assignees;
drop policy if exists "Users create their own assignments" on public.task_assignees;
drop policy if exists "Users delete their own assignments" on public.task_assignees;

create policy "Users read their own assignments"
  on public.task_assignees for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users create their own assignments"
  on public.task_assignees for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.team_members m where m.id = member_id and m.user_id = auth.uid())
  );

create policy "Users delete their own assignments"
  on public.task_assignees for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================
-- Labels / tags (advanced feature #4)
-- Same shape as team members: a per-guest list + a link table.
-- =============================================================

create table if not exists public.labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 30),
  color      text not null default '#6b7280' check (color ~ '^#[0-9a-fA-F]{6}$'),
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists labels_user_id_idx on public.labels (user_id);

create table if not exists public.task_labels (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  user_id  uuid not null default auth.uid()
           references auth.users (id) on delete cascade,
  primary key (task_id, label_id)
);
create index if not exists task_labels_user_id_idx on public.task_labels (user_id);
create index if not exists task_labels_label_id_idx on public.task_labels (label_id);

alter table public.labels      enable row level security;
alter table public.task_labels enable row level security;

drop policy if exists "Users manage their own labels" on public.labels;
create policy "Users manage their own labels"
  on public.labels for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users read their own task labels"   on public.task_labels;
drop policy if exists "Users create their own task labels" on public.task_labels;
drop policy if exists "Users delete their own task labels" on public.task_labels;

create policy "Users read their own task labels"
  on public.task_labels for select
  to authenticated
  using (user_id = auth.uid());

-- Only link a task and a label that both belong to you.
create policy "Users create their own task labels"
  on public.task_labels for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.labels l where l.id = label_id and l.user_id = auth.uid())
  );

create policy "Users delete their own task labels"
  on public.task_labels for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================
-- Task comments (advanced feature #2)
-- =============================================================

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 2000),
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists comments_task_id_idx on public.comments (task_id, created_at);
create index if not exists comments_user_id_idx on public.comments (user_id);

alter table public.comments enable row level security;

drop policy if exists "Users read their own comments"   on public.comments;
drop policy if exists "Users create their own comments" on public.comments;
drop policy if exists "Users delete their own comments" on public.comments;

create policy "Users read their own comments"
  on public.comments for select
  to authenticated
  using (user_id = auth.uid());

-- You can only comment on your own tasks.
create policy "Users create their own comments"
  on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

create policy "Users delete their own comments"
  on public.comments for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================
-- Task activity log (advanced feature #3)
--
-- Rows are written ONLY by database triggers, never by the app.
-- That means the history is complete (every change is recorded, no
-- matter which code path made it) and users can't write fake history:
-- there is no insert/update/delete policy, so clients can only read.
-- =============================================================

create table if not exists public.task_activity (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- created | updated | assigned | unassigned | labeled | unlabeled
  action     text not null,
  field      text,   -- for "updated": status, title, priority, due_date, description
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);
create index if not exists task_activity_task_id_idx on public.task_activity (task_id, created_at);
create index if not exists task_activity_user_id_idx on public.task_activity (user_id);

alter table public.task_activity enable row level security;

drop policy if exists "Users read their own activity" on public.task_activity;
create policy "Users read their own activity"
  on public.task_activity for select
  to authenticated
  using (user_id = auth.uid());

-- "security definer" lets the trigger insert even though clients have
-- no insert policy. search_path = '' is the recommended safety setting
-- for security definer functions (every name below is fully qualified).

-- 1) Task created / fields changed
create or replace function public.log_task_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, user_id, action, new_value)
    values (new.id, new.user_id, 'created', new.status);
    return new;
  end if;

  -- One row per changed field. "is distinct from" treats null correctly.
  if new.status is distinct from old.status then
    insert into public.task_activity (task_id, user_id, action, field, old_value, new_value)
    values (new.id, new.user_id, 'updated', 'status', old.status, new.status);
  end if;
  if new.title is distinct from old.title then
    insert into public.task_activity (task_id, user_id, action, field, old_value, new_value)
    values (new.id, new.user_id, 'updated', 'title', old.title, new.title);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.task_activity (task_id, user_id, action, field, old_value, new_value)
    values (new.id, new.user_id, 'updated', 'priority', old.priority, new.priority);
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (task_id, user_id, action, field, old_value, new_value)
    values (new.id, new.user_id, 'updated', 'due_date', old.due_date::text, new.due_date::text);
  end if;
  if new.description is distinct from old.description then
    insert into public.task_activity (task_id, user_id, action, field)
    values (new.id, new.user_id, 'updated', 'description');
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_activity on public.tasks;
create trigger tasks_activity
  after insert or update on public.tasks
  for each row execute function public.log_task_changes();

-- 2) Assignees / labels added or removed.
-- We store the member/label NAME, so the history still reads well
-- after that member or label is deleted.
create or replace function public.log_link_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  link     record;
  the_name text;
  verb     text;
begin
  link := case when tg_op = 'INSERT' then new else old end;

  -- When a whole task is deleted, its links are deleted too (cascade).
  -- The task row is already gone then, so there is nothing to log.
  if not exists (select 1 from public.tasks t where t.id = link.task_id) then
    return null;
  end if;

  if tg_table_name = 'task_assignees' then
    select m.name into the_name from public.team_members m where m.id = link.member_id;
    verb := case when tg_op = 'INSERT' then 'assigned' else 'unassigned' end;
  else
    select l.name into the_name from public.labels l where l.id = link.label_id;
    verb := case when tg_op = 'INSERT' then 'labeled' else 'unlabeled' end;
  end if;

  -- If the member/label itself was deleted, its name is gone; skip the entry.
  if the_name is null then
    return null;
  end if;

  insert into public.task_activity (task_id, user_id, action, new_value)
  values (link.task_id, link.user_id, verb, the_name);
  return null;
end;
$$;

drop trigger if exists task_assignees_activity on public.task_assignees;
create trigger task_assignees_activity
  after insert or delete on public.task_assignees
  for each row execute function public.log_link_changes();

drop trigger if exists task_labels_activity on public.task_labels;
create trigger task_labels_activity
  after insert or delete on public.task_labels
  for each row execute function public.log_link_changes();

-- Trigger functions should not be callable directly through the API.
revoke execute on function public.log_task_changes() from public, anon, authenticated;
revoke execute on function public.log_link_changes() from public, anon, authenticated;
