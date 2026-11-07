import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Label, TaskPriority, TeamMember } from '../types'
import type { Filters } from '../lib/filters'
import { EMPTY_FILTERS, UNASSIGNED, isFiltering } from '../lib/filters'
import { Menu } from './Menu'
import type { MenuOption } from './Menu'
import { Avatar } from './Avatar'
import { CloseIcon, PriorityIcon, SearchIcon, TagIcon, UserIcon } from './icons'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  members: TeamMember[]
  labels: Label[]
  shown: number
  total: number
  /** Extra content on the right (the board stats). */
  children?: ReactNode
}

const PRIORITY_OPTIONS: MenuOption[] = (['high', 'normal', 'low'] as TaskPriority[]).map((p) => ({
  id: p,
  label: p[0].toUpperCase() + p.slice(1),
  icon: <PriorityIcon priority={p} />,
}))

/** Toggle an id in a list (used by every multi-select filter). */
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

/** Compact toolbar: search, three filter menus, and the board summary on the right. */
export function FilterBar({ filters, onChange, members, labels, shown, total, children }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

  // Press "/" anywhere (outside a text field) to jump to search, like GitHub or Linear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtering = isFiltering(filters)

  // One trigger look for all three filters; turns accent-colored with a count when active.
  const trigger = (icon: ReactNode, title: string, count: number) => (
    <>
      {icon}
      {title}
      {count > 0 && <span className="filter-trigger__count">{count}</span>}
    </>
  )
  const triggerClass = (count: number) => `filter-trigger${count > 0 ? ' filter-trigger--active' : ''}`

  return (
    <div className="toolbar">
      <div className="search">
        <SearchIcon className="search__icon" />
        <input
          ref={searchRef}
          className="search__input"
          type="search"
          placeholder="Search tasks"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (filters.query) onChange({ ...filters, query: '' })
              else e.currentTarget.blur()
            }
          }}
          aria-label="Search tasks by title or description"
        />
        <span className="search__end">
          {filters.query ? (
            <button
              className="icon-btn icon-btn--sm"
              onClick={() => onChange({ ...filters, query: '' })}
              aria-label="Clear search"
            >
              <CloseIcon size={12} />
            </button>
          ) : (
            <kbd className="kbd" aria-hidden="true">/</kbd>
          )}
        </span>
      </div>

      <span className="toolbar__divider" aria-hidden="true" />

      <Menu
        ariaLabel="Filter by priority"
        triggerClassName={triggerClass(filters.priorities.length)}
        trigger={trigger(<PriorityIcon priority="high" />, 'Priority', filters.priorities.length)}
        options={PRIORITY_OPTIONS}
        selected={filters.priorities}
        multiple
        onSelect={(id) => onChange({ ...filters, priorities: toggle(filters.priorities, id) as TaskPriority[] })}
      />
      <Menu
        ariaLabel="Filter by assignee"
        triggerClassName={triggerClass(filters.assigneeIds.length)}
        trigger={trigger(<UserIcon />, 'Assignee', filters.assigneeIds.length)}
        options={[
          { id: UNASSIGNED, label: 'Unassigned', icon: <span className="avatar avatar--empty" style={{ width: 18, height: 18 }} /> },
          ...members.map((m) => ({ id: m.id, label: m.name, icon: <Avatar member={m} size={18} /> })),
        ]}
        selected={filters.assigneeIds}
        multiple
        onSelect={(id) => onChange({ ...filters, assigneeIds: toggle(filters.assigneeIds, id) })}
      />
      <Menu
        ariaLabel="Filter by label"
        triggerClassName={triggerClass(filters.labelIds.length)}
        trigger={trigger(<TagIcon />, 'Label', filters.labelIds.length)}
        options={labels.map((l) => ({
          id: l.id,
          label: l.name,
          icon: <span className="tag__dot" style={{ background: l.color }} />,
        }))}
        selected={filters.labelIds}
        multiple
        onSelect={(id) => onChange({ ...filters, labelIds: toggle(filters.labelIds, id) })}
        emptyText="No labels yet. Create them from a task."
        align="end"
      />

      {filtering && (
        <>
          <span className="toolbar__result" aria-live="polite">
            {shown} of {total}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear
          </button>
        </>
      )}

      {children}
    </div>
  )
}
