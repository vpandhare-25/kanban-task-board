import { useDroppable } from '@dnd-kit/core'
import type { BoardLookups, Task, TaskStatus } from '../types'
import { TaskCard } from './TaskCard'
import { PlusIcon, StatusIcon } from './icons'

interface Props {
  id: TaskStatus
  label: string
  tasks: Task[]
  onAdd: (status: TaskStatus) => void
  onOpen: (task: Task) => void
  lookups: BoardLookups
  /** True when search/filters are active, so empty columns say "no matches" instead. */
  filtering: boolean
}

const EMPTY_TEXT: Record<TaskStatus, string> = {
  todo: 'No tasks yet',
  in_progress: 'Nothing in progress',
  in_review: 'Nothing waiting for review',
  done: 'Nothing completed yet',
}

export function Column({ id, label, tasks, onAdd, onOpen, lookups, filtering }: Props) {
  // Each column is a drop zone. Its id is the status a task gets when dropped here.
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section className={`column column--${id}${isOver ? ' column--over' : ''}`} aria-label={label}>
      <header className="column__header">
        <StatusIcon status={id} />
        <h2 className="column__title">{label}</h2>
        <span className="column__count">{tasks.length}</span>
        <button
          className="icon-btn icon-btn--sm column__add"
          onClick={() => onAdd(id)}
          aria-label={`Add task to ${label}`}
          title={`Add task to ${label}`}
        >
          <PlusIcon size={13} />
        </button>
      </header>

      <div ref={setNodeRef} className="column__body">
        {tasks.length === 0 ? (
          <div className="column__empty">
            <span>{filtering ? 'No matching tasks' : EMPTY_TEXT[id]}</span>
            {!filtering && id === 'todo' && (
              <button className="btn btn--outline btn--sm" onClick={() => onAdd(id)}>
                <PlusIcon size={12} /> Add task
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpen} lookups={lookups} />)
        )}
      </div>
    </section>
  )
}
