import { supabase } from '@/lib/supabase'
import type { Idea, IdeaWithScore, IdeaStatus, ConfidenceLevel } from '@/lib/types'

export type IdeaInput = {
  name: string
  description: string | null
  category: string | null
  why_it_might_work: string | null
  next_research_step: string | null
  revenue_potential: number | null
  time_to_revenue: number | null
  difficulty: number | null
  excitement: number | null
  expected_monthly_revenue: number | null
  revenue_confidence: ConfidenceLevel | null
  status: IdeaStatus
}

export async function listIdeas(): Promise<IdeaWithScore[]> {
  const [ideasRes, scoresRes] = await Promise.all([
    supabase.from('ideas').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('v_idea_scores').select('*'),
  ])
  if (ideasRes.error) throw ideasRes.error
  if (scoresRes.error) throw scoresRes.error
  const score = new Map<string, number | null>(((scoresRes.data ?? []) as { idea_id: string; opportunity_score: number | null }[]).map((s) => [s.idea_id, s.opportunity_score]))
  const merged = ((ideasRes.data ?? []) as Idea[]).map((i) => ({ ...i, opportunity_score: score.get(i.id) ?? null }))
  return merged.sort((a, b) => (b.opportunity_score ?? -1) - (a.opportunity_score ?? -1))
}

export async function createIdea(input: IdeaInput): Promise<void> {
  const { error } = await supabase.from('ideas').insert(input)
  if (error) throw error
}

export async function updateIdea(id: string, input: IdeaInput): Promise<void> {
  const { error } = await supabase.from('ideas').update(input).eq('id', id)
  if (error) throw error
}

export async function setIdeaStatus(id: string, status: IdeaStatus): Promise<void> {
  const { error } = await supabase.from('ideas').update({ status }).eq('id', id)
  if (error) throw error
}

export async function archiveIdea(id: string): Promise<void> {
  const { error } = await supabase.from('ideas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// Promote an approved idea into a real project, then link + mark the idea.
export async function promoteIdeaToProject(idea: Idea): Promise<string> {
  const { data, error } = await supabase.from('projects').insert({
    name: idea.name,
    type: 'personal',
    status: 'not_started',
    priority: 'medium',
    start_date: null,
    due_date: null,
    project_value: idea.expected_monthly_revenue ?? null,
    amount_charged: 0,
    amount_paid: 0,
    payment_status: 'not_invoiced',
    next_action: idea.next_research_step ?? null,
    ai_can_help: false,
    manual_required: true,
  }).select('id').single()
  if (error) throw error
  const newId = (data as { id: string }).id
  const { error: upErr } = await supabase.from('ideas').update({ converted_project_id: newId, status: 'approved' }).eq('id', idea.id)
  if (upErr) throw upErr
  return newId
}
