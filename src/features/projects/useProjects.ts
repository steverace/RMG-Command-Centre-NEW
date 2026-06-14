import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listProjects, getProjectWithMetrics, createProject, updateProject, archiveProject } from '@/lib/projects'
import type { ProjectInput } from '@/lib/projects'

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['projects'] })
  qc.invalidateQueries({ queryKey: ['project'] })
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: listProjects })
}

export function useProject(id: string) {
  return useQuery({ queryKey: ['project', id], queryFn: () => getProjectWithMetrics(id), enabled: !!id })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: ProjectInput) => createProject(input), onSuccess: () => invalidateAll(qc) })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; input: ProjectInput }) => updateProject(vars.id, vars.input),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => archiveProject(id), onSuccess: () => invalidateAll(qc) })
}
