/**
 * H15 — Centralized input validation utilities.
 *
 * Provides safe parsers, sanitizers, and validation helpers for
 * user-controlled inputs across the backend. Prevents:
 * - SQL injection via parameterized query enforcement
 * - XSS via output encoding helpers
 * - Prototype pollution via safe object operations
 * - Mass assignment via field allowlists
 * - Unsafe type coercion
 * - Path traversal
 */

// ─── Safe String Parsers ─────────────────────────────────────────

/**
 * Parse a string to a safe bounded integer.
 * Returns defaultValue if the value is not a valid integer within bounds.
 */
export function safeInt(value: unknown, defaultValue: number, min?: number, max?: number): number {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return defaultValue;
  }
  if (min !== undefined && n < min) {
    return defaultValue;
  }
  if (max !== undefined && n > max) {
    return defaultValue;
  }
  return n;
}

/**
 * Parse a string to a safe bounded float.
 * Returns defaultValue if the value is not a valid number within bounds.
 */
export function safeFloat(
  value: unknown,
  defaultValue: number,
  min?: number,
  max?: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return defaultValue;
  }
  if (min !== undefined && n < min) {
    return defaultValue;
  }
  if (max !== undefined && n > max) {
    return defaultValue;
  }
  return n;
}

/**
 * Parse a string to a boolean safely.
 * Accepts: true, 'true', '1', 'yes' → true
 * Accepts: false, 'false', '0', 'no' → false
 * Returns defaultValue for anything else.
 */
export function safeBool(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (['true', '1', 'yes'].includes(lower)) {
      return true;
    }
    if (['false', '0', 'no'].includes(lower)) {
      return false;
    }
  }
  return defaultValue;
}

/**
 * Safely coerce a string to a Date, returning null if invalid.
 */
export function safeDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ─── String Sanitization ─────────────────────────────────────────

/**
 * Trim and collapse whitespace in a string.
 * Returns empty string for non-string inputs.
 */
export function normalizeString(value: unknown, maxLength = 10000): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .trim()
    .slice(0, maxLength)
    .replace(/\s{3,}/g, '  ');
}

/**
 * Strip potentially dangerous characters from a string for safe display.
 * Does NOT HTML-encode — use context-appropriate encoding for that.
 */
export function stripControlChars(value: string): string {
  // Remove null bytes and control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ─── UUID / ID Validation ────────────────────────────────────────

/**
 * Validate that a string is a valid UUID v4 format.
 */
export function isValidUUID(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate that a string looks like a safe ID (alphanumeric, hyphens, underscores).
 * Less strict than UUID — accepts application-specific IDs like 'PRD-001'.
 */
export function isValidId(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length === 0 || value.length > 128) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

// ─── Path Traversal Prevention ───────────────────────────────────

/**
 * Check if a string contains path traversal sequences.
 * Detects: ../, ..\, %2e%2e, absolute paths, null bytes.
 */
export function containsPathTraversal(value: string): boolean {
  if (value.indexOf('\0') !== -1) {
    return true;
  }
  if (/(\.\.[/\\]|[/\\]\.\.)/.test(value)) {
    return true;
  }
  if (/^[/\\]/.test(value)) {
    return true;
  }
  if (/^[A-Z]:[/\\]/i.test(value)) {
    return true;
  }
  // Check URL-encoded traversal
  const decoded = decodeURIComponent(decodeURIComponent(value));
  if (/(\.\.[/\\]|[/\\]\.\.)/.test(decoded)) {
    return true;
  }
  return false;
}

// ─── Prototype Pollution Prevention ──────────────────────────────

/**
 * Check if an object key is safe (not a prototype pollution vector).
 */
export function isSafeKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Safely merge objects without prototype pollution.
 * Only copies own enumerable properties, skipping dangerous keys.
 */
export function safeMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (isSafeKey(key)) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Deep-sanitize an object, removing __proto__, constructor, prototype keys
 * recursively from nested objects.
 */
export function sanitizeObject(obj: unknown, maxDepth = 10): unknown {
  if (maxDepth <= 0) {
    return obj;
  }
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, maxDepth - 1));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSafeKey(key)) {
      result[key] = sanitizeObject(value, maxDepth - 1);
    }
  }
  return result;
}

