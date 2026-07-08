import { supabase } from '@/lib/supabase'
import type { Task, ItemStatus } from '@/lib/types'

export type TaskInput = {
  title: string
  project_id: string | null
  client_id: string | null
  status: Task['status']
  priority: Task['priority']
  due_date: string | null
  energy: Task['energy']
  notes: string | null
  can_be_done_by_ai: boolean
  requires_manual: boolean
  waiting_on_type: Task['waiting_on_type']
  waiting_on_person: string | null
  avoidance_level: number | null
}

const today = () => new Date().toISOString().slice(0, 10)

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').is('deleted_at', null).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function createTask(input: TaskInput): Promise<void> {
  const row = { ...input, waiting_since: input.waiting_on_type ? today() : null }
  const { error } = await supabase.from('tasks').insert(row)
  if (error) throw error
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const row = { ...input, waiting_since: input.waiting_on_type ? today() : null }
  const { error } = await supabase.from('tasks').update(row).eq('id', id)
  if (error) throw error
}

export async function setTaskStatus(id: string, status: ItemStatus): Promise<void> {
  const { error } = await supabase.from('tasks')
    .update({ status, completed_at: status === 'complete' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function archiveTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
