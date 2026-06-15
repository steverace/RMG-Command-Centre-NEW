import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listClients, getClient, createClient, updateClient, archiveClient } from '@/lib/clients'
import type { ClientInput } from '@/lib/clients'

function inval(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['clients'] })
  qc.invalidateQueries({ queryKey: ['client'] })
}
export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: listClients })
}
export function useClient(id: string) {
  return useQuery({ queryKey: ['client', id], queryFn: () => getClient(id), enabled: !!id })
}
export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: ClientInput) => createClient(input), onSuccess: () => inval(qc) })
}
export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (v: { id: string; input: ClientInput }) => updateClient(v.id, v.input), onSuccess: () => inval(qc) })
}
export function useArchiveClient() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => archiveClient(id), onSuccess: () => inval(qc) })
}
