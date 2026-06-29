import { useMemo, useState } from 'react'
import { Plus, Banknote, CalendarClock, CheckCircle2, CreditCard, AlertCircle, TrendingDown } from 'lucide-react'
import { useProjects } from '@/features/projects/useProjects'
import { useClients } from '@/features/clients/useClients'
import { useRecurring, useAdvanceRenewal } from '@/features/money/useRecurring'
import { useAdvanceOutgoingPayment, useOutgoingPayments } from '@/features/money/useOutgoingPayments'
import RecurringForm from '@/features/money/RecurringForm'
import OutgoingPaymentForm from '@/features/money/OutgoingPaymentForm'
import { gbp, humanise, monthlyEquivalent, clientDisplayName } from '@/lib/types'
import type { OutgoingPayment, RecurringRevenue } from '@/lib/types'

const todayStr = () => new Date().toISOString().slice(0, 10)
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">{children}</div>
}

export default function MoneyPage() {
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  const { data: recurring } = useRecurring()
  const outgoingQuery = useOutgoingPayments()
  const advance = useAdvanceRenewal()
  const advanceOutgoing = useAdvanceOutgoingPayment()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringRevenue | null>(null)
  const [outgoingFormOpen, setOutgoingFormOpen] = useState(false)
  const [editingOutgoing, setEditingOutgoing] = useState<OutgoingPayment | null>(null)

  const clientName = useMemo(() => {
    const m = new Map<string, string>()
    ;(clients ?? []).forEach((c) => m.set(c.id, clientDisplayName(c)))
    return m
  }, [clients])

  const owed = useMemo(() => {
    const ps = projects ?? []
    const unpaid = ps.filter((p) => ['invoiced', 'part_paid', 'overdue'].includes(p.payment_status) && (p.metrics?.outstanding_balance ?? 0) > 0)
    return { total: unpaid.reduce((s, p) => s + (p.metrics?.outstanding_balance ?? 0), 0), count: unpaid.length }
  }, [projects])

  const items = recurring ?? []
  const mrr = items.filter((r) => r.active).reduce((s, r) => s + monthlyEquivalent(r), 0)
  const outgoing = outgoingQuery.data ?? []
  const activeOutgoing = outgoing.filter((p) => p.active)
  const monthlyOutgoing = activeOutgoing.reduce((s, p) => s + monthlyEquivalent(p), 0)
  const annualOutgoing = monthlyOutgoing * 12
  const today = todayStr()
  const soon = plusDays(30)
  const dueToInvoice = items.filter((r) => r.active && r.next_due_date && r.next_due_date <= soon).sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1))
  const dueToPay = activeOutgoing.filter((p) => p.next_due_date && p.next_due_date <= soon).sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1))
  const outgoingByCategory = Object.entries(activeOutgoing.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + monthlyEquivalent(p)
    return acc
  }, {})).sort((a, b) => b[1] - a[1])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(r: RecurringRevenue) { setEditing(r); setFormOpen(true) }
  function openOutgoingCreate() { setEditingOutgoing(null); setOutgoingFormOpen(true) }
  function openOutgoingEdit(p: OutgoingPayment) { setEditingOutgoing(p); setOutgoingFormOpen(true) }

  const cycleSuffix = (cycle: string) => cycle === 'annual' ? 'yr' : cycle === 'quarterly' ? 'qtr' : cycle === 'monthly' ? 'mo' : cycle === 'weekly' ? 'wk' : 'once'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2"><Banknote className="h-4 w-4 text-slate-400" /><Label>Owed to you</Label></div>
          <div className="ff-mono text-2xl font-semibold text-rose-600">{gbp.format(owed.total)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{owed.count} unpaid project{owed.count === 1 ? '' : 's'}</div>
        </Card>
        <Card className="p-4">
          <Label>Monthly recurring revenue</Label>
          <div className="ff-mono mt-1 text-2xl font-semibold text-emerald-600">{gbp.format(mrr)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">from {items.filter((r) => r.active).length} active item{items.filter((r) => r.active).length === 1 ? '' : 's'}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2"><CreditCard className="h-4 w-4 text-slate-400" /><Label>Monthly outgoing</Label></div>
          <div className="ff-mono text-2xl font-semibold text-slate-800">{gbp.format(monthlyOutgoing)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{activeOutgoing.length} active payment{activeOutgoing.length === 1 ? '' : 's'}</div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-amber-500" /><Label>Net recurring</Label></div>
          <div className={`ff-mono text-2xl font-semibold ${mrr - monthlyOutgoing >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gbp.format(mrr - monthlyOutgoing)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">income minus outgoing</div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-amber-500" /><Label>Due to invoice (30 days)</Label></div>
          <div className="ff-mono text-2xl font-semibold text-amber-600">{dueToInvoice.length}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">renewals coming up</div>
        </Card>
      </div>

      {dueToInvoice.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-amber-500" /><Label>Invoice these — don't forget</Label></div>
          <div className="space-y-2">
            {dueToInvoice.map((r) => {
              const overdue = !!r.next_due_date && r.next_due_date < today
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-700">{r.label}{r.client_id ? <span className="text-slate-400"> · {clientName.get(r.client_id)}</span> : ''}</div>
                    <div className="ff-mono text-[11px] text-slate-400">{gbp.format(r.amount)} {humanise(r.billing_cycle)} · due <span className={overdue ? 'text-rose-600' : ''}>{r.next_due_date}</span></div>
                  </div>
                  <button onClick={() => advance.mutate({ id: r.id, current: r.next_due_date, cycle: r.billing_cycle })} disabled={advance.isPending}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Invoiced — next
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {outgoingQuery.isError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <div className="font-display text-sm font-semibold text-amber-900">Outgoing payments need the Supabase table</div>
              <p className="mt-1 text-sm leading-6 text-amber-800">The dashboard code is ready. Run the SQL in <span className="ff-mono">docs/OUTGOING-PAYMENTS-SETUP.md</span>, then this section will save and load payments.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Label>Outgoing payments</Label>
            <button onClick={openOutgoingCreate} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"><Plus className="h-3.5 w-3.5" /> Add outgoing</button>
          </div>
          {outgoing.length === 0 ? (
            <p className="py-3 text-sm text-slate-400">No outgoing payments yet. Add subscriptions, hosting, domains, bills or software so you can review what is going out.</p>
          ) : (
            <div>
              {outgoing.map((p) => {
                const overdue = !!p.next_due_date && p.next_due_date < today && p.active
                return (
                  <button key={p.id} onClick={() => openOutgoingEdit(p)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2.5 text-left last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-800">{p.label} {!p.active && <span className="text-[10px] text-slate-400">(inactive)</span>}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase tracking-wider text-slate-500">{humanise(p.category)}</span>
                        {p.supplier && <span>{p.supplier}</span>}
                        {p.payment_method && <span>{p.payment_method}</span>}
                        {p.next_due_date && <span className={`ff-mono ${overdue ? 'text-rose-600' : ''}`}>due {p.next_due_date}</span>}
                      </div>
                    </div>
                    <span className="ff-mono shrink-0 text-sm font-medium text-slate-700">{gbp.format(p.amount)}<span className="text-[10px] text-slate-400">/{cycleSuffix(p.billing_cycle)}</span></span>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <Label>Outgoing review</Label>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-400">Annual run rate</div>
              <div className="ff-mono mt-1 text-xl font-semibold text-slate-800">{gbp.format(annualOutgoing)}</div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-slate-500">By category</div>
              {outgoingByCategory.length === 0 ? <p className="text-xs text-slate-400">Add payments to build the breakdown.</p> : (
                <div className="space-y-1.5">
                  {outgoingByCategory.slice(0, 6).map(([category, total]) => (
                    <div key={category} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{humanise(category)}</span>
                      <span className="ff-mono font-medium text-slate-700">{gbp.format(total)}/mo</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {dueToPay.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-amber-500" /><Label>Outgoing due soon</Label></div>
          <div className="space-y-2">
            {dueToPay.map((p) => {
              const overdue = !!p.next_due_date && p.next_due_date < today
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-700">{p.label}{p.supplier ? <span className="text-slate-400"> - {p.supplier}</span> : ''}</div>
                    <div className="ff-mono text-[11px] text-slate-400">{gbp.format(p.amount)} {humanise(p.billing_cycle)} - due <span className={overdue ? 'text-rose-600' : ''}>{p.next_due_date}</span></div>
                  </div>
                  <button onClick={() => advanceOutgoing.mutate({ id: p.id, current: p.next_due_date, cycle: p.billing_cycle })} disabled={advanceOutgoing.isPending}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Paid - next
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Label>Recurring income & renewals</Label>
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"><Plus className="h-3.5 w-3.5" /> Add</button>
        </div>
        {items.length === 0 ? (
          <p className="py-3 text-sm text-slate-400">No recurring income yet. Add hosting, domains or retainers to track renewals and never miss an invoice.</p>
        ) : (
          <div>
            {items.map((r) => (
              <button key={r.id} onClick={() => openEdit(r)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2.5 text-left last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-800">{r.label} {!r.active && <span className="text-[10px] text-slate-400">(inactive)</span>}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase tracking-wider text-slate-500">{humanise(r.category)}</span>
                    {r.client_id && <span>{clientName.get(r.client_id)}</span>}
                    {r.next_due_date && <span className="ff-mono">due {r.next_due_date}</span>}
                  </div>
                </div>
                <span className="ff-mono shrink-0 text-sm font-medium text-slate-700">{gbp.format(r.amount)}<span className="text-[10px] text-slate-400">/{cycleSuffix(r.billing_cycle)}</span></span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {formOpen && <RecurringForm item={editing} onClose={() => setFormOpen(false)} />}
      {outgoingFormOpen && <OutgoingPaymentForm item={editingOutgoing} onClose={() => setOutgoingFormOpen(false)} />}
    </div>
  )
}
