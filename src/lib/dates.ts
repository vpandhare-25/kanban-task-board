// Small date helpers for due-date badges. No library needed.

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

// "2026-11-06" -> Date at local midnight (new Date("2026-11-06") would be UTC
// midnight, which shows the wrong day in US time zones).
function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days from today until the due date (negative = overdue). */
export function daysUntil(ymd: string): number {
  return Math.round((parseLocalDate(ymd).getTime() - startOfToday().getTime()) / DAY_MS)
}

export function dueState(ymd: string): DueState {
  const days = daysUntil(ymd)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 2) return 'soon'
  return 'later'
}

export function dueLabel(ymd: string): string {
  const days = daysUntil(ymd)
  if (days < -1) return `${-days} days overdue`
  if (days === -1) return 'Due yesterday'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return parseLocalDate(ymd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
