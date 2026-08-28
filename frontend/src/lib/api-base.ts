/**
 * Shared API base URL resolver — OFFLINE-FIRST DESKTOP.
 *
 * Environment precedence:
 *   1. VITE_API_URL — absolute http(s) URL or root-relative path (highest priority)
 *   2. Web dev proxy — /api/v1 (when served by Vite dev server)
 *   3. Desktop — http://127.0.0.1:<backend-port>/api/v1 (file:// protocol, offline-first)
 *
 * The desktop app spawns a LOCAL backend process on startup.
 * Internet is NEVER required for normal ERP operations.
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

  // ── Desktop (file://) — OFFLINE-FIRST LOCAL BACKEND ──
  // The Tauri app spawns the backend on a local port at startup.
  // The backend port is communicated via window.__SHRANIX_BACKEND_PORT__
  // set by the Rust side before the frontend loads.
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const port =
      (window as any).__SHRANIX_BACKEND_PORT__ ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('shranix_backend_port')) ||
      '19256';
    return `http://127.0.0.1:${port}/api/v1`;
  }

  return 'http://127.0.0.1:19256/api/v1';
}
