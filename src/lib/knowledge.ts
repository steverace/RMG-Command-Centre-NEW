import { supabase } from '@/lib/supabase'
import type { KnowledgeEntityType, KnowledgeRef } from '@/lib/types'

export type KnowledgeRefInput = {
  entity_type: KnowledgeEntityType
  entity_id: string
  vault_path: string
  title: string
  summary: string | null
  tags: string[]
  last_synced_at: string | null
}

const VAULT_NAME = 'Race Media Second Brain'

const folderByEntity: Record<KnowledgeEntityType, string> = {
  project: '02-Projects',
  client: '03-Clients',
  task: '00-Inbox',
  idea: '06-Ideas',
  quote: '04-Areas',
  goal: '04-Areas',
}

function cleanFilePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96) || 'Untitled'
}

export function plannedVaultPath(entityType: KnowledgeEntityType, title: string): string {
  return `${folderByEntity[entityType]}/${cleanFilePart(title)}.md`
}

export function obsidianOpenUrl(path: string): string {
  return `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(path)}`
}

export async function listKnowledgeRefs(entityType: KnowledgeEntityType, entityId: string): Promise<KnowledgeRef[]> {
  const { data, error } = await supabase
    .from('knowledge_refs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as KnowledgeRef[]
}

export async function listKnowledgeRefsByEntity(entityType: KnowledgeEntityType): Promise<KnowledgeRef[]> {
  const { data, error } = await supabase
    .from('knowledge_refs')
    .select('*')
    .eq('entity_type', entityType)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as KnowledgeRef[]
}

export async function createKnowledgeRef(input: KnowledgeRefInput): Promise<void> {
  const { error } = await supabase.from('knowledge_refs').insert(input)
  if (error) throw error
}
