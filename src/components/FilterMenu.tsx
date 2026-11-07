import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface FilterOption {
  id: string
  label: string
  icon?: ReactNode
}

interface Props {
  title: string
  options: FilterOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  emptyText?: string
}

/** A button that opens a small checkbox list. Used for priority, assignee and label filters. */
export function FilterMenu({ title, options, selected, onChange, emptyText }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close when clicking anywhere outside the menu, or on Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const active = selected.length > 0

  return (
    <div className="filter-menu" ref={rootRef}>
      <button
        className={`filter-btn${active ? ' filter-btn--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {title}
        {active && <span className="filter-btn__count">{selected.length}</span>}
        <svg className="filter-btn__caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="filter-pop" role="menu">
          {options.length === 0 ? (
            <p className="filter-pop__empty">{emptyText ?? 'Nothing to filter by yet.'}</p>
          ) : (
            options.map((o) => (
              <label key={o.id} className="filter-pop__item" role="menuitemcheckbox" aria-checked={selected.includes(o.id)}>
                <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
                {o.icon}
                <span>{o.label}</span>
              </label>
            ))
          )}
          {active && (
            <button className="filter-pop__clear" onClick={() => onChange([])}>
              Clear {title.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
