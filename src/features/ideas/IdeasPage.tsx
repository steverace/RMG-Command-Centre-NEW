import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Lightbulb, ArrowUpRight } from 'lucide-react'
import { useIdeas, useSetIdeaStatus, usePromoteIdea } from '@/features/ideas/useIdeas'
import IdeaForm from '@/features/ideas/IdeaForm'
import EmptyState from '@/components/EmptyState'
import { IDEA_STATUSES, humanise, gbp } from '@/lib/types'
import type { Idea, IdeaWithScore, IdeaStatus } from '@/lib/types'

type Filter = 'all' | IdeaStatus

function scoreTone(score: number | null): { ring: string; text: string } {
  if (score == null) return { ring: 'border-slate-200 bg-slate-50', text: 'text-slate-400' }
  if (score >= 70) return { ring: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-700' }
  if (score >= 45) return { ring: 'border-amber-200 bg-amber-50', text: 'text-amber-700' }
  return { ring: 'border-slate-200 bg-slate-50', text: 'text-slate-500' }
}

function Card({ idea, onEdit }: { idea: IdeaWithScore; onEdit: () => void }) {
  const setStatus = useSetIdeaStatus()
  const promote = usePromoteIdea()
  const navigate = useNavigate()
  const tone = scoreTone(idea.opportunity_score)
  const converted = !!idea.converted_project_id

  async function onPromote() {
    if (converted) { navigate(`/projects/${idea.converted_project_id}`); return }
    if (!window.confirm(`Promote "${idea.name}" to a live project?`)) return
    try { const id = await promote.mutateAsync(idea); navigate(`/projects/${id}`) } catch { /* surfaced elsewhere */ }
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${tone.ring}`}>
        <span className={`ff-mono text-lg font-semibold leading-none ${tone.text}`}>{idea.opportunity_score ?? '—'}</span>
        <span className="ff-mono mt-0.5 text-[8px] uppercase tracking-wider text-slate-400">score</span>
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={onEdit} className="block w-full text-left">
          <div className="truncate text-sm font-medium text-slate-800">{idea.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            {idea.category && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">{idea.category}</span>}
            {idea.expected_monthly_revenue != null && <span className="ff-mono">{gbp.format(idea.expected_monthly_revenue)}/mo{idea.revenue_confidence ? ` · ${idea.revenue_confidence}` : ''}</span>}
          </div>
          {idea.description && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{idea.description}</p>}
        </button>
        <div className="mt-2 flex items-center gap-2">
          <select value={idea.status} onChange={(e) => setStatus.mutate({ id: idea.id, status: e.target.value as IdeaStatus })}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none">
            {IDEA_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
          </select>
          {(idea.status === 'approved' || converted) && (
            <button onClick={onPromote} disabled={promote.isPending}
              className="flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60">
              <ArrowUpRight className="h-3 w-3" /> {converted ? 'View project' : 'Promote'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const { data, isLoading, isError, error } = useIdeas()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Idea | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const all = data ?? []
    return filter === 'all' ? all : all.filter((i) => i.status === filter)
  }, [data, filter])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter('all')} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}>All</button>
          {IDEA_STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${filter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}>{humanise(s)}</button>
          ))}
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true) }} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"><Plus className="h-4 w-4" /> New idea</button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading ideas…</p>}
      {isError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load ideas: {error instanceof Error ? error.message : 'unknown error'}</div>}
      {data && data.length === 0 && <EmptyState icon={Lightbulb} title="No ideas captured yet" note="Capture ideas, score them on revenue, speed, difficulty and excitement, and the best ones float to the top." />}

      {data && data.length > 0 && (
        filtered.length === 0
          ? <p className="text-sm text-slate-400">Nothing with this status.</p>
          : <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{filtered.map((i) => <Card key={i.id} idea={i} onEdit={() => { setEditing(i); setFormOpen(true) }} />)}</div>
      )}

      {formOpen && <IdeaForm idea={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
