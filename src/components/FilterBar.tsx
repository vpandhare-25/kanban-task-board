import { useEffect, useRef } from 'react'
import type { Label, TaskPriority, TeamMember } from '../types'
import type { Filters } from '../lib/filters'
import { EMPTY_FILTERS, UNASSIGNED, isFiltering } from '../lib/filters'
import { FilterMenu } from './FilterMenu'
import { Avatar } from './Avatar'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  members: TeamMember[]
  labels: Label[]
  shown: number
  total: number
}

const PRIORITY_OPTIONS: { id: TaskPriority; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
]

/** Search box + filter menus shown above the board. Filtering happens in the browser. */
export function FilterBar({ filters, onChange, members, labels, shown, total }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  // Press "/" anywhere (outside a text field) to jump to search, like GitHub or Linear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtering = isFiltering(filters)

  return (
    <div className="filterbar">
      <div className="search">
        <svg className="search__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          className="search__input"
          type="search"
          placeholder="Search tasks"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          aria-label="Search tasks by title or description"
        />
        {!filters.query && <kbd className="search__kbd" aria-hidden="true">/</kbd>}
      </div>

      <FilterMenu
        title="Priority"
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        onChange={(ids) => onChange({ ...filters, priorities: ids as TaskPriority[] })}
      />
      <FilterMenu
        title="Assignee"
        options={[
          { id: UNASSIGNED, label: 'Unassigned', icon: <span className="avatar avatar--empty" aria-hidden="true" /> },
          ...members.map((m) => ({ id: m.id, label: m.name, icon: <Avatar member={m} size={18} /> })),
        ]}
        selected={filters.assigneeIds}
        onChange={(ids) => onChange({ ...filters, assigneeIds: ids })}
      />
      <FilterMenu
        title="Label"
        options={labels.map((l) => ({
          id: l.id,
          label: l.name,
          icon: <span className="label-pill__dot" style={{ background: l.color }} aria-hidden="true" />,
        }))}
        selected={filters.labelIds}
        onChange={(ids) => onChange({ ...filters, labelIds: ids })}
        emptyText="No labels yet. Create them from a task."
      />

      {filtering && (
        <>
          <span className="filterbar__count" aria-live="polite">
            {shown} of {total} {total === 1 ? 'task' : 'tasks'}
          </span>
          <button className="link-btn" onClick={() => onChange(EMPTY_FILTERS)}>Clear all</button>
        </>
      )}
    </div>
  )
}
