import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { BoardLookups, Label, Task, TeamMember } from '../types'
import { AvatarStack } from './Avatar'
import { LabelPill } from './LabelPill'
import { PRIORITY_LABEL } from '../types'
import { dueLabel, dueState } from '../lib/dates'

interface Props {
  task: Task
  lookups: BoardLookups
  /** True for the floating copy that follows the cursor while dragging. */
  overlay?: boolean
}

/** Visual card only: used both on the board and as the drag overlay. */
export function TaskCardView({ task, lookups, overlay }: Props) {
  // Turn ids into objects; ids whose member/label was just deleted are skipped.
  const assignees = task.assignee_ids
    .map((id) => lookups.membersById.get(id))
    .filter((m): m is TeamMember => Boolean(m))
  const labels = task.label_ids
    .map((id) => lookups.labelsById.get(id))
    .filter((l): l is Label => Boolean(l))
  const due = task.due_date && task.status !== 'done' ? dueState(task.due_date) : null

  return (
    <article className={`card${overlay ? ' card--overlay' : ''}`}>
      {labels.length > 0 && (
        <div className="card__labels">
          {labels.map((l) => (
            <LabelPill key={l.id} label={l} />
          ))}
        </div>
      )}
      <h3 className="card__title">{task.title}</h3>
      {task.description && <p className="card__desc">{task.description}</p>}

      {(task.priority !== 'normal' || task.due_date || assignees.length > 0) && (
        <div className="card__meta">
          {task.priority !== 'normal' && (
            <span className={`badge badge--${task.priority}`}>
              <PriorityIcon level={task.priority} />
              {PRIORITY_LABEL[task.priority]}
            </span>
          )}
          {task.due_date && (
            <span className={`badge badge--due${due ? ` badge--${due}` : ''}`}>
              <CalendarIcon />
              {task.status === 'done' ? dueLabelPlain(task.due_date) : dueLabel(task.due_date)}
            </span>
          )}
          {assignees.length > 0 && (
            <span className="card__assignees">
              <AvatarStack members={assignees} />
            </span>
          )}
        </div>
      )}
    </article>
  )
}

// Completed tasks just show the date, without "overdue" warnings.
function dueLabelPlain(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Draggable wrapper around the card.
 * A click opens the detail panel; a drag only starts after the pointer moves 5px,
 * so clicking and dragging don't get in each other's way.
 * Keyboard: Enter opens the task, Space picks it up to move it.
 */
export function TaskCard({
  task,
  onOpen,
  lookups,
}: {
  task: Task
  onOpen: (task: Task) => void
  lookups: BoardLookups
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card-slot${isDragging ? ' card-slot--dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      aria-label={`Task: ${task.title}. Press Enter to open, Space to move.`}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task)
        else listeners?.onKeyDown?.(e)
      }}
    >
      <TaskCardView task={task} lookups={lookups} />
    </div>
  )
}

function PriorityIcon({ level }: { level: Task['priority'] }) {
  // Three bars, filled according to priority (like Linear's priority icon).
  const filled = level === 'high' ? 3 : level === 'normal' ? 2 : 1
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * 4}
          y={8 - i * 3}
          width="2.5"
          height={3 + i * 3}
          rx="1"
          fill="currentColor"
          opacity={i < filled ? 1 : 0.3}
        />
      ))}
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
