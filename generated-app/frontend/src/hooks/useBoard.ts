import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Board, UpdateBoard } from '@canopy/shared';
import { getBoard, updateBoard } from '@/api/client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const boardKeys = {
  all: ['boards'] as const,
  details: () => [...boardKeys.all, 'detail'] as const,
  detail: (projectId: string) => [...boardKeys.details(), projectId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch the board for a given project. */
export function useBoard(projectId: string | undefined) {
  return useQuery<Board>({
    queryKey: boardKeys.detail(projectId!),
    queryFn: () => getBoard(projectId!),
    enabled: !!projectId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Update a board (columns, swimlane config, etc.). */
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation<Board, Error, { id: string; projectId: string; data: UpdateBoard }>({
    mutationFn: ({ id, data }) => updateBoard(id, data),
    onSuccess: (updated, { projectId }) => {
      queryClient.setQueryData<Board>(boardKeys.detail(projectId), updated);
    },
  });
}
