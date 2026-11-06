import { createClient } from '@supabase/supabase-js'

// Vite exposes env vars that start with VITE_ to the browser.
// The anon key is designed to be public; Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// If the keys are missing we export null and the app shows a setup screen
// instead of crashing.
export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null
