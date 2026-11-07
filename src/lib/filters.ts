import type { Task, TaskPriority } from '../types'

/** Special id for the "Unassigned" option in the assignee filter. */
export const UNASSIGNED = '__unassigned__'

export interface Filters {
  query: string
  priorities: TaskPriority[]
  assigneeIds: string[] // may include UNASSIGNED
  labelIds: string[]
}

export const EMPTY_FILTERS: Filters = { query: '', priorities: [], assigneeIds: [], labelIds: [] }

export function isFiltering(f: Filters) {
  return f.query.trim() !== '' || f.priorities.length > 0 || f.assigneeIds.length > 0 || f.labelIds.length > 0
}

/**
 * Does a task pass every active filter?
 * - Different filters combine with AND (priority AND label...).
 * - Several values inside one filter combine with OR (Bug OR Design).
 * An empty filter means "don't filter on this".
 */
export function matchesFilters(task: Task, f: Filters) {
  const q = f.query.trim().toLowerCase()
  if (q && !task.title.toLowerCase().includes(q) && !(task.description ?? '').toLowerCase().includes(q)) {
    return false
  }
  if (f.priorities.length && !f.priorities.includes(task.priority)) return false
  if (f.assigneeIds.length) {
    const wantsUnassigned = f.assigneeIds.includes(UNASSIGNED) && task.assignee_ids.length === 0
    const hasAssignee = task.assignee_ids.some((id) => f.assigneeIds.includes(id))
    if (!wantsUnassigned && !hasAssignee) return false
  }
  if (f.labelIds.length && !task.label_ids.some((id) => f.labelIds.includes(id))) return false
  return true
}
