import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Task, TeamMember } from '../types'
import { MEMBER_COLORS } from '../types'
import { Avatar } from './Avatar'

interface Props {
  members: TeamMember[]
  tasks: Task[]
  onAdd: (name: string, color: string) => Promise<boolean>
  onRemove: (member: TeamMember) => Promise<boolean>
  onClose: () => void
}

/** Dialog to add and remove team members. */
export function TeamDialog({ members, tasks, onAdd, onRemove, onClose }: Props) {
  const [name, setName] = useState('')
  // Pre-pick a color that isn't used yet, so new avatars look different.
  const [color, setColor] = useState(
    () => MEMBER_COLORS.find((c) => !members.some((m) => m.color === c)) ?? MEMBER_COLORS[0],
  )
  const [saving, setSaving] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    const ok = await onAdd(name, color)
    setSaving(false)
    if (ok) {
      setName('')
      const used = [...members.map((m) => m.color), color]
      setColor(MEMBER_COLORS.find((c) => !used.includes(c)) ?? MEMBER_COLORS[0])
      nameRef.current?.focus()
    }
  }

  // How many tasks each member is on, to warn before removing them.
  const taskCount = (memberId: string) => tasks.filter((t) => t.assignee_ids.includes(memberId)).length

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-heading"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__titlebar">
          <h2 id="team-heading" className="modal__heading">Team</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {members.length === 0 ? (
          <p className="team-empty">
            No team members yet. Add the people you work with, then assign them to tasks.
          </p>
        ) : (
          <ul className="team-list">
            {members.map((m) => {
              const count = taskCount(m.id)
              return (
                <li key={m.id} className="team-list__item">
                  <Avatar member={m} size={28} />
                  <span className="team-list__name">{m.name}</span>
                  {confirmId === m.id ? (
                    <span className="confirm confirm--inline">
                      <span>{count > 0 ? `Unassign from ${count} task${count > 1 ? 's' : ''}?` : 'Remove?'}</span>
                      <button className="btn btn--ghost btn--sm" onClick={() => setConfirmId(null)}>Cancel</button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={async () => {
                          await onRemove(m)
                          setConfirmId(null)
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <>
                      <span className="team-list__count">
                        {count} {count === 1 ? 'task' : 'tasks'}
                      </span>
                      <button
                        className="icon-btn"
                        onClick={() => setConfirmId(m.id)}
                        aria-label={`Remove ${m.name}`}
                        title="Remove"
                      >
                        ×
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <form className="team-add" onSubmit={handleAdd}>
          <input
            ref={nameRef}
            className="field"
            placeholder="Name, e.g. Maya Chen"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            aria-label="New member name"
          />
          <div className="swatches" role="radiogroup" aria-label="Avatar color">
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                aria-label={`Color ${c}`}
                className={`swatch${c === color ? ' swatch--selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <button type="submit" className="btn btn--primary" disabled={!name.trim() || saving}>
            {saving ? 'Adding…' : 'Add member'}
          </button>
        </form>
      </div>
    </div>
  )
}
