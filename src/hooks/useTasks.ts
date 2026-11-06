import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NewTask, Task, TaskStatus } from '../types'

/** Fields the user can edit on an existing task. */
export type TaskPatch = Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date'>>

/**
 * Supabase can fetch related rows in the same request ("embedded select").
 * `task_assignees(member_id)` follows the foreign key and returns
 * [{ member_id }, ...] for each task. We flatten that to a list of ids.
 */
const TASK_SELECT = '*, task_assignees(member_id)'
type TaskRow = Omit<Task, 'assignee_ids'> & { task_assignees?: { member_id: string }[] }

function fromRow({ task_assignees, ...task }: TaskRow): Task {
  return { ...task, assignee_ids: (task_assignees ?? []).map((a) => a.member_id) }
}

function sortNewestFirst(list: Task[]) {
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/**
 * Turns low-level errors into something a user understands.
 * "Failed to fetch" means the request never reached the server (offline, Wi-Fi drop...).
 */
export function friendlyError(action: string, raw: string) {
  if (/failed to fetch|network|load failed/i.test(raw)) {
    return `${action}. Check your connection and try again.`
  }
  return `${action}: ${raw}`
}

/**
 * Loads the signed-in user's tasks and exposes actions to change them.
 * We never filter by user_id here: RLS in the database already guarantees
 * the query only returns this user's rows.
 */
export function useTasks(userId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Short-lived message for failed saves (shown as a toast).
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .order('created_at', { ascending: false })
    if (error) setLoadError(friendlyError("We couldn't reach the server", error.message))
    else setTasks((data as TaskRow[]).map(fromRow))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load, userId])

  const createTask = useCallback(async (input: NewTask) => {
    if (!supabase) return false
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        due_date: input.due_date || null,
        status: input.status,
      })
      .select(TASK_SELECT)
      .single()
    if (error) {
      setActionError(friendlyError("Couldn't create task", error.message))
      return false
    }
    setTasks((prev) => [fromRow(data as TaskRow), ...prev])
    return true
  }, [])

  /**
   * Changes some fields of a task (status, title, priority...).
   * "Optimistic update": the screen changes immediately, then we save.
   * If the save fails we put the old values back and show an error, so the UI never lies.
   */
  const updateTask = useCallback(async (task: Task, patch: TaskPatch) => {
    if (!supabase) return false
    const before: TaskPatch = {}
    for (const key of Object.keys(patch) as (keyof TaskPatch)[]) {
      ;(before as Record<string, unknown>)[key] = task[key]
    }
    const apply = (values: TaskPatch) =>
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...values } : t)))

    apply(patch)
    const { error } = await supabase.from('tasks').update(patch).eq('id', task.id)
    if (error) {
      apply(before)
      setActionError(friendlyError("Couldn't save your change", error.message))
      return false
    }
    return true
  }, [])

  /** Moving a card between columns is just a status update. */
  const moveTask = useCallback(
    (task: Task, status: TaskStatus) => {
      if (task.status !== status) updateTask(task, { status })
    },
    [updateTask],
  )

  /** Removes a task. Same optimistic pattern: hide it first, restore it if the delete fails. */
  const deleteTask = useCallback(async (task: Task) => {
    if (!supabase) return false
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) {
      setTasks((prev) => sortNewestFirst([...prev, task]))
      setActionError(friendlyError("Couldn't delete task", error.message))
      return false
    }
    return true
  }, [])

  /**
   * Sets exactly which members are assigned to a task.
   * We work out which assignments to add and which to remove, apply that on
   * screen right away, then save both changes. On failure we reload from the
   * database so the screen matches what was really saved.
   */
  const setAssignees = useCallback(
    async (task: Task, memberIds: string[]) => {
      if (!supabase) return
      const toAdd = memberIds.filter((id) => !task.assignee_ids.includes(id))
      const toRemove = task.assignee_ids.filter((id) => !memberIds.includes(id))
      if (toAdd.length === 0 && toRemove.length === 0) return

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assignee_ids: memberIds } : t)))

      const results = await Promise.all([
        toAdd.length
          ? supabase.from('task_assignees').insert(toAdd.map((member_id) => ({ task_id: task.id, member_id })))
          : null,
        toRemove.length
          ? supabase.from('task_assignees').delete().eq('task_id', task.id).in('member_id', toRemove)
          : null,
      ])
      const failed = results.find((r) => r?.error)
      if (failed?.error) {
        setActionError(friendlyError("Couldn't update assignees", failed.error.message))
        load()
      }
    },
    [load],
  )

  /**
   * After a team member is deleted, the database removes their assignments
   * automatically (ON DELETE CASCADE). This mirrors that on screen.
   */
  const forgetMember = useCallback((memberId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.assignee_ids.includes(memberId)
          ? { ...t, assignee_ids: t.assignee_ids.filter((id) => id !== memberId) }
          : t,
      ),
    )
  }, [])

  // Stable function so components can use it in effects without re-running them.
  const clearActionError = useCallback(() => setActionError(null), [])

  return {
    tasks,
    loading,
    loadError,
    actionError,
    clearActionError,
    reload: load,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    setAssignees,
    forgetMember,
    setActionError,
  }
}
