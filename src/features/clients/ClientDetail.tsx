import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Mail, Phone, Globe, MapPin } from 'lucide-react'
import { useClient } from '@/features/clients/useClients'
import { useProjects } from '@/features/projects/useProjects'
import { useRecurring } from '@/features/money/useRecurring'
import { useQuotes } from '@/features/quotes/useQuotes'
import ClientForm from '@/features/clients/ClientForm'
import { clientDisplayName, gbp, humanise } from '@/lib/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="ff-mono mb-2 text-[10px] uppercase tracking-widest text-slate-400">{title}</div>
      {children}
    </div>
  )
}

export default function ClientDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: client, isLoading, isError, error } = useClient(id)
  const { data: projects } = useProjects()
  const { data: recurring } = useRecurring()
  const { data: quotes } = useQuotes()
  const [editOpen, setEditOpen] = useState(false)

  const back = <Link to="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Clients</Link>

  if (isLoading) return <div>{back}<p className="text-sm text-slate-400">Loading…</p></div>
  if (isError) return <div>{back}<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load: {error instanceof Error ? error.message : 'unknown error'}</div></div>
  if (!client) return <div>{back}<p className="text-sm text-slate-400">This client no longer exists.</p></div>

  const myProjects = (projects ?? []).filter((p) => p.client_id === id)
  const myRenewals = (recurring ?? []).filter((r) => r.client_id === id)
  const myQuotes = (quotes ?? []).filter((q) => q.client_id === id)

  return (
    <div>
      {back}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">{clientDisplayName(client)}</h2>
          {client.name && client.business_name && <p className="mt-0.5 text-sm text-slate-500">{client.name}</p>}
        </div>
        <button onClick={() => setEditOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" /> Edit</button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Section title="Contact">
          <div className="space-y-1.5 text-sm text-slate-600">
            {client.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> {client.email}</div>}
            {client.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {client.phone}</div>}
            {client.website && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-slate-400" /> <a href={client.website} target="_blank" rel="noreferrer" className="text-slate-700 underline-offset-2 hover:underline">{client.website}</a></div>}
            {client.address && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="whitespace-pre-line">{client.address}</span></div>}
            {!client.email && !client.phone && !client.website && !client.address && <p className="text-slate-400">No contact details yet.</p>}
          </div>
        </Section>

        <Section title="Notes">
          {client.notes ? <p className="whitespace-pre-line text-sm text-slate-600">{client.notes}</p> : <p className="text-sm text-slate-400">No notes yet.</p>}
        </Section>

        <Section title={`Projects (${myProjects.length})`}>
          {myProjects.length === 0 ? <p className="text-sm text-slate-400">No linked projects. Set a project's client to this one.</p> : (
            <div className="space-y-1.5">
              {myProjects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-200">
                  <span className="truncate pr-2 text-slate-700">{p.name}</span>
                  <span className="ff-mono shrink-0 text-xs text-slate-500">{p.metrics?.overall_progress ?? 0}%</span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title={`Hosting & renewals (${myRenewals.length})`}>
          {myRenewals.length === 0 ? <p className="text-sm text-slate-400">No renewals linked. Add one in Money.</p> : (
            <div className="space-y-1.5">
              {myRenewals.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="truncate pr-2 text-slate-700">{r.label} <span className="text-slate-400">· {humanise(r.category)}</span></span>
                  <span className="shrink-0 text-right">
                    <span className="ff-mono text-xs font-medium text-slate-700">{gbp.format(r.amount)}</span>
                    {r.next_due_date && <span className="ff-mono ml-2 text-[11px] text-slate-400">{r.next_due_date}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {myQuotes.length > 0 && (
          <Section title={`Quotes (${myQuotes.length})`}>
            <div className="space-y-1.5">
              {myQuotes.map((q) => (
                <Link key={q.id} to="/quotes" className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-200">
                  <span className="truncate pr-2 text-slate-700">{q.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">{humanise(q.status)}{q.amount ? ` · ${gbp.format(q.amount)}` : ''}</span>
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>

      {editOpen && <ClientForm client={client} onClose={() => setEditOpen(false)} onArchived={() => { setEditOpen(false); navigate('/clients') }} />}
    </div>
  )
}
