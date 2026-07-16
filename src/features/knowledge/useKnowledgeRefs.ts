import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createKnowledgeRef, listKnowledgeRefs, listKnowledgeRefsByEntity } from '@/lib/knowledge'
import type { KnowledgeRefInput } from '@/lib/knowledge'
import type { KnowledgeEntityType } from '@/lib/types'

export function useKnowledgeRefs(entityType: KnowledgeEntityType, entityId: string) {
  return useQuery({
    queryKey: ['knowledge-refs', entityType, entityId],
    queryFn: () => listKnowledgeRefs(entityType, entityId),
    enabled: !!entityId,
    retry: 1,
  })
}

export function useKnowledgeRefsByEntity(entityType: KnowledgeEntityType) {
  return useQuery({
    queryKey: ['knowledge-refs', entityType],
    queryFn: () => listKnowledgeRefsByEntity(entityType),
    retry: 1,
  })
}

export function useCreateKnowledgeRef() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: KnowledgeRefInput) => createKnowledgeRef(input),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['knowledge-refs', input.entity_type] })
      qc.invalidateQueries({ queryKey: ['knowledge-refs', input.entity_type, input.entity_id] })
    },
  })
}
