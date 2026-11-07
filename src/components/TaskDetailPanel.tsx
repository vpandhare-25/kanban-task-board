import { useEffect, useRef, useState } from 'react'
import type { Label, Task, TaskPriority, TaskStatus, TeamMember } from '../types'
import { COLUMNS, PRIORITY_LABEL } from '../types'
import type { LinkField, TaskPatch } from '../hooks/useTasks'
import { Avatar, AvatarStack } from './Avatar'
import { LabelPill } from './LabelPill'
import { Menu } from './Menu'
import { TaskFeed } from './TaskFeed'
import { CloseIcon, PriorityIcon, StatusIcon, TagIcon, TrashIcon, UserIcon } from './icons'
import { dueLabel, dueState, fullDateTime } from '../lib/dates'

interface Props {
  task: Task
  onClose: () => void
  onUpdate: (task: Task, patch: TaskPatch) => Promise<boolean>
  onDelete: (task: Task) => Promise<boolean>
  members: TeamMember[]
  labels: Label[]
  onSetLinks: (task: Task, field: LinkField, ids: string[]) => void
  onManageTeam: () => void
  onManageLabels: () => void
  /** Changes after every save, so the activity feed knows to reload. */
  saveCount: number
  onCommentCountChange: (taskId: string, delta: number) => void
}

/**
 * Slide-in panel for one task. Every field saves on its own (no "Save" button),
 * like Linear or Notion: menus save on pick, text saves when you leave the field.
 * The parent renders it with key={task.id}, so local text state resets per task.
 */
export function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
  onDelete,
  members,
  labels,
  onSetLinks,
  onManageTeam,
  onManageLabels,
  saveCount,
  onCommentCountChange,
}: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  // Keyboard users: move focus into the panel when it opens, and give it back
  // to whatever was focused before (usually the card) when it closes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => previous?.focus?.()
  }, [])

  // Escape closes the panel, unless a dialog (Team/Labels) is open on top of it.
  // (Open dropdown menus stop their own Escape, so it never reaches here.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.modal-backdrop')) onClose()
    }
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

  /** Picking a member or label in a menu adds it to / removes it from the task. */
  function toggle(field: LinkField, id: string) {
    const current = task[field]
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    onSetLinks(task, field, next)
  }

  async function handleDelete() {
    const ok = await onDelete(task)
    if (ok) onClose()
  }

  const status = COLUMNS.find((c) => c.id === task.status)!
  const due = task.due_date && task.status !== 'done' ? dueState(task.due_date) : null
  const assigned = members.filter((m) => task.assignee_ids.includes(m.id))
  const attached = labels.filter((l) => task.label_ids.includes(l.id))

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.title}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer__header">
          <span className="drawer__crumb">
            <StatusIcon status={task.status} size={13} />
            {status.label}
          </span>
          <div className="drawer__actions">
            <button
              className="icon-btn"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete task"
              title="Delete task"
            >
              <TrashIcon />
            </button>
            <button className="icon-btn" onClick={onClose} aria-label="Close panel" title="Close (Esc)">
              <CloseIcon />
            </button>
          </div>
        </header>

        {confirmingDelete && (
          <div className="confirm-bar" role="alert">
            <span>Delete this task? This can't be undone.</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirmingDelete(false)}>Cancel</button>
            <button className="btn btn--danger btn--sm" onClick={handleDelete}>Delete</button>
          </div>
        )}

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
              <Menu
                ariaLabel="Status"
                triggerClassName="prop-trigger"
                trigger={<><StatusIcon status={task.status} />{status.label}</>}
                options={COLUMNS.map((c) => ({ id: c.id, label: c.label, icon: <StatusIcon status={c.id} /> }))}
                selected={[task.status]}
                onSelect={(id) => onUpdate(task, { status: id as TaskStatus })}
              />
            </dd>

            <dt>Priority</dt>
            <dd>
              <Menu
                ariaLabel="Priority"
                triggerClassName="prop-trigger"
                trigger={<><PriorityIcon priority={task.priority} />{PRIORITY_LABEL[task.priority]}</>}
                options={(['high', 'normal', 'low'] as TaskPriority[]).map((p) => ({
                  id: p,
                  label: PRIORITY_LABEL[p],
                  icon: <PriorityIcon priority={p} />,
                }))}
                selected={[task.priority]}
                onSelect={(id) => onUpdate(task, { priority: id as TaskPriority })}
              />
            </dd>

            <dt>Assignees</dt>
            <dd>
              <Menu
                ariaLabel="Assignees"
                triggerClassName={`prop-trigger${assigned.length ? '' : ' prop-trigger--muted'}`}
                trigger={
                  assigned.length ? (
                    <>
                      <AvatarStack members={assigned} size={18} />
                      {assigned.length === 1 ? assigned[0].name : `${assigned.length} people`}
                    </>
                  ) : (
                    <><UserIcon />Unassigned</>
                  )
                }
                options={members.map((m) => ({ id: m.id, label: m.name, icon: <Avatar member={m} size={18} /> }))}
                selected={task.assignee_ids}
                multiple
                onSelect={(id) => toggle('assignee_ids', id)}
                emptyText="No team members yet."
                footer={{ label: 'Manage team…', onClick: onManageTeam }}
              />
            </dd>

            <dt>Labels</dt>
            <dd>
              {attached.map((l) => (
                <LabelPill key={l.id} label={l} />
              ))}
              <Menu
                ariaLabel="Labels"
                triggerClassName="prop-trigger prop-trigger--muted"
                trigger={attached.length ? <>Edit</> : <><TagIcon />Add label</>}
                options={labels.map((l) => ({
                  id: l.id,
                  label: l.name,
                  icon: <span className="tag__dot" style={{ background: l.color }} />,
                }))}
                selected={task.label_ids}
                multiple
                onSelect={(id) => toggle('label_ids', id)}
                emptyText="No labels yet."
                footer={{ label: labels.length ? 'Manage labels…' : 'Create labels…', onClick: onManageLabels }}
              />
            </dd>

            <dt>Due date</dt>
            <dd>
              <input
                className={`prop-date${task.due_date ? '' : ' prop-date--empty'}`}
                type="date"
                value={task.due_date ?? ''}
                onChange={(e) => onUpdate(task, { due_date: e.target.value || null })}
                aria-label="Due date"
              />
              {task.due_date && due && due !== 'later' && (
                <span className={`meta ${due === 'overdue' ? 'meta--overdue' : 'meta--soon'}`}>
                  {dueLabel(task.due_date)}
                </span>
              )}
            </dd>

            <dt>Created</dt>
            <dd>
              <span className="prop-muted">{fullDateTime(task.created_at)}</span>
            </dd>
          </dl>

          <section className="drawer__section">
            <h3 className="section-label">Description</h3>
            <textarea
              className="desc-input"
              placeholder="Add more detail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              aria-label="Description"
            />
          </section>

          <TaskFeed
            taskId={task.id}
            refreshKey={saveCount}
            onCommentCountChange={(delta) => onCommentCountChange(task.id, delta)}
          />
        </div>
      </aside>
    </div>
  )
}
