import { useState } from 'react'
import { LogOut, Download, SlidersHorizontal, Info, NotebookPen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'

const EXPORT_TABLES = ['clients', 'projects', 'checklist_items', 'tasks', 'ideas', 'goals', 'goal_milestones', 'habits', 'habit_logs', 'recurring_revenue', 'outgoing_payments', 'quotes', 'project_notes', 'transactions']

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">{icon}<h2 className="font-display text-sm font-semibold text-slate-800">{title}</h2></div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { session, signOut } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  async function exportAll() {
    setExporting(true); setExportMsg(null)
    try {
      const dump: Record<string, unknown> = { exported_at: new Date().toISOString(), app: 'Race Media Control Centre' }
      for (const t of EXPORT_TABLES) {
        const { data, error } = await supabase.from(t).select('*')
        dump[t] = error ? { error: error.message } : data
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rmcc-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      setExportMsg('Backup downloaded.')
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : 'Export failed')
    } finally { setExporting(false) }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card icon={<Info className="h-4 w-4 text-slate-400" />} title="Account">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-700">{session?.user?.email}</div>
            <div className="text-xs text-slate-400">Signed in as the sole administrator</div>
          </div>
          <button onClick={() => void signOut()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </Card>

      <Card icon={<Download className="h-4 w-4 text-slate-400" />} title="Data export">
        <p className="mb-3 text-sm text-slate-500">Download everything — clients, projects, tasks, ideas, money and quotes — as a single JSON backup.</p>
        <div className="flex items-center gap-3">
          <button onClick={exportAll} disabled={exporting} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export all data'}</button>
          {exportMsg && <span className="text-xs text-slate-500">{exportMsg}</span>}
        </div>
      </Card>

      <Card icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />} title="Signal thresholds">
        <p className="mb-2 text-sm text-slate-500">These drive the deck's signals. They're currently set in the database; tunable from here in a later pass.</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-slate-500">Stale after</dt><dd className="ff-mono text-slate-700">14 days untouched</dd>
          <dt className="text-slate-500">Waiting flagged after</dt><dd className="ff-mono text-slate-700">3 days</dd>
          <dt className="text-slate-500">"Avoiding" task</dt><dd className="ff-mono text-slate-700">avoidance ≥ 4, 7 days idle</dd>
          <dt className="text-slate-500">Overdue</dt><dd className="ff-mono text-slate-700">past due date</dd>
        </dl>
      </Card>

      <Card icon={<NotebookPen className="h-4 w-4 text-slate-400" />} title="Obsidian & notifications">
        <p className="text-sm text-slate-500">Markdown export with <span className="ff-mono">obsidian://</span> deep links and a scheduled phone digest are planned for a later phase. Nothing to configure yet.</p>
      </Card>

      <p className="px-1 text-center text-[11px] text-slate-400">Race Media Control Centre · private build · React + Supabase</p>
    </div>
  )
}
