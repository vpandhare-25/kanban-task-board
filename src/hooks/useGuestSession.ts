import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string }

/**
 * Makes sure there is a signed-in user on first launch.
 * - If the browser already has a session (saved by supabase-js in localStorage), reuse it.
 * - Otherwise create a new anonymous "guest" account. No email or password needed.
 * Each guest gets their own user id, and RLS uses that id to keep boards separate.
 */
export function useGuestSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let cancelled = false

    async function ensureSession() {
      const { data: existing, error: getError } = await client.auth.getSession()
      if (getError) throw getError
      if (existing.session) return existing.session.user

      const { data, error } = await client.auth.signInAnonymously()
      if (error) throw error
      if (!data.user) throw new Error('Supabase did not return a guest user.')
      return data.user
    }

    ensureSession()
      .then((user) => !cancelled && setState({ status: 'ready', user }))
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
