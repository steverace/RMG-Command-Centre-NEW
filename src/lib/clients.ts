import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/types'

export type ClientInput = {
  business_name: string | null
  name: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  notes: string | null
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').is('deleted_at', null).order('business_name', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as Client[]
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
  if (error) throw error
  return (data as Client) ?? null
}

export async function createClient(input: ClientInput): Promise<void> {
  const { error } = await supabase.from('clients').insert(input)
  if (error) throw error
}

export async function updateClient(id: string, input: ClientInput): Promise<void> {
  const { error } = await supabase.from('clients').update(input).eq('id', id)
  if (error) throw error
}

export async function archiveClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
