// Shared types that mirror the `tasks` table in supabase/schema.sql.

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null // "YYYY-MM-DD"
  user_id: string
  created_at: string
}

// What the "New task" form sends. user_id and created_at are set by the database.
export interface NewTask {
  title: string
  description?: string
  priority: TaskPriority
  due_date?: string
  status: TaskStatus
}

// The four board columns, in display order.
export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
]

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}
