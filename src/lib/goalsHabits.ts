import { supabase } from '@/lib/supabase'
import type { Goal, GoalMilestone, Habit, HabitLog } from '@/lib/types'

export type GoalInput = {
  title: string
  area: Goal['area']
  why: string | null
  target_label: string | null
  target_value: number | null
  current_value: number | null
  unit: string | null
  deadline: string | null
  status: Goal['status']
  notes: string | null
}

export type HabitInput = {
  name: string
  area: Habit['area']
  frequency: Habit['frequency']
  days_of_week: number[] | null
  target_type: Habit['target_type']
  target_value: number | null
  unit: string | null
  time_of_day: string | null
  goal_id: string | null
  active: boolean
  notes: string | null
}

export type GoalMilestoneInput = {
  goal_id: string
  title: string
  status: GoalMilestone['status']
  due_date: string | null
}

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from('goals').select('*').is('deleted_at', null).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Goal[]
}

export async function createGoal(input: GoalInput): Promise<void> {
  const { error } = await supabase.from('goals').insert(input)
  if (error) throw error
}

export async function updateGoal(id: string, input: GoalInput): Promise<void> {
  const { error } = await supabase.from('goals').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function archiveGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function listGoalMilestones(): Promise<GoalMilestone[]> {
  const { data, error } = await supabase.from('goal_milestones').select('*').is('deleted_at', null).order('sort_order', { ascending: true }).order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as GoalMilestone[]
}

export async function createGoalMilestone(input: GoalMilestoneInput): Promise<void> {
  const { error } = await supabase.from('goal_milestones').insert(input)
  if (error) throw error
}

export async function updateGoalMilestoneStatus(id: string, status: GoalMilestone['status']): Promise<void> {
  const { error } = await supabase.from('goal_milestones').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function archiveGoalMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('goal_milestones').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase.from('habits').select('*').is('deleted_at', null).order('time_of_day', { ascending: true, nullsFirst: false }).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Habit[]
}

export async function createHabit(input: HabitInput): Promise<void> {
  const { error } = await supabase.from('habits').insert(input)
  if (error) throw error
}

export async function updateHabit(id: string, input: HabitInput): Promise<void> {
  const { error } = await supabase.from('habits').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function archiveHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function listHabitLogs(): Promise<HabitLog[]> {
  const { data, error } = await supabase.from('habit_logs').select('*').gte('log_date', daysAgo(60)).order('log_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as HabitLog[]
}

export async function setHabitLog(input: { habit_id: string; log_date?: string; completed: boolean; value?: number | null; note?: string | null }): Promise<void> {
  const row = {
    habit_id: input.habit_id,
    log_date: input.log_date ?? today(),
    completed: input.completed,
    value: input.value ?? null,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('habit_logs').upsert(row, { onConflict: 'habit_id,log_date' })
  if (error) throw error
}
