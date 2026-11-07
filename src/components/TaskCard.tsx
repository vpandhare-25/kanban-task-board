import { useDraggable } from '@dnd-kit/core'
import type { BoardLookups, Label, Task, TeamMember } from '../types'
import { PRIORITY_LABEL } from '../types'
import { AvatarStack } from './Avatar'
import { LabelPill } from './LabelPill'
import { CalendarIcon, CommentIcon, PriorityIcon } from './icons'
import { dueLabel, dueState, shortDate } from '../lib/dates'

interface Props {
  task: Task
  lookups: BoardLookups
  /** True for the floating copy that follows the cursor while dragging. */
  overlay?: boolean
}

/**
 * The card itself (used on the board and as the drag preview).
 * Hierarchy: labels → title → description → one quiet row of metadata.
 * Priority and due date are small icons + text, not big colored badges.
 */
export function TaskCardView({ task, lookups, overlay }: Props) {
  // Turn ids into objects; ids whose member/label was just deleted are skipped.
  const assignees = task.assignee_ids
    .map((id) => lookups.membersById.get(id))
    .filter((m): m is TeamMember => Boolean(m))
  const labels = task.label_ids
    .map((id) => lookups.labelsById.get(id))
    .filter((l): l is Label => Boolean(l))

  const isDone = task.status === 'done'
  const due = task.due_date && !isDone ? dueState(task.due_date) : null
  const showPriority = task.priority !== 'normal' // "normal" is the default, so hide it to reduce noise
  const hasMeta = showPriority || task.due_date || task.comment_count > 0 || assignees.length > 0

  return (
    <article className={`card${overlay ? ' card--overlay' : ''}${isDone ? ' card--done' : ''}`}>
      {labels.length > 0 && (
        <div className="card__tags">
          {labels.map((l) => (
            <LabelPill key={l.id} label={l} />
          ))}
        </div>
      )}

      <h3 className="card__title">{task.title}</h3>
      {task.description && <p className="card__desc">{task.description}</p>}

      {hasMeta && (
        <div className="card__meta">
          {showPriority && (
            <span className="meta" title={`${PRIORITY_LABEL[task.priority]} priority`}>
              <PriorityIcon priority={task.priority} size={13} />
              <span className="sr-only">{PRIORITY_LABEL[task.priority]} priority</span>
            </span>
          )}
          {task.due_date && (
            <span
              className={`meta${due === 'overdue' ? ' meta--overdue' : due === 'today' || due === 'soon' ? ' meta--soon' : ''}`}
              title={`Due ${shortDate(task.due_date)}`}
            >
              <CalendarIcon size={12} />
              {due && due !== 'later' ? dueLabel(task.due_date) : shortDate(task.due_date)}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="meta" title={`${task.comment_count} comment${task.comment_count > 1 ? 's' : ''}`}>
              <CommentIcon size={12} />
              {task.comment_count}
            </span>
          )}
          {assignees.length > 0 && (
            <span className="card__avatars">
              <AvatarStack members={assignees} size={20} />
            </span>
          )}
        </div>
      )}
    </article>
  )
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
  // No transform here: the DragOverlay draws the moving copy, and this card
  // stays in place as a dashed placeholder showing where it came from.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card-slot${isDragging ? ' card-slot--dragging' : ''}`}
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
