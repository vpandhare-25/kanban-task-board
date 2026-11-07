import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ActivityEntry, Comment } from '../types'
import { friendlyError } from './useTasks'

/** One item in the merged timeline: either a comment or an activity entry. */
export type FeedItem =
  | { kind: 'comment'; id: string; created_at: string; comment: Comment }
  | { kind: 'activity'; id: string; created_at: string; entry: ActivityEntry }

/**
 * Loads the comments and activity history for one task and merges them
 * into a single timeline, oldest first (like GitHub or Linear).
 *
 * `refreshKey` changes after every successful save on the board. Activity
 * rows are written by database triggers, so we re-fetch to pick them up.
 */
export function useTaskFeed(taskId: string, refreshKey: number) {
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Comments: loaded once per task (we add/remove them locally afterwards).
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(friendlyError("Couldn't load comments", error.message))
        else setComments(data as Comment[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [taskId])

  // Activity: re-loaded whenever something on the board was saved.
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase
      .from('task_activity')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(friendlyError("Couldn't load activity", error.message))
        else setActivity(data as ActivityEntry[])
      })
    return () => {
      cancelled = true
    }
  }, [taskId, refreshKey])

  const addComment = useCallback(
    async (body: string) => {
      if (!supabase) return false
      const { data, error } = await supabase
        .from('comments')
        .insert({ task_id: taskId, body: body.trim() })
        .select()
        .single()
      if (error) {
        setError(friendlyError("Couldn't post comment", error.message))
        return false
      }
      setError(null)
      setComments((prev) => [...prev, data as Comment])
      return true
    },
    [taskId],
  )

  const deleteComment = useCallback(async (comment: Comment) => {
    if (!supabase) return false
    const { error } = await supabase.from('comments').delete().eq('id', comment.id)
    if (error) {
      setError(friendlyError("Couldn't delete comment", error.message))
      return false
    }
    setComments((prev) => prev.filter((c) => c.id !== comment.id))
    return true
  }, [])

  // Merge both lists and sort by time.
  const feed: FeedItem[] = [
    ...comments.map((c) => ({ kind: 'comment' as const, id: c.id, created_at: c.created_at, comment: c })),
    ...activity.map((a) => ({ kind: 'activity' as const, id: a.id, created_at: a.created_at, entry: a })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return { feed, loading, error, addComment, deleteComment }
}
