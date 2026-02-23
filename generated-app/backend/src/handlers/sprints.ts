import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateSprintSchema, UpdateSprintSchema } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, GetCommand, QueryCommand, ScanCommand } from '../lib/db';
import { success, error, notFound, serverError } from '../lib/response';

export async function listSprints(projectId: string) {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk AND entityType = :et',
      ExpressionAttributeValues: {
        ':pk': 'SPRINT#',
        ':sk': 'METADATA',
        ':et': 'SPRINT',
      },
    }));
    const sprints = (result.Items || [])
      .map(item => item.data)
      .filter((s: any) => s.projectId === projectId);
    return success(sprints);
  } catch (e) {
    console.error('listSprints error:', e);
    return serverError();
  }
}

export async function createSprint(projectId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = CreateSprintSchema.parse({ ...body, projectId });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const sprint = {
      ...parsed,
      id,
      status: 'future' as const,
      velocity: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.sprint(id),
        data: sprint,
        GSI1PK: `PROJ#${projectId}#SPRINTS`,
        GSI1SK: `STATUS#${sprint.status}`,
        entityType: 'SPRINT',
      },
    }));

    return success(sprint, 201);
  } catch (e: any) {
    console.error('createSprint error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

export async function updateSprint(sprintId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = UpdateSprintSchema.parse(body);

    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.sprint(sprintId),
    }));
    if (!existing.Item) return notFound('Sprint not found');

    const now = new Date().toISOString();
    const existingData = existing.Item.data;

    let completedAt = existingData.completedAt;
    if (parsed.status === 'completed' && !existingData.completedAt) {
      completedAt = now;
    }

    // If starting sprint, set startDate
    let startDate = parsed.startDate || existingData.startDate;
    if (parsed.status === 'active' && !existingData.startDate) {
      startDate = now;
    }

    const updated = {
      ...existingData,
      ...parsed,
      startDate,
      completedAt,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...existing.Item,
        data: updated,
        GSI1PK: `PROJ#${updated.projectId}#SPRINTS`,
        GSI1SK: `STATUS#${updated.status}`,
        entityType: 'SPRINT',
      },
    }));

    return success(updated);
  } catch (e: any) {
    console.error('updateSprint error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}
