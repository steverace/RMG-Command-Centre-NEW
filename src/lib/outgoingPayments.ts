import { supabase } from '@/lib/supabase'
import type { BillingCycle, OutgoingPayment } from '@/lib/types'

export type OutgoingPaymentInput = {
  label: string
  category: OutgoingPayment['category']
  supplier: string | null
  amount: number
  billing_cycle: BillingCycle
  next_due_date: string | null
  active: boolean
  payment_method: string | null
  is_business: boolean
  notes: string | null
}

function nextDate(current: string, cycle: BillingCycle): string | null {
  const d = new Date(current + 'T00:00:00')
  if (cycle === 'weekly') d.setDate(d.getDate() + 7)
  else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1)
  else return null
  return d.toISOString().slice(0, 10)
}

export async function listOutgoingPayments(): Promise<OutgoingPayment[]> {
  const { data, error } = await supabase.from('outgoing_payments').select('*').is('deleted_at', null).order('next_due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as OutgoingPayment[]
}

export async function createOutgoingPayment(input: OutgoingPaymentInput): Promise<void> {
  const { error } = await supabase.from('outgoing_payments').insert(input)
  if (error) throw error
}

export async function updateOutgoingPayment(id: string, input: OutgoingPaymentInput): Promise<void> {
  const { error } = await supabase.from('outgoing_payments').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function archiveOutgoingPayment(id: string): Promise<void> {
  const { error } = await supabase.from('outgoing_payments').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function advanceOutgoingPayment(id: string, current: string | null, cycle: BillingCycle): Promise<void> {
  if (!current) return
  const next_due_date = nextDate(current, cycle)
  const patch = next_due_date
    ? { next_due_date, last_paid_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }
    : { active: false, last_paid_on: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }
  const { error } = await supabase.from('outgoing_payments').update(patch).eq('id', id)
  if (error) throw error
}
