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
