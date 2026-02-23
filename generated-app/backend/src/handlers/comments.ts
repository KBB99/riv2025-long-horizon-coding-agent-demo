import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateCommentSchema } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, QueryCommand } from '../lib/db';
import { success, error, serverError } from '../lib/response';

export async function addComment(issueId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = CreateCommentSchema.parse({ ...body, issueId });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const comment = {
      ...parsed,
      id,
      authorId: body.authorId || crypto.randomUUID(),
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.comment(issueId, id),
        data: comment,
        entityType: 'COMMENT',
      },
    }));

    return success(comment, 201);
  } catch (e: any) {
    console.error('addComment error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

export async function listComments(issueId: string) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ISSUE#${issueId}`,
        ':sk': 'COMMENT#',
      },
    }));
    const comments = (result.Items || []).map(item => item.data);
    return success(comments);
  } catch (e) {
    console.error('listComments error:', e);
    return serverError();
  }
}
