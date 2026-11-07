import type { Task } from '../types'
import { dueState } from '../lib/dates'

/** Counts for the summary strip. Done tasks are never "overdue". */
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

/** Small summary in the header: total, completed (with a progress bar), overdue, due soon. */
export function BoardStats({ tasks }: { tasks: Task[] }) {
  const { total, done, overdue, dueSoon, percent } = computeStats(tasks)

  return (
    <dl className="stats" aria-label="Board summary">
      <div className="stat">
        <dt>Total</dt>
        <dd>{total}</dd>
      </div>
      <div className="stat stat--progress">
        <dt>Completed</dt>
        <dd>
          {done}
          <span className="stat__sub">{percent}%</span>
          <span
            className="progress"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent}% of tasks completed`}
          >
            <span className="progress__fill" style={{ width: `${percent}%` }} />
          </span>
        </dd>
      </div>
      <div className={`stat${overdue > 0 ? ' stat--overdue' : ''}`}>
        <dt>Overdue</dt>
        <dd>{overdue}</dd>
      </div>
      <div className={`stat${dueSoon > 0 ? ' stat--soon' : ''}`}>
        <dt>Due soon</dt>
        <dd>{dueSoon}</dd>
      </div>
    </dl>
  )
}
