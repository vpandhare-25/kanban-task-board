import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { ActivityEntry, Comment, TaskStatus } from '../types'
import { COLUMNS, PRIORITY_LABEL } from '../types'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { fullDateTime, shortDate, timeAgo } from '../lib/dates'

interface Props {
  taskId: string
  refreshKey: number
  onCommentCountChange: (delta: number) => void
}

const statusLabel = (s: string | null) => COLUMNS.find((c) => c.id === (s as TaskStatus))?.label ?? s ?? ''
const priorityLabel = (p: string | null) => PRIORITY_LABEL[p as keyof typeof PRIORITY_LABEL] ?? p ?? ''

/** Turns one activity row into a readable sentence. */
function describe(a: ActivityEntry) {
  switch (a.action) {
    case 'created':
      return <>created this task</>
    case 'assigned':
      return <>assigned <strong>{a.new_value}</strong></>
    case 'unassigned':
      return <>unassigned <strong>{a.new_value}</strong></>
    case 'labeled':
      return <>added label <strong>{a.new_value}</strong></>
    case 'unlabeled':
      return <>removed label <strong>{a.new_value}</strong></>
    case 'updated':
      switch (a.field) {
        case 'status':
          return <>moved from <strong>{statusLabel(a.old_value)}</strong> → <strong>{statusLabel(a.new_value)}</strong></>
        case 'title':
          return <>renamed to <strong>“{a.new_value}”</strong></>
        case 'priority':
          return <>changed priority from <strong>{priorityLabel(a.old_value)}</strong> to <strong>{priorityLabel(a.new_value)}</strong></>
        case 'due_date':
          if (!a.new_value) return <>removed the due date</>
          return <>{a.old_value ? 'changed' : 'set'} the due date to <strong>{shortDate(a.new_value)}</strong></>
        case 'description':
          return <>edited the description</>
      }
  }
  return <>updated this task</>
}

/** Comments and history for one task, merged into a single timeline. */
export function TaskFeed({ taskId, refreshKey, onCommentCountChange }: Props) {
  const { feed, loading, error, addComment, deleteComment } = useTaskFeed(taskId, refreshKey)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!draft.trim() || posting) return
    setPosting(true)
    const ok = await addComment(draft)
    setPosting(false)
    if (ok) {
      setDraft('')
      onCommentCountChange(1)
    }
  }

  async function remove(c: Comment) {
    if (await deleteComment(c)) onCommentCountChange(-1)
  }

  // Cmd/Ctrl + Enter sends, plain Enter adds a new line.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
  }

  return (
    <section className="drawer__section">
      <h3 className="drawer__label">Activity</h3>

      {loading ? (
        <div className="feed-skeleton" aria-busy="true" aria-label="Loading activity">
          <span /><span /><span />
        </div>
      ) : (
        <ol className="feed">
          {feed.map((item) =>
            item.kind === 'activity' ? (
              <li key={item.id} className="feed__event">
                <span className="feed__dot" aria-hidden="true" />
                <span className="feed__text">
                  You {describe(item.entry)}
                  <time className="feed__time" dateTime={item.created_at} title={fullDateTime(item.created_at)}>
                    {' · '}{timeAgo(item.created_at)}
                  </time>
                </span>
              </li>
            ) : (
              <li key={item.id} className="feed__comment">
                <div className="comment">
                  <div className="comment__head">
                    <span className="comment__author">You</span>
                    <time className="feed__time" dateTime={item.created_at} title={fullDateTime(item.created_at)}>
                      {timeAgo(item.created_at)}
                    </time>
                    <button
                      className="icon-btn comment__delete"
                      onClick={() => remove(item.comment)}
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      ×
                    </button>
                  </div>
                  <p className="comment__body">{item.comment.body}</p>
                </div>
              </li>
            ),
          )}
        </ol>
      )}

      {error && <p className="feed__error" role="alert">{error}</p>}

      <form className="composer" onSubmit={submit}>
        <textarea
          className="field composer__input"
          placeholder="Write a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={2000}
          aria-label="Write a comment"
        />
        <div className="composer__row">
          <span className="composer__hint">⌘/Ctrl + Enter to send</span>
          <button type="submit" className="btn btn--primary btn--sm" disabled={!draft.trim() || posting}>
            {posting ? 'Posting…' : 'Comment'}
          </button>
        </div>
      </form>
    </section>
  )
}
