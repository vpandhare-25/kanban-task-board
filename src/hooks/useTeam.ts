import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TeamMember } from '../types'
import { friendlyError } from './useTasks'

/**
 * Loads and edits the guest's team members.
 * Like tasks, RLS makes sure this only ever sees the current guest's members.
 * `onError` shows failures in the board's toast.
 */
export function useTeam(userId: string, onError: (message: string) => void) {
  const [members, setMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) onError(friendlyError("Couldn't load your team", error.message))
        else setMembers(data as TeamMember[])
      })
  }, [userId, onError])

  const addMember = useCallback(
    async (name: string, color: string) => {
      if (!supabase) return false
      const { data, error } = await supabase
        .from('team_members')
        .insert({ name: name.trim(), color })
        .select()
        .single()
      if (error) {
        onError(friendlyError("Couldn't add team member", error.message))
        return false
      }
      setMembers((prev) => [...prev, data as TeamMember])
      return true
    },
    [onError],
  )

  const removeMember = useCallback(
    async (member: TeamMember) => {
      if (!supabase) return false
      const { error } = await supabase.from('team_members').delete().eq('id', member.id)
      if (error) {
        onError(friendlyError("Couldn't remove team member", error.message))
        return false
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      return true
    },
    [onError],
  )

  return { members, addMember, removeMember }
}
