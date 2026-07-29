import { authService } from '@/services/auth.service';
const apiBaseUrl = (import.meta.env.VITE_API_URL || (window.location.protocol === 'file:' ? 'http://localhost:4001/api/v1' : '/api/v1')).replace(/\/$/, '');
function getCsrfToken() {
    return document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('csrf_token='))
        ?.split('=')
        .slice(1)
        .join('=');
}
function resolveUrl(path) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    return `${apiBaseUrl}/${path.replace(/^\//, '')}`;
}
async function parseError(response) {
    const body = await response.json().catch(() => null);
    return new Error(body?.message || `Request failed (${response.status})`);
}
/** Shared authenticated API client with CSRF protection and a one-time refresh retry. */
export async function apiRequest(path, options = {}, retried = false) {
    const headers = new Headers(options.headers);
    const token = authService.getAccessToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            headers.set('x-csrf-token', csrfToken);
        }
    }
    const response = await fetch(resolveUrl(path), { ...options, headers, credentials: 'include' });
    if (response.status === 401 && !retried && await authService.refreshToken()) {
        return apiRequest(path, options, true);
    }
    if (!response.ok) {
        throw await parseError(response);
    }
    if (response.status === 204) {
        return undefined;
    }
    const body = await response.json();
    return (typeof body === 'object' && body !== null && 'success' in body && body.success === true)
        ? body.data
        : body;
}
export const apiUrl = resolveUrl;
//# sourceMappingURL=api-client.js.map