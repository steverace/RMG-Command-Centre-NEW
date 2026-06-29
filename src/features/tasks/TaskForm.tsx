import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Archive } from 'lucide-react'
import {
  ITEM_STATUSES, PRIORITIES, TASK_ENERGIES, WAITING_ON_TYPES, humanise,
} from '@/lib/types'
import type { Task } from '@/lib/types'
import type { TaskInput } from '@/lib/tasks'
import { useCreateTask, useUpdateTask, useArchiveTask } from '@/features/tasks/useTasks'
import { useProjects } from '@/features/projects/useProjects'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

export default function TaskForm({ task, onClose, defaultProjectId = '' }: { task: Task | null; onClose: () => void; defaultProjectId?: string }) {
  const create = useCreateTask()
  const update = useUpdateTask()
  const archive = useArchiveTask()
  const { data: projects } = useProjects()
  const editing = !!task

  const [title, setTitle] = useState(task?.title ?? '')
  const [projectId, setProjectId] = useState(task?.project_id ?? defaultProjectId)
  const [status, setStatus] = useState(task?.status ?? 'not_started')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [energy, setEnergy] = useState<string>(task?.energy ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [waitingType, setWaitingType] = useState<string>(task?.waiting_on_type ?? '')
  const [waitingPerson, setWaitingPerson] = useState(task?.waiting_on_person ?? '')
  const [avoidance, setAvoidance] = useState<string>(task?.avoidance_level?.toString() ?? '')
  const [aiCanDo, setAiCanDo] = useState(task?.can_be_done_by_ai ?? false)
  const [manual, setManual] = useState(task?.requires_manual ?? true)
  const [error, setError] = useState<string | null>(null)

  const busy = create.isPending || update.isPending || archive.isPending
  const readyForAi = aiCanDo && !manual

  function setReadyForAi(checked: boolean) {
    setAiCanDo(checked)
    if (checked) {
      setManual(false)
      setWaitingType('')
      setWaitingPerson('')
      if (status === 'blocked') setStatus('not_started')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: TaskInput = {
      title: title.trim(),
      project_id: projectId || null,
      status, priority,
      due_date: dueDate || null,
      energy: (energy || null) as TaskInput['energy'],
      notes: notes.trim() || null,
      can_be_done_by_ai: aiCanDo,
      requires_manual: manual,
      waiting_on_type: (waitingType || null) as TaskInput['waiting_on_type'],
      waiting_on_person: waitingType ? (waitingPerson.trim() || null) : null,
      avoidance_level: avoidance ? Number(avoidance) : null,
    }
    try {
      if (editing && task) await update.mutateAsync({ id: task.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function onArchive() {
    if (!task) return
    if (!window.confirm('Delete this task?')) return
    try { await archive.mutateAsync(task.id); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit task' : defaultProjectId ? 'New project task' : 'New task'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="t-title">Task</label>
            <input id="t-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Chase Xing Design invoice" />
          </div>

          <div>
            <label className={labelCls} htmlFor="t-project">Project <span className="text-slate-300">(optional)</span></label>
            <select id="t-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
              <option value="">— Standalone (no project) —</option>
              {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="t-notes">Context / AI prompt <span className="text-slate-300">(optional)</span></label>
            <textarea
              id="t-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
              placeholder="Add background, links, constraints, or the exact prompt an AI model should use later."
            />
            <p className="mt-1 text-[11px] leading-4 text-slate-400">Useful when the title is too vague, or when this should become something an AI can complete later.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="t-status">Status</label>
              <select id="t-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
                {ITEM_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="t-priority">Priority</label>
              <select id="t-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{humanise(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="t-due">Due date <span className="text-slate-300">(optional)</span></label>
              <input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t-energy">Energy <span className="text-slate-300">(optional)</span></label>
              <select id="t-energy" value={energy} onChange={(e) => setEnergy(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {TASK_ENERGIES.map((en) => <option key={en} value={en}>{humanise(en)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="t-wait">Waiting on <span className="text-slate-300">(optional)</span></label>
              <select id="t-wait" value={waitingType} onChange={(e) => setWaitingType(e.target.value)} className={inputCls}>
                <option value="">— Not waiting —</option>
                {WAITING_ON_TYPES.map((w) => <option key={w} value={w}>{humanise(w)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="t-avoid">Avoidance 1–5 <span className="text-slate-300">(optional)</span></label>
              <select id="t-avoid" value={avoidance} onChange={(e) => setAvoidance(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {waitingType && (
            <div>
              <label className={labelCls} htmlFor="t-person">Waiting on whom?</label>
              <input id="t-person" value={waitingPerson} onChange={(e) => setWaitingPerson(e.target.value)} className={inputCls} placeholder="e.g. Marc at the venue" />
            </div>
          )}

          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={readyForAi} onChange={(e) => setReadyForAi(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Ready for AI to complete
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={manual} onChange={(e) => { setManual(e.target.checked); if (e.target.checked) setAiCanDo(false) }} className="h-4 w-4 rounded border-slate-300" /> Steve/manual input needed
            </label>
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing
            ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Delete</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
