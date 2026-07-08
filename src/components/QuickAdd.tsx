import { useState } from 'react'
import type { FormEvent } from 'react'
import { Lightbulb, ListChecks, FolderKanban, X } from 'lucide-react'
import { useCreateTask } from '@/features/tasks/useTasks'
import { useCreateProject, useProjects } from '@/features/projects/useProjects'
import { useClients } from '@/features/clients/useClients'
import { useCreateIdea } from '@/features/ideas/useIdeas'
import { clientDisplayName } from '@/lib/types'
import type { TaskInput } from '@/lib/tasks'
import type { ProjectInput } from '@/lib/projects'
import type { IdeaInput } from '@/lib/ideas'

type Mode = 'task' | 'project' | 'idea'

const modes: { key: Mode; label: string; icon: typeof ListChecks }[] = [
  { key: 'task', label: 'Task', icon: ListChecks },
  { key: 'project', label: 'Project', icon: FolderKanban },
  { key: 'idea', label: 'Idea', icon: Lightbulb },
]

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

export default function QuickAdd({ onClose }: { onClose: () => void }) {
  const createTask = useCreateTask()
  const createProject = useCreateProject()
  const createIdea = useCreateIdea()
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  const [mode, setMode] = useState<Mode>('task')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const busy = createTask.isPending || createProject.isPending || createIdea.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const name = title.trim()
    const details = note.trim()
    if (!name) return

    try {
      if (mode === 'task') {
        const input: TaskInput = {
          title: name,
          project_id: projectId || null,
          client_id: clientId || null,
          status: 'not_started',
          priority: 'medium',
          due_date: null,
          energy: null,
          notes: details || null,
          can_be_done_by_ai: false,
          requires_manual: true,
          waiting_on_type: null,
          waiting_on_person: null,
          avoidance_level: null,
        }
        await createTask.mutateAsync(input)
      } else if (mode === 'project') {
        const input: ProjectInput = {
          name,
          type: 'personal',
          status: 'not_started',
          priority: 'medium',
          start_date: null,
          due_date: null,
          project_value: null,
          amount_charged: 0,
          amount_paid: 0,
          payment_status: 'not_applicable',
          next_action: details || null,
          ai_can_help: false,
          manual_required: true,
        }
        await createProject.mutateAsync(input)
      } else {
        const input: IdeaInput = {
          name,
          description: details || null,
          category: null,
          why_it_might_work: null,
          next_research_step: null,
          revenue_potential: null,
          time_to_revenue: null,
          difficulty: null,
          excitement: null,
          expected_monthly_revenue: null,
          revenue_confidence: null,
          status: 'captured',
        }
        await createIdea.mutateAsync(input)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this item')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">Quick add</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            {modes.map((item) => {
              const Icon = item.icon
              const active = mode === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium ${
                    active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {mode === 'task' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="qa-project">
                  Project <span className="text-slate-300">(optional)</span>
                </label>
                <select id="qa-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                  <option value="">Standalone task</option>
                  {(projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="qa-client">
                  Client <span className="text-slate-300">(optional)</span>
                </label>
                <select id="qa-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                  <option value="">No linked client</option>
                  {(clients ?? []).map((client) => <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>)}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="qa-title">
              {mode === 'task' ? 'Task' : mode === 'project' ? 'Project' : 'Idea'}
            </label>
            <input
              id="qa-title"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder={mode === 'task' ? 'e.g. Chase invoice' : mode === 'project' ? 'e.g. New landing page' : 'e.g. Directory product idea'}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="qa-note">
              {mode === 'task' ? 'Context / AI prompt' : mode === 'project' ? 'Next action' : 'Description'} <span className="text-slate-300">(optional)</span>
            </label>
            <textarea
              id="qa-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder={mode === 'task' ? 'Add context, links, constraints, or the future AI prompt.' : undefined}
            />
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
            {busy ? 'Saving...' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
