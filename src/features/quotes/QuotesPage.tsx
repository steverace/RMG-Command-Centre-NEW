import { useMemo, useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import { useQuotes, useSetQuoteStatus } from '@/features/quotes/useQuotes'
import { useClients } from '@/features/clients/useClients'
import QuoteForm from '@/features/quotes/QuoteForm'
import EmptyState from '@/components/EmptyState'
import { QUOTE_STATUSES, humanise, gbp, clientDisplayName } from '@/lib/types'
import type { Quote, QuoteStatus } from '@/lib/types'

const statusTone: Record<QuoteStatus, string> = {
  to_send: 'bg-slate-100 text-slate-600',
  sent: 'bg-indigo-50 text-indigo-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-rose-50 text-rose-700',
  expired: 'bg-amber-50 text-amber-700',
}
const todayStr = () => new Date().toISOString().slice(0, 10)
type Filter = 'all' | QuoteStatus

function Row({ quote, who, onEdit }: { quote: Quote; who: string; onEdit: () => void }) {
  const setStatus = useSetQuoteStatus()
  const followDue = !!quote.follow_up_date && quote.follow_up_date <= todayStr() && quote.status === 'sent'
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <select value={quote.status} onClick={(e) => e.stopPropagation()} onChange={(e) => setStatus.mutate({ id: quote.id, status: e.target.value as QuoteStatus })}
        className={`shrink-0 rounded-md border-0 px-2 py-1 text-xs font-medium ${statusTone[quote.status]}`}>
        {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
      </select>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm text-slate-800">{quote.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span>{who}</span>
          {quote.sent_on && <span className="ff-mono">sent {quote.sent_on}</span>}
          {quote.follow_up_date && <span className={`ff-mono ${followDue ? 'text-rose-600' : ''}`}>follow up {quote.follow_up_date}</span>}
        </div>
      </button>
      {quote.amount != null && <span className="ff-mono shrink-0 text-sm font-medium text-slate-700">{gbp.format(quote.amount)}</span>}
    </div>
  )
}

export default function QuotesPage() {
  const { data: quotes, isLoading, isError, error } = useQuotes()
  const { data: clients } = useClients()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const clientName = useMemo(() => {
    const m = new Map<string, string>()
    ;(clients ?? []).forEach((c) => m.set(c.id, clientDisplayName(c)))
    return m
  }, [clients])

  const all = quotes ?? []
  const filtered = filter === 'all' ? all : all.filter((q) => q.status === filter)
  const pipeline = all.filter((q) => q.status === 'to_send' || q.status === 'sent').reduce((s, q) => s + (q.amount ?? 0), 0)
  const won = all.filter((q) => q.status === 'accepted').reduce((s, q) => s + (q.amount ?? 0), 0)

  function whoFor(q: Quote): string { return q.client_id ? (clientName.get(q.client_id) ?? 'Client') : (q.prospect_name || 'Prospect') }
  function openCreate() { setEditing(null); setFormOpen(true) }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter('all')} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}>All</button>
          {QUOTE_STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${filter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800'}`}>{humanise(s)}</button>
          ))}
        </div>
        <button onClick={openCreate} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"><Plus className="h-4 w-4" /> Add quote</button>
      </div>

      {all.length > 0 && (
        <div className="mb-4 flex gap-4 text-sm">
          <span className="text-slate-500">Open pipeline <span className="ff-mono font-semibold text-slate-800">{gbp.format(pipeline)}</span></span>
          <span className="text-slate-500">Won <span className="ff-mono font-semibold text-emerald-600">{gbp.format(won)}</span></span>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading quotes…</p>}
      {isError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn't load quotes: {error instanceof Error ? error.message : 'unknown error'}</div>}
      {all.length === 0 && !isLoading && <EmptyState icon={FileText} title="No quotes yet" note="Track quotes you've sent or need to send, so nothing slips through and you can revisit later." />}

      {all.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {filtered.length === 0 ? <p className="py-3 text-sm text-slate-400">Nothing in this filter.</p> : filtered.map((q) => <Row key={q.id} quote={q} who={whoFor(q)} onEdit={() => { setEditing(q); setFormOpen(true) }} />)}
        </div>
      )}

      {formOpen && <QuoteForm quote={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
