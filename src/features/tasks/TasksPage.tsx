import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ListChecks, Bot, Wrench, Hourglass, MessageSquareWarning, ClipboardCheck } from 'lucide-react'
import { useTasks, useSetTaskStatus } from '@/features/tasks/useTasks'
import { useProjects } from '@/features/projects/useProjects'
import TaskForm from '@/features/tasks/TaskForm'
import EmptyState from '@/components/EmptyState'
import { ITEM_STATUSES, humanise } from '@/lib/types'
import type { Task, ItemStatus } from '@/lib/types'
import { taskOverdue, taskWaiting, taskAiReady, taskManual, taskAvoided, taskNeedsSteveInput, taskSteveReview } from '@/features/tasks/taskLogic'

type Filter = 'all' | 'overdue' | 'ai' | 'input' | 'review' | 'manual' | 'waiting' | 'avoided'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'ai', label: 'Ready for AI' },
  { key: 'input', label: 'Steve input' },
  { key: 'review', label: 'Steve review' },
  { key: 'manual', label: 'Manual' },
  { key: 'waiting', label: 'Waiting on' },
  { key: 'avoided', label: 'Avoiding' },
]

function Row({ task, projectName, onEdit }: { task: Task; projectName?: string; onEdit: () => void }) {
  const setStatus = useSetTaskStatus()
  const overdue = taskOverdue(task)
  const complete = task.status === 'complete'
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <select
        value={task.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setStatus.mutate({ id: task.id, status: e.target.value as ItemStatus })}
        className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none"
      >
        {ITEM_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
      </select>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={`text-sm ${complete ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          {projectName && task.project_id && (
            <Link
              to={`/projects/${task.project_id}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            >
              {projectName}
            </Link>
          )}
          {task.due_date && <span className={overdue ? 'ff-mono text-rose-600' : 'ff-mono'}>{task.due_date}</span>}
          {task.energy && <span>{humanise(task.energy)}</span>}
          {taskWaiting(task) && <span className="flex items-center gap-1 text-slate-500"><Hourglass className="h-3 w-3" /> {humanise(task.waiting_on_type!)}{task.waiting_on_person ? ` · ${task.waiting_on_person}` : ''}</span>}
          {taskAiReady(task) && <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600"><Bot className="h-3 w-3" /> Ready for AI</span>}
          {taskNeedsSteveInput(task) && <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700"><MessageSquareWarning className="h-3 w-3" /> Steve input needed</span>}
          {taskSteveReview(task) && <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700"><ClipboardCheck className="h-3 w-3" /> Steve review</span>}
          {task.requires_manual && <Wrench className="h-3.5 w-3.5 text-slate-400" />}
          {(task.avoidance_level ?? 0) >= 4 && <span className="text-amber-600">avoiding</span>}
        </div>
        {task.notes && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            {task.notes}
          </p>
        )}
      </button>
    </div>
  )
}

export default function TasksPage() {
  const { data: tasks, isLoading, isError, error } = useTasks()
  const { data: projects } = useProjects()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const projectName = useMemo(() => {
    const m = new Map<string, string>()
    ;(projects ?? []).forEach((p) => m.set(p.id, p.name))
    return m
  }, [projects])

  const filtered = useMemo(() => {
    const all = tasks ?? []
    switch (filter) {
      case 'overdue': return all.filter(taskOverdue)
      case 'ai': return all.filter(taskAiReady)
      case 'input': return all.filter(taskNeedsSteveInput)
      case 'review': return all.filter(taskSteveReview)
      case 'manual': return all.filter(taskManual)
      case 'waiting': return all.filter(taskWaiting)
      case 'avoided': return all.filter(taskAvoided)
      default: return all
    }
  }, [tasks, filter])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(t: Task) { setEditing(t); setFormOpen(true) }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${filter === f.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700">
          <Plus className="h-4 w-4" /> Add task
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading tasks…</p>}
      {isError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load tasks: {error instanceof Error ? error.message : 'unknown error'}</div>}

      {tasks && tasks.length === 0 && (
        <EmptyState icon={ListChecks} title="No tasks yet" note="Add tasks, mark the clear ones Ready for AI, and they'll feed your Control Deck queues." />
      )}

      {tasks && tasks.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {filtered.length === 0
            ? <p className="py-3 text-sm text-slate-400">Nothing in this filter.</p>
            : filtered.map((t) => <Row key={t.id} task={t} projectName={t.project_id ? projectName.get(t.project_id) : undefined} onEdit={() => openEdit(t)} />)}
        </div>
      )}

      {formOpen && <TaskForm task={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
