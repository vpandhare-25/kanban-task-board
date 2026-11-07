/**
 * Small hand-drawn icon set (no icon library needed).
 * All icons use currentColor, so they take the text color of their parent.
 */
import type { TaskPriority, TaskStatus } from '../types'

type IconProps = { size?: number; className?: string }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  'aria-hidden': true as const,
})

/**
 * Status icon in the style of Linear: an empty circle for To Do, a circle that
 * fills up as work progresses, and a check for Done. Colors come from CSS.
 */
export function StatusIcon({ status, size = 14 }: { status: TaskStatus; size?: number }) {
  // How much of the inner circle is filled for each status.
  const fill = { todo: 0, in_progress: 0.5, in_review: 0.75, done: 1 }[status]
  const r = 2.5
  const circumference = 2 * Math.PI * r
  return (
    <svg {...base(size)} className={`status-icon status-icon--${status}`}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      {status === 'done' ? (
        <>
          <circle cx="8" cy="8" r="6" fill="currentColor" />
          <path d="M5.4 8.2l1.8 1.8 3.4-3.6" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        fill > 0 && (
          // A thick stroke on a small circle, cut with a dash pattern, draws a "pie slice".
          <circle
            cx="8"
            cy="8"
            r={r}
            stroke="currentColor"
            strokeWidth={r * 2}
            strokeDasharray={`${circumference * fill} ${circumference}`}
            transform="rotate(-90 8 8)"
          />
        )
      )}
    </svg>
  )
}

/** Three bars; more filled bars = higher priority. */
export function PriorityIcon({ priority, size = 14 }: { priority: TaskPriority; size?: number }) {
  const filled = { low: 1, normal: 2, high: 3 }[priority]
  return (
    <svg {...base(size)} className={`priority-icon priority-icon--${priority}`}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2.5 + i * 4}
          y={10 - i * 3}
          width="2.5"
          height={3.5 + i * 3}
          rx="0.8"
          fill="currentColor"
          opacity={i < filled ? 1 : 0.25}
        />
      ))}
    </svg>
  )
}

export function PlusIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 12, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 6.5L8 10l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SearchIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CalendarIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function CommentIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7.5L4.5 14v-2.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function UserIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.75 13.5c.6-2.6 2.7-4 5.25-4s4.65 1.4 5.25 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function TagIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M2.5 3.5v3.6a1 1 0 0 0 .3.7l5.4 5.4a1 1 0 0 0 1.4 0l3.6-3.6a1 1 0 0 0 0-1.4L7.8 2.8a1 1 0 0 0-.7-.3H3.5a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function TrashIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M3 4.5h10M6.5 4.5V3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.5M4.5 4.5l.6 8.1a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SunIcon({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MoonIcon({ size = 15, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        d="M13.2 9.6A5.5 5.5 0 0 1 6.4 2.8a5.5 5.5 0 1 0 6.8 6.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The board's logo mark: three columns of different heights, like a Kanban board. */
export function BoardMark({ size = 16 }: { size?: number }) {
  return (
    <svg {...base(size)}>
      <rect x="2.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="6.5" y="2.5" width="3" height="7.5" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="10.5" y="2.5" width="3" height="9" rx="1" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

export function AlertIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.8v3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  )
}
