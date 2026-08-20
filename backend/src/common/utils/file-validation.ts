/**
 * H12 — Centralized file upload validation utilities.
 *
 * Provides shared MIME-type / extension allow-lists and a multer-compatible
 * `fileFilter` factory so that every upload endpoint in the codebase applies
 * consistent, minimally-permissive validation without duplicating logic.
 */

import { BadRequestException } from '@nestjs/common';

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
): (req: any, file: any, cb: (err: Error | null, acceptFile: boolean) => void) => void {
  return (_req: any, file: any, cb: (err: Error | null, acceptFile: boolean) => void) => {
    // 1. Check MIME type
    if (!allowedMimes.includes(file.mimetype)) {
      cb(
        new BadRequestException(
          `Invalid ${label} type "${file.mimetype}". Allowed: ${allowedMimes.slice(0, 5).join(', ')}…`,
        ),
        false,
      );
      return;
    }

    // 2. Extract and validate extension
    const originalName = file.originalname || '';
    const dotIndex = originalName.lastIndexOf('.');
    if (dotIndex < 1) {
      cb(new BadRequestException(`Invalid ${label} name: no extension found.`), false);
      return;
    }
    const ext = originalName.slice(dotIndex).toLowerCase();

    // 3. Check for dangerous extensions (even in double-extension scenarios)
    // e.g. "report.pdf.exe" — the last extension is .exe
    // But also check if ANY extension in the chain is dangerous
    const parts = originalName.split('.');
    for (let i = 1; i < parts.length; i++) {
      const partExt = `.${parts[i].toLowerCase()}`;
      if ((DANGEROUS_EXTENSIONS as readonly string[]).includes(partExt)) {
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
      cb(
        new BadRequestException(
          `Rejected ${label}: filename "${originalName}" contains path traversal.`,
        ),
        false,
      );
      return;
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
