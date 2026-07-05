import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, HelpCircle, Banknote, Snowflake, Hourglass, Lightbulb, Target } from 'lucide-react'
import { useProjects } from '@/features/projects/useProjects'
import { useTasks } from '@/features/tasks/useTasks'
import { useRecurring } from '@/features/money/useRecurring'
import { useOutgoingPayments } from '@/features/money/useOutgoingPayments'
import { useQuotes } from '@/features/quotes/useQuotes'
import { useIdeas } from '@/features/ideas/useIdeas'
import { useGoalMilestones, useGoals, useHabitLogs, useHabits } from '@/features/goals/useGoalsHabits'
import { gbp, humanise, monthlyEquivalent } from '@/lib/types'
import type { Habit, HabitLog } from '@/lib/types'
import { taskWaiting, taskAvoided, recentlyCompleted, daysSince } from '@/features/tasks/taskLogic'

const todayStr = () => new Date().toISOString().slice(0, 10)
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function isHabitDueToday(habit: Habit, logs: HabitLog[]) {
  if (!habit.active) return false
  const day = new Date().getDay()
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekdays') return day >= 1 && day <= 5
  if (habit.frequency === 'custom') return (habit.days_of_week ?? []).includes(day)
  const weekStart = daysAgo(day === 0 ? 6 : day - 1)
  return !logs.some((l) => l.habit_id === habit.id && l.completed && l.log_date >= weekStart)
}

type Item = { key: string; text: string; meta?: string; to?: string; tone?: 'rose' | 'amber' | 'emerald' | 'slate' }

