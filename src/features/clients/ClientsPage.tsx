import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useClients } from '@/features/clients/useClients'
import ClientForm from '@/features/clients/ClientForm'
import EmptyState from '@/components/EmptyState'
import { clientDisplayName } from '@/lib/types'

export default function ClientsPage() {
  const { data, isLoading, isError, error } = useClients()
  const [formOpen, setFormOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{data ? `${data.length} client${data.length === 1 ? '' : 's'}` : '\u00A0'}</p>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"><Plus className="h-4 w-4" /> Add client</button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading clients…</p>}
      {isError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load clients: {error instanceof Error ? error.message : 'unknown error'}</div>}
      {data && data.length === 0 && <EmptyState icon={Users} title="No clients yet" note="Add a client profile, then link projects and hosting renewals to it." />}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300">
              <div className="font-medium text-slate-800">{clientDisplayName(c)}</div>
              {c.name && c.business_name && <div className="mt-0.5 text-xs text-slate-500">{c.name}</div>}
              <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                {c.email && <div className="truncate">{c.email}</div>}
                {c.website && <div className="truncate">{c.website}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {formOpen && <ClientForm client={null} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
