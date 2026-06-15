import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Archive } from 'lucide-react'
import { RECURRING_CATEGORIES, BILLING_CYCLES, humanise } from '@/lib/types'
import type { RecurringRevenue } from '@/lib/types'
import type { RecurringInput } from '@/lib/recurring'
import { useCreateRecurring, useUpdateRecurring, useArchiveRecurring } from '@/features/money/useRecurring'
import { useClients } from '@/features/clients/useClients'
import { clientDisplayName } from '@/lib/types'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

export default function RecurringForm({ item, onClose }: { item: RecurringRevenue | null; onClose: () => void }) {
  const create = useCreateRecurring()
  const update = useUpdateRecurring()
  const archive = useArchiveRecurring()
  const { data: clients } = useClients()
  const editing = !!item

  const [label, setLabel] = useState(item?.label ?? '')
  const [category, setCategory] = useState(item?.category ?? 'hosting')
  const [clientId, setClientId] = useState(item?.client_id ?? '')
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '')
  const [cycle, setCycle] = useState(item?.billing_cycle ?? 'annual')
  const [nextDue, setNextDue] = useState(item?.next_due_date ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: RecurringInput = {
      label: label.trim(),
      category, client_id: clientId || null,
      amount: amount.trim() === '' ? 0 : Number(amount),
      billing_cycle: cycle,
      next_due_date: nextDue || null,
      active,
      notes: notes.trim() || null,
    }
    try {
      if (editing && item) await update.mutateAsync({ id: item.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
  }
  async function onArchive() {
    if (!item) return
    if (!window.confirm('Remove this recurring item?')) return
    try { await archive.mutateAsync(item.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit recurring item' : 'New recurring / renewal'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="r-label">Label</label>
            <input id="r-label" required value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="e.g. GreenLinc hosting" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="r-cat">Type</label>
              <select id="r-cat" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={inputCls}>
                {RECURRING_CATEGORIES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="r-client">Client</label>
              <select id="r-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="r-amount">Amount (£)</label>
              <input id="r-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="r-cycle">Billed</label>
              <select id="r-cycle" value={cycle} onChange={(e) => setCycle(e.target.value as typeof cycle)} className={inputCls}>
                {BILLING_CYCLES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="r-due">Next due / renewal date</label>
              <input id="r-due" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-600"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" /> Active</label>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="r-notes">Notes</label>
            <textarea id="r-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Remove</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save' : 'Add'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
