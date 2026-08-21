/**
 * H12 — Comprehensive tests for file upload validation utilities.
 *
 * Covers all 15 required test categories:
 *  1. Valid allowed file accepted
 *  2. Invalid MIME rejected
 *  3. Invalid extension rejected
 *  4. Double-extension attack rejected
 *  5. Path traversal in filename rejected
 *  6. Encoded path traversal rejected
 *  7. Oversized file rejected
 *  8. Dangerous/executable extension rejected
 *  9. Magic bytes verification
 * 10. Filename sanitisation
 * 11. Content-Disposition sanitisation
 * 12. Safe path resolution
 * 13. Existing legitimate upload regression
 * 14. Bypass attempts
 * 15. Constants integrity
 */

import { describe, it, expect } from 'vitest';

import {
  createFileFilter,
  sanitizeFilename,
  isFilenameSafe,
  createUploadLimits,
  verifyMagicBytes,
  safeContentDisposition,
  safeResolvePath,
  IMPORT_ALLOWED_MIMES,
  IMPORT_ALLOWED_EXTENSIONS,
  DMS_ALLOWED_MIMES,
  DMS_ALLOWED_EXTENSIONS,
  DANGEROUS_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
  DMS_MAX_FILES,
} from './file-validation';

// ─── Helpers ──────────────────────────────────────────────────────────

