import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban } from 'lucide-react'
import { useProjects } from '@/features/projects/useProjects'
import ProjectForm from '@/features/projects/ProjectForm'
import EmptyState from '@/components/EmptyState'
import { humanise, gbp } from '@/lib/types'
import type { ProjectWithMetrics, ProjectStatus } from '@/lib/types'

const statusTone: Record<ProjectStatus, string> = {
  idea: 'bg-indigo-50 text-indigo-700',
  not_started: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-amber-50 text-amber-700',
  waiting: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-800',
  abandoned: 'bg-slate-100 text-slate-400',
}

function Flag({ tone, label }: { tone: 'rose' | 'amber' | 'slate'; label: string }) {
  const cls = tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>
}

function Card({ p, onOpen }: { p: ProjectWithMetrics; onOpen: () => void }) {
  const m = p.metrics
  const progress = m?.overall_progress ?? 0
  const outstanding = m?.outstanding_balance ?? 0
  return (
    <button onClick={onOpen} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-medium text-slate-800">{p.name}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusTone[p.status]}`}>{humanise(p.status)}</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">{humanise(p.type)}</span>
        {m?.is_overdue && <Flag tone="rose" label="Overdue" />}
        {m?.is_stale && <Flag tone="amber" label="Stale" />}
        {m?.is_waiting && <Flag tone="slate" label="Waiting" />}
        {m?.has_no_next_action && <Flag tone="amber" label="No next action" />}
      </div>
      <div className="mb-1 flex items-center justify-between">
        <span className="ff-mono text-[9px] uppercase tracking-widest text-slate-400">Overall</span>
        <span className="ff-mono text-[11px] font-semibold text-slate-700">{progress}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-800" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
        <span className="truncate pr-2">{p.next_action || <span className="text-slate-400">No next action set</span>}</span>
        {outstanding > 0 && <span className="ff-mono shrink-0 font-medium text-rose-600">{gbp.format(outstanding)}</span>}
      </div>
    </button>
  )
}

export default function ProjectsPage() {
  const { data, isLoading, isError, error } = useProjects()
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{data ? `${data.length} active project${data.length === 1 ? '' : 's'}` : '\u00A0'}</p>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700">
          <Plus className="h-4 w-4" /> Add project
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading projects…</p>}

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Couldn't load projects: {error instanceof Error ? error.message : 'unknown error'}
        </div>
      )}

      {data && data.length === 0 && (
        <EmptyState icon={FolderKanban} title="No projects yet" note="Add your first project to start tracking progress, money and next actions." />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => <Card key={p.id} p={p} onOpen={() => navigate(`/projects/${p.id}`)} />)}
        </div>
      )}

      {formOpen && <ProjectForm project={null} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
