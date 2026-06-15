import { supabase } from '@/lib/supabase'
import type { RecurringRevenue, BillingCycle } from '@/lib/types'

export type RecurringInput = {
  label: string
  category: RecurringRevenue['category']
  client_id: string | null
  amount: number
  billing_cycle: BillingCycle
  next_due_date: string | null
  active: boolean
  notes: string | null
}

export async function listRecurring(): Promise<RecurringRevenue[]> {
  const { data, error } = await supabase.from('recurring_revenue').select('*').is('deleted_at', null).order('next_due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as RecurringRevenue[]
}

export async function createRecurring(input: RecurringInput): Promise<void> {
  const { error } = await supabase.from('recurring_revenue').insert(input)
  if (error) throw error
}

export async function updateRecurring(id: string, input: RecurringInput): Promise<void> {
  const { error } = await supabase.from('recurring_revenue').update(input).eq('id', id)
  if (error) throw error
}

export async function archiveRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_revenue').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// "Invoiced — roll to next due date": the antidote to forgetting to invoice.
export async function advanceRenewal(id: string, current: string | null, cycle: BillingCycle): Promise<void> {
  if (!current) return
  const d = new Date(current + 'T00:00:00')
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1)
  else return
  const next = d.toISOString().slice(0, 10)
  const { error } = await supabase.from('recurring_revenue').update({ next_due_date: next }).eq('id', id)
  if (error) throw error
}