function Section({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: Item[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">{icon}<span className="font-display text-sm font-semibold text-slate-800">{title}</span><span className="ff-mono text-xs text-slate-400">{items.length}</span></div>
      {items.length === 0 ? <p className="text-xs text-slate-400">{empty}</p> : (
        <div className="space-y-1.5">
          {items.map((it) => {
            const body = (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-700">{it.text}</span>
                {it.meta && <span className={`ff-mono shrink-0 text-[11px] ${it.tone === 'rose' ? 'text-rose-600' : it.tone === 'amber' ? 'text-amber-600' : it.tone === 'emerald' ? 'text-emerald-600' : 'text-slate-400'}`}>{it.meta}</span>}
              </div>
            )
            return it.to
              ? <Link key={it.key} to={it.to} className="block rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-slate-200">{body}</Link>
              : <div key={it.key} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">{body}</div>
          })}
        </div>
      )}
    </div>
  )
}

export default function WeeklyReview() {
  const { data: projects } = useProjects()
  const { data: tasks } = useTasks()
  const { data: recurring } = useRecurring()
  const { data: outgoing } = useOutgoingPayments()
  const { data: quotes } = useQuotes()
  const { data: ideas } = useIdeas()
  const { data: goals } = useGoals()
  const { data: goalMilestones } = useGoalMilestones()
  const { data: habits } = useHabits()
  const { data: habitLogs } = useHabitLogs()

  const r = useMemo(() => {
    const ps = projects ?? [], ts = tasks ?? [], rs = recurring ?? [], os = outgoing ?? [], qs = quotes ?? [], is = ideas ?? []
    const gs = goals ?? [], ms = goalMilestones ?? [], hs = habits ?? [], hls = habitLogs ?? []
    const today = todayStr(), soon = plusDays(30)

    const wins: Item[] = [
      ...ts.filter(recentlyCompleted).map((t) => ({ key: `t${t.id}`, text: t.title, tone: 'emerald' as const })),
      ...ps.filter((p) => p.status === 'completed' && daysSince(p.updated_at) <= 7).map((p) => ({ key: `p${p.id}`, text: p.name, meta: 'launched', to: `/projects/${p.id}`, tone: 'emerald' as const })),
    ]
    const decisions: Item[] = ps.filter((p) => p.metrics?.has_no_next_action).map((p) => ({ key: p.id, text: p.name, meta: 'no next action', to: `/projects/${p.id}`, tone: 'amber' as const }))

    const money: Item[] = [
      ...ps.filter((p) => ['invoiced', 'part_paid', 'overdue'].includes(p.payment_status) && (p.metrics?.outstanding_balance ?? 0) > 0)
        .map((p) => ({ key: `m${p.id}`, text: p.name, meta: gbp.format(p.metrics?.outstanding_balance ?? 0), to: `/projects/${p.id}`, tone: 'rose' as const })),
      ...rs.filter((x) => x.active && x.next_due_date && x.next_due_date <= soon)
        .map((x) => ({ key: `r${x.id}`, text: `${x.label} — invoice`, meta: x.next_due_date!, to: '/money', tone: (x.next_due_date! < today ? 'rose' : 'amber') as 'rose' | 'amber' })),
      ...os.filter((x) => x.active && x.next_due_date && x.next_due_date <= soon)
        .map((x) => ({ key: `o${x.id}`, text: `Pay: ${x.label}`, meta: x.next_due_date!, to: '/money', tone: (x.next_due_date! < today ? 'rose' : 'amber') as 'rose' | 'amber' })),
      ...qs.filter((q) => q.status === 'sent' && q.follow_up_date && q.follow_up_date <= today)
        .map((q) => ({ key: `q${q.id}`, text: `Chase quote: ${q.title}`, meta: 'follow up', to: '/quotes', tone: 'amber' as const })),
    ]
    const stale: Item[] = [
      ...ps.filter((p) => p.metrics?.is_stale).map((p) => ({ key: `s${p.id}`, text: p.name, meta: `${p.metrics?.days_since_last_worked ?? '?'}d`, to: `/projects/${p.id}`, tone: 'amber' as const })),
      ...ts.filter(taskAvoided).map((t) => ({ key: `a${t.id}`, text: t.title, meta: 'avoiding', to: '/tasks', tone: 'amber' as const })),
    ]
    const waiting: Item[] = [
      ...ps.filter((p) => p.metrics?.is_waiting).map((p) => ({ key: `w${p.id}`, text: p.name, meta: `${p.metrics?.waiting_days ?? '?'}d`, to: `/projects/${p.id}`, tone: 'slate' as const })),
      ...ts.filter(taskWaiting).map((t) => ({ key: `wt${t.id}`, text: t.title, meta: t.waiting_on_person ?? humanise(t.waiting_on_type!), to: '/tasks', tone: 'slate' as const })),
    ]
    const topIdeas: Item[] = is.filter((i) => ['captured', 'researching', 'approved'].includes(i.status) && i.opportunity_score != null)
      .slice(0, 5).map((i) => ({ key: i.id, text: i.name, meta: `${i.opportunity_score}`, to: '/ideas', tone: (i.opportunity_score! >= 70 ? 'emerald' : 'slate') as 'emerald' | 'slate' }))
    const milestoneCount = ms.reduce<Record<string, number>>((acc, m) => {
      acc[m.goal_id] = (acc[m.goal_id] ?? 0) + 1
      return acc
    }, {})
    const goalHabits: Item[] = [
      ...gs.filter((g) => g.status === 'active' && g.deadline && g.deadline < today)
        .map((g) => ({ key: `g-risk-${g.id}`, text: g.title, meta: g.deadline!, to: '/goals', tone: 'rose' as const })),
      ...gs.filter((g) => g.status === 'active' && !milestoneCount[g.id])
        .map((g) => ({ key: `g-shape-${g.id}`, text: g.title, meta: 'no milestones', to: '/goals', tone: 'amber' as const })),
      ...hs.filter((h) => isHabitDueToday(h, hls) && !hls.some((l) => l.habit_id === h.id && l.log_date === today && l.completed))
        .map((h) => ({ key: `h-${h.id}`, text: h.name, meta: 'due today', to: '/goals', tone: 'amber' as const })),
    ]

    return { wins, decisions, money, stale, waiting, topIdeas, goalHabits }
  }, [projects, tasks, recurring, outgoing, quotes, ideas, goals, goalMilestones, habits, habitLogs])

  const range = `${new Date(plusDays(-6)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  const moneyTotal = (projects ?? []).filter((p) => ['invoiced', 'part_paid', 'overdue'].includes(p.payment_status)).reduce((s, p) => s + (p.metrics?.outstanding_balance ?? 0), 0)
  const outgoingTotal = (outgoing ?? []).filter((p) => p.active).reduce((s, p) => s + monthlyEquivalent(p), 0)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="ff-mono text-[10px] uppercase tracking-widest text-slate-400">The week · {range}</div>
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-semibold text-emerald-600">{r.wins.length}</span> finished ·
          <span className="font-semibold text-amber-600"> {r.decisions.length + r.stale.length}</span> need attention ·
          <span className="font-semibold text-rose-600"> {gbp.format(moneyTotal)}</span> to chase ·
          <span className="font-semibold text-slate-700"> {gbp.format(outgoingTotal)}</span> monthly outgoing ·
          <span className="font-semibold text-slate-700"> {r.waiting.length}</span> waiting ·
          <span className="font-semibold text-indigo-600"> {r.goalHabits.length}</span> goal/habit checks
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Section icon={<Trophy className="h-4 w-4 text-emerald-500" />} title="Wins this week" items={r.wins} empty="Nothing ticked off yet — there's still time." />
        <Section icon={<HelpCircle className="h-4 w-4 text-amber-500" />} title="Needs a decision" items={r.decisions} empty="Every active project has a next action. Tidy." />
        <Section icon={<Banknote className="h-4 w-4 text-rose-500" />} title="Chase the money" items={r.money} empty="Nothing outstanding to chase." />
        <Section icon={<Snowflake className="h-4 w-4 text-sky-500" />} title="Going cold / avoiding" items={r.stale} empty="Nothing stale or avoided." />
        <Section icon={<Hourglass className="h-4 w-4 text-slate-400" />} title="Still waiting on others" items={r.waiting} empty="Not blocked on anyone." />
        <Section icon={<Lightbulb className="h-4 w-4 text-indigo-500" />} title="Ideas worth a look" items={r.topIdeas} empty="No live ideas to weigh up." />
        <Section icon={<Target className="h-4 w-4 text-indigo-500" />} title="Goals & habits" items={r.goalHabits} empty="No goal or habit checks due." />
      </div>
    </div>
  )
}
