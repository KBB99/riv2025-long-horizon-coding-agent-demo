import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CreateIssueSchema, UpdateIssueSchema, BulkUpdateIssuesSchema } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from '../lib/db';
import { success, error, notFound, serverError } from '../lib/response';

export async function listIssues(projectId: string) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': `PROJ#${projectId}#ISSUES` },
    }));
    const issues = (result.Items || []).map(item => item.data);
    return success(issues);
  } catch (e) {
    console.error('listIssues error:', e);
    return serverError();
  }
}

export async function createIssue(projectId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = CreateIssueSchema.parse({ ...body, projectId });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Get project to increment counter
    const projResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.project(projectId),
    }));
    if (!projResult.Item) return notFound('Project not found');

    const project = projResult.Item.data;
    const counter = (project.issueCounter || 0) + 1;
    const issueKey = `${project.key}-${counter}`;

    const issue = {
      ...parsed,
      id,
      key: issueKey,
      status: parsed.sprintId ? 'todo' : 'todo',
      reporterId: parsed.assigneeId || crypto.randomUUID(),
      sortOrder: counter * 1000,
      timeSpent: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Write issue and update project counter
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.issue(id),
        data: issue,
        GSI1PK: `PROJ#${projectId}#ISSUES`,
        GSI1SK: `STATUS#${issue.status}#${issue.sortOrder}`,
        GSI2PK: issue.assigneeId ? `USER#${issue.assigneeId}` : 'UNASSIGNED',
        GSI2SK: now,
        GSI3PK: issue.sprintId ? `SPRINT#${issue.sprintId}` : 'BACKLOG',
        GSI3SK: `${issue.sortOrder}`,
        entityType: 'ISSUE',
      },
    }));

    // Update project counter
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...projResult.Item,
        data: { ...project, issueCounter: counter, updatedAt: now },
      },
    }));

    return success(issue, 201);
  } catch (e: any) {
    console.error('createIssue error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

export async function getIssue(issueId: string) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.issue(issueId),
    }));
    if (!result.Item) return notFound('Issue not found');
    return success(result.Item.data);
  } catch (e) {
    console.error('getIssue error:', e);
    return serverError();
  }
}

export async function updateIssue(issueId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = UpdateIssueSchema.parse(body);

    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.issue(issueId),
    }));
    if (!existing.Item) return notFound('Issue not found');

    const now = new Date().toISOString();
    const existingData = existing.Item.data;

    // Check if moving to done status
    let resolvedAt = existingData.resolvedAt;
    if (parsed.status && ['done', 'Done'].includes(parsed.status) && !existingData.resolvedAt) {
      resolvedAt = now;
    } else if (parsed.status && !['done', 'Done'].includes(parsed.status)) {
      resolvedAt = undefined;
    }

    const updated = {
      ...existingData,
      ...parsed,
      resolvedAt,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...existing.Item,
        data: updated,
        GSI1PK: `PROJ#${updated.projectId}#ISSUES`,
        GSI1SK: `STATUS#${updated.status}#${updated.sortOrder}`,
        GSI2PK: updated.assigneeId ? `USER#${updated.assigneeId}` : 'UNASSIGNED',
        GSI2SK: now,
        GSI3PK: updated.sprintId ? `SPRINT#${updated.sprintId}` : 'BACKLOG',
        GSI3SK: `${updated.sortOrder}`,
      },
    }));

    return success(updated);
  } catch (e: any) {
    console.error('updateIssue error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}

export async function deleteIssue(issueId: string) {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.issue(issueId),
    }));
    return success({ success: true });
  } catch (e) {
    console.error('deleteIssue error:', e);
    return serverError();
  }
}

export async function bulkUpdateIssues(event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = BulkUpdateIssuesSchema.parse(body);
    const now = new Date().toISOString();
    const results: any[] = [];

    for (const issueId of parsed.issueIds) {
      const existing = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: keys.issue(issueId),
      }));
      if (!existing.Item) continue;

      const updated = {
        ...existing.Item.data,
        ...parsed.update,
        updatedAt: now,
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...existing.Item,
          data: updated,
          GSI1PK: `PROJ#${updated.projectId}#ISSUES`,
          GSI1SK: `STATUS#${updated.status}#${updated.sortOrder}`,
          GSI2PK: updated.assigneeId ? `USER#${updated.assigneeId}` : 'UNASSIGNED',
          GSI2SK: now,
          GSI3PK: updated.sprintId ? `SPRINT#${updated.sprintId}` : 'BACKLOG',
          GSI3SK: `${updated.sortOrder}`,
        },
      }));

      results.push(updated);
    }

    return success(results);
  } catch (e: any) {
    console.error('bulkUpdateIssues error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}
