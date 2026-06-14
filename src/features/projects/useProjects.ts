import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listProjects, createProject, updateProject, archiveProject } from '@/lib/projects'
import type { ProjectInput } from '@/lib/projects'

const KEY = ['projects']

export function useProjects() {
  return useQuery({ queryKey: KEY, queryFn: listProjects })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; input: ProjectInput }) => updateProject(vars.id, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
