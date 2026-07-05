import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, Archive, CalendarCheck, CheckCircle2, Flame, ListChecks, Plus, Target, Trophy, X } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import {
  GOAL_STATUSES,
  HABIT_FREQUENCIES,
  HABIT_TARGET_TYPES,
  ITEM_STATUSES,
  LIFE_AREAS,
  humanise,
} from '@/lib/types'
import type { Goal, GoalMilestone, Habit, HabitLog } from '@/lib/types'
import type { GoalInput, HabitInput } from '@/lib/goalsHabits'
import {
  useArchiveGoal,
  useArchiveGoalMilestone,
  useArchiveHabit,
  useCreateGoal,
  useCreateGoalMilestone,
  useCreateHabit,
  useGoalMilestones,
  useGoals,
  useHabitLogs,
  useHabits,
  useSetHabitLog,
  useUpdateGoal,
  useUpdateGoalMilestoneStatus,
  useUpdateHabit,
} from '@/features/goals/useGoalsHabits'

type Tab = 'today' | 'goals' | 'habits' | 'review'
type Editing = { kind: 'goal'; item: Goal | null } | { kind: 'habit'; item: Habit | null } | null

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'
const todayStr = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">{children}</div>
}

function goalProgress(goal: Goal): number {
  if (goal.target_value == null || goal.target_value <= 0 || goal.current_value == null) return 0
  return Math.max(0, Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)))
}

function logKey(habitId: string, date = todayStr()) {
  return `${habitId}:${date}`
}

function isHabitDueToday(habit: Habit, logs: HabitLog[]) {
  if (!habit.active) return false
  const day = new Date().getDay()
  if (habit.frequency === 'daily') return true
  if (habit.frequency === 'weekdays') return day >= 1 && day <= 5
  if (habit.frequency === 'custom') return (habit.days_of_week ?? []).includes(day)
  const weekStart = daysAgo(day === 0 ? 6 : day - 1)
  return !logs.some((l) => l.habit_id === habit.id && l.completed && l.log_date >= weekStart)
}

function habitStreak(habit: Habit, logs: HabitLog[]) {
  const completed = new Set(logs.filter((l) => l.habit_id === habit.id && l.completed).map((l) => l.log_date))
  let streak = 0
  for (let i = 0; i < 60; i += 1) {
    if (!completed.has(daysAgo(i))) break
    streak += 1
  }
  return streak
}

function completionRate(habit: Habit, logs: HabitLog[]) {
  const recent = logs.filter((l) => l.habit_id === habit.id && l.log_date >= daysAgo(29))
  if (recent.length === 0) return 0
  return Math.round((recent.filter((l) => l.completed).length / recent.length) * 100)
}

function StatsCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">{icon}<Label>{label}</Label></div>
      <div className="ff-mono text-2xl font-semibold text-slate-800">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{note}</div>
    </Card>
  )
}