// ─── SQL Safety Helpers ──────────────────────────────────────────

/**
 * Validate that a string is a safe SQL identifier (column/table name).
 * Only allows alphanumeric characters, underscores, and dots (for schema.table).
 * Rejects anything that could be SQL injection.
 */
export function isValidSqlIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(value) && value.length <= 128;
}

/**
 * Validate sort direction.
 */
export function normalizeSortDirection(value: unknown): 'asc' | 'desc' {
  const s = String(value || '')
    .toLowerCase()
    .trim();
  return s === 'desc' ? 'desc' : 'asc';
}

/**
 * Validate and normalize a sort field against an allowlist.
 * Returns the default field if the input is not in the allowlist.
 */
export function normalizeSortField(
  value: unknown,
  allowedFields: string[],
  defaultField: string,
): string {
  const s = String(value || '').trim();
  if (allowedFields.includes(s)) {
    return s;
  }
  return defaultField;
}

// ─── Pagination Bounds ───────────────────────────────────────────

/**
 * Safely parse pagination parameters with bounds.
 */
export function normalizePagination(
  page?: unknown,
  pageSize?: unknown,
  defaultPageSize = 20,
  maxPageSize = 200,
): { page: number; pageSize: number } {
  return {
    page: safeInt(page, 1, 1, 10000),
    pageSize: safeInt(pageSize, defaultPageSize, 1, maxPageSize),
  };
}

// ─── XSS Prevention ──────────────────────────────────────────────

/**
 * HTML-encode a string for safe insertion into HTML content.
 * Use this when rendering user-generated content in HTML templates.
 */
export function htmlEncode(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Check if a string contains potential XSS payloads.
 * Returns true if suspicious patterns are found.
 */
export function containsXssPayload(value: string): boolean {
  // Check for script tags, event handlers, javascript: protocol
  if (/<script[\s>]/i.test(value)) {
    return true;
  }
  if (/<\/script>/i.test(value)) {
    return true;
  }
  if (/javascript\s*:/i.test(value)) {
    return true;
  }
  if (/on\w+\s*=/i.test(value)) {
    return true;
  }
  if (/<iframe[\s>]/i.test(value)) {
    return true;
  }
  if (/<object[\s>]/i.test(value)) {
    return true;
  }
  if (/<embed[\s>]/i.test(value)) {
    return true;
  }
  return false;
}

// ─── URL Validation ──────────────────────────────────────────────

/**
 * Check if a URL string is safe (no javascript:, data:, or other dangerous protocols).
 */
export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// ─── Mass Assignment Protection ──────────────────────────────────

/**
 * Pick only allowed fields from an object.
 * Prevents mass assignment by filtering to a known set of fields.
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: Record<string, unknown>,
  allowedFields: string[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in obj && isSafeKey(field)) {
      result[field] = obj[field];
    }
  }
  return result as Partial<T>;
}

/**
 * Fields that must NEVER be set by client requests.
 * These are server-owned fields that should come from authenticated context.
 */
export const SERVER_OWNED_FIELDS = [
  'id',
  'tenantId',
  'companyId',
  'userId',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
  'isDeleted',
  'deletedAt',
  'deletedBy',
  'version',
  'tokenVersion',
  'refreshTokenVersion',
  'passwordHash',
  'failedLoginAttempts',
  'lockedUntil',
  'lastLoginAt',
  'lastLoginIp',
] as const;

/**
 * Remove server-owned fields from a client-provided object.
 * Returns a new object without the dangerous fields.
 */
export function stripServerOwnedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSafeKey(key) && !(SERVER_OWNED_FIELDS as readonly string[]).includes(key)) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}
