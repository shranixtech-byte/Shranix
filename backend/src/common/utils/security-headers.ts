/**
 * H14 — Centralized security headers and Helmet configuration.
 *
 * Provides explicit, hardened security header policies instead of relying
 * on Helmet defaults. Environment-aware: development vs production.
 *
 * Helmet v7 provides these headers by default; we override specific ones
 * where the application needs tighter control.
 */

import type { HelmetOptions } from 'helmet';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// ─── Content Security Policy ─────────────────────────────────────

/**
 * CSP directive sources.
 *
 * Development: relaxed to allow Vite HMR, webpack dev server, and
 * local development workflows.
 *
 * Production: strict policy allowing only the application's own origin.
 *
 * NOTE: If the frontend requires inline scripts/styles (e.g. Vite
 * injects <script type="module"> tags), we use 'unsafe-inline' for
 * script-src in development only. In production, if the frontend is
 * bundled, inline scripts should be removed.
 *
 * EXCEPTION DOCUMENTATION:
 * - 'unsafe-inline' for style-src: Vite dev server injects inline styles
 *   during HMR. In production, if the frontend uses bundled CSS, this
 *   can be replaced with nonce-based or hash-based CSP.
 * - 'unsafe-eval' is NOT used anywhere.
 */
const CSP_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    // Vite dev server injects inline scripts; production builds don't need this
    ...(isDevelopment ? ["'unsafe-inline'"] : []),
  ],
  styleSrc: [
    "'self'",
    // Vite HMR injects inline styles
    "'unsafe-inline'",
  ],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
};

// ─── Helmet Configuration ────────────────────────────────────────

/**
 * Hardened Helmet options for the application.
 *
 * Explicitly configures every header rather than relying on defaults.
 */
export const HELMET_OPTIONS: HelmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: CSP_DIRECTIVES,
  },

  // HSTS — only in production behind HTTPS
  // In development (HTTP localhost), HSTS must NOT be enabled
  strictTransportSecurity: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        // preload: only enable if the domain is actually submitted to
        // hstspreload.org — do NOT enable blindly
        preload: false,
      }
    : false,

  // Prevent MIME-type sniffing
  // Already a Helmet default; explicitly set for clarity
  // Note: contentTypeNosniff is enabled by default in Helmet v7

  // Clickjacking protection
  // DENY is most restrictive; SAMEORIGIN is acceptable if the app
  // needs to embed its own content in iframes
  frameguard: { action: 'deny' },

  // Referrer policy — privacy-preserving default
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Disable deprecated X-XSS-Protection (modern browsers don't use it)
  // Helmet v7 sets this to 0 by default; explicit for clarity
  xssFilter: false,

  // DNS prefetch control
  dnsPrefetchControl: { allow: false },

  // Don't leak the X-Powered-By header
  hidePoweredBy: true,

  // Cross-origin policies (Helmet defaults are fine)
  crossOriginEmbedderPolicy: false, // Can break some cross-origin resources
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },

  // Origin agent cluster
  originAgentCluster: true,

  // X-Download-Options (IE specific, but harmless)
  ieNoOpen: true,

  // Permitted cross-domain policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
};

// ─── Permissions Policy ──────────────────────────────────────────

/**
 * Permissions-Policy header value.
 *
 * Disables unnecessary browser capabilities that the application
 * does not use. This is NOT set by Helmet; we add it as custom middleware.
 *
 * If the application later needs camera/microphone (e.g. for video calls),
 * the relevant permission should be re-enabled here.
 */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'ambient-light-sensor=()',
  'autoplay=()',
  'battery=()',
  'camera=()',
  'display-capture=()',
  'document-domain=()',
  'encrypted-media=()',
  'execution-while-not-rendered=()',
  'execution-while-out-of-viewport=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'keyboard-map=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'navigation-override=()',
  'payment=(self)',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'sync-xhr=(self)',
  'usb=()',
  'web-share=()',
  'xr-spatial-tracking=()',
].join(', ');

// ─── Cache-Control for sensitive endpoints ───────────────────────

/**
 * Cache-Control header value for sensitive API responses.
 *
 * Used on: authentication endpoints, user profile, admin data,
 * password reset, CSRF token endpoints.
 */
export const SENSITIVE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate, proxy-revalidate';

/**
 * Cache-Control for static assets (images, fonts, CSS, JS bundles).
 * Long cache with immutable flag for fingerprinted assets.
 */
export const STATIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';

// ─── CORS Configuration ──────────────────────────────────────────

/**
 * Production CORS configuration.
 *
 * Uses environment-driven allowed origins. Never uses wildcard '*'
 * with credentials.
 */
export function getCorsOptions() {
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:4000,tauri://localhost')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'x-csrf-token',
      'x-correlation-id',
    ],
    exposedHeaders: ['x-request-id'],
    maxAge: 86400, // 24 hours preflight cache
  };
}
