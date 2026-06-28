import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, Bot, Wrench, CheckCircle2, Hourglass } from 'lucide-react'
import { useProject } from '@/features/projects/useProjects'
import { useChecklist, useCreateChecklistItem, useSetItemStatus, useDeleteChecklistItem } from '@/features/projects/useChecklist'
import { useTasks, useSetTaskStatus } from '@/features/tasks/useTasks'
import TaskForm from '@/features/tasks/TaskForm'
import ProjectForm from '@/features/projects/ProjectForm'
import { humanise, gbp, ITEM_STATUSES } from '@/lib/types'
import type { ChecklistItem, ItemStatus, Task } from '@/lib/types'

function Reading({ label, value }: { label: string; value: number | null | undefined }) {
  const muted = value === null || value === undefined
  const v = value ?? 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="ff-mono text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`ff-mono mb-1.5 mt-1 text-xl font-semibold ${muted ? 'text-slate-300' : 'text-slate-800'}`}>{muted ? '-' : `${v}%`}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-800" style={{ width: muted ? '0%' : `${v}%` }} />
      </div>
    </div>
  )
}

function Tag({ children }: { children: string }) {
  return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{children}</span>
}

function ChecklistRow({ item, projectId }: { item: ChecklistItem; projectId: string }) {
  const setStatus = useSetItemStatus(projectId)
  const del = useDeleteChecklistItem(projectId)
  const complete = item.status === 'complete'
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <select
        value={item.status}
        onChange={(e) => setStatus.mutate({ id: item.id, status: e.target.value as ItemStatus })}
        className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none"
      >
        {ITEM_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
      </select>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${complete ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {item.required_for_completion && <Tag>Required</Tag>}
          {item.gate_launch && <Tag>Launch</Tag>}
          {item.gate_delivery && <Tag>Delivery</Tag>}
          <span className="ff-mono text-[10px] text-slate-400">x{item.weight}</span>
          {item.can_be_done_by_ai && <Bot className="h-3.5 w-3.5 text-indigo-400" />}
          {item.requires_manual && <Wrench className="h-3.5 w-3.5 text-slate-400" />}
        </div>
      </div>
      <button
        onClick={() => { if (window.confirm('Delete this checklist gate?')) del.mutate(item.id) }}
        className="shrink-0 text-slate-300 hover:text-rose-600"
        aria-label="Delete checklist gate"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function ProjectTaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const setStatus = useSetTaskStatus()
  const complete = task.status === 'complete'
  const waiting = !!task.waiting_on_type
  const overdue = !!task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !complete

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <select
        value={task.status}
        onChange={(e) => setStatus.mutate({ id: task.id, status: e.target.value as ItemStatus })}
        className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none"
      >
        {ITEM_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
      </select>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className={`text-sm ${complete ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          {task.due_date && <span className={overdue ? 'ff-mono text-rose-600' : 'ff-mono'}>{task.due_date}</span>}
          {task.energy && <span>{humanise(task.energy)}</span>}
          {waiting && <span className="flex items-center gap-1 text-slate-500"><Hourglass className="h-3 w-3" /> {humanise(task.waiting_on_type!)}{task.waiting_on_person ? ` - ${task.waiting_on_person}` : ''}</span>}
          {task.can_be_done_by_ai && <Bot className="h-3.5 w-3.5 text-indigo-400" />}
          {task.requires_manual && <Wrench className="h-3.5 w-3.5 text-slate-400" />}
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

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

function AddChecklistGate({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const create = useCreateChecklistItem(projectId)
  const [title, setTitle] = useState('')
  const [weight, setWeight] = useState('1')
  const [due, setDue] = useState('')
  const [reqd, setReqd] = useState(true)
  const [launch, setLaunch] = useState(false)
  const [delivery, setDelivery] = useState(false)
  const [ai, setAi] = useState(false)
  const [manual, setManual] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: null,
        required_for_completion: reqd,
        gate_launch: launch,
        gate_delivery: delivery,
        weight: Number(weight),
        can_be_done_by_ai: ai,
        requires_manual: manual,
        due_date: due || null,
      })
      onClose()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not add checklist gate')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls} htmlFor="ci-title">Checklist gate</label>
          <input id="ci-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Final client approval received" />
        </div>
        <div className="w-20">
          <label className={labelCls} htmlFor="ci-weight">Weight</label>
          <select id="ci-weight" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls}>
            {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className={labelCls} htmlFor="ci-due">Due <span className="text-slate-300">(optional)</span></label>
          <input id="ci-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
        <label className="flex items-center gap-2"><input type="checkbox" checked={reqd} onChange={(e) => setReqd(e.target.checked)} className="h-4 w-4" /> Required to complete</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={launch} onChange={(e) => setLaunch(e.target.checked)} className="h-4 w-4" /> Required for launch</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="h-4 w-4" /> Required for delivery</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} className="h-4 w-4" /> AI can do</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} className="h-4 w-4" /> Manual</label>
      </div>
      {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
        <button type="submit" disabled={create.isPending} className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
          {create.isPending ? 'Adding...' : 'Add gate'}
        </button>
      </div>
    </form>
  )
}

export default function ProjectDetail() {
  const { id = '' } = useParams()
  const { data: project, isLoading, isError, error } = useProject(id)
  const checklist = useChecklist(id)
  const tasks = useTasks()
  const [editOpen, setEditOpen] = useState(false)
  const [addingGate, setAddingGate] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const projectTasks = useMemo(() => (tasks.data ?? []).filter((task) => task.project_id === id), [tasks.data, id])

  const back = <Link to="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Projects</Link>

  if (isLoading) return <div>{back}<p className="text-sm text-slate-400">Loading...</p></div>
  if (isError) return <div>{back}<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load: {error instanceof Error ? error.message : 'unknown error'}</div></div>
  if (!project) return <div>{back}<p className="text-sm text-slate-400">This project no longer exists.</p></div>

  const m = project.metrics
  const gates = checklist.data ?? []

  function openNewTask() {
    setEditingTask(null)
    setTaskFormOpen(true)
  }

  function openEditTask(task: Task) {
    setEditingTask(task)
    setTaskFormOpen(true)
  }

  function closeTaskForm() {
    setTaskFormOpen(false)
    setEditingTask(null)
  }

  return (
    <div>
      {back}

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">{project.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase tracking-wider text-slate-500">{humanise(project.type)}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{humanise(project.status)}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{humanise(project.priority)} priority</span>
          </div>
        </div>
        <button onClick={() => setEditOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Reading label="Overall" value={m?.overall_progress} />
        <Reading label="Launch readiness" value={m?.launch_readiness} />
        <Reading label="Delivery readiness" value={m?.delivery_readiness} />
        <Reading label="Admin / payment" value={m?.admin_completion} />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        {(m?.outstanding_balance ?? 0) > 0 && <span>Outstanding <span className="ff-mono font-semibold text-rose-600">{gbp.format(m!.outstanding_balance!)}</span></span>}
        <span className="text-slate-600">AI-ready remaining <span className="ff-mono font-semibold text-indigo-600">{m?.ai_remaining ?? 0}</span></span>
        <span className="text-slate-600">Manual remaining <span className="ff-mono font-semibold text-slate-700">{m?.manual_remaining ?? 0}</span></span>
        {m?.definition_of_done_met
          ? <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Ready to complete</span>
          : <span className="text-slate-500">{m?.required_incomplete ?? 0} required gate{(m?.required_incomplete ?? 0) === 1 ? '' : 's'} left</span>}
      </div>

      {project.next_action && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="ff-mono text-[9px] uppercase tracking-widest text-slate-400">Next action</div>
          <p className="mt-1 text-sm text-slate-700">{project.next_action}</p>
        </div>
      )}
      {project.blockers && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="ff-mono text-[9px] uppercase tracking-widest text-amber-500">Blockers</div>
          <p className="mt-1 text-sm text-amber-800">{project.blockers}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-800">Project work</h3>
            <p className="mt-0.5 text-xs text-slate-400">Linked tasks live here and in the main Tasks view. Checklist gates still drive readiness.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={openNewTask} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" /> Add task
            </button>
            {!addingGate && (
              <button onClick={() => setAddingGate(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Plus className="h-3.5 w-3.5" /> Checklist gate
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Tasks</h4>
            <span className="text-[11px] text-slate-400">{projectTasks.length} linked</span>
          </div>
          {tasks.isLoading && <p className="py-3 text-sm text-slate-400">Loading tasks...</p>}
          {projectTasks.length === 0 && !tasks.isLoading && (
            <p className="py-3 text-sm text-slate-400">No linked tasks yet. Add a task here, or choose this project when creating one from Tasks.</p>
          )}
          <div>
            {projectTasks.map((task) => <ProjectTaskRow key={task.id} task={task} onEdit={() => openEditTask(task)} />)}
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2">
            <h4 className="ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Completion checklist</h4>
            <p className="mt-1 text-xs text-slate-400">Use this only for required gates that affect launch, delivery and completion readiness.</p>
          </div>

          {addingGate && <div className="mb-3"><AddChecklistGate projectId={id} onClose={() => setAddingGate(false)} /></div>}

          {checklist.isLoading && <p className="py-3 text-sm text-slate-400">Loading checklist...</p>}
          {gates.length === 0 && !checklist.isLoading && !addingGate && (
            <p className="py-3 text-sm text-slate-400">No checklist gates yet. Add gates when something should count towards the progress bars above.</p>
          )}
          <div>
            {gates.map((gate) => <ChecklistRow key={gate.id} item={gate} projectId={id} />)}
          </div>
        </div>
      </div>

      {taskFormOpen && <TaskForm task={editingTask} defaultProjectId={id} onClose={closeTaskForm} />}
      {editOpen && <ProjectForm project={project} onClose={() => setEditOpen(false)} />}
    </div>
  )
}
