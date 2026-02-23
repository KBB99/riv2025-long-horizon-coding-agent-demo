import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Sprint, CreateSprint, UpdateSprint } from '@canopy/shared';
import { listSprints, createSprint, updateSprint } from '@/api/client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const sprintKeys = {
  all: ['sprints'] as const,
  lists: () => [...sprintKeys.all, 'list'] as const,
  list: (projectId: string) => [...sprintKeys.lists(), projectId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch sprints for a given project. */
export function useSprints(projectId: string | undefined) {
  return useQuery<Sprint[]>({
    queryKey: sprintKeys.list(projectId!),
    queryFn: () => listSprints(projectId!),
    enabled: !!projectId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new sprint. */
export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation<Sprint, Error, CreateSprint>({
    mutationFn: (data) => createSprint(data),
    onSuccess: (newSprint) => {
      queryClient.setQueryData<Sprint[]>(
        sprintKeys.list(newSprint.projectId),
        (old = []) => [...old, newSprint],
      );
      queryClient.invalidateQueries({ queryKey: sprintKeys.list(newSprint.projectId) });
    },
  });
}

/** Update an existing sprint (status change, dates, goal, etc.). */
export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation<Sprint, Error, { id: string; projectId: string; data: UpdateSprint }>({
    mutationFn: ({ id, data }) => updateSprint(id, data),
    onSuccess: (updated, { projectId }) => {
      queryClient.setQueryData<Sprint[]>(
        sprintKeys.list(projectId),
        (old = []) => old.map((s) => (s.id === updated.id ? updated : s)),
      );
    },
  });
}
