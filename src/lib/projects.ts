import { supabase } from '@/lib/supabase'
import type { Project, ProjectMetrics, ProjectWithMetrics } from '@/lib/types'

export type ProjectInput = {
  name: string
  type: Project['type']
  status: Project['status']
  priority: Project['priority']
  start_date: string | null
  due_date: string | null
  project_value: number | null
  amount_charged: number | null
  amount_paid: number | null
  payment_status: Project['payment_status']
  next_action: string | null
  ai_can_help: boolean
  manual_required: boolean
}

export async function listProjects(): Promise<ProjectWithMetrics[]> {
  const [projectsRes, metricsRes] = await Promise.all([
    supabase.from('projects').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
    supabase.from('v_project_metrics').select('*'),
  ])
  if (projectsRes.error) throw projectsRes.error
  if (metricsRes.error) throw metricsRes.error
  const byId = new Map<string, ProjectMetrics>(
    ((metricsRes.data ?? []) as ProjectMetrics[]).map((m) => [m.project_id, m]),
  )
  return ((projectsRes.data ?? []) as Project[]).map((p) => ({ ...p, metrics: byId.get(p.id) ?? null }))
}

export async function createProject(input: ProjectInput): Promise<void> {
  const { error } = await supabase.from('projects').insert(input)
  if (error) throw error
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const { error } = await supabase.from('projects').update(input).eq('id', id)
  if (error) throw error
}

export async function archiveProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
