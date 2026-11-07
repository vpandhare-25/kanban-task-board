import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

// The saved theme is applied by a tiny script in index.html before React loads,
// so the page never flashes the wrong theme. This hook just reads and changes it.
function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Light is the default; the choice is remembered in this browser. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme)

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
    setThemeState(next)
  }, [])

  return { theme, toggle }
}
