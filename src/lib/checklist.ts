import { supabase } from '@/lib/supabase'
import type { ChecklistItem, ItemStatus } from '@/lib/types'

export type ChecklistInput = {
  title: string
  description: string | null
  required_for_completion: boolean
  gate_launch: boolean
  gate_delivery: boolean
  weight: number
  can_be_done_by_ai: boolean
  requires_manual: boolean
  due_date: string | null
}

export async function listChecklist(projectId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ChecklistItem[]
}

export async function createChecklistItem(projectId: string, input: ChecklistInput): Promise<void> {
  const { error } = await supabase.from('checklist_items').insert({
    project_id: projectId,
    title: input.title,
    description: input.description,
    status: 'not_started',
    required_for_completion: input.required_for_completion,
    gate_launch: input.gate_launch,
    gate_delivery: input.gate_delivery,
    weight: Math.max(1, input.weight || 1),
    can_be_done_by_ai: input.can_be_done_by_ai,
    requires_manual: input.requires_manual,
    due_date: input.due_date,
    completed_at: null,
    notes: null,
    sort_order: 0,
  })
  if (error) throw error
}

export async function setItemStatus(id: string, status: ItemStatus): Promise<void> {
  const { error } = await supabase
    .from('checklist_items')
    .update({ status, completed_at: status === 'complete' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
