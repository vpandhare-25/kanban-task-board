import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NewTask, Task, TaskStatus } from '../types'

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
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setLoadError(error.message)
    else setTasks(data as Task[])
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
      .select()
      .single()
    if (error) {
      setActionError(`Couldn't create task: ${error.message}`)
      return false
    }
    setTasks((prev) => [data as Task, ...prev])
    return true
  }, [])

  /**
   * Moves a task to another column.
   * "Optimistic update": the card moves on screen immediately, then we save.
   * If the save fails we move it back and show an error, so the UI never lies.
   */
  const moveTask = useCallback(async (task: Task, status: TaskStatus) => {
    if (!supabase || task.status === status) return
    const previous = task.status
    const setStatus = (s: TaskStatus) =>
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: s } : t)))

    setStatus(status)
    const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id)
    if (error) {
      setStatus(previous)
      setActionError(`Couldn't move task: ${error.message}`)
    }
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
    moveTask,
  }
}
