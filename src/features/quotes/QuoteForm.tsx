import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Archive } from 'lucide-react'
import { QUOTE_STATUSES, humanise, clientDisplayName } from '@/lib/types'
import type { Quote } from '@/lib/types'
import type { QuoteInput } from '@/lib/quotes'
import { useCreateQuote, useUpdateQuote, useArchiveQuote } from '@/features/quotes/useQuotes'
import { useClients } from '@/features/clients/useClients'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

export default function QuoteForm({ quote, onClose }: { quote: Quote | null; onClose: () => void }) {
  const create = useCreateQuote()
  const update = useUpdateQuote()
  const archive = useArchiveQuote()
  const { data: clients } = useClients()
  const editing = !!quote

  const [title, setTitle] = useState(quote?.title ?? '')
  const [clientId, setClientId] = useState(quote?.client_id ?? '')
  const [prospect, setProspect] = useState(quote?.prospect_name ?? '')
  const [amount, setAmount] = useState(quote?.amount?.toString() ?? '')
  const [status, setStatus] = useState(quote?.status ?? 'to_send')
  const [sentOn, setSentOn] = useState(quote?.sent_on ?? '')
  const [followUp, setFollowUp] = useState(quote?.follow_up_date ?? '')
  const [notes, setNotes] = useState(quote?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: QuoteInput = {
      title: title.trim(),
      client_id: clientId || null,
      prospect_name: clientId ? null : (prospect.trim() || null),
      amount: amount.trim() === '' ? null : Number(amount),
      status,
      sent_on: sentOn || null,
      follow_up_date: followUp || null,
      notes: notes.trim() || null,
    }
    try {
      if (editing && quote) await update.mutateAsync({ id: quote.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
  }
  async function onArchive() {
    if (!quote) return
    if (!window.confirm('Delete this quote?')) return
    try { await archive.mutateAsync(quote.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit quote' : 'New quote'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="q-title">What's the quote for?</label>
            <input id="q-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. New website + 12 months hosting" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="q-client">Client</label>
              <select id="q-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                <option value="">— Prospect (not a client yet) —</option>
                {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="q-amount">Amount (£)</label>
              <input id="q-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </div>
            {!clientId && (
              <div className="col-span-2">
                <label className={labelCls} htmlFor="q-prospect">Prospect name</label>
                <input id="q-prospect" value={prospect} onChange={(e) => setProspect(e.target.value)} className={inputCls} placeholder="Who's it for?" />
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="q-status">Status</label>
              <select id="q-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls}>
                {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="q-sent">Sent on</label>
              <input id="q-sent" type="date" value={sentOn} onChange={(e) => setSentOn(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls} htmlFor="q-follow">Follow-up date <span className="text-slate-300">(when to chase / revisit)</span></label>
              <input id="q-follow" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="q-notes">Notes</label>
            <textarea id="q-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Delete</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save' : 'Create quote'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
