import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { NewTask, TaskPriority, TaskStatus } from '../types'
import { COLUMNS } from '../types'

interface Props {
  initialStatus: TaskStatus
  onClose: () => void
  onCreate: (task: NewTask) => Promise<boolean>
}

export function NewTaskModal({ initialStatus, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Focus the title field and allow closing with Escape.
  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    const ok = await onCreate({
      title,
      description,
      priority,
      due_date: dueDate || undefined,
      status,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-heading"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="new-task-heading" className="modal__heading">New task</h2>

        <input
          ref={titleRef}
          className="field field--title"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
        <textarea
          className="field field--desc"
          placeholder="Add a description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div className="modal__row">
          <label className="select-label">
            <span>Status</span>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="select-label">
            <span>Priority</span>
            <select className="field" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="select-label">
            <span>Due date</span>
            <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={!title.trim() || saving}>
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </footer>
      </form>
    </div>
  )
}
