/**
 * API client for communicating with the backend.
 *
 * Uses VITE_API_URL environment variable for the base URL.
 * If not set, API calls will be skipped and the app should fall back to local storage.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/** Whether the API is configured (VITE_API_URL is set) */
export const isApiConfigured = (): boolean => !!API_BASE_URL;

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  if (!API_BASE_URL) {
    throw new Error('API not configured. Set VITE_API_URL environment variable.');
  }

  const url = `${API_BASE_URL}${path}`;

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
      data?.message || `Request failed: ${response.statusText}`,
      data,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };
export default api;
