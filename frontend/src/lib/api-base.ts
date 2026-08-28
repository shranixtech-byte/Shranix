/**
 * Shared API base URL resolver.
 *
 * Environment precedence:
 *   1. VITE_API_URL — absolute http(s) URL or root-relative path (highest priority)
 *   2. Web dev proxy — /api/v1 (when served by Vite dev server)
 *   3. Desktop dev — http://localhost:4001/api/v1 (file:// protocol, development only)
 *
 * Production desktop builds MUST set VITE_API_URL at build time.
 * The file:// fallback only activates in development (when VITE_API_URL is not set).
 */
export function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

  if (configured && (/^https?:\/\//i.test(configured) || configured.startsWith('/'))) {
    return configured.replace(/\/+$/, '');
  }

  // Vite dev server (port 4000) proxies /api to backend — use relative path
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    return '/api/v1';
  }

  // Desktop (file://) without VITE_API_URL — development-only fallback.
  // Production desktop builds MUST set VITE_API_URL at build time.
  if (import.meta.env.MODE === 'production') {
    console.error(
      '[SHRANIX] CRITICAL: VITE_API_URL is not configured for production desktop build. ' +
        'Set VITE_API_URL to your production API URL (e.g. https://api.shranix.com/api/v1).',
    );
  }

  return 'http://localhost:4001/api/v1';
}
