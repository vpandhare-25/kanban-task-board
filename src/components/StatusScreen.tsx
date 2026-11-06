import type { ReactNode } from 'react'

interface Props {
  tone: 'loading' | 'error' | 'info'
  title: string
  message?: ReactNode
  action?: { label: string; onClick: () => void }
}

/** Centered message used for loading, error and setup screens. */
export function StatusScreen({ tone, title, message, action }: Props) {
  return (
    <div className={`status status--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'loading' ? <div className="spinner" aria-hidden="true" /> : (
        <div className="status__icon" aria-hidden="true">{tone === 'error' ? '!' : 'i'}</div>
      )}
      <h2 className="status__title">{title}</h2>
      {message && <div className="status__message">{message}</div>}
      {action && (
        <button className="btn btn--primary" onClick={action.onClick}>{action.label}</button>
      )}
    </div>
  )
}
