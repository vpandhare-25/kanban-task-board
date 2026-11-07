import { useDroppable } from '@dnd-kit/core'
import type { BoardLookups, Task, TaskStatus } from '../types'
import { TaskCard } from './TaskCard'

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
  todo: 'Nothing planned yet. Add a task to get started.',
  in_progress: 'Drag a task here when you start working on it.',
  in_review: 'Tasks waiting for review will show up here.',
  done: 'Finished work lands here.',
}

export function Column({ id, label, tasks, onAdd, onOpen, lookups, filtering }: Props) {
  // Each column is a drop zone. Its id is the status a task gets when dropped here.
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <section className={`column column--${id}${isOver ? ' column--over' : ''}`}>
      <header className="column__header">
        <span className="column__dot" aria-hidden="true" />
        <h2 className="column__title">{label}</h2>
        <span className="column__count">{tasks.length}</span>
        <button
          className="icon-btn column__add"
          onClick={() => onAdd(id)}
          aria-label={`Add task to ${label}`}
          title={`Add task to ${label}`}
        >
          +
        </button>
      </header>

      <div ref={setNodeRef} className="column__body">
        {tasks.length === 0 ? (
          <div className="column__empty">{filtering ? 'No matching tasks' : EMPTY_TEXT[id]}</div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpen} lookups={lookups} />)
        )}
      </div>
    </section>
  )
}
