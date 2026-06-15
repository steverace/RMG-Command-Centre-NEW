import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listRecurring, createRecurring, updateRecurring, archiveRecurring, advanceRenewal } from '@/lib/recurring'
import type { RecurringInput } from '@/lib/recurring'
import type { BillingCycle } from '@/lib/types'

export function useRecurring() {
  return useQuery({ queryKey: ['recurring'], queryFn: listRecurring })
}
function useRecurringMutation<T>(fn: (v: T) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }) })
}
export function useCreateRecurring() {
  return useRecurringMutation<RecurringInput>((input) => createRecurring(input))
}
export function useUpdateRecurring() {
  return useRecurringMutation<{ id: string; input: RecurringInput }>((v) => updateRecurring(v.id, v.input))
}
export function useArchiveRecurring() {
  return useRecurringMutation<string>((id) => archiveRecurring(id))
}
export function useAdvanceRenewal() {
  return useRecurringMutation<{ id: string; current: string | null; cycle: BillingCycle }>((v) => advanceRenewal(v.id, v.current, v.cycle))
}
