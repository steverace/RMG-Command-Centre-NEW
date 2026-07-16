import { useState } from 'react'
import { BookOpen, ExternalLink, Plus } from 'lucide-react'
import { obsidianOpenUrl, plannedVaultPath } from '@/lib/knowledge'
import { useCreateKnowledgeRef, useKnowledgeRefs } from '@/features/knowledge/useKnowledgeRefs'
import type { KnowledgeEntityType } from '@/lib/types'

type Props = {
  entityType: KnowledgeEntityType
  entityId: string
  entityTitle: string
  note?: string
}

export default function KnowledgePanel({ entityType, entityId, entityTitle, note }: Props) {
  const refs = useKnowledgeRefs(entityType, entityId)
  const create = useCreateKnowledgeRef()
  const [error, setError] = useState<string | null>(null)

  async function createPlannedNote() {
    setError(null)
    const vaultPath = plannedVaultPath(entityType, entityTitle)
    try {
      await create.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        vault_path: vaultPath,
        title: entityTitle,
        summary: note ?? `Planned ${entityType} note for the local Obsidian bridge to create.`,
        tags: ['rmcc', entityType],
        last_synced_at: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the vault note link')
    }
  }

  const items = refs.data ?? []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-400" />
            <h3 className="font-display text-sm font-semibold text-slate-800">Knowledge</h3>
            <span className="ff-mono text-xs text-slate-400">{items.length}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">Local Obsidian notes linked to this {entityType}.</p>
        </div>
        <button
          type="button"
          onClick={createPlannedNote}
          disabled={create.isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" /> Vault note
        </button>
      </div>

      {refs.isLoading && <p className="text-sm text-slate-400">Loading knowledge links...</p>}
      {refs.isError && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Knowledge links need the Supabase setup SQL before they can load.
        </p>
      )}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      {!refs.isLoading && !refs.isError && items.length === 0 && (
        <p className="text-sm text-slate-400">No vault notes linked yet.</p>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item) => (
            <a
              key={item.id}
              href={obsidianOpenUrl(item.vault_path)}
              className="block rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-200"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-700">{item.title}</span>
                  <span className="ff-mono mt-0.5 block truncate text-[11px] text-slate-400">{item.vault_path}</span>
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
              </span>
              {item.summary && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{item.summary}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
