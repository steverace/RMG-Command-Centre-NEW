import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listTasks, createTask, updateTask, setTaskStatus, archiveTask } from '@/lib/tasks'
import type { TaskInput } from '@/lib/tasks'
import type { ItemStatus } from '@/lib/types'

export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: listTasks })
}

function useTaskMutation<T>(fn: (vars: T) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }) })
}

export function useCreateTask() {
  return useTaskMutation<TaskInput>((input) => createTask(input))
}
export function useUpdateTask() {
  return useTaskMutation<{ id: string; input: TaskInput }>((v) => updateTask(v.id, v.input))
}
export function useSetTaskStatus() {
  return useTaskMutation<{ id: string; status: ItemStatus }>((v) => setTaskStatus(v.id, v.status))
}
export function useArchiveTask() {
  return useTaskMutation<string>((id) => archiveTask(id))
}
