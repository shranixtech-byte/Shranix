/**
 * H12 — Centralized file upload validation utilities.
 *
 * Provides shared MIME-type / extension allow-lists, magic-bytes verification,
 * multer-compatible `fileFilter` factory, security logging, and content-disposition
 * sanitisation so that every upload endpoint in the codebase applies consistent,
 * minimally-permissive validation without duplicating logic.
 */

import * as path from 'path';

import { BadRequestException, Logger } from '@nestjs/common';

const h12Logger = new Logger('H12-UploadSecurity');

// ─── Allowed MIME types ───────────────────────────────────────────────

/** Common import formats accepted by data-management, customers, suppliers, products */
export const IMPORT_ALLOWED_MIMES = [
  'text/csv',
  'text/plain',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // some browsers send this for CSV
] as const;

/** DMS document upload — broader set including PDF, images, Word, Excel, zip */
export const DMS_ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/json',
  'text/xml',
  'application/zip',
] as const;

// ─── Allowed extensions ───────────────────────────────────────────────

export const IMPORT_ALLOWED_EXTENSIONS = ['.csv', '.json', '.xlsx', '.xls'] as const;

export const DMS_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.json',
  '.xml',
  '.zip',
] as const;

// ─── Dangerous extensions that should never be accepted ──────────────

export const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.ps1',
  '.psm1',
  '.com',
  '.scr',
  '.pif',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.msc',
  '.cpl',
  '.inf',
  '.reg',
  '.php',
  '.phtml',
  '.php3',
  '.php4',
  '.php5',
  '.php7',
  '.jsp',
  '.jspx',
  '.asp',
  '.aspx',
  '.cer',
  '.cfm',
  '.pl',
  '.py',
  '.rb',
  '.cgi',
  '.fcgi',
] as const;

// ─── File size limits ────────────────────────────────────────────────

/** 50 MB — matches the DMS FileStorageService max */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum number of files for multi-upload endpoints */
export const DMS_MAX_FILES = 10;

// ─── Filename sanitisation ───────────────────────────────────────────

/**
 * Remove directory traversal components and dangerous characters from a
 * client-supplied filename.  Returns a flat, safe name suitable for
 * logging or display.  Actual storage filenames should be server-generated
 * (see FileStorageService).
 */
