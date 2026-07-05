import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveGoal,
  archiveGoalMilestone,
  archiveHabit,
  createGoal,
  createGoalMilestone,
  createHabit,
  listGoalMilestones,
  listGoals,
  listHabitLogs,
  listHabits,
  setHabitLog,
  updateGoal,
  updateGoalMilestoneStatus,
  updateHabit,
} from '@/lib/goalsHabits'
import type { GoalInput, GoalMilestoneInput, HabitInput } from '@/lib/goalsHabits'
import type { GoalMilestone } from '@/lib/types'

const goalKeys = [['goals'], ['goal-milestones']]
const habitKeys = [['habits'], ['habit-logs']]

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [...goalKeys, ...habitKeys]) qc.invalidateQueries({ queryKey: key })
}

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: listGoals, retry: 1 })
}

export function useGoalMilestones() {
  return useQuery({ queryKey: ['goal-milestones'], queryFn: listGoalMilestones, retry: 1 })
}

export function useHabits() {
  return useQuery({ queryKey: ['habits'], queryFn: listHabits, retry: 1 })
}

export function useHabitLogs() {
  return useQuery({ queryKey: ['habit-logs'], queryFn: listHabitLogs, retry: 1 })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: GoalInput) => createGoal(input), onSuccess: () => invalidateAll(qc) })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: { id: string; input: GoalInput }) => updateGoal(v.id, v.input), onSuccess: () => invalidateAll(qc) })
}

export function useArchiveGoal() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => archiveGoal(id), onSuccess: () => invalidateAll(qc) })
}

export function useCreateGoalMilestone() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: GoalMilestoneInput) => createGoalMilestone(input), onSuccess: () => invalidateAll(qc) })
}

export function useUpdateGoalMilestoneStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; status: GoalMilestone['status'] }) => updateGoalMilestoneStatus(v.id, v.status),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useArchiveGoalMilestone() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => archiveGoalMilestone(id), onSuccess: () => invalidateAll(qc) })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: HabitInput) => createHabit(input), onSuccess: () => invalidateAll(qc) })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: { id: string; input: HabitInput }) => updateHabit(v.id, v.input), onSuccess: () => invalidateAll(qc) })
}

export function useArchiveHabit() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => archiveHabit(id), onSuccess: () => invalidateAll(qc) })
}

export function useSetHabitLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { habit_id: string; log_date?: string; completed: boolean; value?: number | null; note?: string | null }) => setHabitLog(input),
    onSuccess: () => invalidateAll(qc),
  })
}
