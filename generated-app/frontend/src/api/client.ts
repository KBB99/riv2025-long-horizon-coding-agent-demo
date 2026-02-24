/**
 * API client for communicating with the Canopy backend.
 *
 * Uses VITE_API_URL environment variable for the base URL.
 * Falls back to localStorage when the API is unreachable.
 */

import type {
  Project,
  CreateProject,
  UpdateProject,
  Issue,
  CreateIssue,
  UpdateIssue,
  BulkUpdateIssues,
  Sprint,
  CreateSprint,
  UpdateSprint,
  Board,
  UpdateBoard,
  Comment,
  CreateComment,
  SearchResult,
  SearchQuery,
  Attachment,
  AttachmentWithData,
} from '@canopy/shared';

// ---------------------------------------------------------------------------
// Base URL & connectivity
// ---------------------------------------------------------------------------

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/** Whether VITE_API_URL was provided at build/dev time. */
export const isApiConfigured = (): boolean => !!API_BASE_URL;

let apiReachable: boolean | null = null; // null = unknown

async function checkApiReachable(): Promise<boolean> {
  if (!API_BASE_URL) {
    apiReachable = false;
    return false;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    apiReachable = res.ok || res.status === 404;
  } catch {
    apiReachable = false;
  }
  return apiReachable;
}

