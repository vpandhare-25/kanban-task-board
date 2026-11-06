import { useEffect, useState } from 'react'
import type { Task, TaskPriority, TaskStatus } from '../types'
import { COLUMNS } from '../types'
import type { TaskPatch } from '../hooks/useTasks'
import { dueLabel, dueState } from '../lib/dates'

interface Props {
  task: Task
  onClose: () => void
  onUpdate: (task: Task, patch: TaskPatch) => Promise<boolean>
  onDelete: (task: Task) => Promise<boolean>
}

/**
 * Slide-in panel for one task. Every field saves on its own (no "Save" button),
 * like Linear or Notion: dropdowns save on change, text saves when you leave the field.
 * The parent renders it with key={task.id}, so local text state resets per task.
 */
export function TaskDetailPanel({ task, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Escape closes the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function saveTitle() {
    const next = title.trim()
    if (!next) {
      setTitle(task.title) // a task must have a title, so undo an empty edit
      return
    }
    if (next !== task.title) onUpdate(task, { title: next })
  }

  function saveDescription() {
    const next = description.trim() || null
    if (next !== task.description) onUpdate(task, { description: next })
  }

  async function handleDelete() {
    const ok = await onDelete(task)
    if (ok) onClose()
  }

  const due = task.due_date && task.status !== 'done' ? dueState(task.due_date) : null
  const created = new Date(task.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.title}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer__header">
          <span className={`status-pill status-pill--${task.status}`}>
            <span className="column__dot" aria-hidden="true" />
            {COLUMNS.find((c) => c.id === task.status)?.label}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close panel" title="Close (Esc)">
            ×
          </button>
        </header>

        <div className="drawer__body">
          <textarea
            className="drawer__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              // Enter finishes editing the title instead of adding a new line.
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            rows={1}
            maxLength={200}
            aria-label="Title"
          />

          <dl className="props">
            <dt>Status</dt>
            <dd>
              <select
                className="field field--inline"
                value={task.status}
                onChange={(e) => onUpdate(task, { status: e.target.value as TaskStatus })}
              >
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </dd>

            <dt>Priority</dt>
            <dd>
              <select
                className="field field--inline"
                value={task.priority}
                onChange={(e) => onUpdate(task, { priority: e.target.value as TaskPriority })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </dd>

            <dt>Due date</dt>
            <dd className="props__due">
              <input
                className="field field--inline"
                type="date"
                value={task.due_date ?? ''}
                onChange={(e) => onUpdate(task, { due_date: e.target.value || null })}
              />
              {task.due_date && due && due !== 'later' && (
                <span className={`badge badge--${due}`}>{dueLabel(task.due_date)}</span>
              )}
            </dd>

            <dt>Created</dt>
            <dd className="props__muted">{created}</dd>
          </dl>

          <section className="drawer__section">
            <h3 className="drawer__label">Description</h3>
            <textarea
              className="field drawer__desc"
              placeholder="Add more detail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              rows={5}
            />
          </section>
        </div>

        <footer className="drawer__footer">
          {confirmingDelete ? (
            <div className="confirm">
              <span>Delete this task? This can't be undone.</span>
              <button className="btn btn--ghost" onClick={() => setConfirmingDelete(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
            </div>
          ) : (
            <button className="btn btn--ghost btn--danger-text" onClick={() => setConfirmingDelete(true)}>
              Delete task
            </button>
          )}
        </footer>
      </aside>
    </div>
  )
}