function GoalForm({ item, onClose }: { item: Goal | null; onClose: () => void }) {
  const create = useCreateGoal()
  const update = useUpdateGoal()
  const archive = useArchiveGoal()
  const editing = !!item
  const [title, setTitle] = useState(item?.title ?? '')
  const [area, setArea] = useState<Goal['area']>(item?.area ?? 'personal')
  const [status, setStatus] = useState<Goal['status']>(item?.status ?? 'active')
  const [why, setWhy] = useState(item?.why ?? '')
  const [targetLabel, setTargetLabel] = useState(item?.target_label ?? '')
  const [targetValue, setTargetValue] = useState(item?.target_value?.toString() ?? '')
  const [currentValue, setCurrentValue] = useState(item?.current_value?.toString() ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [deadline, setDeadline] = useState(item?.deadline ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: GoalInput = {
      title: title.trim(),
      area,
      why: why.trim() || null,
      target_label: targetLabel.trim() || null,
      target_value: targetValue.trim() === '' ? null : Number(targetValue),
      current_value: currentValue.trim() === '' ? null : Number(currentValue),
      unit: unit.trim() || null,
      deadline: deadline || null,
      status,
      notes: notes.trim() || null,
    }
    try {
      if (editing && item) await update.mutateAsync({ id: item.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save goal') }
  }

  async function onArchive() {
    if (!item || !window.confirm('Remove this goal?')) return
    try { await archive.mutateAsync(item.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove goal') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit goal' : 'New goal'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="goal-title">Goal</label>
            <input id="goal-title" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Build a reliable morning routine" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="goal-area">Area</label>
              <select id="goal-area" value={area} onChange={(e) => setArea(e.target.value as Goal['area'])} className={inputCls}>{LIFE_AREAS.map((x) => <option key={x} value={x}>{humanise(x)}</option>)}</select>
            </div>
            <div>
              <label className={labelCls} htmlFor="goal-status">Status</label>
              <select id="goal-status" value={status} onChange={(e) => setStatus(e.target.value as Goal['status'])} className={inputCls}>{GOAL_STATUSES.map((x) => <option key={x} value={x}>{humanise(x)}</option>)}</select>
            </div>
            <div>
              <label className={labelCls} htmlFor="goal-deadline">Deadline</label>
              <input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="goal-target-label">Target label</label>
              <input id="goal-target-label" value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} className={inputCls} placeholder="e.g. Revenue, weight, days, pages" />
            </div>
            <div>
              <label className={labelCls} htmlFor="goal-current">Current</label>
              <input id="goal-current" type="number" inputMode="decimal" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="goal-target">Target</label>
              <input id="goal-target" type="number" inputMode="decimal" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="goal-unit">Unit</label>
              <input id="goal-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} placeholder="e.g. kg, GBP, days" />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="goal-why">Why it matters</label>
            <textarea id="goal-why" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="goal-notes">Notes</label>
            <textarea id="goal-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
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

function HabitForm({ item, goals, onClose }: { item: Habit | null; goals: Goal[]; onClose: () => void }) {
  const create = useCreateHabit()
  const update = useUpdateHabit()
  const archive = useArchiveHabit()
  const editing = !!item
  const [name, setName] = useState(item?.name ?? '')
  const [area, setArea] = useState<Habit['area']>(item?.area ?? 'health')
  const [frequency, setFrequency] = useState<Habit['frequency']>(item?.frequency ?? 'daily')
  const [days, setDays] = useState<number[]>(item?.days_of_week ?? [])
  const [targetType, setTargetType] = useState<Habit['target_type']>(item?.target_type ?? 'check')
  const [targetValue, setTargetValue] = useState(item?.target_value?.toString() ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [timeOfDay, setTimeOfDay] = useState(item?.time_of_day ?? '')
  const [goalId, setGoalId] = useState(item?.goal_id ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  function toggleDay(day: number) {
    setDays((current) => current.includes(day) ? current.filter((x) => x !== day) : [...current, day].sort())
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: HabitInput = {
      name: name.trim(),
      area,
      frequency,
      days_of_week: frequency === 'custom' ? days : null,
      target_type: targetType,
      target_value: targetType === 'number' && targetValue.trim() !== '' ? Number(targetValue) : null,
      unit: unit.trim() || null,
      time_of_day: timeOfDay || null,
      goal_id: goalId || null,
      active,
      notes: notes.trim() || null,
    }
    try {
      if (editing && item) await update.mutateAsync({ id: item.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save habit') }
  }

  async function onArchive() {
    if (!item || !window.confirm('Remove this habit?')) return
    try { await archive.mutateAsync(item.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove habit') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit habit' : 'New habit'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="habit-name">Habit</label>
            <input id="habit-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Review today before opening inbox" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="habit-area">Area</label>
              <select id="habit-area" value={area} onChange={(e) => setArea(e.target.value as Habit['area'])} className={inputCls}>{LIFE_AREAS.map((x) => <option key={x} value={x}>{humanise(x)}</option>)}</select>
            </div>
            <div>
              <label className={labelCls} htmlFor="habit-frequency">Frequency</label>
              <select id="habit-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Habit['frequency'])} className={inputCls}>{HABIT_FREQUENCIES.map((x) => <option key={x} value={x}>{humanise(x)}</option>)}</select>
            </div>
            <div>
              <label className={labelCls} htmlFor="habit-time">Time</label>
              <input id="habit-time" type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className={inputCls} />
            </div>
          </div>
          {frequency === 'custom' && (
            <div>
              <label className={labelCls}>Days</label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleDay(i)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${days.includes(i) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>{d}</button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="habit-target-type">Target</label>
              <select id="habit-target-type" value={targetType} onChange={(e) => setTargetType(e.target.value as Habit['target_type'])} className={inputCls}>{HABIT_TARGET_TYPES.map((x) => <option key={x} value={x}>{humanise(x)}</option>)}</select>
            </div>
            <div>
              <label className={labelCls} htmlFor="habit-target-value">Target value</label>
              <input id="habit-target-value" type="number" inputMode="decimal" disabled={targetType === 'check'} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="habit-unit">Unit</label>
              <input id="habit-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} placeholder="e.g. mins, pages, calls" />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="habit-goal">Linked goal</label>
            <select id="habit-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} className={inputCls}>
              <option value="">No linked goal</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" /> Active</label>
          <div>
            <label className={labelCls} htmlFor="habit-notes">Notes</label>
            <textarea id="habit-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
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

export default function GoalsHabitsPage() {
  const [tab, setTab] = useState<Tab>('today')
  const [editing, setEditing] = useState<Editing>(null)
  const goalsQuery = useGoals()
  const milestonesQuery = useGoalMilestones()
  const habitsQuery = useHabits()
  const logsQuery = useHabitLogs()
  const setLog = useSetHabitLog()
  const createMilestone = useCreateGoalMilestone()
  const updateMilestone = useUpdateGoalMilestoneStatus()
  const archiveMilestone = useArchiveGoalMilestone()

  const goals = goalsQuery.data ?? []
  const milestones = milestonesQuery.data ?? []
  const habits = habitsQuery.data ?? []
  const logs = logsQuery.data ?? []
  const today = todayStr()
  const logMap = useMemo(() => new Map(logs.map((l) => [logKey(l.habit_id, l.log_date), l])), [logs])
  const goalName = useMemo(() => new Map(goals.map((g) => [g.id, g.title])), [goals])
  const milestonesByGoal = useMemo(() => {
    const map = new Map<string, GoalMilestone[]>()
    for (const m of milestones) map.set(m.goal_id, [...(map.get(m.goal_id) ?? []), m])
    return map
  }, [milestones])

  const dueHabits = habits.filter((h) => isHabitDueToday(h, logs))
  const completedToday = dueHabits.filter((h) => logMap.get(logKey(h.id))?.completed)
  const activeGoals = goals.filter((g) => g.status === 'active')
  const atRiskGoals = activeGoals.filter((g) => g.deadline && g.deadline < today)
  const goalsWithoutMilestones = activeGoals.filter((g) => (milestonesByGoal.get(g.id) ?? []).length === 0)
  const last7Logs = logs.filter((l) => l.log_date >= daysAgo(6))
  const last7Rate = last7Logs.length === 0 ? 0 : Math.round((last7Logs.filter((l) => l.completed).length / last7Logs.length) * 100)
  const hasSetupError = goalsQuery.isError || milestonesQuery.isError || habitsQuery.isError || logsQuery.isError

  async function toggleHabit(habit: Habit) {
    const existing = logMap.get(logKey(habit.id))
    const completed = !existing?.completed
    await setLog.mutateAsync({
      habit_id: habit.id,
      completed,
      value: completed && habit.target_type === 'number' ? (habit.target_value ?? 1) : null,
    })
  }

  async function addMilestone(goal: Goal) {
    const title = window.prompt('Milestone title')
    if (!title?.trim()) return
    await createMilestone.mutateAsync({ goal_id: goal.id, title: title.trim(), status: 'not_started', due_date: null })
  }

  return (
    <div className="space-y-4">
      {hasSetupError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <div className="font-display text-sm font-semibold text-amber-900">Goals and habits need the Supabase tables</div>
              <p className="mt-1 text-sm leading-6 text-amber-800">The page is ready. Run the SQL in <span className="ff-mono">docs/GOALS-HABITS-SETUP.md</span>, then this section will save and load entries.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(['today', 'goals', 'habits', 'review'] as Tab[]).map((x) => (
            <button key={x} onClick={() => setTab(x)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === x ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>{humanise(x)}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ kind: 'goal', item: null })} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" /> Goal</button>
          <button onClick={() => setEditing({ kind: 'habit', item: null })} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"><Plus className="h-4 w-4" /> Habit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={<Target className="h-4 w-4 text-indigo-500" />} label="Active goals" value={String(activeGoals.length)} note={`${atRiskGoals.length} past deadline`} />
        <StatsCard icon={<ListChecks className="h-4 w-4 text-slate-400" />} label="Habits today" value={`${completedToday.length}/${dueHabits.length}`} note="completed today" />
        <StatsCard icon={<Flame className="h-4 w-4 text-amber-500" />} label="7 day habit score" value={`${last7Rate}%`} note="completion rate" />
        <StatsCard icon={<Trophy className="h-4 w-4 text-emerald-500" />} label="Goals complete" value={String(goals.filter((g) => g.status === 'complete').length)} note="banked wins" />
      </div>

      {tab === 'today' && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="p-4 xl:col-span-2">
            <div className="mb-3 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-slate-400" /><Label>Today</Label></div>
            {dueHabits.length === 0 ? (
              <EmptyState icon={ListChecks} title="No habits due today" note="Add a habit and it will appear here on the right day." />
            ) : (
              <div className="divide-y divide-slate-100">
                {dueHabits.map((h) => {
                  const done = !!logMap.get(logKey(h.id))?.completed
                  return (
                    <div key={h.id} className="flex items-center justify-between gap-3 py-3">
                      <button onClick={() => setEditing({ kind: 'habit', item: h })} className="min-w-0 text-left">
                        <div className={`truncate text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{h.name}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                          <span>{humanise(h.area)}</span>
                          {h.time_of_day && <span className="ff-mono">{h.time_of_day}</span>}
                          {h.goal_id && <span>{goalName.get(h.goal_id)}</span>}
                        </div>
                      </button>
                      <button onClick={() => void toggleHabit(h)} disabled={setLog.isPending} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${done ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-900 text-white hover:bg-slate-700'} disabled:opacity-60`}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {done ? 'Done' : 'Mark done'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <Label>Needs attention</Label>
            <div className="mt-3 space-y-2">
              {atRiskGoals.map((g) => <button key={g.id} onClick={() => setEditing({ kind: 'goal', item: g })} className="block w-full rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-left text-sm text-rose-700">{g.title}<span className="ff-mono ml-2 text-[11px]">{g.deadline}</span></button>)}
              {goalsWithoutMilestones.map((g) => <button key={g.id} onClick={() => setEditing({ kind: 'goal', item: g })} className="block w-full rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">{g.title}<span className="ml-2 text-[11px]">needs milestones</span></button>)}
              {atRiskGoals.length === 0 && goalsWithoutMilestones.length === 0 && <p className="text-sm text-slate-400">Nothing shouting for attention.</p>}
            </div>
          </Card>
        </div>
      )}

      {tab === 'goals' && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {goals.length === 0 ? <EmptyState icon={Target} title="No goals yet" note="Add one clear outcome, then attach milestones and habits to it." /> : goals.map((goal) => {
            const ms = milestonesByGoal.get(goal.id) ?? []
            const progress = goalProgress(goal)
            return (
              <Card key={goal.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setEditing({ kind: 'goal', item: goal })} className="min-w-0 text-left">
                    <div className="truncate text-base font-semibold text-slate-900">{goal.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase tracking-wider text-slate-500">{humanise(goal.area)}</span>
                      <span>{humanise(goal.status)}</span>
                      {goal.deadline && <span className={`ff-mono ${goal.deadline < today && goal.status === 'active' ? 'text-rose-600' : ''}`}>{goal.deadline}</span>}
                    </div>
                  </button>
                  <button onClick={() => void addMilestone(goal)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Milestone</button>
                </div>
                {goal.why && <p className="mt-3 text-sm leading-6 text-slate-500">{goal.why}</p>}
                {(goal.target_value != null || goal.current_value != null) && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] text-slate-400"><span>{goal.target_label ?? 'Progress'}</span><span>{goal.current_value ?? 0}/{goal.target_value ?? '?'} {goal.unit ?? ''}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: `${progress}%` }} /></div>
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {ms.length === 0 ? <p className="text-xs text-slate-400">No milestones yet.</p> : ms.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <select value={m.status} onChange={(e) => updateMilestone.mutate({ id: m.id, status: e.target.value as GoalMilestone['status'] })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
                        {ITEM_STATUSES.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
                      </select>
                      <span className={`min-w-0 flex-1 truncate text-sm ${m.status === 'complete' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.title}</span>
                      <button onClick={() => archiveMilestone.mutate(m.id)} className="text-slate-300 hover:text-rose-500" aria-label="Remove milestone"><Archive className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'habits' && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {habits.length === 0 ? <EmptyState icon={ListChecks} title="No habits yet" note="Add recurring behaviour you want to track daily or weekly." /> : habits.map((habit) => {
            const streak = habitStreak(habit, logs)
            const rate = completionRate(habit, logs)
            return (
              <Card key={habit.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setEditing({ kind: 'habit', item: habit })} className="min-w-0 text-left">
                    <div className="truncate text-base font-semibold text-slate-900">{habit.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase tracking-wider text-slate-500">{humanise(habit.area)}</span>
                      <span>{humanise(habit.frequency)}</span>
                      {habit.time_of_day && <span className="ff-mono">{habit.time_of_day}</span>}
                      {!habit.active && <span>inactive</span>}
                    </div>
                  </button>
                  <button onClick={() => void toggleHabit(habit)} disabled={setLog.isPending} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" /> Today</button>
                </div>
                {habit.notes && <p className="mt-3 text-sm leading-6 text-slate-500">{habit.notes}</p>}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-400">Streak</div><div className="ff-mono mt-1 text-lg font-semibold text-slate-800">{streak}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-400">30 day rate</div><div className="ff-mono mt-1 text-lg font-semibold text-slate-800">{rate}%</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-400">Goal</div><div className="mt-1 truncate text-xs font-medium text-slate-700">{habit.goal_id ? goalName.get(habit.goal_id) : 'None'}</div></div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'review' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card className="p-4">
            <Label>Habit score</Label>
            <div className="ff-mono mt-2 text-3xl font-semibold text-slate-800">{last7Rate}%</div>
            <p className="mt-1 text-sm text-slate-400">{last7Logs.filter((l) => l.completed).length} completed logs in the last 7 days.</p>
          </Card>
          <Card className="p-4">
            <Label>Goals at risk</Label>
            <div className="mt-3 space-y-2">
              {atRiskGoals.length === 0 ? <p className="text-sm text-slate-400">No active goals past deadline.</p> : atRiskGoals.map((g) => <button key={g.id} onClick={() => setEditing({ kind: 'goal', item: g })} className="block w-full rounded-lg border border-rose-100 px-3 py-2 text-left text-sm text-rose-700">{g.title}</button>)}
            </div>
          </Card>
          <Card className="p-4">
            <Label>Goals needing shape</Label>
            <div className="mt-3 space-y-2">
              {goalsWithoutMilestones.length === 0 ? <p className="text-sm text-slate-400">Every active goal has at least one milestone.</p> : goalsWithoutMilestones.map((g) => <button key={g.id} onClick={() => void addMilestone(g)} className="block w-full rounded-lg border border-amber-100 px-3 py-2 text-left text-sm text-amber-800">{g.title}</button>)}
            </div>
          </Card>
        </div>
      )}

      {editing?.kind === 'goal' && <GoalForm item={editing.item} onClose={() => setEditing(null)} />}
      {editing?.kind === 'habit' && <HabitForm item={editing.item} goals={goals} onClose={() => setEditing(null)} />}
    </div>
  )
}