/** Returns true when we should use the real API. */
async function shouldUseApi(): Promise<boolean> {
  if (!API_BASE_URL) return false;
  if (apiReachable !== null) return apiReachable;
  return checkApiReachable();
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Low-level fetch helpers
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options;

  let url = `${API_BASE_URL}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      data?.error?.message || data?.message || `Request failed: ${response.statusText}`,
      data,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

const http = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>(path, { params }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// localStorage fallback store
// ---------------------------------------------------------------------------

const LS_PREFIX = 'canopy_';

function lsKey(collection: string): string {
  return `${LS_PREFIX}${collection}`;
}

function lsRead<T>(collection: string): T[] {
  try {
    const raw = localStorage.getItem(lsKey(collection));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsWrite<T>(collection: string, data: T[]): void {
  localStorage.setItem(lsKey(collection), JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// localStorage CRUD helpers
// ---------------------------------------------------------------------------

function lsCreate<T extends { id: string; createdAt: string; updatedAt: string }>(
  collection: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'id' | 'createdAt' | 'updatedAt'>>,
): T {
  const timestamp = now();
  const record = {
    ...data,
    id: data.id ?? generateId(),
    createdAt: data.createdAt ?? timestamp,
    updatedAt: data.updatedAt ?? timestamp,
  } as T;
  const items = lsRead<T>(collection);
  items.push(record);
  lsWrite(collection, items);
  return record;
}

function lsList<T>(collection: string): T[] {
  return lsRead<T>(collection);
}

function lsGet<T extends { id: string }>(collection: string, id: string): T | undefined {
  return lsRead<T>(collection).find((item) => item.id === id);
}

function lsUpdate<T extends { id: string; updatedAt: string }>(
  collection: string,
  id: string,
  updates: Partial<T>,
): T {
  const items = lsRead<T>(collection);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) throw new ApiError(404, `${collection} item not found: ${id}`);
  items[index] = { ...items[index], ...updates, updatedAt: now() };
  lsWrite(collection, items);
  return items[index];
}

function lsDelete<T extends { id: string }>(collection: string, id: string): { success: boolean } {
  const items = lsRead<T>(collection);
  const filtered = items.filter((item) => item.id !== id);
  lsWrite(collection, filtered);
  return { success: filtered.length < items.length };
}

// ---------------------------------------------------------------------------
// Typed API functions – each tries the real API first, falls back to LS
// ---------------------------------------------------------------------------

// ---- Projects ----

export async function listProjects(): Promise<Project[]> {
  if (await shouldUseApi()) {
    return http.get<Project[]>('/projects');
  }
  return lsList<Project>('projects');
}

export async function getProject(id: string): Promise<Project> {
  if (await shouldUseApi()) {
    return http.get<Project>(`/projects/${id}`);
  }
  const p = lsGet<Project>('projects', id);
  if (!p) throw new ApiError(404, 'Project not found');
  return p;
}

export async function createProject(data: CreateProject): Promise<Project> {
  if (await shouldUseApi()) {
    return http.post<Project>('/projects', data);
  }
  return lsCreate<Project>('projects', {
    ...data,
    issueCounter: 0,
    isArchived: false,
    settings: {},
  } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
}

export async function updateProject(id: string, data: UpdateProject): Promise<Project> {
  if (await shouldUseApi()) {
    return http.put<Project>(`/projects/${id}`, data);
  }
  return lsUpdate<Project>('projects', id, data as Partial<Project>);
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  if (await shouldUseApi()) {
    return http.delete<{ success: boolean }>(`/projects/${id}`);
  }
  return lsDelete<Project>('projects', id);
}

// ---- Issues ----

export async function listIssues(projectId: string): Promise<Issue[]> {
  if (await shouldUseApi()) {
    return http.get<Issue[]>(`/projects/${projectId}/issues`);
  }
  return lsList<Issue>('issues').filter((i) => i.projectId === projectId);
}

export async function getIssue(id: string): Promise<Issue> {
  if (await shouldUseApi()) {
    return http.get<Issue>(`/issues/${id}`);
  }
  const issue = lsGet<Issue>('issues', id);
  if (!issue) throw new ApiError(404, 'Issue not found');
  return issue;
}

export async function createIssue(data: CreateIssue): Promise<Issue> {
  if (await shouldUseApi()) {
    return http.post<Issue>(`/projects/${data.projectId}/issues`, data);
  }
  // Increment project issue counter for key generation
  const projects = lsRead<Project>('projects');
  const projIdx = projects.findIndex((p) => p.id === data.projectId);
  let key = 'ISSUE-1';
  if (projIdx !== -1) {
    const proj = projects[projIdx];
    const counter = (proj.issueCounter ?? 0) + 1;
    projects[projIdx] = { ...proj, issueCounter: counter, updatedAt: now() };
    lsWrite('projects', projects);
    key = `${proj.key}-${counter}`;
  }
  return lsCreate<Issue>('issues', {
    ...data,
    key,
    status: 'todo',
    reporterId: 'local-user',
    sortOrder: 0,
    timeSpent: 0,
    labels: data.labels ?? [],
    components: data.components ?? [],
  } as Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>);
}

export async function updateIssue(id: string, data: UpdateIssue): Promise<Issue> {
  if (await shouldUseApi()) {
    return http.put<Issue>(`/issues/${id}`, data);
  }
  return lsUpdate<Issue>('issues', id, data as Partial<Issue>);
}

export async function deleteIssue(id: string): Promise<{ success: boolean }> {
  if (await shouldUseApi()) {
    return http.delete<{ success: boolean }>(`/issues/${id}`);
  }
  return lsDelete<Issue>('issues', id);
}

export async function bulkUpdateIssues(data: BulkUpdateIssues): Promise<Issue[]> {
  if (await shouldUseApi()) {
    return http.put<Issue[]>('/issues/bulk', data);
  }
  return data.issueIds.map((id) => lsUpdate<Issue>('issues', id, data.update as Partial<Issue>));
}

// ---- Comments ----

export async function addComment(issueId: string, data: CreateComment): Promise<Comment> {
  if (await shouldUseApi()) {
    return http.post<Comment>(`/issues/${issueId}/comments`, data);
  }
  return lsCreate<Comment>('comments', {
    ...data,
    issueId,
    authorId: 'local-user',
    isEdited: false,
  } as Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>);
}

export async function listComments(issueId: string): Promise<Comment[]> {
  if (await shouldUseApi()) {
    return http.get<Comment[]>(`/issues/${issueId}/comments`);
  }
  return lsList<Comment>('comments').filter((c) => c.issueId === issueId);
}

// ---- Sprints ----

export async function listSprints(projectId: string): Promise<Sprint[]> {
  if (await shouldUseApi()) {
    return http.get<Sprint[]>(`/projects/${projectId}/sprints`);
  }
  return lsList<Sprint>('sprints').filter((s) => s.projectId === projectId);
}

export async function createSprint(data: CreateSprint): Promise<Sprint> {
  if (await shouldUseApi()) {
    return http.post<Sprint>(`/projects/${data.projectId}/sprints`, data);
  }
  return lsCreate<Sprint>('sprints', {
    ...data,
    status: 'future',
    velocity: 0,
  } as Omit<Sprint, 'id' | 'createdAt' | 'updatedAt'>);
}

export async function updateSprint(id: string, data: UpdateSprint): Promise<Sprint> {
  if (await shouldUseApi()) {
    return http.put<Sprint>(`/sprints/${id}`, data);
  }
  return lsUpdate<Sprint>('sprints', id, data as Partial<Sprint>);
}

// ---- Boards ----

export async function getBoard(projectId: string): Promise<Board> {
  if (await shouldUseApi()) {
    return http.get<Board>(`/projects/${projectId}/board`);
  }
  const boards = lsList<Board>('boards');
  let board = boards.find((b) => b.projectId === projectId);
  if (!board) {
    // Create a default board for this project
    board = lsCreate<Board>('boards', {
      projectId,
      name: 'Board',
      columns: [
        { id: generateId(), name: 'To Do', statusCategory: 'todo', sortOrder: 0 },
        { id: generateId(), name: 'In Progress', statusCategory: 'in_progress', sortOrder: 1 },
        { id: generateId(), name: 'Done', statusCategory: 'done', sortOrder: 2 },
      ],
      swimlaneBy: 'none',
    } as Omit<Board, 'id' | 'createdAt' | 'updatedAt'>);
  }
  return board;
}

export async function updateBoard(id: string, data: UpdateBoard): Promise<Board> {
  if (await shouldUseApi()) {
    return http.put<Board>(`/boards/${id}`, data);
  }
  return lsUpdate<Board>('boards', id, data as Partial<Board>);
}

// ---- Search ----

export async function search(query: SearchQuery): Promise<SearchResult> {
  if (await shouldUseApi()) {
    return http.get<SearchResult>('/search', {
      q: query.q,
      projectId: query.projectId,
      type: query.type,
      limit: query.limit,
    });
  }
  // Local search across projects and issues
  const q = query.q.toLowerCase();
  const allProjects = lsList<Project>('projects');
  const allIssues = lsList<Issue>('issues');

  const matchedProjects =
    query.type === 'issues'
      ? []
      : allProjects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description?.toLowerCase().includes(q) ?? false) ||
            p.key.toLowerCase().includes(q),
        );

  const matchedIssues =
    query.type === 'projects'
      ? []
      : allIssues.filter(
          (i) =>
            (!query.projectId || i.projectId === query.projectId) &&
            (i.summary.toLowerCase().includes(q) ||
              (i.description?.toLowerCase().includes(q) ?? false) ||
              i.key.toLowerCase().includes(q)),
        );

  const limit = query.limit ?? 20;
  return {
    projects: matchedProjects.slice(0, limit),
    issues: matchedIssues.slice(0, limit),
    total: matchedProjects.length + matchedIssues.length,
  };
}

// ---- Attachments ----

export async function uploadAttachment(
  issueId: string,
  data: { fileName: string; fileSize: number; mimeType: string; fileData: string },
): Promise<Attachment> {
  if (await shouldUseApi()) {
    try {
      return await http.post<Attachment>(`/issues/${issueId}/attachments`, {
        ...data,
        issueId,
      });
    } catch (err) {
      // Fall back to localStorage if endpoint not yet deployed (404)
      if (err instanceof ApiError && err.status === 404) {
        console.info('Attachment API not available, using localStorage fallback');
      } else {
        throw err;
      }
    }
  }
  // localStorage fallback
  const attachment: Attachment = {
    id: generateId(),
    issueId,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    uploadedBy: 'local-user',
    createdAt: now(),
  };
  // Store metadata in list
  const items = lsRead<Attachment & { fileData?: string }>('attachments');
  items.push({ ...attachment, fileData: data.fileData });
  lsWrite('attachments', items);
  return attachment;
}

export async function listAttachments(issueId: string): Promise<Attachment[]> {
  if (await shouldUseApi()) {
    try {
      return await http.get<Attachment[]>(`/issues/${issueId}/attachments`);
    } catch (err) {
      // Fall back to localStorage if endpoint not yet deployed (404)
      if (err instanceof ApiError && err.status === 404) {
        console.info('Attachment API not available, using localStorage fallback');
      } else {
        throw err;
      }
    }
  }
  return lsList<Attachment & { issueId: string }>('attachments').filter(
    (a) => a.issueId === issueId,
  );
}

export async function getAttachment(
  issueId: string,
  attachmentId: string,
): Promise<AttachmentWithData> {
  if (await shouldUseApi()) {
    try {
      return await http.get<AttachmentWithData>(
        `/issues/${issueId}/attachments/${attachmentId}`,
      );
    } catch (err) {
      // Fall back to localStorage if endpoint not yet deployed (404 route not found)
      if (err instanceof ApiError && err.status === 404 && err.data && typeof err.data === 'object' && 'error' in (err.data as Record<string, unknown>) && ((err.data as Record<string, unknown>).error as Record<string, unknown>)?.code === 'NOT_FOUND') {
        console.info('Attachment API not available, using localStorage fallback');
      } else {
        throw err;
      }
    }
  }
  const items = lsRead<AttachmentWithData & { issueId: string }>('attachments');
  const item = items.find((a) => a.id === attachmentId && a.issueId === issueId);
  if (!item) throw new ApiError(404, 'Attachment not found');
  return item;
}

export async function deleteAttachment(
  issueId: string,
  attachmentId: string,
): Promise<{ success: boolean }> {
  if (await shouldUseApi()) {
    try {
      return await http.delete<{ success: boolean }>(
        `/issues/${issueId}/attachments/${attachmentId}`,
      );
    } catch (err) {
      // Fall back to localStorage if endpoint not yet deployed (404)
      if (err instanceof ApiError && err.status === 404) {
        console.info('Attachment API not available, using localStorage fallback');
      } else {
        throw err;
      }
    }
  }
  const items = lsRead<Attachment & { issueId: string }>('attachments');
  const filtered = items.filter(
    (a) => !(a.id === attachmentId && a.issueId === issueId),
  );
  lsWrite('attachments', filtered);
  return { success: filtered.length < items.length };
}

// ---------------------------------------------------------------------------
// Re-export convenience object (backwards compat with simple api.get/post)
// ---------------------------------------------------------------------------

export const api = {
  get: http.get,
  post: http.post,
  put: http.put,
  delete: http.delete,
};

export default api;
