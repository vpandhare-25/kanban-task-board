import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Label, TeamMember } from '../types'
import { friendlyError } from './useTasks'

/** Both team members and labels are rows with a name + color. */
type NamedItem = { id: string; name: string; color: string; created_at: string }

/**
 * Loads, adds and removes rows from a simple "name + color" table.
 * Used for team members and labels, which behave exactly the same.
 * RLS makes sure this only ever sees the current guest's rows.
 * `onError` shows failures in the board's toast.
 */
function useNamedList<T extends NamedItem>(
  table: 'team_members' | 'labels',
  noun: string,
  userId: string,
  onError: (message: string) => void,
) {
  const [items, setItems] = useState<T[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) onError(friendlyError(`Couldn't load ${noun}s`, error.message))
        else setItems(data as T[])
      })
  }, [table, noun, userId, onError])

  const add = useCallback(
    async (name: string, color: string) => {
      if (!supabase) return false
      const { data, error } = await supabase
        .from(table)
        .insert({ name: name.trim(), color })
        .select()
        .single()
      if (error) {
        onError(friendlyError(`Couldn't add ${noun}`, error.message))
        return false
      }
      setItems((prev) => [...prev, data as T])
      return true
    },
    [table, noun, onError],
  )

  const remove = useCallback(
    async (item: T) => {
      if (!supabase) return false
      const { error } = await supabase.from(table).delete().eq('id', item.id)
      if (error) {
        onError(friendlyError(`Couldn't remove ${noun}`, error.message))
        return false
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      return true
    },
    [table, noun, onError],
  )

  return { items, add, remove }
}

export function useTeam(userId: string, onError: (message: string) => void) {
  const { items, add, remove } = useNamedList<TeamMember>('team_members', 'team member', userId, onError)
  return { members: items, addMember: add, removeMember: remove }
}

export function useLabels(userId: string, onError: (message: string) => void) {
  const { items, add, remove } = useNamedList<Label>('labels', 'label', userId, onError)
  return { labels: items, addLabel: add, removeLabel: remove }
}
