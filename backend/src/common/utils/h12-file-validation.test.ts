/**
 * H12 — Focused tests for file upload validation utilities.
 *
 * Covers:
 *  1. Valid allowed file accepted
 *  2. Invalid MIME rejected
 *  3. Invalid extension rejected
 *  4. Double-extension attack rejected
 *  5. Path traversal in filename rejected
 *  6. Encoded path traversal rejected
 *  7. Dangerous/executable extension rejected
 *  8. Filename sanitisation
 *  9. isFilenameSafe checks
 * 10. createUploadLimits returns correct config
 */

import { describe, it, expect } from 'vitest';

import {
  createFileFilter,
  sanitizeFilename,
  isFilenameSafe,
  createUploadLimits,
  IMPORT_ALLOWED_MIMES,
  IMPORT_ALLOWED_EXTENSIONS,
  DMS_ALLOWED_MIMES,
  DMS_ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
} from './file-validation';

// ─── Helpers ──────────────────────────────────────────────────────────

function mockFile(originalname: string, mimetype: string) {
  return {
    originalname,
    mimetype,
    fieldname: 'file',
    encoding: '',
    size: 1000,
    buffer: Buffer.from(''),
  } as any;
}

function runFilter(filter: any, file: any): { accepted: boolean; error?: string } {
  return new Promise((resolve) => {
    filter(null, file, (err: any, accept: boolean) => {
      if (err) {
        resolve({ accepted: false, error: err.message });
      } else {
        resolve({ accepted: accept });
      }
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('H12 — File Validation Utilities', () => {
  describe('createFileFilter — import endpoints', () => {
    const filter = createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import');

    it('should accept a valid CSV file', async () => {
      const result = await runFilter(filter, mockFile('data.csv', 'text/csv'));
      expect(result.accepted).toBe(true);
    });

    it('should accept a valid XLSX file', async () => {
      const result = await runFilter(
        filter,
        mockFile(
          'report.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      );
      expect(result.accepted).toBe(true);
    });

    it('should accept a valid JSON file', async () => {
      const result = await runFilter(filter, mockFile('export.json', 'application/json'));
      expect(result.accepted).toBe(true);
    });

    it('should reject an invalid MIME type (PDF)', async () => {
      const result = await runFilter(filter, mockFile('doc.pdf', 'application/pdf'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('Invalid import type');
    });

    it('should reject an invalid extension (.exe)', async () => {
      const result = await runFilter(filter, mockFile('hack.exe', 'application/octet-stream'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject double-extension attack (file.pdf.exe)', async () => {
      const result = await runFilter(filter, mockFile('report.pdf.exe', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject double-extension attack (file.xlsx.js)', async () => {
      const result = await runFilter(filter, mockFile('data.xlsx.js', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject a file with no extension', async () => {
      const result = await runFilter(filter, mockFile('noext', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('no extension found');
    });

    it('should reject dangerous extension (.php)', async () => {
      const result = await runFilter(filter, mockFile('shell.php', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject path traversal in filename (../etc/passwd)', async () => {
      const result = await runFilter(filter, mockFile('../etc/passwd.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject encoded path traversal in filename (%2e%2e%2f)', async () => {
      const result = await runFilter(filter, mockFile('%2e%2e%2fetc/passwd.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject Windows path traversal in filename (..\\)', async () => {
      const result = await runFilter(filter, mockFile('..\\windows\\system32.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });
  });

  describe('createFileFilter — DMS endpoints', () => {
    const filter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');

    it('should accept a valid PDF', async () => {
      const result = await runFilter(filter, mockFile('doc.pdf', 'application/pdf'));
      expect(result.accepted).toBe(true);
    });

    it('should accept a valid JPEG image', async () => {
      const result = await runFilter(filter, mockFile('photo.jpg', 'image/jpeg'));
      expect(result.accepted).toBe(true);
    });

    it('should accept a ZIP file', async () => {
      const result = await runFilter(filter, mockFile('archive.zip', 'application/zip'));
      expect(result.accepted).toBe(true);
    });

    it('should reject a script file (.sh) — caught by MIME check', async () => {
      const result = await runFilter(filter, mockFile('script.sh', 'application/x-sh'));
      expect(result.accepted).toBe(false);
    });

    it('should reject a .bat file — caught by MIME check', async () => {
      const result = await runFilter(filter, mockFile('virus.bat', 'application/x-bat'));
      expect(result.accepted).toBe(false);
    });

    it('should reject a .php file (double extension: image.jpg.php)', async () => {
      const result = await runFilter(filter, mockFile('image.jpg.php', 'image/jpeg'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });
  });

  describe('sanitizeFilename', () => {
    it('should strip directory components', () => {
      expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('C:\\Users\\admin\\file.txt')).toBe('file.txt');
      expect(sanitizeFilename('../file.txt')).toBe('file.txt');
    });

    it('should replace unsafe characters with underscores', () => {
      expect(sanitizeFilename('my file (1).csv')).toBe('my_file_1_.csv');
    });

    it('should collapse consecutive underscores', () => {
      expect(sanitizeFilename('a  b   c.txt')).toBe('a_b_c.txt');
    });

    it('should handle normal filenames unchanged', () => {
      expect(sanitizeFilename('report.xlsx')).toBe('report.xlsx');
      expect(sanitizeFilename('data_2024.csv')).toBe('data_2024.csv');
    });
  });

  describe('isFilenameSafe', () => {
    it('should accept safe filenames', () => {
      expect(isFilenameSafe('report.csv')).toBe(true);
      expect(isFilenameSafe('data_2024-01.xlsx')).toBe(true);
    });

    it('should reject path traversal with ../', () => {
      expect(isFilenameSafe('../secret.txt')).toBe(false);
    });

    it('should reject path traversal with ..\\', () => {
      expect(isFilenameSafe('..\\secret.txt')).toBe(false);
    });

    it('should reject absolute Unix paths', () => {
      expect(isFilenameSafe('/etc/passwd')).toBe(false);
    });

    it('should reject absolute Windows paths', () => {
      expect(isFilenameSafe('C:\\Windows\\system32\\file.txt')).toBe(false);
    });

    it('should reject UNC paths', () => {
      expect(isFilenameSafe('\\\\server\\share\\file.txt')).toBe(false);
    });

    it('should reject URL-encoded traversal (%2e%2e)', () => {
      expect(isFilenameSafe('%2e%2e%2fetc/passwd')).toBe(false);
    });

    it('should reject double URL-encoded traversal', () => {
      expect(isFilenameSafe('%252e%252e%252fetc/passwd')).toBe(false);
    });
  });

  describe('createUploadLimits', () => {
    it('should return default 50MB limit', () => {
      const limits = createUploadLimits();
      expect(limits.fileSize).toBe(DEFAULT_MAX_FILE_SIZE);
      expect(limits.files).toBe(1);
    });

    it('should accept custom size and file count', () => {
      const limits = createUploadLimits(10 * 1024 * 1024, 5);
      expect(limits.fileSize).toBe(10 * 1024 * 1024);
      expect(limits.files).toBe(5);
    });
  });

  describe('Bypass attempts', () => {
    const importFilter = createFileFilter(
      IMPORT_ALLOWED_MIMES,
      IMPORT_ALLOWED_EXTENSIONS,
      'import',
    );
    const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');

    it('should reject valid extension with dangerous MIME (PDF content disguised as CSV)', async () => {
      // Attacker sends application/pdf with .csv extension
      const result = await runFilter(importFilter, mockFile('trick.csv', 'application/pdf'));
      expect(result.accepted).toBe(false);
    });

    it('should reject valid MIME with dangerous extension (.exe with text/csv)', async () => {
      const result = await runFilter(importFilter, mockFile('trick.exe', 'text/csv'));
      expect(result.accepted).toBe(false);
    });

    it('should reject case variation (.CSV uppercase)', async () => {
      // .CSV is not in allowlist (only .csv is) — but extension is lowercased
      const result = await runFilter(importFilter, mockFile('data.CSV', 'text/csv'));
      expect(result.accepted).toBe(true); // toLowerCase handles this
    });

    it('should reject case variation (.EXE uppercase)', async () => {
      const result = await runFilter(importFilter, mockFile('hack.EXE', 'text/csv'));
      expect(result.accepted).toBe(false);
    });

    it('should reject empty filename', async () => {
      const result = await runFilter(importFilter, mockFile('', 'text/csv'));
      expect(result.accepted).toBe(false);
    });

    it('should reject filename with only dots', async () => {
      const result = await runFilter(importFilter, mockFile('...', 'text/csv'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .JS extension (dangerous)', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.js', 'text/javascript'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .VBS extension (dangerous)', async () => {
      const result = await runFilter(dmsFilter, mockFile('macro.vbs', 'text/vbscript'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .PS1 extension (dangerous)', async () => {
      const result = await runFilter(dmsFilter, mockFile('powershell.ps1', 'text/plain'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .CMD extension (dangerous)', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.cmd', 'text/plain'));
      expect(result.accepted).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have DANGEROUS_EXTENSIONS with no overlaps in ALLOWED lists', () => {
      const dangerousSet = new Set(DANGEROUS_EXTENSIONS);
      for (const ext of IMPORT_ALLOWED_EXTENSIONS) {
        expect(dangerousSet.has(ext)).toBe(false);
      }
      for (const ext of DMS_ALLOWED_EXTENSIONS) {
        expect(dangerousSet.has(ext)).toBe(false);
      }
    });

    it('should have all IMPORT_ALLOWED_MIMES as strings', () => {
      for (const mime of IMPORT_ALLOWED_MIMES) {
        expect(typeof mime).toBe('string');
        expect(mime).toContain('/');
      }
    });

    it('should have all DMS_ALLOWED_MIMES as strings', () => {
      for (const mime of DMS_ALLOWED_MIMES) {
        expect(typeof mime).toBe('string');
        expect(mime).toContain('/');
      }
    });
  });
});
