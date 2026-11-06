import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Label, Task } from '../types'
import { MEMBER_COLORS, STARTER_LABELS } from '../types'
import { LabelPill } from './LabelPill'

interface Props {
  labels: Label[]
  tasks: Task[]
  onAdd: (name: string, color: string) => Promise<boolean>
  onRemove: (label: Label) => Promise<boolean>
  onClose: () => void
}

/** Dialog to create and delete labels. Mirrors the Team dialog. */
export function LabelsDialog({ labels, tasks, onAdd, onRemove, onClose }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(
    () => MEMBER_COLORS.find((c) => !labels.some((l) => l.color === c)) ?? MEMBER_COLORS[0],
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

  const nameTaken = labels.some((l) => l.name.toLowerCase() === name.trim().toLowerCase())

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || nameTaken || saving) return
    setSaving(true)
    const ok = await onAdd(name, color)
    setSaving(false)
    if (ok) {
      setName('')
      const used = [...labels.map((l) => l.color), color]
      setColor(MEMBER_COLORS.find((c) => !used.includes(c)) ?? MEMBER_COLORS[0])
      nameRef.current?.focus()
    }
  }

  async function addStarters() {
    setSaving(true)
    for (const s of STARTER_LABELS) await onAdd(s.name, s.color)
    setSaving(false)
    // Pre-pick a color the starters didn't use, and get ready for a custom label.
    const used = STARTER_LABELS.map((s) => s.color)
    setColor(MEMBER_COLORS.find((c) => !used.includes(c)) ?? MEMBER_COLORS[0])
    nameRef.current?.focus()
  }

  const taskCount = (labelId: string) => tasks.filter((t) => t.label_ids.includes(labelId)).length

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="labels-heading"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__titlebar">
          <h2 id="labels-heading" className="modal__heading">Labels</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {labels.length === 0 ? (
          <div className="team-empty">
            <p>Labels help you group work, like “Bug” or “Design”. Start with a few common ones?</p>
            <button className="btn btn--ghost btn--sm starter-btn" onClick={addStarters} disabled={saving}>
              Add {STARTER_LABELS.map((s) => s.name).join(', ')}
            </button>
          </div>
        ) : (
          <ul className="team-list">
            {labels.map((l) => {
              const count = taskCount(l.id)
              return (
                <li key={l.id} className="team-list__item">
                  <LabelPill label={l} />
                  <span className="team-list__name" />
                  {confirmId === l.id ? (
                    <span className="confirm confirm--inline">
                      <span>{count > 0 ? `Remove from ${count} task${count > 1 ? 's' : ''}?` : 'Delete?'}</span>
                      <button className="btn btn--ghost btn--sm" onClick={() => setConfirmId(null)}>Cancel</button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={async () => {
                          await onRemove(l)
                          setConfirmId(null)
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  ) : (
                    <>
                      <span className="team-list__count">
                        {count} {count === 1 ? 'task' : 'tasks'}
                      </span>
                      <button
                        className="icon-btn"
                        onClick={() => setConfirmId(l.id)}
                        aria-label={`Delete label ${l.name}`}
                        title="Delete"
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
            placeholder="New label, e.g. Backend"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            aria-label="New label name"
          />
          {nameTaken && <p className="field-hint">A label with this name already exists.</p>}
          <div className="swatches" role="radiogroup" aria-label="Label color">
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
          <button type="submit" className="btn btn--primary" disabled={!name.trim() || nameTaken || saving}>
            {saving ? 'Adding…' : 'Add label'}
          </button>
        </form>
      </div>
    </div>
  )
}
