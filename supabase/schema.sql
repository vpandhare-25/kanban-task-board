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
