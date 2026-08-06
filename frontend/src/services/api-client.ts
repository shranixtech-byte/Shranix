import { resolveApiBase } from '@/lib/api-base';
import { authService } from '@/services/auth.service';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

const apiBaseUrl = resolveApiBase();

function getCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? match[1] : undefined;
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${apiBaseUrl}/${path.replace(/^\//, '')}`;
}

async function parseError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as
    ApiEnvelope<unknown> | { message?: string } | null;
  return new Error(body?.message || `Request failed (${response.status})`);
}

/**
 * Fetch a fresh CSRF token from the server and set it as a cookie.
 * Called automatically when a CSRF-protected request fails with 403.
 */
let csrfRefreshing = false;
let csrfRefreshPromise: Promise<void> | null = null;

async function refreshCsrfToken(): Promise<void> {
  if (csrfRefreshing && csrfRefreshPromise) {
    return csrfRefreshPromise;
  }
  csrfRefreshing = true;
  csrfRefreshPromise = (async () => {
    try {
      // Use authService's base URL for auth endpoints
      const authBase = `${resolveApiBase()}/auth`;
      const res = await fetch(`${authBase}/csrf`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        console.warn('[API] CSRF token refresh failed:', res.status);
      }
    } catch (err) {
      console.warn('[API] CSRF token refresh error:', err);
    }
  })();
  try {
    await csrfRefreshPromise;
  } finally {
    csrfRefreshing = false;
    csrfRefreshPromise = null;
  }
}

/** Shared authenticated API client with CSRF protection and retry logic. */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
  csrfRetried = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = authService.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach CSRF token for state-changing methods
  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(
    (options.method || 'GET').toUpperCase(),
  );
  if (isStateChanging) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  const response = await fetch(resolveUrl(path), { ...options, headers, credentials: 'include' });

  // ── 401 → Refresh token & retry (once) ──
  if (response.status === 401 && !retried) {
    const refreshed = await authService.refreshToken();
    if (refreshed) {
      return apiRequest<T>(path, options, true, csrfRetried);
    }
  }

  // ── 403 CSRF → Refresh CSRF token & retry (once) ──
  if (response.status === 403 && !csrfRetried && isStateChanging) {
    await refreshCsrfToken();
    // Small delay to ensure cookie is set before retrying
    await new Promise((r) => setTimeout(r, 50));
    return apiRequest<T>(path, options, retried, true);
  }

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as ApiEnvelope<T> | T;
  return typeof body === 'object' && body !== null && 'success' in body && body.success === true
    ? ((body as ApiEnvelope<T>).data as T)
    : (body as T);
}

export const apiUrl = resolveUrl;
