import { supabase } from '@/lib/supabase'
import type { Quote, QuoteStatus } from '@/lib/types'

export type QuoteInput = {
  title: string
  client_id: string | null
  prospect_name: string | null
  amount: number | null
  status: QuoteStatus
  sent_on: string | null
  follow_up_date: string | null
  notes: string | null
}

export async function listQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase.from('quotes').select('*').is('deleted_at', null).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Quote[]
}

export async function createQuote(input: QuoteInput): Promise<void> {
  const { error } = await supabase.from('quotes').insert(input)
  if (error) throw error
}

export async function updateQuote(id: string, input: QuoteInput): Promise<void> {
  const { error } = await supabase.from('quotes').update(input).eq('id', id)
  if (error) throw error
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
  if (error) throw error
}

export async function archiveQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
