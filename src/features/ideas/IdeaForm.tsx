import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Archive } from 'lucide-react'
import { IDEA_STATUSES, CONFIDENCE_LEVELS, humanise, opportunityScore } from '@/lib/types'
import type { Idea } from '@/lib/types'
import type { IdeaInput } from '@/lib/ideas'
import { useCreateIdea, useUpdateIdea, useArchiveIdea } from '@/features/ideas/useIdeas'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

const SCORES: { key: 'revenue_potential' | 'time_to_revenue' | 'difficulty' | 'excitement'; label: string; lo: string; hi: string }[] = [
  { key: 'revenue_potential', label: 'Revenue potential', lo: '1 = small', hi: '5 = big' },
  { key: 'time_to_revenue', label: 'Speed to revenue', lo: '1 = far off', hi: '5 = quick' },
  { key: 'difficulty', label: 'Difficulty', lo: '1 = easy', hi: '5 = hard' },
  { key: 'excitement', label: 'Excitement', lo: '1 = meh', hi: '5 = love it' },
]

export default function IdeaForm({ idea, onClose }: { idea: Idea | null; onClose: () => void }) {
  const create = useCreateIdea()
  const update = useUpdateIdea()
  const archive = useArchiveIdea()
  const editing = !!idea

  const [name, setName] = useState(idea?.name ?? '')
  const [description, setDescription] = useState(idea?.description ?? '')
  const [category, setCategory] = useState(idea?.category ?? '')
  const [status, setStatus] = useState(idea?.status ?? 'captured')
  const [scores, setScores] = useState({
    revenue_potential: idea?.revenue_potential ?? null as number | null,
    time_to_revenue: idea?.time_to_revenue ?? null as number | null,
    difficulty: idea?.difficulty ?? null as number | null,
    excitement: idea?.excitement ?? null as number | null,
  })
  const [expRev, setExpRev] = useState(idea?.expected_monthly_revenue?.toString() ?? '')
  const [confidence, setConfidence] = useState<string>(idea?.revenue_confidence ?? '')
  const [why, setWhy] = useState(idea?.why_it_might_work ?? '')
  const [next, setNext] = useState(idea?.next_research_step ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  const livePreview = opportunityScore(scores)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: IdeaInput = {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      why_it_might_work: why.trim() || null,
      next_research_step: next.trim() || null,
      revenue_potential: scores.revenue_potential,
      time_to_revenue: scores.time_to_revenue,
      difficulty: scores.difficulty,
      excitement: scores.excitement,
      expected_monthly_revenue: expRev.trim() === '' ? null : Number(expRev),
      revenue_confidence: (confidence || null) as IdeaInput['revenue_confidence'],
      status,
    }
    try {
      if (editing && idea) await update.mutateAsync({ id: idea.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
  }
  async function onArchive() {
    if (!idea) return
    if (!window.confirm('Delete this idea?')) return
    try { await archive.mutateAsync(idea.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit idea' : 'New idea'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="i-name">Idea</label>
            <input id="i-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Metal-detecting finds marketplace" />
          </div>
          <div>
            <label className={labelCls} htmlFor="i-desc">Description</label>
            <textarea id="i-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="i-cat">Category</label>
              <input id="i-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="e.g. affiliate, SaaS" />
            </div>
            <div>
              <label className={labelCls} htmlFor="i-status">Status</label>
              <select id="i-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
                {IDEA_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="ff-mono text-[10px] uppercase tracking-widest text-slate-400">Opportunity scoring</span>
              <span className="ff-mono text-sm font-semibold text-slate-800">{livePreview == null ? '— ' : `${livePreview} `}<span className="text-[10px] font-normal text-slate-400">/ 100</span></span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SCORES.map((s) => (
                <div key={s.key}>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500" htmlFor={`i-${s.key}`}>{s.label}</label>
                  <select id={`i-${s.key}`} value={scores[s.key] ?? ''} onChange={(e) => setScores((p) => ({ ...p, [s.key]: e.target.value ? Number(e.target.value) : null }))} className={inputCls}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <div className="mt-0.5 flex justify-between text-[9px] text-slate-400"><span>{s.lo}</span><span>{s.hi}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="i-exp">Expected £/month</label>
              <input id="i-exp" type="number" inputMode="decimal" value={expRev} onChange={(e) => setExpRev(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="i-conf">Confidence</label>
              <select id="i-conf" value={confidence} onChange={(e) => setConfidence(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="i-why">Why it might work</label>
            <textarea id="i-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="i-next">Next research step</label>
            <input id="i-next" value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} placeholder="The one thing to find out next" />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save' : 'Capture idea'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
