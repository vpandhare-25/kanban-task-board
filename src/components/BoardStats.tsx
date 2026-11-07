import type { Task } from '../types'
import { dueState } from '../lib/dates'

/** Counts for the summary. Done tasks are never "overdue". */
function computeStats(tasks: Task[]) {
  let done = 0
  let overdue = 0
  let dueSoon = 0
  for (const t of tasks) {
    if (t.status === 'done') {
      done++
      continue
    }
    if (!t.due_date) continue
    const state = dueState(t.due_date)
    if (state === 'overdue') overdue++
    else if (state === 'today' || state === 'soon') dueSoon++
  }
  const total = tasks.length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return { total, done, overdue, dueSoon, percent }
}

/**
 * Quiet one-line summary on the right of the toolbar.
 * Overdue / due soon only get color when they are above zero.
 */
export function BoardStats({ tasks }: { tasks: Task[] }) {
  const { total, done, overdue, dueSoon, percent } = computeStats(tasks)

  return (
    <div className="stats" aria-label="Board summary">
      <span className="stats__item">
        <b>{total}</b> {total === 1 ? 'task' : 'tasks'}
      </span>
      <span className="stats__sep" aria-hidden="true" />
      <span className="stats__item" title={`${done} of ${total} completed`}>
        <span
          className="stats__bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% completed`}
        >
          <span className="stats__fill" style={{ width: `${percent}%` }} />
        </span>
        <b>{done}</b> done
      </span>
      <span className="stats__sep" aria-hidden="true" />
      <span className={`stats__item${overdue > 0 ? ' stats__item--danger' : ''}`}>
        <b>{overdue}</b> overdue
      </span>
      <span className="stats__sep stats__sep--soon" aria-hidden="true" />
      <span className={`stats__item stats__item--soon${dueSoon > 0 ? ' stats__item--warning' : ''}`}>
        <b>{dueSoon}</b> due soon
      </span>
    </div>
  )
}
