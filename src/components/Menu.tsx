import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { CheckIcon } from './icons'

export interface MenuOption {
  id: string
  label: string
  icon?: ReactNode
}

interface Props {
  /** What the trigger button shows. */
  trigger: ReactNode
  triggerClassName?: string
  /** Accessible name for the trigger button. */
  ariaLabel: string
  options: MenuOption[]
  selected: string[]
  /** Multi-select stays open and shows checkmarks; single-select closes on pick. */
  multiple?: boolean
  onSelect: (id: string) => void
  /** Optional link at the bottom, e.g. "Manage labels". */
  footer?: { label: string; onClick: () => void }
  emptyText?: string
  align?: 'start' | 'end'
}

/**
 * One dropdown used everywhere: status/priority pickers, assignee/label pickers
 * and the toolbar filters. Replaces the browser's native <select> so it looks
 * consistent and can show icons.
 *
 * Keyboard: Enter/Space/↓ opens, ↑/↓ moves, Enter/Space picks, Esc closes.
 */
export function Menu({
  trigger,
  triggerClassName = 'btn btn--ghost',
  ariaLabel,
  options,
  selected,
  multiple = false,
  onSelect,
  footer,
  emptyText = 'Nothing here yet.',
  align = 'start',
}: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  function openMenu() {
    // Start on the currently selected option, if there is one.
    const index = options.findIndex((o) => selected.includes(o.id))
    setActive(index >= 0 ? index : 0)
    setOpen(true)
  }

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  // Focus the list when it opens so arrow keys work right away.
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(id: string) {
    onSelect(id)
    if (!multiple) close()
  }

  function onListKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      // Stop here so a panel/dialog underneath doesn't also close.
      e.stopPropagation()
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if ((e.key === 'Enter' || e.key === ' ') && options[active]) {
      e.preventDefault()
      pick(options[active].id)
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div className={`menu menu--${align}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            openMenu()
          }
        }}
      >
        {trigger}
      </button>

      {open && (
        <div className="menu__pop">
          <div
            ref={listRef}
            id={listId}
            className="menu__list"
            role="listbox"
            aria-label={ariaLabel}
            aria-multiselectable={multiple || undefined}
            aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
          >
            {options.length === 0 && <p className="menu__empty">{emptyText}</p>}
            {options.map((o, i) => {
              const isSelected = selected.includes(o.id)
              return (
                <div
                  key={o.id}
                  id={`${listId}-${o.id}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`menu__item${i === active ? ' menu__item--active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the list
                  onClick={() => pick(o.id)}
                >
                  {multiple && (
                    <span className={`checkbox${isSelected ? ' checkbox--on' : ''}`} aria-hidden="true">
                      {isSelected && <CheckIcon size={10} />}
                    </span>
                  )}
                  {o.icon && <span className="menu__icon">{o.icon}</span>}
                  <span className="menu__label">{o.label}</span>
                  {!multiple && isSelected && <CheckIcon size={13} className="menu__check" />}
                </div>
              )
            })}
          </div>
          {footer && (
            <button
              type="button"
              className="menu__footer"
              onClick={() => {
                close(false)
                footer.onClick()
              }}
            >
              {footer.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
