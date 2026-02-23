import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Issue, CreateIssue, UpdateIssue, BulkUpdateIssues } from '@canopy/shared';
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  bulkUpdateIssues,
} from '@/api/client';
import { projectKeys } from './useProjects';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (projectId: string) => [...issueKeys.lists(), projectId] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch issues for a given project. */
export function useIssues(projectId: string | undefined) {
  return useQuery<Issue[]>({
    queryKey: issueKeys.list(projectId!),
    queryFn: () => listIssues(projectId!),
    enabled: !!projectId,
  });
}

/** Fetch a single issue by ID. */
export function useIssue(id: string | undefined) {
  return useQuery<Issue>({
    queryKey: issueKeys.detail(id!),
    queryFn: () => getIssue(id!),
    enabled: !!id,
  });
}

/** Fetch issues from all projects by aggregating per-project issue lists. */
export function useAllIssues() {
  return useQuery<Issue[]>({
    queryKey: [...issueKeys.all, 'all-issues'],
    queryFn: async () => {
      // Fetch all projects first, then get issues for each
      const { listProjects } = await import('@/api/client');
      const projects = await listProjects();
      if (projects.length === 0) return [];

      const allIssues = await Promise.all(
        projects.map(p => listIssues(p.id).catch(() => [] as Issue[]))
      );
      return allIssues.flat();
    },
    staleTime: 15000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new issue within a project. */
export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation<Issue, Error, CreateIssue>({
    mutationFn: (data) => createIssue(data),
    onSuccess: (newIssue) => {
      // Update the issue list for the parent project
      queryClient.setQueryData<Issue[]>(
        issueKeys.list(newIssue.projectId),
        (old = []) => [...old, newIssue],
      );
      queryClient.invalidateQueries({ queryKey: issueKeys.list(newIssue.projectId) });
      // Invalidate all-issues aggregation (Dashboard stats)
      queryClient.invalidateQueries({ queryKey: [...issueKeys.all, 'all-issues'] });
      // The project's issueCounter may have changed
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(newIssue.projectId) });
    },
  });
}

/** Update an existing issue. */
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation<Issue, Error, { id: string; data: UpdateIssue }>({
    mutationFn: ({ id, data }) => updateIssue(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Issue>(issueKeys.detail(updated.id), updated);
      queryClient.setQueryData<Issue[]>(
        issueKeys.list(updated.projectId),
        (old = []) => old.map((i) => (i.id === updated.id ? updated : i)),
      );
      // Invalidate all-issues aggregation (Dashboard stats)
      queryClient.invalidateQueries({ queryKey: [...issueKeys.all, 'all-issues'] });
    },
  });
}

/** Delete an issue. */
export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { id: string; projectId: string }
  >({
    mutationFn: ({ id }) => deleteIssue(id),
    onSuccess: (_result, { id, projectId }) => {
      queryClient.setQueryData<Issue[]>(
        issueKeys.list(projectId),
        (old = []) => old.filter((i) => i.id !== id),
      );
      queryClient.removeQueries({ queryKey: issueKeys.detail(id) });
      // Invalidate all-issues aggregation (Dashboard stats)
      queryClient.invalidateQueries({ queryKey: [...issueKeys.all, 'all-issues'] });
    },
  });
}

/** Bulk-update multiple issues at once. */
export function useBulkUpdateIssues() {
  const queryClient = useQueryClient();

  return useMutation<Issue[], Error, BulkUpdateIssues>({
    mutationFn: (data) => bulkUpdateIssues(data),
    onSuccess: (updatedIssues) => {
      // Update each issue in the cache
      for (const issue of updatedIssues) {
        queryClient.setQueryData<Issue>(issueKeys.detail(issue.id), issue);
      }
      // Invalidate all issue lists since we may have updated across projects
      queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
    },
  });
}
