import { isSupabaseConfigured } from './lib/supabase'
import { useGuestSession } from './hooks/useGuestSession'
import { Board } from './components/Board'
import { StatusScreen } from './components/StatusScreen'

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <StatusScreen
        tone="info"
        title="Connect Supabase to get started"
        message={
          <>
            Copy <code>.env.example</code> to <code>.env</code>, add your project URL and anon key,
            then restart the dev server.
          </>
        }
      />
    )
  }
  return <AppWithSession />
}

// Split out so the session hook only runs when Supabase is configured.
function AppWithSession() {
  const session = useGuestSession()

  if (session.status === 'loading') {
    return <StatusScreen tone="loading" title="Setting up your board…" />
  }
  if (session.status === 'error') {
    return (
      <StatusScreen
        tone="error"
        title="Couldn't start a guest session"
        message={
          <>
            {session.message}
            <br />
            Check that Anonymous sign-ins are enabled in Supabase (Authentication → Sign In / Providers).
          </>
        }
        action={{ label: 'Retry', onClick: () => window.location.reload() }}
      />
    )
  }
  return <Board userId={session.user.id} />
}
