import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listIdeas, createIdea, updateIdea, setIdeaStatus, archiveIdea, promoteIdeaToProject } from '@/lib/ideas'
import type { IdeaInput } from '@/lib/ideas'
import type { Idea, IdeaStatus } from '@/lib/types'

export function useIdeas() {
  return useQuery({ queryKey: ['ideas'], queryFn: listIdeas })
}
function useIdeaMutation<T, R = void>(fn: (v: T) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ideas'] }); qc.invalidateQueries({ queryKey: ['projects'] }) },
  })
}
export function useCreateIdea() { return useIdeaMutation<IdeaInput>((input) => createIdea(input)) }
export function useUpdateIdea() { return useIdeaMutation<{ id: string; input: IdeaInput }>((v) => updateIdea(v.id, v.input)) }
export function useSetIdeaStatus() { return useIdeaMutation<{ id: string; status: IdeaStatus }>((v) => setIdeaStatus(v.id, v.status)) }
export function useArchiveIdea() { return useIdeaMutation<string>((id) => archiveIdea(id)) }
export function usePromoteIdea() { return useIdeaMutation<Idea, string>((idea) => promoteIdeaToProject(idea)) }
