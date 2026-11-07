import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { BoardLookups, Label, Task, TaskStatus, TeamMember } from '../types'
import { COLUMNS } from '../types'
import { useTasks } from '../hooks/useTasks'
import { useLabels, useTeam } from '../hooks/useNamedList'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useTheme } from '../hooks/useTheme'
import type { Filters } from '../lib/filters'
import { EMPTY_FILTERS, isFiltering, matchesFilters } from '../lib/filters'
import { Column } from './Column'
import { TaskCardView } from './TaskCard'
import { NewTaskModal } from './NewTaskModal'
import type { NewTaskInput } from './NewTaskModal'
import { StatusScreen } from './StatusScreen'
import { TaskDetailPanel } from './TaskDetailPanel'
import { TeamDialog } from './TeamDialog'
import { LabelsDialog } from './LabelsDialog'
import { FilterBar } from './FilterBar'
import { BoardStats } from './BoardStats'
import { AvatarStack } from './Avatar'
import { BoardMark, CloseIcon, MoonIcon, PlusIcon, StatusIcon, SunIcon, UserIcon } from './icons'

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
    saveCount,
    adjustCommentCount,
  } = useTasks(userId)
  // Team and label errors show in the same toast as task errors.
  const { members, addMember, removeMember } = useTeam(userId, setActionError)
  const { labels, addLabel, removeLabel } = useLabels(userId, setActionError)
  const { theme, toggle: toggleTheme } = useTheme()
  const [teamOpen, setTeamOpen] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(false)

  // Phones show one column at a time with status tabs (see MobileTabs below).
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>('todo')

  // Quick id -> object lookups for drawing avatars and labels on cards.
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

  /** Create the task, then attach any assignees/labels picked in the composer. */
  async function handleCreate(input: NewTaskInput) {
    const task = await createTask(input)
    if (!task) return false
    if (input.assignee_ids.length) await setLinks(task, 'assignee_ids', input.assignee_ids)
    if (input.label_ids.length) await setLinks({ ...task, assignee_ids: input.assignee_ids }, 'label_ids', input.label_ids)
    if (isMobile) setMobileStatus(input.status) // show the tab the new task landed in
    return true
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

  // Search and filters. All tasks are already in memory, so filtering
  // happens instantly in the browser with no extra database requests.
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const filtering = isFiltering(filters)
  const visibleTasks = useMemo(
    () => (filtering ? tasks.filter((t) => matchesFilters(t, filters)) : tasks),
    [tasks, filters, filtering],
  )

  // Group tasks by column once per change instead of filtering in every column.
  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] }
    for (const t of visibleTasks) groups[t.status].push(t)
    return groups
  }, [visibleTasks])

  // Hide the error toast automatically after a few seconds.
  useEffect(() => {
    if (!actionError) return
    const id = setTimeout(clearActionError, 5000)
    return () => clearTimeout(id)
  }, [actionError, clearActionError])

  // Press "C" (outside a text field, with nothing open) to create a task, like Linear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      const somethingOpen = document.querySelector('.modal-backdrop, .drawer-backdrop, .menu__pop')
      if (e.key.toLowerCase() === 'c' && !typing && !somethingOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setModalStatus(isMobile ? mobileStatus : 'todo')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, mobileStatus])

  function handleDragStart(e: DragStartEvent) {
    setActiveTask((e.active.data.current?.task as Task) ?? null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const task = e.active.data.current?.task as Task | undefined
    if (!task || !e.over) return
    // Drop targets are columns ("todo") or, on phones, status tabs ("tab:todo").
    const target = String(e.over.id).replace('tab:', '') as TaskStatus
    moveTask(task, target)
  }

  const visibleColumns = isMobile ? COLUMNS.filter((c) => c.id === mobileStatus) : COLUMNS

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="board-mark" aria-hidden="true">
            <BoardMark size={15} />
          </span>
          <h1 className="header__title">Task Board</h1>
          <p className="header__desc">Plan, track and ship your work</p>
        </div>

        <div className="header__actions">
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="team-btn" onClick={() => setTeamOpen(true)} title="Manage team">
            {members.length > 0 ? (
              <AvatarStack members={members} max={3} size={22} label={`Team: ${members.map((m) => m.name).join(', ')}`} />
            ) : (
              <span className="team-btn__empty" aria-hidden="true">
                <UserIcon size={12} />
              </span>
            )}
            <span className="team-btn__label">Team</span>
          </button>
          <button className="btn btn--primary" onClick={() => setModalStatus(isMobile ? mobileStatus : 'todo')} title="New task (C)">
            <PlusIcon size={13} />
            New task
            <kbd className="kbd" aria-hidden="true">C</kbd>
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
          <FilterBar
            filters={filters}
            onChange={setFilters}
            members={members}
            labels={labels}
            shown={visibleTasks.length}
            total={tasks.length}
          >
            <BoardStats tasks={tasks} />
          </FilterBar>

          {isMobile && <MobileTabs active={mobileStatus} onChange={setMobileStatus} counts={byStatus} />}

          <main className="board">
            {visibleColumns.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                label={col.label}
                tasks={byStatus[col.id]}
                onAdd={setModalStatus}
                onOpen={(t) => setOpenTaskId(t.id)}
                lookups={lookups}
                filtering={filtering}
              />
            ))}
          </main>

          {/* The floating card that follows the pointer while dragging. */}
          <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {activeTask ? <TaskCardView task={activeTask} lookups={lookups} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {modalStatus && (
        <NewTaskModal
          initialStatus={modalStatus}
          members={members}
          labels={labels}
          onClose={() => setModalStatus(null)}
          onCreate={handleCreate}
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
          saveCount={saveCount}
          onCommentCountChange={adjustCommentCount}
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
          <button className="icon-btn icon-btn--sm" onClick={clearActionError} aria-label="Dismiss">
            <CloseIcon size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Phone layout: one tab per status instead of four squeezed columns.
 * Each tab is also a drop target, so a card can be dragged onto another status.
 */
function MobileTabs({
  active,
  onChange,
  counts,
}: {
  active: TaskStatus
  onChange: (s: TaskStatus) => void
  counts: Record<TaskStatus, Task[]>
}) {
  return (
    <div className="tabs" role="tablist" aria-label="Status">
      {COLUMNS.map((c) => (
        <MobileTab key={c.id} id={c.id} label={c.label} count={counts[c.id].length} active={active === c.id} onSelect={onChange} />
      ))}
    </div>
  )
}

function MobileTab({
  id,
  label,
  count,
  active,
  onSelect,
}: {
  id: TaskStatus
  label: string
  count: number
  active: boolean
  onSelect: (s: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tab:${id}` })
  return (
    <button
      ref={setNodeRef}
      role="tab"
      aria-selected={active}
      className={`tab${active ? ' tab--active' : ''}${isOver ? ' tab--over' : ''}`}
      onClick={() => onSelect(id)}
    >
      <StatusIcon status={id} size={13} />
      {label}
      <span className="tab__count">{count}</span>
    </button>
  )
}

/** Placeholder layout shown while tasks load: same shapes as the real board. */
function BoardSkeleton() {
  return (
    <>
      <div className="toolbar" aria-hidden="true" />
      <main className="board" aria-busy="true" aria-label="Loading tasks">
        {COLUMNS.map((col, i) => (
          <section key={col.id} className={`column column--${col.id}`}>
            <header className="column__header">
              <StatusIcon status={col.id} />
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
    </>
  )
}
