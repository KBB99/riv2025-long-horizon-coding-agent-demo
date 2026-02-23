import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project, CreateProject, UpdateProject } from '@canopy/shared';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '@/api/client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all projects. */
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: projectKeys.list(),
    queryFn: listProjects,
  });
}

/** Fetch a single project by ID. */
export function useProject(id: string | undefined) {
  return useQuery<Project>({
    queryKey: projectKeys.detail(id!),
    queryFn: () => getProject(id!),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new project. */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, CreateProject>({
    mutationFn: (data) => createProject(data),
    onSuccess: (newProject) => {
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old = []) => [
        ...old,
        newProject,
      ]);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/** Update an existing project. */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, { id: string; data: UpdateProject }>({
    mutationFn: ({ id, data }) => updateProject(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Project>(projectKeys.detail(updated.id), updated);
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old = []) =>
        old.map((p) => (p.id === updated.id ? updated : p)),
      );
    },
  });
}

/** Delete a project. */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => deleteProject(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old = []) =>
        old.filter((p) => p.id !== id),
      );
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}
