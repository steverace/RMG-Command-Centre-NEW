import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listChecklist, createChecklistItem, setItemStatus, deleteChecklistItem } from '@/lib/checklist'
import type { ChecklistInput } from '@/lib/checklist'
import type { ItemStatus } from '@/lib/types'

export function useChecklist(projectId: string) {
  return useQuery({ queryKey: ['checklist', projectId], queryFn: () => listChecklist(projectId), enabled: !!projectId })
}

function useChecklistMutation<T>(projectId: string, fn: (vars: T) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist', projectId] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useCreateChecklistItem(projectId: string) {
  return useChecklistMutation<ChecklistInput>(projectId, (input) => createChecklistItem(projectId, input))
}

export function useSetItemStatus(projectId: string) {
  return useChecklistMutation<{ id: string; status: ItemStatus }>(projectId, (v) => setItemStatus(v.id, v.status))
}

export function useDeleteChecklistItem(projectId: string) {
  return useChecklistMutation<string>(projectId, (id) => deleteChecklistItem(id))
}
