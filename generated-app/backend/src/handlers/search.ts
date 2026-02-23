import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { docClient, TABLE_NAME, ScanCommand } from '../lib/db';
import { success, serverError } from '../lib/response';

export async function search(event: APIGatewayProxyEventV2) {
  try {
    const params = event.queryStringParameters || {};
    const q = (params.q || '').toLowerCase();
    const searchType = params.type || 'all';
    const limit = Math.min(parseInt(params.limit || '20'), 50);
    const projectId = params.projectId;

    const issues: any[] = [];
    const projects: any[] = [];

    if (searchType === 'all' || searchType === 'issues') {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :et',
        ExpressionAttributeValues: { ':et': 'ISSUE' },
      }));
      const allIssues = (result.Items || []).map(item => item.data).filter(Boolean);
      const filtered = allIssues.filter((issue: any) => {
        if (projectId && issue.projectId !== projectId) return false;
        const searchable = `${issue.summary} ${issue.description || ''} ${issue.key}`.toLowerCase();
        return searchable.includes(q);
      });
      issues.push(...filtered.slice(0, limit));
    }

    if (searchType === 'all' || searchType === 'projects') {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :et',
        ExpressionAttributeValues: { ':et': 'PROJECT' },
      }));
      const allProjects = (result.Items || []).map(item => item.data).filter(Boolean);
      const filtered = allProjects.filter((project: any) => {
        const searchable = `${project.name} ${project.key} ${project.description || ''}`.toLowerCase();
        return searchable.includes(q);
      });
      projects.push(...filtered.slice(0, limit));
    }

    return success({
      issues,
      projects,
      total: issues.length + projects.length,
    });
  } catch (e) {
    console.error('search error:', e);
    return serverError();
  }
}
