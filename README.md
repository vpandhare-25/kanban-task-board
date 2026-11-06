# Task Board

A Kanban-style task board (To Do → In Progress → In Review → Done) built with
React, TypeScript, Vite and Supabase. Every visitor automatically gets a private
guest account, and Row Level Security keeps each guest's tasks separate.

## Tech
- **Frontend:** React 19 + TypeScript + Vite, plain CSS with design tokens
- **Drag and drop:** dnd-kit (mouse, touch and keyboard)
- **Backend:** Supabase (Postgres + anonymous Auth + Row Level Security), called directly from the frontend

## Run locally
1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Open **Authentication → Sign In / Providers** and turn on **Allow anonymous sign-ins**.
4. Copy `.env.example` to `.env` and fill in the project URL and **anon** key
   (Project Settings → API). Never use the service_role key here.
5. Install and start:
   ```bash
   npm install
   npm run dev
   ```

## Project structure
```
src/
  App.tsx                 setup / guest-session / board screens
  lib/supabase.ts         Supabase client (reads env vars)
  lib/dates.ts            due-date helpers (overdue, due soon)
  hooks/useGuestSession   creates or reuses the anonymous guest user
  hooks/useTasks          loads tasks, create, move (optimistic update + rollback)
  components/             Board, Column, TaskCard, NewTaskModal, StatusScreen
supabase/schema.sql       tables + RLS policies
```
