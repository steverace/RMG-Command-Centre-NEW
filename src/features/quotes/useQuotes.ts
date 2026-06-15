import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listQuotes, createQuote, updateQuote, setQuoteStatus, archiveQuote } from '@/lib/quotes'
import type { QuoteInput } from '@/lib/quotes'
import type { QuoteStatus } from '@/lib/types'

export function useQuotes() {
  return useQuery({ queryKey: ['quotes'], queryFn: listQuotes })
}
function useQuoteMutation<T>(fn: (v: T) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }) })
}
export function useCreateQuote() {
  return useQuoteMutation<QuoteInput>((input) => createQuote(input))
}
export function useUpdateQuote() {
  return useQuoteMutation<{ id: string; input: QuoteInput }>((v) => updateQuote(v.id, v.input))
}
export function useSetQuoteStatus() {
  return useQuoteMutation<{ id: string; status: QuoteStatus }>((v) => setQuoteStatus(v.id, v.status))
}
export function useArchiveQuote() {
  return useQuoteMutation<string>((id) => archiveQuote(id))
}
