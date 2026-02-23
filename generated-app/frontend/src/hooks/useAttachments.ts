import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Attachment, AttachmentWithData } from '@canopy/shared';
import {
  listAttachments,
  uploadAttachment,
  getAttachment,
  deleteAttachment,
} from '@/api/client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const attachmentKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentKeys.all, 'list'] as const,
  list: (issueId: string) => [...attachmentKeys.lists(), issueId] as const,
  details: () => [...attachmentKeys.all, 'detail'] as const,
  detail: (issueId: string, attachmentId: string) =>
    [...attachmentKeys.details(), issueId, attachmentId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all attachments for an issue. */
export function useAttachments(issueId: string | undefined) {
  return useQuery<Attachment[]>({
    queryKey: attachmentKeys.list(issueId!),
    queryFn: async () => {
      try {
        return await listAttachments(issueId!);
      } catch {
        // Gracefully return empty array if endpoint not yet deployed
        return [];
      }
    },
    enabled: !!issueId,
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Upload a new attachment to an issue. */
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation<
    Attachment,
    Error,
    { issueId: string; fileName: string; fileSize: number; mimeType: string; fileData: string }
  >({
    mutationFn: ({ issueId, ...data }) => uploadAttachment(issueId, data),
    onSuccess: (newAttachment) => {
      // Update the attachment list cache
      queryClient.setQueryData<Attachment[]>(
        attachmentKeys.list(newAttachment.issueId),
        (old = []) => [...old, newAttachment],
      );
      queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(newAttachment.issueId),
      });
    },
  });
}

/** Delete an attachment from an issue. */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean },
    Error,
    { issueId: string; attachmentId: string }
  >({
    mutationFn: ({ issueId, attachmentId }) =>
      deleteAttachment(issueId, attachmentId),
    onSuccess: (_result, { issueId, attachmentId }) => {
      queryClient.setQueryData<Attachment[]>(
        attachmentKeys.list(issueId),
        (old = []) => old.filter((a) => a.id !== attachmentId),
      );
    },
  });
}

/** Download an attachment (get with file data). */
export function useDownloadAttachment() {
  return useMutation<
    AttachmentWithData,
    Error,
    { issueId: string; attachmentId: string }
  >({
    mutationFn: ({ issueId, attachmentId }) =>
      getAttachment(issueId, attachmentId),
  });
}
