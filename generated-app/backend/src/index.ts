// Canopy API Lambda Handler v6 - with attachment routes
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { listProjects, createProject, getProject, updateProject, deleteProject } from './handlers/projects';
import { listIssues, createIssue, getIssue, updateIssue, deleteIssue, bulkUpdateIssues } from './handlers/issues';
import { listSprints, createSprint, updateSprint } from './handlers/sprints';
import { getBoard, updateBoard } from './handlers/boards';
import { addComment, listComments } from './handlers/comments';
import { uploadAttachment, listAttachments, getAttachment, deleteAttachment } from './handlers/attachments';
import { search } from './handlers/search';
import { success, error } from './lib/response';

// Simple path matcher
function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || (event as any).httpMethod || 'GET';
  const path = event.requestContext?.http?.path || (event as any).path || '/';

  console.log(`${method} ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return success({});
  }

  try {
    // Projects
    let params = matchRoute('/projects', path);
    if (params) {
      if (method === 'GET') return await listProjects();
      if (method === 'POST') return await createProject(event);
    }

    params = matchRoute('/projects/:id', path);
    if (params) {
      if (method === 'GET') return await getProject(params.id);
      if (method === 'PUT') return await updateProject(params.id, event);
      if (method === 'DELETE') return await deleteProject(params.id);
    }

    // Issues under project
    params = matchRoute('/projects/:id/issues', path);
    if (params) {
      if (method === 'GET') return await listIssues(params.id);
      if (method === 'POST') return await createIssue(params.id, event);
    }

    // Bulk update — must come before /issues/:id to avoid 'bulk' being treated as an ID
    params = matchRoute('/issues/bulk', path);
    if (params) {
      if (method === 'PUT') return await bulkUpdateIssues(event);
    }

    // Issues direct
    params = matchRoute('/issues/:id', path);
    if (params) {
      if (method === 'GET') return await getIssue(params.id);
      if (method === 'PUT') return await updateIssue(params.id, event);
      if (method === 'DELETE') return await deleteIssue(params.id);
    }

    // Attachments (specific route must come before :attachmentId wildcard)
    params = matchRoute('/issues/:id/attachments/:attachmentId', path);
    if (params) {
      if (method === 'GET') return await getAttachment(params.id, params.attachmentId);
      if (method === 'DELETE') return await deleteAttachment(params.id, params.attachmentId);
    }

    params = matchRoute('/issues/:id/attachments', path);
    if (params) {
      if (method === 'GET') return await listAttachments(params.id);
      if (method === 'POST') return await uploadAttachment(params.id, event);
    }

    // Comments
    params = matchRoute('/issues/:id/comments', path);
    if (params) {
      if (method === 'GET') return await listComments(params.id);
      if (method === 'POST') return await addComment(params.id, event);
    }

    // Sprints under project
    params = matchRoute('/projects/:id/sprints', path);
    if (params) {
      if (method === 'GET') return await listSprints(params.id);
      if (method === 'POST') return await createSprint(params.id, event);
    }

    // Sprints direct
    params = matchRoute('/sprints/:id', path);
    if (params) {
      if (method === 'PUT') return await updateSprint(params.id, event);
    }

    // Boards
    params = matchRoute('/projects/:id/board', path);
    if (params) {
      if (method === 'GET') return await getBoard(params.id);
    }

    params = matchRoute('/boards/:id', path);
    if (params) {
      if (method === 'PUT') return await updateBoard(params.id, event);
    }

    // Search
    params = matchRoute('/search', path);
    if (params) {
      if (method === 'GET') return await search(event);
    }

    return error(`Route not found: ${method} ${path}`, 404, 'NOT_FOUND');
  } catch (e) {
    console.error('Unhandled error:', e);
    return error('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
