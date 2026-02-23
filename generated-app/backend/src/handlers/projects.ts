import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateProjectSchema, UpdateProjectSchema } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from '../lib/db';
import { success, error, notFound, serverError } from '../lib/response';

export async function listProjects() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
      ExpressionAttributeValues: { ':pk': 'PROJ#', ':sk': 'METADATA' },
    }));
    const projects = (result.Items || []).map(item => item.data);
    return success(projects);
  } catch (e) {
    console.error('listProjects error:', e);
    return serverError();
  }
}

export async function createProject(event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = CreateProjectSchema.parse(body);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const project = {
      ...parsed,
      id,
      issueCounter: 0,
      isArchived: false,
      settings: {},
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.project(id),
        data: project,
        GSI1PK: `PROJ#${id}`,
        GSI1SK: `STATUS#active`,
        entityType: 'PROJECT',
      },
    }));

    return success(project, 201);
  } catch (e: any) {
    console.error('createProject error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

export async function getProject(projectId: string) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.project(projectId),
    }));
    if (!result.Item) return notFound('Project not found');
    return success(result.Item.data);
  } catch (e) {
    console.error('getProject error:', e);
    return serverError();
  }
}

export async function updateProject(projectId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = UpdateProjectSchema.parse(body);

    // Get existing project first
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.project(projectId),
    }));
    if (!existing.Item) return notFound('Project not found');

    const updated = {
      ...existing.Item.data,
      ...parsed,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.project(projectId),
        data: updated,
        GSI1PK: `PROJ#${projectId}`,
        GSI1SK: `STATUS#${updated.isArchived ? 'archived' : 'active'}`,
        entityType: 'PROJECT',
      },
    }));

    return success(updated);
  } catch (e: any) {
    console.error('updateProject error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

export async function deleteProject(projectId: string) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.project(projectId),
    }));
    return success({ success: true });
  } catch (e) {
    console.error('deleteProject error:', e);
    return serverError();
  }
}
