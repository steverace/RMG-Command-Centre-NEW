import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Wrench, Hourglass, AlarmClock, Banknote, TrendingUp, CheckCircle2, CalendarClock } from 'lucide-react'
import { useProjects } from '@/features/projects/useProjects'
import { useTasks } from '@/features/tasks/useTasks'
import { useRecurring } from '@/features/money/useRecurring'
import { useOutgoingPayments } from '@/features/money/useOutgoingPayments'
import { gbp, humanise, monthlyEquivalent } from '@/lib/types'
import type { OutgoingPayment, ProjectWithMetrics, Task, RecurringRevenue } from '@/lib/types'
import { taskOverdue, taskWaiting, taskAiReady, taskManual, taskAvoided, recentlyCompleted } from '@/features/tasks/taskLogic'

type Tone = 'rose' | 'amber' | 'emerald' | 'indigo' | 'slate'
const dotC: Record<Tone, string> = { rose: 'bg-rose-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', indigo: 'bg-indigo-500', slate: 'bg-slate-400' }
const textC: Record<Tone, string> = { rose: 'text-rose-600', amber: 'text-amber-600', emerald: 'text-emerald-600', indigo: 'text-indigo-600', slate: 'text-slate-700' }
const chipC: Record<Tone, string> = { rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700', indigo: 'bg-indigo-50 text-indigo-700', slate: 'bg-slate-100 text-slate-600' }
const todayStr = () => new Date().toISOString().slice(0, 10)
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">{children}</div>
}
function QueueCard({ icon, title, items, dot, empty }: { icon: React.ReactNode; title: string; items: string[]; dot: string; empty: string }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">{icon}<Label>{title}</Label></div>
      {items.length === 0 ? <p className="text-xs text-slate-400">{empty}</p> : (
        <div className="space-y-2">
          {items.slice(0, 5).map((t, i) => <div key={i} className="flex items-start gap-2 text-xs text-slate-600"><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />{t}</div>)}
          {items.length > 5 && <div className="text-[11px] text-slate-400">+{items.length - 5} more</div>}
        </div>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { data: projects, isLoading: lp } = useProjects()
  const { data: tasks, isLoading: lt } = useTasks()
  const { data: recurring } = useRecurring()
  const { data: outgoing } = useOutgoingPayments()

  const d = useMemo(() => {
    const ps: ProjectWithMetrics[] = projects ?? []
    const ts: Task[] = tasks ?? []
    const rs: RecurringRevenue[] = recurring ?? []
    const os: OutgoingPayment[] = outgoing ?? []
    const today = todayStr()
    const soon = plusDays(30)
    const nameOf = new Map(ps.map((p) => [p.id, p.name]))

    const overdueTasks = ts.filter(taskOverdue)
    const overdueProjects = ps.filter((p) => p.metrics?.is_overdue)
    const stale = ps.filter((p) => p.metrics?.is_stale)
    const noNext = ps.filter((p) => p.metrics?.has_no_next_action)
    const waiting = [
      ...ps.filter((p) => p.metrics?.is_waiting).map((p) => p.name),
      ...ts.filter(taskWaiting).map((t) => t.title),
    ]

    const unpaid = ps.filter((p) => ['invoiced', 'part_paid', 'overdue'].includes(p.payment_status) && (p.metrics?.outstanding_balance ?? 0) > 0)
    const totalOutstanding = unpaid.reduce((s, p) => s + (p.metrics?.outstanding_balance ?? 0), 0)
    const topOverdue = unpaid.filter((p) => p.payment_due_date && p.payment_due_date < today).sort((a, b) => (a.payment_due_date! < b.payment_due_date! ? -1 : 1)).slice(0, 3)
    const paidToDate = ps.reduce((s, p) => s + (p.amount_paid ?? 0), 0)

    const mrr = rs.filter((r) => r.active).reduce((s, r) => s + monthlyEquivalent(r), 0)
    const activeRecurring = rs.filter((r) => r.active).length
    const renewalsDue = rs.filter((r) => r.active && r.next_due_date && r.next_due_date <= soon).sort((a, b) => (a.next_due_date! < b.next_due_date! ? -1 : 1))
    const monthlyOutgoing = os.filter((p) => p.active).reduce((s, p) => s + monthlyEquivalent(p), 0)

    const aiReady = ts.filter(taskAiReady)
    const manual = ts.filter(taskManual)
    const avoided = ts.filter(taskAvoided).sort((a, b) => (b.avoidance_level ?? 0) - (a.avoidance_level ?? 0))
    const done = ts.filter(recentlyCompleted)
    const activeProjects = ps.filter((p) => p.status === 'active')

    type Cand = { name: string; sub: string; reason: string; tone: Tone; score: number; to: string }
    const cands: Cand[] = []
    for (const p of ps) {
      const m = p.metrics
      if (p.status === 'completed' || p.status === 'abandoned' || m?.is_waiting) continue
      let score = 0, reason = '', tone: Tone = 'slate'
      if (m?.is_overdue) { score = 100; reason = 'Overdue'; tone = 'rose' }
      else if (p.priority === 'urgent') { score = 85; reason = 'Urgent'; tone = 'rose' }
      else if (p.priority === 'high') { score = 70; reason = 'High priority'; tone = 'amber' }
      else if ((m?.launch_readiness ?? 0) >= 80 && (m?.launch_readiness ?? 100) < 100) { score = 60; reason = 'Push to launch'; tone = 'emerald' }
      else if (m?.is_stale) { score = 40; reason = 'Stale'; tone = 'amber' }
      if (score > 0) cands.push({ name: p.next_action || p.name, sub: p.name, reason, tone, score, to: `/projects/${p.id}` })
    }
    for (const t of ts) {
      if (t.status === 'complete' || taskWaiting(t)) continue
      let score = 0, reason = '', tone: Tone = 'slate'
      if (taskOverdue(t)) { score = 100; reason = 'Overdue'; tone = 'rose' }
      else if (t.priority === 'urgent') { score = 85; reason = 'Urgent'; tone = 'rose' }
      else if (t.priority === 'high') { score = 70; reason = 'High priority'; tone = 'amber' }
      else if (taskAiReady(t)) { score = 30; reason = 'Quick AI win'; tone = 'indigo' }
      if (score > 0) cands.push({ name: t.title, sub: t.project_id ? (nameOf.get(t.project_id) ?? 'Task') : 'Task', reason, tone, score, to: t.project_id ? `/projects/${t.project_id}` : '/tasks' })
    }
    const top3 = cands.sort((a, b) => b.score - a.score).slice(0, 3)

    const signals = [
      { label: 'Overdue', value: String(overdueTasks.length + overdueProjects.length), note: 'past due', tone: 'rose' as Tone },
      { label: 'Stale', value: String(stale.length), note: 'untouched 14d+', tone: 'amber' as Tone },
      { label: 'No next action', value: String(noNext.length), note: 'needs a plan', tone: 'amber' as Tone },
      { label: 'Waiting on', value: String(waiting.length), note: 'blocked elsewhere', tone: 'slate' as Tone },
      { label: 'Unpaid', value: gbp.format(totalOutstanding), note: `${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'}`, tone: 'rose' as Tone },
    ]

    return { top3, signals, unpaid, totalOutstanding, topOverdue, paidToDate, mrr, monthlyOutgoing, activeRecurring, renewalsDue, aiReady, manual, avoided, done, activeProjects, waiting }
  }, [projects, tasks, recurring, outgoing])

  if ((lp || lt) && !projects && !tasks) return <p className="text-sm text-slate-400">Loading your deck…</p>

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-5">
        <div className="mb-3"><Label>Today · Top 3</Label></div>
        {d.top3.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing pressing right now. Add projects or tasks and your focus list builds itself.</p>
        ) : (
          <div className="space-y-2">
            {d.top3.map((t, i) => (
              <Link key={i} to={t.to} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 hover:border-slate-200">
                <span className="ff-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-800">{t.name}</div><div className="text-xs text-slate-400">{t.sub}</div></div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${chipC[t.tone]}`}>{t.reason}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {d.signals.map((s) => (
          <Card key={s.label} className="p-3.5">
            <div className="mb-2 flex items-center justify-between"><Label>{s.label}</Label><span className={`h-1.5 w-1.5 rounded-full ${dotC[s.tone]}`} /></div>
            <div className={`ff-mono text-2xl font-semibold ${textC[s.tone]}`}>{s.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">{s.note}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><Banknote className="h-4 w-4 text-slate-400" /><Label>Money waiting to be collected</Label></div>
          <div className="ff-mono text-3xl font-semibold text-rose-600">{gbp.format(d.totalOutstanding)}</div>
          <div className="mb-3 mt-0.5 text-[11px] text-slate-400">across {d.unpaid.length} unpaid project{d.unpaid.length === 1 ? '' : 's'}</div>
          {d.topOverdue.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
              {d.topOverdue.map((p) => <div key={p.id} className="flex items-center justify-between text-xs"><span className="truncate pr-2 text-slate-600">{p.name}</span><span className="ff-mono font-medium text-slate-800">{gbp.format(p.metrics?.outstanding_balance ?? 0)}</span></div>)}
            </div>
          )}
        </Card>
        <Card className="flex flex-col justify-center p-4">
          <Label>Paid to date</Label>
          <div className="ff-mono mt-1 text-3xl font-semibold text-slate-800">{gbp.format(d.paidToDate)}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><TrendingUp className="h-3 w-3" /> monthly breakdown arrives with the ledger</div>
        </Card>
        <Card className="flex flex-col justify-center p-4">
          <Label>Monthly recurring revenue</Label>
          <div className="ff-mono mt-1 text-3xl font-semibold text-emerald-600">{gbp.format(d.mrr)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">{d.activeRecurring} active recurring item{d.activeRecurring === 1 ? '' : 's'}</div>
        </Card>
        <Card className="flex flex-col justify-center p-4">
          <Label>Monthly outgoing</Label>
          <div className="ff-mono mt-1 text-3xl font-semibold text-slate-800">{gbp.format(d.monthlyOutgoing)}</div>
          <div className={`mt-0.5 text-[11px] ${d.mrr - d.monthlyOutgoing >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gbp.format(d.mrr - d.monthlyOutgoing)} net recurring</div>
        </Card>
      </div>

      {d.renewalsDue.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-amber-500" /><Label>Renewals due to invoice (next 30 days)</Label></div>
          <div className="space-y-1.5">
            {d.renewalsDue.slice(0, 6).map((r) => {
              const overdue = !!r.next_due_date && r.next_due_date < todayStr()
              return (
                <Link key={r.id} to="/money" className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-200">
                  <span className="truncate pr-2 text-slate-700">{r.label} <span className="text-slate-400">· {humanise(r.category)}</span></span>
                  <span className="shrink-0 text-right">
                    <span className="ff-mono text-xs font-medium text-slate-700">{gbp.format(r.amount)}</span>
                    <span className={`ff-mono ml-2 text-[11px] ${overdue ? 'text-rose-600' : 'text-slate-400'}`}>{r.next_due_date}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <QueueCard icon={<Bot className="h-4 w-4 text-indigo-500" />} title="Ready for AI" items={d.aiReady.map((t) => t.title)} dot="bg-indigo-400" empty="No tasks ready for AI" />
        <QueueCard icon={<Wrench className="h-4 w-4 text-slate-400" />} title="Manual only" items={d.manual.map((t) => t.title)} dot="bg-slate-400" empty="No manual tasks" />
        <QueueCard icon={<AlarmClock className="h-4 w-4 text-amber-500" />} title="You've been avoiding" items={d.avoided.map((t) => t.title)} dot="bg-amber-500" empty="Nothing flagged" />
        <QueueCard icon={<Hourglass className="h-4 w-4 text-slate-400" />} title="Waiting on" items={d.waiting} dot="bg-slate-300" empty="Nothing waiting" />
      </div>

      {d.activeProjects.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="mb-3"><Label>Active projects · progress</Label></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {d.activeProjects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="rounded-xl border border-slate-100 p-3 hover:border-slate-200">
                <div className="mb-2 flex items-center justify-between"><span className="truncate pr-2 text-sm font-medium text-slate-800">{p.name}</span><span className="ff-mono text-[11px] font-semibold text-slate-700">{p.metrics?.overall_progress ?? 0}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${p.metrics?.overall_progress ?? 0}%` }} /></div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {d.done.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><Label>Completed this week</Label></div>
          <div className="space-y-1.5">{d.done.map((t) => <div key={t.id} className="text-xs text-slate-500 line-through">{t.title}</div>)}</div>
        </Card>
      )}
    </div>
  )
}
