import type { Label } from '../types'

/**
 * Small colored tag. The label color is used for the dot and a light tint
 * behind the text, so any color stays readable in light and dark mode.
 */
export function LabelPill({ label }: { label: Label }) {
  return (
    <span className="label-pill" style={{ ['--label' as string]: label.color }}>
      <span className="label-pill__dot" aria-hidden="true" />
      {label.name}
    </span>
  )
}
