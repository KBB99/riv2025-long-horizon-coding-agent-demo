import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateAttachmentSchema, MAX_ATTACHMENT_SIZE } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, QueryCommand, GetCommand, DeleteCommand } from '../lib/db';
import { success, error, notFound, serverError } from '../lib/response';

/**
 * Upload an attachment to an issue.
 * Stores metadata + base64 file data in DynamoDB.
 */
export async function uploadAttachment(issueId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = CreateAttachmentSchema.parse({ ...body, issueId });

    // Validate file size
    if (parsed.fileSize > MAX_ATTACHMENT_SIZE) {
      return error(`File too large. Maximum size is ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`, 400, 'FILE_TOO_LARGE');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const attachment = {
      id,
      issueId: parsed.issueId,
      fileName: parsed.fileName,
      fileSize: parsed.fileSize,
      mimeType: parsed.mimeType,
      uploadedBy: body.uploadedBy || crypto.randomUUID(),
      createdAt: now,
    };

    // Store in DynamoDB with fileData as a separate attribute
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.attachment(issueId, id),
        data: attachment,
        fileData: parsed.fileData,
        entityType: 'ATTACHMENT',
      },
    }));

    // Return metadata only (no fileData in response)
    return success(attachment, 201);
  } catch (e: any) {
    console.error('uploadAttachment error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

/**
 * List all attachments for an issue.
 * Returns metadata only (no file data) for efficiency.
 */
export async function listAttachments(issueId: string) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ISSUE#${issueId}`,
        ':sk': 'ATTACHMENT#',
      },
      // Only project metadata, not the file data
      ProjectionExpression: 'PK, SK, #d, entityType',
      ExpressionAttributeNames: {
        '#d': 'data',
      },
    }));
    const attachments = (result.Items || []).map(item => item.data);
    return success(attachments);
  } catch (e) {
    console.error('listAttachments error:', e);
    return serverError();
  }
}

/**
 * Get a single attachment with file data (for download).
 */
export async function getAttachment(issueId: string, attachmentId: string) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.attachment(issueId, attachmentId),
    }));

    if (!result.Item) {
      return notFound('Attachment not found');
    }

    const response = {
      ...result.Item.data,
      fileData: result.Item.fileData,
    };

    return success(response);
  } catch (e) {
    console.error('getAttachment error:', e);
    return serverError();
  }
}

/**
 * Delete an attachment from an issue.
 */
export async function deleteAttachment(issueId: string, attachmentId: string) {
  try {
    // Verify attachment exists
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.attachment(issueId, attachmentId),
      ProjectionExpression: 'PK',
    }));

    if (!existing.Item) {
      return notFound('Attachment not found');
    }

    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.attachment(issueId, attachmentId),
    }));

    return success({ success: true });
  } catch (e) {
    console.error('deleteAttachment error:', e);
    return serverError();
  }
}
