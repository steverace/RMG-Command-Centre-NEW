import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  advanceOutgoingPayment,
  archiveOutgoingPayment,
  createOutgoingPayment,
  listOutgoingPayments,
  updateOutgoingPayment,
} from '@/lib/outgoingPayments'
import type { OutgoingPaymentInput } from '@/lib/outgoingPayments'
import type { BillingCycle } from '@/lib/types'

export function useOutgoingPayments() {
  return useQuery({ queryKey: ['outgoing-payments'], queryFn: listOutgoingPayments, retry: 1 })
}

function useOutgoingPaymentMutation<T>(fn: (v: T) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['outgoing-payments'] }) })
}

export function useCreateOutgoingPayment() {
  return useOutgoingPaymentMutation<OutgoingPaymentInput>((input) => createOutgoingPayment(input))
}

export function useUpdateOutgoingPayment() {
  return useOutgoingPaymentMutation<{ id: string; input: OutgoingPaymentInput }>((v) => updateOutgoingPayment(v.id, v.input))
}

export function useArchiveOutgoingPayment() {
  return useOutgoingPaymentMutation<string>((id) => archiveOutgoingPayment(id))
}

export function useAdvanceOutgoingPayment() {
  return useOutgoingPaymentMutation<{ id: string; current: string | null; cycle: BillingCycle }>((v) => advanceOutgoingPayment(v.id, v.current, v.cycle))
}
