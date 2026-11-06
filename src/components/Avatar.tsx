import type { TeamMember } from '../types'

/** "Ada Lovelace" -> "AL", "ada" -> "AD" */
function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return letters.toUpperCase()
}

export function Avatar({ member, size = 22 }: { member: TeamMember; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ background: member.color, width: size, height: size, fontSize: size * 0.42 }}
      title={member.name}
      aria-label={member.name}
    >
      {initials(member.name)}
    </span>
  )
}

/** Overlapping avatars, e.g. on a card. Shows "+2" when there are more than `max`. */
export function AvatarStack({
  members,
  max = 3,
  size = 22,
  label,
}: {
  members: TeamMember[]
  max?: number
  size?: number
  /** Screen-reader text; defaults to "Assigned to ...". */
  label?: string
}) {
  if (members.length === 0) return null
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <span className="avatar-stack" aria-label={label ?? `Assigned to ${members.map((m) => m.name).join(', ')}`}>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar avatar--more" style={{ width: size, height: size, fontSize: size * 0.42 }}>
          +{extra}
        </span>
      )}
    </span>
  )
}
