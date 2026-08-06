/**
 * Shared API base URL resolver.
 *
 * Vite inlines VITE_API_URL at build/serve time. If a misconfigured or
 * environment-poisoned value sneaks in (e.g. a bare Windows path like
 * "C:/Program Files/Git/api/v1"), fetch() would try to resolve it against a
 * file:// URL and login would break silently. Only accept absolute http(s)
 * URLs or root-relative paths; anything else falls back to the dev defaults.
 */
export function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (configured && (/^https?:\/\//i.test(configured) || configured.startsWith('/'))) {
    return configured.replace(/\/+$/, '');
  }
  // Desktop (Tauri / file://) builds talk to the local backend directly
  return window.location.protocol === 'file:' ? 'http://localhost:4001/api/v1' : '/api/v1';
}