function mockFile(originalname: string, mimetype: string, buffer?: Buffer) {
  return {
    originalname,
    mimetype,
    fieldname: 'file',
    encoding: '',
    size: buffer?.length || 1000,
    buffer: buffer || Buffer.from(''),
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
  // ═══════════════════════════════════════════════════════════════════
  // 1. Valid allowed file accepted
  // ═══════════════════════════════════════════════════════════════════
  describe('Valid files accepted', () => {
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

    it('should accept a valid XLS file', async () => {
      const result = await runFilter(filter, mockFile('legacy.xls', 'application/vnd.ms-excel'));
      expect(result.accepted).toBe(true);
    });

    it('should accept DMS PDF', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('doc.pdf', 'application/pdf'));
      expect(result.accepted).toBe(true);
    });

    it('should accept DMS JPEG image', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('photo.jpg', 'image/jpeg'));
      expect(result.accepted).toBe(true);
    });

    it('should accept DMS PNG image', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('icon.png', 'image/png'));
      expect(result.accepted).toBe(true);
    });

    it('should accept DMS ZIP archive', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('archive.zip', 'application/zip'));
      expect(result.accepted).toBe(true);
    });

    it('should accept DMS Word document', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(
        dmsFilter,
        mockFile(
          'doc.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      );
      expect(result.accepted).toBe(true);
    });

    it('should accept DMS plain text', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('readme.txt', 'text/plain'));
      expect(result.accepted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. Invalid MIME rejected
  // ═══════════════════════════════════════════════════════════════════
  describe('Invalid MIME rejected', () => {
    const filter = createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import');

    it('should reject application/pdf for import', async () => {
      const result = await runFilter(filter, mockFile('doc.pdf', 'application/pdf'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('Invalid import type');
    });

    it('should reject image/jpeg for import', async () => {
      const result = await runFilter(filter, mockFile('photo.jpg', 'image/jpeg'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('Invalid import type');
    });

    it('should reject application/zip for import', async () => {
      const result = await runFilter(filter, mockFile('archive.zip', 'application/zip'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('Invalid import type');
    });

    it('should reject text/html for DMS', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('page.html', 'text/html'));
      expect(result.accepted).toBe(false);
    });

    it('should reject application/x-executable for DMS', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('program', 'application/x-executable'));
      expect(result.accepted).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. Invalid extension rejected
  // ═══════════════════════════════════════════════════════════════════
  describe('Invalid extension rejected', () => {
    const filter = createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import');

    it('should reject .pdf extension for import', async () => {
      const result = await runFilter(filter, mockFile('doc.pdf', 'application/pdf'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('Invalid import type');
    });

    it('should reject .html extension for import', async () => {
      const result = await runFilter(filter, mockFile('page.html', 'text/html'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .mp4 extension for DMS', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('video.mp4', 'video/mp4'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .bin extension for DMS', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('data.bin', 'application/octet-stream'));
      expect(result.accepted).toBe(false);
    });

    it('should reject a file with no extension', async () => {
      const result = await runFilter(filter, mockFile('noext', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('no extension found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. Double-extension attack rejected
  // ═══════════════════════════════════════════════════════════════════
  describe('Double-extension attack rejected', () => {
    const filter = createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import');

    it('should reject file.pdf.exe', async () => {
      const result = await runFilter(filter, mockFile('report.pdf.exe', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject file.xlsx.js', async () => {
      const result = await runFilter(filter, mockFile('data.xlsx.js', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject file.csv.php', async () => {
      const result = await runFilter(filter, mockFile('report.csv.php', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject file.json.bat', async () => {
      const result = await runFilter(filter, mockFile('data.json.bat', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject file.xls.cmd', async () => {
      const result = await runFilter(filter, mockFile('legacy.xls.cmd', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS image.jpg.php', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('image.jpg.php', 'image/jpeg'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS doc.pdf.vbs', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('doc.pdf.vbs', 'application/pdf'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS archive.zip.sh', async () => {
      const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');
      const result = await runFilter(dmsFilter, mockFile('archive.zip.sh', 'application/zip'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. Path traversal in filename rejected
  // ═══════════════════════════════════════════════════════════════════
  describe('Path traversal rejected', () => {
    const filter = createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import');

    it('should reject ../etc/passwd.csv', async () => {
      const result = await runFilter(filter, mockFile('../etc/passwd.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject ..\\windows\\system32.csv', async () => {
      const result = await runFilter(filter, mockFile('..\\windows\\system32.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject /absolute/path.csv', async () => {
      const result = await runFilter(filter, mockFile('/tmp/secret.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject C:\\Windows\\file.csv', async () => {
      const result = await runFilter(filter, mockFile('C:\\Windows\\file.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. Encoded path traversal rejected
  // ═══════════════════════════════════════════════════════════════════
  describe('Encoded path traversal rejected', () => {
    const filter = createFileFilter(IMPORT_ALLOWED_MIMES, IMPORT_ALLOWED_EXTENSIONS, 'import');

    it('should reject %2e%2e%2fetc/passwd.csv', async () => {
      const result = await runFilter(filter, mockFile('%2e%2e%2fetc/passwd.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject %252e%252e%252f (double-encoded)', async () => {
      const result = await runFilter(filter, mockFile('%252e%252e%252fetc/passwd.csv', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should reject %2e%2e%5c (encoded backslash)', async () => {
      const result = await runFilter(
        filter,
        mockFile('%2e%2e%5cwindows%5csystem32.csv', 'text/csv'),
      );
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('path traversal');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 7. Oversized file rejected (via limits)
  // ═══════════════════════════════════════════════════════════════════
  describe('Oversized file rejected', () => {
    it('should enforce default 50MB limit', () => {
      const limits = createUploadLimits();
      expect(limits.fileSize).toBe(50 * 1024 * 1024);
    });

    it('should enforce custom limit', () => {
      const limits = createUploadLimits(10 * 1024 * 1024, 5);
      expect(limits.fileSize).toBe(10 * 1024 * 1024);
      expect(limits.files).toBe(5);
    });

    it('should enforce DMS_MAX_FILES = 10', () => {
      expect(DMS_MAX_FILES).toBe(10);
    });

    it('should enforce DEFAULT_MAX_FILE_SIZE = 50MB', () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 8. Dangerous/executable extension rejected
  // ═══════════════════════════════════════════════════════════════════
  describe('Dangerous extension rejected', () => {
    const importFilter = createFileFilter(
      IMPORT_ALLOWED_MIMES,
      IMPORT_ALLOWED_EXTENSIONS,
      'import',
    );
    const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');

    it('should reject .exe', async () => {
      const result = await runFilter(
        importFilter,
        mockFile('hack.exe', 'application/octet-stream'),
      );
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .bat', async () => {
      const result = await runFilter(importFilter, mockFile('script.bat', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .cmd', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.cmd', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .sh', async () => {
      const result = await runFilter(importFilter, mockFile('script.sh', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .ps1', async () => {
      const result = await runFilter(dmsFilter, mockFile('powershell.ps1', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .vbs (caught by MIME check since text/vbscript not allowed)', async () => {
      const result = await runFilter(dmsFilter, mockFile('macro.vbs', 'text/vbscript'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .js (caught by MIME check since text/javascript not allowed)', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.js', 'text/javascript'));
      expect(result.accepted).toBe(false);
    });

    it('should reject .php', async () => {
      const result = await runFilter(importFilter, mockFile('shell.php', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .jsp', async () => {
      const result = await runFilter(dmsFilter, mockFile('app.jsp', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .asp', async () => {
      const result = await runFilter(dmsFilter, mockFile('page.asp', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .py', async () => {
      const result = await runFilter(importFilter, mockFile('script.py', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .rb', async () => {
      const result = await runFilter(importFilter, mockFile('script.rb', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 9. Magic bytes verification
  // ═══════════════════════════════════════════════════════════════════
  describe('Magic bytes verification', () => {
    it('should accept valid PDF signature', () => {
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(verifyMagicBytes(pdfBuffer, 'application/pdf')).toBe(true);
    });

    it('should reject mismatched PDF signature', () => {
      const notPdf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(verifyMagicBytes(notPdf, 'application/pdf')).toBe(false);
    });

    it('should accept valid JPEG signature', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(verifyMagicBytes(jpegBuffer, 'image/jpeg')).toBe(true);
    });

    it('should reject mismatched JPEG signature', () => {
      const notJpeg = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      expect(verifyMagicBytes(notJpeg, 'image/jpeg')).toBe(false);
    });

    it('should accept valid PNG signature', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(verifyMagicBytes(pngBuffer, 'image/png')).toBe(true);
    });

    it('should reject mismatched PNG signature', () => {
      const notPng = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(verifyMagicBytes(notPng, 'image/png')).toBe(false);
    });

    it('should accept valid GIF signature', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(verifyMagicBytes(gifBuffer, 'image/gif')).toBe(true);
    });

    it('should accept valid ZIP/XLSX signature', () => {
      const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
      expect(verifyMagicBytes(zipBuffer, 'application/zip')).toBe(true);
      expect(
        verifyMagicBytes(
          zipBuffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).toBe(true);
    });

    it('should accept valid OLE2/XLS/DOC signature', () => {
      const ole2Buffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
      expect(verifyMagicBytes(ole2Buffer, 'application/msword')).toBe(true);
      expect(verifyMagicBytes(ole2Buffer, 'application/vnd.ms-excel')).toBe(true);
    });

    it('should accept valid JSON signature (starts with {)', () => {
      const jsonBuffer = Buffer.from('{"key": "value"}');
      expect(verifyMagicBytes(jsonBuffer, 'application/json')).toBe(true);
    });

    it('should reject empty buffer', () => {
      expect(verifyMagicBytes(Buffer.from(''), 'application/pdf')).toBe(false);
    });

    it('should reject tiny buffer (< 4 bytes)', () => {
      expect(verifyMagicBytes(Buffer.from([0x25]), 'application/pdf')).toBe(false);
    });

    it('should skip verification for text/csv (no reliable signature)', () => {
      expect(verifyMagicBytes(Buffer.from('any content'), 'text/csv')).toBe(true);
    });

    it('should skip verification for text/plain', () => {
      expect(verifyMagicBytes(Buffer.from('any content'), 'text/plain')).toBe(true);
    });

    it('should skip verification for text/xml', () => {
      expect(verifyMagicBytes(Buffer.from('any content'), 'text/xml')).toBe(true);
    });

    it('should skip verification for application/octet-stream', () => {
      expect(verifyMagicBytes(Buffer.from('any content'), 'application/octet-stream')).toBe(true);
    });

    it('should accept unknown MIME (no signature defined)', () => {
      expect(verifyMagicBytes(Buffer.from('anything'), 'application/x-custom')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 10. Filename sanitisation
  // ═══════════════════════════════════════════════════════════════════
  describe('Filename sanitisation', () => {
    it('should strip directory components', () => {
      expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('C:\\Users\\admin\\file.txt')).toBe('file.txt');
      expect(sanitizeFilename('../file.txt')).toBe('file.txt');
      expect(sanitizeFilename('../../secret.csv')).toBe('secret.csv');
    });

    it('should replace unsafe characters with underscores', () => {
      const result1 = sanitizeFilename('my file (1).csv');
      expect(result1).not.toContain(' ');
      expect(result1).not.toContain('(');
      expect(result1).toContain('.csv');
      // Consecutive underscores are collapsed
      const result2 = sanitizeFilename('file@#$%.xlsx');
      expect(result2).not.toContain('@');
      expect(result2).not.toContain('#');
      expect(result2).not.toContain('$');
      expect(result2).not.toContain('%');
      expect(result2).toContain('.xlsx');
    });

    it('should collapse consecutive underscores', () => {
      expect(sanitizeFilename('a  b   c.txt')).toBe('a_b_c.txt');
    });

    it('should handle normal filenames unchanged', () => {
      expect(sanitizeFilename('report.xlsx')).toBe('report.xlsx');
      expect(sanitizeFilename('data_2024.csv')).toBe('data_2024.csv');
      expect(sanitizeFilename('photo-001.jpg')).toBe('photo-001.jpg');
    });

    it('should handle empty filename', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle filename with only special characters', () => {
      expect(sanitizeFilename('@#$%^&*')).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 11. Content-Disposition sanitisation
  // ═══════════════════════════════════════════════════════════════════
  describe('Content-Disposition sanitisation', () => {
    it('should produce safe header for normal filename', () => {
      const result = safeContentDisposition('report.pdf');
      expect(result).toContain('attachment; filename="report.pdf"');
      expect(result).toContain('filename*=');
    });

    it('should strip CR/LF from filename', () => {
      const result = safeContentDisposition('file\r\nEvil-Header: injection.pdf');
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\n');
      expect(result).toContain('filename=');
    });

    it('should strip null bytes', () => {
      const result = safeContentDisposition('file\x00.pdf');
      expect(result).not.toContain('\x00');
    });

    it('should support inline disposition', () => {
      const result = safeContentDisposition('image.png', 'inline');
      expect(result).toContain('inline;');
    });

    it('should encode non-ASCII characters', () => {
      const result = safeContentDisposition('ファイル.pdf');
      expect(result).toContain('filename*=');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 12. Safe path resolution
  // ═══════════════════════════════════════════════════════════════════
  describe('Safe path resolution', () => {
    it('should resolve safe path within base', () => {
      const result = safeResolvePath('/storage', 'documents/doc1/file.pdf');
      expect(result).toContain('storage');
      expect(result).toContain('file.pdf');
    });

    it('should reject path traversal with ../', () => {
      expect(() => safeResolvePath('/storage', '../etc/passwd')).toThrow('Invalid file path');
    });

    it('should reject path traversal with ..\\', () => {
      expect(() => safeResolvePath('/storage', '..\\windows\\system32')).toThrow(
        'Invalid file path',
      );
    });

    it('should reject absolute path that escapes base', () => {
      expect(() => safeResolvePath('/storage', '/etc/passwd')).toThrow('Invalid file path');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 13. Existing legitimate upload regression
  // ═══════════════════════════════════════════════════════════════════
  describe('Existing legitimate upload regression', () => {
    const importFilter = createFileFilter(
      IMPORT_ALLOWED_MIMES,
      IMPORT_ALLOWED_EXTENSIONS,
      'import',
    );
    const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');

    it('import: accepts data.csv with text/csv', async () => {
      const result = await runFilter(importFilter, mockFile('data.csv', 'text/csv'));
      expect(result.accepted).toBe(true);
    });

    it('import: accepts export.xlsx with xlsx MIME', async () => {
      const result = await runFilter(
        importFilter,
        mockFile(
          'export.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      );
      expect(result.accepted).toBe(true);
    });

    it('import: accepts legacy.xls with xls MIME', async () => {
      const result = await runFilter(
        importFilter,
        mockFile('legacy.xls', 'application/vnd.ms-excel'),
      );
      expect(result.accepted).toBe(true);
    });

    it('import: accepts data.json with application/json', async () => {
      const result = await runFilter(importFilter, mockFile('data.json', 'application/json'));
      expect(result.accepted).toBe(true);
    });

    it('import: accepts data.CSV (uppercase extension) with text/csv', async () => {
      const result = await runFilter(importFilter, mockFile('data.CSV', 'text/csv'));
      expect(result.accepted).toBe(true);
    });

    it('import: accepts data.csv with application/octet-stream (browser fallback)', async () => {
      const result = await runFilter(
        importFilter,
        mockFile('data.csv', 'application/octet-stream'),
      );
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts document.pdf with application/pdf', async () => {
      const result = await runFilter(dmsFilter, mockFile('document.pdf', 'application/pdf'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts photo.jpg with image/jpeg', async () => {
      const result = await runFilter(dmsFilter, mockFile('photo.jpg', 'image/jpeg'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts photo.png with image/png', async () => {
      const result = await runFilter(dmsFilter, mockFile('photo.png', 'image/png'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts photo.gif with image/gif', async () => {
      const result = await runFilter(dmsFilter, mockFile('photo.gif', 'image/gif'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts archive.zip with application/zip', async () => {
      const result = await runFilter(dmsFilter, mockFile('archive.zip', 'application/zip'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts notes.txt with text/plain', async () => {
      const result = await runFilter(dmsFilter, mockFile('notes.txt', 'text/plain'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts data.xml with text/xml', async () => {
      const result = await runFilter(dmsFilter, mockFile('data.xml', 'text/xml'));
      expect(result.accepted).toBe(true);
    });

    it('DMS: accepts report.docx with docx MIME', async () => {
      const result = await runFilter(
        dmsFilter,
        mockFile(
          'report.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      );
      expect(result.accepted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 14. Bypass attempts
  // ═══════════════════════════════════════════════════════════════════
  describe('Bypass attempts', () => {
    const importFilter = createFileFilter(
      IMPORT_ALLOWED_MIMES,
      IMPORT_ALLOWED_EXTENSIONS,
      'import',
    );
    const dmsFilter = createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document');

    it('should reject valid extension with dangerous MIME (PDF disguised as CSV)', async () => {
      const result = await runFilter(importFilter, mockFile('trick.csv', 'application/pdf'));
      expect(result.accepted).toBe(false);
    });

    it('should reject valid MIME with dangerous extension (.exe with text/csv)', async () => {
      const result = await runFilter(importFilter, mockFile('trick.exe', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject .EXE uppercase', async () => {
      const result = await runFilter(importFilter, mockFile('hack.EXE', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject empty filename', async () => {
      const result = await runFilter(importFilter, mockFile('', 'text/csv'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('no extension found');
    });

    it('should reject filename with only dots (extension is "." which is not allowed)', async () => {
      const result = await runFilter(importFilter, mockFile('...', 'text/csv'));
      expect(result.accepted).toBe(false);
    });

    it('should reject DMS .JS with text/plain MIME (MIME is valid, ext is dangerous)', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.js', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .VBS with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('macro.vbs', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .PS1 with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('powershell.ps1', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .CMD with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.cmd', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .BAT with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.bat', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .SH with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.sh', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .ASP with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('page.asp', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .JSP with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('app.jsp', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .PHP with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('shell.php', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .PL with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.pl', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .PY with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.py', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });

    it('should reject DMS .RB with text/plain MIME', async () => {
      const result = await runFilter(dmsFilter, mockFile('script.rb', 'text/plain'));
      expect(result.accepted).toBe(false);
      expect(result.error).toContain('dangerous extension');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 15. Constants integrity
  // ═══════════════════════════════════════════════════════════════════
  describe('Constants integrity', () => {
    it('should have DANGEROUS_EXTENSIONS with no overlaps in IMPORT_ALLOWED', () => {
      const dangerousSet = new Set(DANGEROUS_EXTENSIONS);
      for (const ext of IMPORT_ALLOWED_EXTENSIONS) {
        expect(dangerousSet.has(ext)).toBe(false);
      }
    });

    it('should have DANGEROUS_EXTENSIONS with no overlaps in DMS_ALLOWED', () => {
      const dangerousSet = new Set(DANGEROUS_EXTENSIONS);
      for (const ext of DMS_ALLOWED_EXTENSIONS) {
        expect(dangerousSet.has(ext)).toBe(false);
      }
    });

    it('should have all IMPORT_ALLOWED_MIMES as strings with /', () => {
      for (const mime of IMPORT_ALLOWED_MIMES) {
        expect(typeof mime).toBe('string');
        expect(mime).toContain('/');
      }
    });

    it('should have all DMS_ALLOWED_MIMES as strings with /', () => {
      for (const mime of DMS_ALLOWED_MIMES) {
        expect(typeof mime).toBe('string');
        expect(mime).toContain('/');
      }
    });

    it('should have at least 35 dangerous extensions', () => {
      expect(DANGEROUS_EXTENSIONS.length).toBeGreaterThanOrEqual(35);
    });

    it('should have at least 4 IMPORT allowed extensions', () => {
      expect(IMPORT_ALLOWED_EXTENSIONS.length).toBeGreaterThanOrEqual(4);
    });

    it('should have at least 10 DMS allowed extensions', () => {
      expect(DMS_ALLOWED_EXTENSIONS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have at least 6 IMPORT allowed MIME types', () => {
      expect(IMPORT_ALLOWED_MIMES.length).toBeGreaterThanOrEqual(6);
    });

    it('should have at least 10 DMS allowed MIME types', () => {
      expect(DMS_ALLOWED_MIMES.length).toBeGreaterThanOrEqual(10);
    });

    it('DEFAULT_MAX_FILE_SIZE should be 50MB', () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
    });

    it('DMS_MAX_FILES should be 10', () => {
      expect(DMS_MAX_FILES).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // isFilenameSafe (additional)
  // ═══════════════════════════════════════════════════════════════════
  describe('isFilenameSafe', () => {
    it('should accept safe filenames', () => {
      expect(isFilenameSafe('report.csv')).toBe(true);
      expect(isFilenameSafe('data_2024-01.xlsx')).toBe(true);
      expect(isFilenameSafe('my-file.pdf')).toBe(true);
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

    it('should reject traversal with mixed separators', () => {
      expect(isFilenameSafe('..%2fetc/passwd')).toBe(false);
      expect(isFilenameSafe('..%5cwindows')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Magic bytes bypass attempts
  // ═══════════════════════════════════════════════════════════════════
  describe('Magic bytes bypass attempts', () => {
    it('should detect PNG header when PDF expected', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(verifyMagicBytes(pngBuffer, 'application/pdf')).toBe(false);
    });

    it('should detect JPEG header when PNG expected', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(verifyMagicBytes(jpegBuffer, 'image/png')).toBe(false);
    });

    it('should detect ZIP header when PDF expected', () => {
      const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      expect(verifyMagicBytes(zipBuffer, 'application/pdf')).toBe(false);
    });

    it('should detect OLE2 header when ZIP expected', () => {
      const ole2Buffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
      expect(verifyMagicBytes(ole2Buffer, 'application/zip')).toBe(false);
    });

    it('should accept valid JSON starting with [', () => {
      const jsonArray = Buffer.from('[1, 2, 3]');
      expect(verifyMagicBytes(jsonArray, 'application/json')).toBe(true);
    });

    it('should accept valid JSON starting with {', () => {
      const jsonObject = Buffer.from('{"key": "value"}');
      expect(verifyMagicBytes(jsonObject, 'application/json')).toBe(true);
    });

    it('should reject non-JSON content claiming to be JSON (no { or [)', () => {
      const notJson = Buffer.from('plain text content');
      expect(verifyMagicBytes(notJson, 'application/json')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // createUploadLimits
  // ═══════════════════════════════════════════════════════════════════
  describe('createUploadLimits', () => {
    it('should return default 50MB limit with 1 file', () => {
      const limits = createUploadLimits();
      expect(limits.fileSize).toBe(DEFAULT_MAX_FILE_SIZE);
      expect(limits.files).toBe(1);
    });

    it('should accept custom size and file count', () => {
      const limits = createUploadLimits(10 * 1024 * 1024, 5);
      expect(limits.fileSize).toBe(10 * 1024 * 1024);
      expect(limits.files).toBe(5);
    });

    it('should accept small limit for testing', () => {
      const limits = createUploadLimits(1024, 1);
      expect(limits.fileSize).toBe(1024);
      expect(limits.files).toBe(1);
    });
  });
});
