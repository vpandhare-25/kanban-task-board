import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { BoardLookups, Label, Task, TaskStatus, TeamMember } from '../types'
import { COLUMNS } from '../types'
import { useTasks } from '../hooks/useTasks'
import { Column } from './Column'
import { TaskCardView } from './TaskCard'
import { NewTaskModal } from './NewTaskModal'
import { StatusScreen } from './StatusScreen'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TeamDialog } from './TeamDialog'
import { AvatarStack } from './Avatar'
import { useLabels, useTeam } from '../hooks/useNamedList'
import { LabelsDialog } from './LabelsDialog'

export function Board({ userId }: { userId: string }) {
  const {
    tasks,
    loading,
    loadError,
    actionError,
    clearActionError,
    reload,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    setLinks,
    forgetLink,
    setActionError,
  } = useTasks(userId)
  // Team errors show in the same toast as task errors.
  const { members, addMember, removeMember } = useTeam(userId, setActionError)
  const { labels, addLabel, removeLabel } = useLabels(userId, setActionError)
  const [teamOpen, setTeamOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)

  // Quick id -> object lookups for drawing avatars and label pills on cards.
  const lookups: BoardLookups = useMemo(
    () => ({
      membersById: new Map(members.map((m) => [m.id, m])),
      labelsById: new Map(labels.map((l) => [l.id, l])),
    }),
    [members, labels],
  )

  // When a member/label is deleted, the database drops its links; mirror that on screen.
  async function handleRemoveMember(member: TeamMember) {
    const ok = await removeMember(member)
    if (ok) forgetLink('assignee_ids', member.id)
    return ok
  }
  async function handleRemoveLabel(label: Label) {
    const ok = await removeLabel(label)
    if (ok) forgetLink('label_ids', label.id)
    return ok
  }

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [modalStatus, setModalStatus] = useState<TaskStatus | null>(null)
  // We store only the id and look the task up each render, so the panel
  // always shows the latest values (e.g. after a drag or a failed save).
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null
  const closePanel = useCallback(() => setOpenTaskId(null), [])

  // Sensors decide how a drag starts:
  // - mouse: after moving 5px (so a plain click doesn't start a drag)
  // - touch: after a short press (so swiping still scrolls the page on phones)
  // - keyboard: Space to pick up, arrow keys to move, Space to drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  // Group tasks by column once per change instead of filtering in every column.
  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    for (const t of tasks) groups[t.status].push(t)
    return groups
  }, [tasks])

  // Hide the error toast automatically after a few seconds.
  useEffect(() => {
    if (!actionError) return
    const id = setTimeout(clearActionError, 5000)
    return () => clearTimeout(id)
  }, [actionError, clearActionError])

  function handleDragStart(e: DragStartEvent) {
    setActiveTask((e.active.data.current?.task as Task) ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const task = e.active.data.current?.task as Task | undefined
    const target = e.over?.id as TaskStatus | undefined
    if (task && target) moveTask(task, target)
  }

  const doneCount = byStatus.done.length

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="logo" aria-hidden="true">▦</span>
          <div>
            <h1 className="topbar__title">My Board</h1>
            {!loading && !loadError && (
              <p className="topbar__subtitle">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · {doneCount} done
              </p>
            )}
          </div>
        </div>
        <div className="topbar__actions">
          <button className="team-btn" onClick={() => setTeamOpen(true)} title="Manage team">
            {members.length > 0 ? (
              <AvatarStack members={members} max={4} size={26} label={`Team: ${members.map((m) => m.name).join(', ')}`} />
            ) : (
              <span className="team-btn__icon" aria-hidden="true">+</span>
            )}
            <span className="team-btn__label">Team</span>
          </button>
          <button className="btn btn--primary" onClick={() => setModalStatus('todo')}>
            <span aria-hidden="true">+</span> New task
          </button>
        </div>
      </header>

      {loading ? (
        <BoardSkeleton />
      ) : loadError ? (
        <StatusScreen
          tone="error"
          title="Couldn't load your board"
          message={loadError}
          action={{ label: 'Try again', onClick: reload }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTask(null)}
        >
          <main className="board">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                label={col.label}
                tasks={byStatus[col.id]}
                onAdd={setModalStatus}
                onOpen={(t) => setOpenTaskId(t.id)}
                lookups={lookups}
              />
            ))}
          </main>
          {/* The floating card that follows the pointer while dragging. */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {activeTask ? <TaskCardView task={activeTask} lookups={lookups} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {modalStatus && (
        <NewTaskModal
          initialStatus={modalStatus}
          onClose={() => setModalStatus(null)}
          onCreate={createTask}
        />
      )}

      {openTask && (
        <TaskDetailPanel
          key={openTask.id}
          task={openTask}
          onClose={closePanel}
          onUpdate={updateTask}
          onDelete={deleteTask}
          members={members}
          labels={labels}
          onSetLinks={setLinks}
          onManageTeam={() => setTeamOpen(true)}
          onManageLabels={() => setLabelsOpen(true)}
        />
      )}

      {labelsOpen && (
        <LabelsDialog
          labels={labels}
          tasks={tasks}
          onAdd={addLabel}
          onRemove={handleRemoveLabel}
          onClose={() => setLabelsOpen(false)}
        />
      )}

      {teamOpen && (
        <TeamDialog
          members={members}
          tasks={tasks}
          onAdd={addMember}
          onRemove={handleRemoveMember}
          onClose={() => setTeamOpen(false)}
        />
      )}

      {actionError && (
        <div className="toast" role="alert">
          <span>{actionError}</span>
          <button className="icon-btn" onClick={clearActionError} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  )
}

/** Grey placeholder columns shown while tasks load. */
function BoardSkeleton() {
  return (
    <main className="board" aria-busy="true" aria-label="Loading tasks">
      {COLUMNS.map((col, i) => (
        <section key={col.id} className={`column column--${col.id}`}>
          <header className="column__header">
            <span className="column__dot" aria-hidden="true" />
            <h2 className="column__title">{col.label}</h2>
          </header>
          <div className="column__body">
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <div key={j} className="skeleton-card" />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
