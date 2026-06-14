import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Archive } from 'lucide-react'
import {
  PROJECT_TYPES, SELECTABLE_PROJECT_STATUSES, PRIORITIES, PAYMENT_STATUSES, humanise,
} from '@/lib/types'
import type { ProjectWithMetrics } from '@/lib/types'
import type { ProjectInput } from '@/lib/projects'
import { useCreateProject, useUpdateProject, useArchiveProject } from '@/features/projects/useProjects'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

function num(s: string): number | null {
  return s.trim() === '' ? null : Number(s)
}

export default function ProjectForm({ project, onClose }: { project: ProjectWithMetrics | null; onClose: () => void }) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const archive = useArchiveProject()
  const editing = !!project

  const [name, setName] = useState(project?.name ?? '')
  const [type, setType] = useState(project?.type ?? 'personal')
  const [status, setStatus] = useState(project?.status ?? 'active')
  const [priority, setPriority] = useState(project?.priority ?? 'medium')
  const [startDate, setStartDate] = useState(project?.start_date ?? '')
  const [dueDate, setDueDate] = useState(project?.due_date ?? '')
  const [value, setValue] = useState(project?.project_value?.toString() ?? '')
  const [charged, setCharged] = useState(project?.amount_charged?.toString() ?? '')
  const [paid, setPaid] = useState(project?.amount_paid?.toString() ?? '')
  const [paymentStatus, setPaymentStatus] = useState(project?.payment_status ?? 'not_applicable')
  const [nextAction, setNextAction] = useState(project?.next_action ?? '')
  const [aiCanHelp, setAiCanHelp] = useState(project?.ai_can_help ?? false)
  const [manualRequired, setManualRequired] = useState(project?.manual_required ?? true)
  const [error, setError] = useState<string | null>(null)

  const busy = create.isPending || update.isPending || archive.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: ProjectInput = {
      name: name.trim(),
      type, status, priority,
      start_date: startDate || null,
      due_date: dueDate || null,
      project_value: num(value),
      amount_charged: num(charged) ?? 0,
      amount_paid: num(paid) ?? 0,
      payment_status: paymentStatus,
      next_action: nextAction.trim() || null,
      ai_can_help: aiCanHelp,
      manual_required: manualRequired,
    }
    try {
      if (editing && project) await update.mutateAsync({ id: project.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  async function onArchive() {
    if (!project) return
    if (!window.confirm('Archive this project? It will be hidden but not permanently deleted.')) return
    try {
      await archive.mutateAsync(project.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit project' : 'New project'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="p-name">Name</label>
            <input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Comps Watch" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-type">Type</label>
              <select id="p-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{humanise(t)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-status">Status</label>
              <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
                {SELECTABLE_PROJECT_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-priority">Priority</label>
              <select id="p-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputCls}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{humanise(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-pay">Payment status</label>
              <select id="p-pay" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)} className={inputCls}>
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="p-start">Start date <span className="text-slate-300">(optional)</span></label>
              <input id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-due">Due date <span className="text-slate-300">(optional)</span></label>
              <input id="p-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="p-value">Value (£)</label>
              <input id="p-value" type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-charged">Charged (£)</label>
              <input id="p-charged" type="number" inputMode="decimal" value={charged} onChange={(e) => setCharged(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="p-paid">Paid (£)</label>
              <input id="p-paid" type="number" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="p-next">Next action <span className="text-slate-300">(optional)</span></label>
            <textarea id="p-next" rows={2} value={nextAction} onChange={(e) => setNextAction(e.target.value)} className={inputCls} placeholder="The single next thing to move this forward" />
          </div>

          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={aiCanHelp} onChange={(e) => setAiCanHelp(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> AI can help
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={manualRequired} onChange={(e) => setManualRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Manual action needed
            </label>
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing
            ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Archive</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