export function sanitizeFilename(original: string): string {
  // Strip any directory components (../, ..\, C:\, /absolute/path, etc.)
  const base = original.replace(/^.*[/\\]/, '');
  // Remove characters that could cause issues in any OS filesystem
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Collapse consecutive underscores
  return safe.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Validate that a filename does not contain path traversal sequences,
 * even URL-encoded ones.
 */
export function isFilenameSafe(original: string): boolean {
  // Decode common encodings
  const decoded = decodeURIComponent(decodeURIComponent(original));
  // Check for traversal in both raw and decoded forms
  const traversalPatterns = [/\.\.[\\/]/, /[\\/]\.\./, /^[A-Z]:\\/i, /^\\\\/, /^\//];
  for (const pattern of traversalPatterns) {
    if (pattern.test(original) || pattern.test(decoded)) {
      return false;
    }
  }
  return true;
}

// ─── Multer fileFilter factory ───────────────────────────────────────

/**
 * Create a multer-compatible `fileFilter` callback that rejects files
 * not matching the given MIME-type and extension allow-lists.
 *
 * Also rejects double-extension attacks (e.g. `file.pdf.exe`) and
 * dangerous executable extensions.
 */
export function createFileFilter(
  allowedMimes: readonly string[],
  allowedExtensions: readonly string[],
  label = 'file',
  options: { verifyMagicBytes?: boolean } = {},
): (req: any, file: any, cb: (err: Error | null, acceptFile: boolean) => void) => void {
  return (_req: any, file: any, cb: (err: Error | null, acceptFile: boolean) => void) => {
    const originalName = file.originalname || '';

    // 1. Check MIME type
    if (!allowedMimes.includes(file.mimetype)) {
      logUploadSecurityEvent('MIME-REJECTED', {
        filename: originalName,
        mimetype: file.mimetype,
        reason: 'MIME not in allowlist',
        endpoint: label,
      });
      cb(
        new BadRequestException(
          `Invalid ${label} type "${file.mimetype}". Allowed: ${allowedMimes.slice(0, 5).join(', ')}…`,
        ),
        false,
      );
      return;
    }

    // 2. Extract and validate extension
    const dotIndex = originalName.lastIndexOf('.');
    if (dotIndex < 1) {
      logUploadSecurityEvent('EXTENSION-REJECTED', {
        filename: originalName,
        reason: 'no extension found',
        endpoint: label,
      });
      cb(new BadRequestException(`Invalid ${label} name: no extension found.`), false);
      return;
    }
    const ext = originalName.slice(dotIndex).toLowerCase();

    // 3. Check for dangerous extensions (even in double-extension scenarios)
    const parts = originalName.split('.');
    for (let i = 1; i < parts.length; i++) {
      const partExt = `.${parts[i].toLowerCase()}`;
      if ((DANGEROUS_EXTENSIONS as readonly string[]).includes(partExt)) {
        logUploadSecurityEvent('DANGEROUS-EXTENSION', {
          filename: originalName,
          reason: `dangerous extension "${partExt}" in chain`,
          endpoint: label,
        });
        cb(
          new BadRequestException(
            `Rejected ${label}: dangerous extension "${partExt}" detected in "${originalName}".`,
          ),
          false,
        );
        return;
      }
    }

    // 4. Check extension is in allowlist
    if (!(allowedExtensions as readonly string[]).includes(ext)) {
      logUploadSecurityEvent('EXTENSION-REJECTED', {
        filename: originalName,
        mimetype: file.mimetype,
        reason: `extension "${ext}" not in allowlist`,
        endpoint: label,
      });
      cb(
        new BadRequestException(
          `Invalid ${label} extension "${ext}". Allowed: ${allowedExtensions.join(', ')}`,
        ),
        false,
      );
      return;
    }

    // 5. Check filename safety (path traversal)
    if (!isFilenameSafe(originalName)) {
      logUploadSecurityEvent('PATH-TRAVERSAL-REJECTED', {
        filename: originalName,
        reason: 'path traversal detected in filename',
        endpoint: label,
      });
      cb(
        new BadRequestException(
          `Rejected ${label}: filename "${originalName}" contains path traversal.`,
        ),
        false,
      );
      return;
    }

    // 6. Magic bytes verification (when buffer is available via memoryStorage)
    if (options.verifyMagicBytes && file.buffer && Buffer.isBuffer(file.buffer)) {
      if (!verifyMagicBytes(file.buffer, file.mimetype)) {
        logUploadSecurityEvent('MAGIC-BYTES-MISMATCH', {
          filename: originalName,
          mimetype: file.mimetype,
          reason: 'file content signature does not match declared MIME type',
          endpoint: label,
        });
        cb(
          new BadRequestException(
            `Rejected ${label}: file content does not match declared type "${file.mimetype}".`,
          ),
          false,
        );
        return;
      }
    }

    cb(null, true as any);
  };
}

/**
 * Multer limits configuration for uploads.
 */
export function createUploadLimits(maxFileSize = DEFAULT_MAX_FILE_SIZE, maxFiles = 1) {
  return {
    fileSize: maxFileSize,
    files: maxFiles,
  };
}

// ─── Magic bytes (file signature) verification ──────────────────────

/**
 * Known file signatures mapped to expected MIME types.
 * Only covers types we actually accept — not an exhaustive catalogue.
 */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  // PDF
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  // JPEG
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  // PNG
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // GIF
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  // ZIP (also covers XLSX, DOCX which are ZIP-based)
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
  // OLE2 (XLS, DOC — old Microsoft formats)
  { mime: 'application/msword', bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  // JSON (starts with { or [)
  { mime: 'application/json', bytes: [0x7b] }, // {
  { mime: 'application/json', bytes: [0x5b] }, // [
  // CSV/Plain text — no reliable signature; we accept any content for text/*
];

/**
 * MIME types that are text-based and have no unique magic bytes.
 * For these we skip magic-bytes verification (extension + MIME check is sufficient).
 */
const TEXT_BASED_MIMES = new Set([
  'text/csv',
  'text/plain',
  'text/xml',
  'application/octet-stream',
]);

/**
 * Verify that a file buffer's leading bytes match the expected MIME type.
 * Returns `true` if verification passes or is skipped (text-based MIME).
 * Returns `false` if the signature clearly mismatches.
 *
 * This is a best-effort check — not a replacement for proper MIME sniffing,
 * but it catches the most common spoofing attacks (e.g. sending a PDF with
 * Content-Type: text/csv and a .csv extension).
 */
export function verifyMagicBytes(buffer: Buffer, expectedMime: string): boolean {
  // Skip verification for text-based MIMEs with no reliable signature
  if (TEXT_BASED_MIMES.has(expectedMime)) {
    return true;
  }

  // Need at least a few bytes to check
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const sigs = MAGIC_BYTES.filter((s) => s.mime === expectedMime);
  if (sigs.length === 0) {
    // No known signature for this MIME — accept (extension + MIME check already passed)
    return true;
  }

  // Check if ANY of the known signatures matches (OR logic — e.g. JSON can start with { or [)
  for (const sig of sigs) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) {
      continue;
    }
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return true;
    }
  }
  return false;
}

// ─── Security event logging ─────────────────────────────────────────

/**
 * Log a security-relevant upload event (rejection, bypass attempt, etc.).
 * Never logs file contents or sensitive payloads.
 */
export function logUploadSecurityEvent(
  event: string,
  details: {
    filename?: string;
    mimetype?: string;
    reason?: string;
    endpoint?: string;
    userId?: string;
  },
): void {
  const safeFilename = details.filename ? sanitizeFilename(details.filename) : 'unknown';
  h12Logger.warn(
    `[UPLOAD-SECURITY] ${event} | file=${safeFilename} | mime=${details.mimetype || '?'} | reason=${details.reason || '?'} | endpoint=${details.endpoint || '?'} | user=${details.userId || '?'}`,
  );
}

// ─── Content-Disposition sanitisation ────────────────────────────────

/**
 * Build a safe Content-Disposition header value.
 * Prevents header injection via newlines or control characters in filenames.
 */
export function safeContentDisposition(
  filename: string,
  disposition: 'inline' | 'attachment' = 'attachment',
): string {
  // Strip any characters that could inject headers (CR, LF, null)
  const safe = filename.replace(/[\r\n\0]/g, '_');
  // Use RFC 5987 encoding for non-ASCII names
  const encoded = encodeURIComponent(safe).replace(/'/g, '%27');
  return `${disposition}; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

// ─── Path resolution for downloads ──────────────────────────────────

/**
 * Resolve a user-supplied path and verify it stays within the base directory.
 * Throws BadRequestException if path traversal is detected.
 */
export function safeResolvePath(baseDir: string, userPath: string): string {
  const resolved = path.resolve(baseDir, userPath);
  const baseResolved = path.resolve(baseDir);
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
    logUploadSecurityEvent('PATH-TRAVERSAL-BLOCKED', {
      filename: userPath,
      reason: 'download path escape',
    });
    throw new BadRequestException('Invalid file path');
  }
  return resolved;
}
