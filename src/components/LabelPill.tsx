import type { Label } from '../types'

/** A label shown as a small outlined tag with a colored dot. */
export function LabelPill({ label }: { label: Label }) {
  return (
    <span className="tag">
      <span className="tag__dot" style={{ background: label.color }} aria-hidden="true" />
      {label.name}
    </span>
  )
}
