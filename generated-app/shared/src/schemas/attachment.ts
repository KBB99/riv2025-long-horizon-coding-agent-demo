import { z } from 'zod';

/** Maximum attachment file size in bytes (5 MB) */
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for attachments */
export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/xml',
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/gzip',
] as const;

export const CreateAttachmentSchema = z.object({
  issueId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
  mimeType: z.string().min(1),
  fileData: z.string().min(1), // base64-encoded file content
});

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  uploadedBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const AttachmentWithDataSchema = AttachmentSchema.extend({
  fileData: z.string(),
});
