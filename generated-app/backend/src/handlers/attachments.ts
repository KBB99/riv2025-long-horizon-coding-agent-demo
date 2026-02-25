import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateAttachmentSchema, MAX_ATTACHMENT_SIZE } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, QueryCommand, GetCommand, DeleteCommand } from '../lib/db';
import { success, error, notFound, serverError } from '../lib/response';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const ATTACHMENT_BUCKET = process.env.ATTACHMENT_BUCKET || '';

/**
 * Build the S3 key for an attachment.
 */
function s3Key(issueId: string, attachmentId: string): string {
  return `attachments/${issueId}/${attachmentId}`;
}

/**
 * Upload an attachment to an issue.
 * Stores metadata in DynamoDB and file data in S3.
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

    // Store file data in S3 (avoids DynamoDB 400KB item limit)
    if (ATTACHMENT_BUCKET) {
      const fileBuffer = Buffer.from(parsed.fileData, 'base64');
      await s3Client.send(new PutObjectCommand({
        Bucket: ATTACHMENT_BUCKET,
        Key: s3Key(issueId, id),
        Body: fileBuffer,
        ContentType: parsed.mimeType,
        Metadata: {
          'original-filename': parsed.fileName,
          'issue-id': issueId,
        },
      }));

      // Store only metadata in DynamoDB (no fileData)
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...keys.attachment(issueId, id),
          data: attachment,
          storageType: 'S3',
          entityType: 'ATTACHMENT',
        },
      }));
    } else {
      // Fallback: store in DynamoDB (for small files / local dev without S3)
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...keys.attachment(issueId, id),
          data: attachment,
          fileData: parsed.fileData,
          storageType: 'DYNAMODB',
          entityType: 'ATTACHMENT',
        },
      }));
    }

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
      ProjectionExpression: 'PK, SK, #d, entityType, storageType',
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
 * Reads file data from S3 or DynamoDB depending on storage type.
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

    const metadata = result.Item.data;
    let fileData: string;

    if (result.Item.storageType === 'S3' && ATTACHMENT_BUCKET) {
      // Read file data from S3
      const s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: ATTACHMENT_BUCKET,
        Key: s3Key(issueId, attachmentId),
      }));
      const bodyBytes = await s3Response.Body?.transformToByteArray();
      fileData = bodyBytes ? Buffer.from(bodyBytes).toString('base64') : '';
    } else {
      // Read from DynamoDB (legacy items or fallback)
      fileData = result.Item.fileData || '';
    }

    return success({
      ...metadata,
      fileData,
    });
  } catch (e) {
    console.error('getAttachment error:', e);
    return serverError();
  }
}

/**
 * Delete an attachment from an issue.
 * Removes from both DynamoDB and S3.
 */
export async function deleteAttachment(issueId: string, attachmentId: string) {
  try {
    // Verify attachment exists and get storage type
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.attachment(issueId, attachmentId),
      ProjectionExpression: 'PK, storageType',
    }));

    if (!existing.Item) {
      return notFound('Attachment not found');
    }

    // Delete from S3 if stored there
    if (existing.Item.storageType === 'S3' && ATTACHMENT_BUCKET) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: ATTACHMENT_BUCKET,
          Key: s3Key(issueId, attachmentId),
        }));
      } catch (s3Err) {
        console.error('S3 delete error (continuing with DynamoDB delete):', s3Err);
      }
    }

    // Delete metadata from DynamoDB
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
