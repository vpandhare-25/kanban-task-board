import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Label, NewTask, TaskPriority, TaskStatus, TeamMember } from '../types'
import { COLUMNS, PRIORITY_LABEL } from '../types'
import { Menu } from './Menu'
import { Avatar, AvatarStack } from './Avatar'
import { CloseIcon, PriorityIcon, StatusIcon, TagIcon, UserIcon } from './icons'

export interface NewTaskInput extends NewTask {
  assignee_ids: string[]
  label_ids: string[]
}

interface Props {
  initialStatus: TaskStatus
  members: TeamMember[]
  labels: Label[]
  onClose: () => void
  onCreate: (task: NewTaskInput) => Promise<boolean>
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

/**
 * "New task" composer in the style of Linear: big title, description,
 * then a row of property buttons. ⌘/Ctrl + Enter creates the task.
 */
export function NewTaskModal({ initialStatus, members, labels, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    const ok = await onCreate({
      title,
      description,
      status,
      priority,
      due_date: dueDate || undefined,
      assignee_ids: assigneeIds,
      label_ids: labelIds,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const selectedMembers = members.filter((m) => assigneeIds.includes(m.id))
  const statusLabel = COLUMNS.find((c) => c.id === status)?.label

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal modal--compose"
        role="dialog"
        aria-modal="true"
        aria-label="New task"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
      >
        <div className="compose__head">
          <span className="modal__crumb">New task</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="compose__body">
          <input
            ref={titleRef}
            className="compose__title"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            aria-label="Task title"
          />
          <textarea
            className="compose__desc"
            placeholder="Add a description…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Description"
          />
        </div>

        <div className="compose__props">
          <Menu
            ariaLabel="Status"
            triggerClassName="chip-trigger"
            trigger={<><StatusIcon status={status} size={13} />{statusLabel}</>}
            options={COLUMNS.map((c) => ({ id: c.id, label: c.label, icon: <StatusIcon status={c.id} /> }))}
            selected={[status]}
            onSelect={(id) => setStatus(id as TaskStatus)}
          />
          <Menu
            ariaLabel="Priority"
            triggerClassName={`chip-trigger${priority === 'normal' ? ' chip-trigger--muted' : ''}`}
            trigger={<><PriorityIcon priority={priority} size={13} />{PRIORITY_LABEL[priority]}</>}
            options={(['high', 'normal', 'low'] as TaskPriority[]).map((p) => ({
              id: p,
              label: PRIORITY_LABEL[p],
              icon: <PriorityIcon priority={p} />,
            }))}
            selected={[priority]}
            onSelect={(id) => setPriority(id as TaskPriority)}
          />
          <Menu
            ariaLabel="Assignees"
            triggerClassName={`chip-trigger${assigneeIds.length ? '' : ' chip-trigger--muted'}`}
            trigger={
              selectedMembers.length ? (
                <><AvatarStack members={selectedMembers} size={16} />{selectedMembers.length === 1 ? selectedMembers[0].name : `${selectedMembers.length} people`}</>
              ) : (
                <><UserIcon size={13} />Assignee</>
              )
            }
            options={members.map((m) => ({ id: m.id, label: m.name, icon: <Avatar member={m} size={18} /> }))}
            selected={assigneeIds}
            multiple
            onSelect={(id) => setAssigneeIds((ids) => toggle(ids, id))}
            emptyText="No team members yet. Add them from the Team button."
          />
          <Menu
            ariaLabel="Labels"
            triggerClassName={`chip-trigger${labelIds.length ? '' : ' chip-trigger--muted'}`}
            trigger={<><TagIcon size={13} />{labelIds.length ? `${labelIds.length} label${labelIds.length > 1 ? 's' : ''}` : 'Labels'}</>}
            options={labels.map((l) => ({ id: l.id, label: l.name, icon: <span className="tag__dot" style={{ background: l.color }} /> }))}
            selected={labelIds}
            multiple
            onSelect={(id) => setLabelIds((ids) => toggle(ids, id))}
            emptyText="No labels yet. Create them from a task."
          />
          <input
            className={`chip-date${dueDate ? '' : ' chip-date--empty'}`}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
          />
        </div>

        <div className="compose__footer">
          <span className="compose__hint">
            <kbd className="kbd">⌘</kbd> <kbd className="kbd">↵</kbd> to create
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={!title.trim() || saving}>
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </div>
  )
}
