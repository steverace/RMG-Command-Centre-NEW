import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, Bot, Wrench, CheckCircle2 } from 'lucide-react'
import { useProject } from '@/features/projects/useProjects'
import { useChecklist, useCreateChecklistItem, useSetItemStatus, useDeleteChecklistItem } from '@/features/projects/useChecklist'
import ProjectForm from '@/features/projects/ProjectForm'
import { humanise, gbp, ITEM_STATUSES } from '@/lib/types'
import type { ChecklistItem, ItemStatus } from '@/lib/types'

function Reading({ label, value }: { label: string; value: number | null | undefined }) {
  const muted = value === null || value === undefined
  const v = value ?? 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="ff-mono text-[9px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`ff-mono mb-1.5 mt-1 text-xl font-semibold ${muted ? 'text-slate-300' : 'text-slate-800'}`}>{muted ? '—' : `${v}%`}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-800" style={{ width: muted ? '0%' : `${v}%` }} />
      </div>
    </div>
  )
}

function Tag({ children }: { children: string }) {
  return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{children}</span>
}

function ItemRow({ item, projectId }: { item: ChecklistItem; projectId: string }) {
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
          <span className="ff-mono text-[10px] text-slate-400">×{item.weight}</span>
          {item.can_be_done_by_ai && <Bot className="h-3.5 w-3.5 text-indigo-400" />}
          {item.requires_manual && <Wrench className="h-3.5 w-3.5 text-slate-400" />}
        </div>
      </div>
      <button
        onClick={() => { if (window.confirm('Delete this checklist item?')) del.mutate(item.id) }}
        className="shrink-0 text-slate-300 hover:text-rose-600" aria-label="Delete item"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

function AddItem({ projectId, onClose }: { projectId: string; onClose: () => void }) {
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
        title: title.trim(), description: null,
        required_for_completion: reqd, gate_launch: launch, gate_delivery: delivery,
        weight: Number(weight), can_be_done_by_ai: ai, requires_manual: manual,
        due_date: due || null,
      })
      onClose()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not add item')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelCls} htmlFor="ci-title">Item</label>
          <input id="ci-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Write 5 comparison pages" />
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
          {create.isPending ? 'Adding…' : 'Add item'}
        </button>
      </div>
    </form>
  )
}

export default function ProjectDetail() {
  const { id = '' } = useParams()
  const { data: project, isLoading, isError, error } = useProject(id)
  const checklist = useChecklist(id)
  const [editOpen, setEditOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const back = <Link to="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Projects</Link>

  if (isLoading) return <div>{back}<p className="text-sm text-slate-400">Loading…</p></div>
  if (isError) return <div>{back}<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load: {error instanceof Error ? error.message : 'unknown error'}</div></div>
  if (!project) return <div>{back}<p className="text-sm text-slate-400">This project no longer exists.</p></div>

  const m = project.metrics
  const items = checklist.data ?? []

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
          : <span className="text-slate-500">{m?.required_incomplete ?? 0} required item{(m?.required_incomplete ?? 0) === 1 ? '' : 's'} left</span>}
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
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-800">Checklist</h3>
          {!adding && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          )}
        </div>

        {adding && <div className="mb-3"><AddItem projectId={id} onClose={() => setAdding(false)} /></div>}

        {checklist.isLoading && <p className="py-3 text-sm text-slate-400">Loading checklist…</p>}
        {items.length === 0 && !checklist.isLoading && !adding && (
          <p className="py-3 text-sm text-slate-400">No checklist items yet. Add items and the progress bars above fill in automatically.</p>
        )}
        <div>
          {items.map((it) => <ItemRow key={it.id} item={it} projectId={id} />)}
        </div>
      </div>

      {editOpen && <ProjectForm project={project} onClose={() => setEditOpen(false)} />}
    </div>
  )
}
