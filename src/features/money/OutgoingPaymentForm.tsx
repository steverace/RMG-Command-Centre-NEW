import { useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, X } from 'lucide-react'
import { BILLING_CYCLES, OUTGOING_CATEGORIES, humanise } from '@/lib/types'
import type { OutgoingPayment } from '@/lib/types'
import type { OutgoingPaymentInput } from '@/lib/outgoingPayments'
import { useArchiveOutgoingPayment, useCreateOutgoingPayment, useUpdateOutgoingPayment } from '@/features/money/useOutgoingPayments'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

export default function OutgoingPaymentForm({ item, onClose }: { item: OutgoingPayment | null; onClose: () => void }) {
  const create = useCreateOutgoingPayment()
  const update = useUpdateOutgoingPayment()
  const archive = useArchiveOutgoingPayment()
  const editing = !!item

  const [label, setLabel] = useState(item?.label ?? '')
  const [category, setCategory] = useState(item?.category ?? 'subscription')
  const [supplier, setSupplier] = useState(item?.supplier ?? '')
  const [amount, setAmount] = useState(item?.amount?.toString() ?? '')
  const [cycle, setCycle] = useState(item?.billing_cycle ?? 'monthly')
  const [nextDue, setNextDue] = useState(item?.next_due_date ?? '')
  const [paymentMethod, setPaymentMethod] = useState(item?.payment_method ?? '')
  const [isBusiness, setIsBusiness] = useState(item?.is_business ?? true)
  const [active, setActive] = useState(item?.active ?? true)
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: OutgoingPaymentInput = {
      label: label.trim(),
      category,
      supplier: supplier.trim() || null,
      amount: amount.trim() === '' ? 0 : Number(amount),
      billing_cycle: cycle,
      next_due_date: nextDue || null,
      active,
      payment_method: paymentMethod.trim() || null,
      is_business: isBusiness,
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
    if (!window.confirm('Remove this outgoing payment?')) return
    try { await archive.mutateAsync(item.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit outgoing payment' : 'New outgoing payment'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="o-label">Payment</label>
            <input id="o-label" required value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="e.g. SiteGround hosting" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="o-cat">Type</label>
              <select id="o-cat" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={inputCls}>
                {OUTGOING_CATEGORIES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="o-supplier">Supplier</label>
              <input id="o-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} placeholder="e.g. Google, Cloudflare" />
            </div>
            <div>
              <label className={labelCls} htmlFor="o-amount">Amount (£)</label>
              <input id="o-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="o-cycle">Billed</label>
              <select id="o-cycle" value={cycle} onChange={(e) => setCycle(e.target.value as typeof cycle)} className={inputCls}>
                {BILLING_CYCLES.map((c) => <option key={c} value={c}>{humanise(c)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="o-due">Next payment date</label>
              <input id="o-due" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="o-method">Paid from</label>
              <input id="o-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls} placeholder="e.g. Starling, PayPal" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-600"><input type="checkbox" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} className="h-4 w-4" /> Business cost</label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-600"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" /> Active</label>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="o-notes">Notes</label>
            <textarea id="o-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Renewal notes, cancellation link, account email, etc." />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Remove</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Saving...' : editing ? 'Save' : 'Add'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
