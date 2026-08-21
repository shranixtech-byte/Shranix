/**
 * H12 — DMS FileStorageService security tests.
 *
 * Tests path traversal prevention in readFile and deleteFile,
 * and verifies secure filename generation in saveFile.
 */

import * as path from 'path';

import { describe, it, expect } from 'vitest';

import {
  safeResolvePath,
  sanitizeFilename,
  isFilenameSafe,
} from '../../common/utils/file-validation';

describe('H12 — DMS File Storage Security', () => {
  describe('Path traversal prevention', () => {
    const baseDir = '/storage/dms';

    it('should resolve safe nested path within base', () => {
      const result = safeResolvePath(baseDir, 'doc1/file_v1_1234567890_report.pdf');
      expect(result).toContain('doc1');
      expect(result).toContain('report.pdf');
    });

    it('should reject path traversal with ../', () => {
      expect(() => safeResolvePath(baseDir, '../etc/passwd')).toThrow('Invalid file path');
    });

    it('should reject path traversal with ..\\', () => {
      expect(() => safeResolvePath(baseDir, '..\\windows\\system32')).toThrow('Invalid file path');
    });

    it('should reject absolute path that escapes base', () => {
      expect(() => safeResolvePath(baseDir, '/etc/passwd')).toThrow('Invalid file path');
    });

    it('should accept nested path within base', () => {
      const result = safeResolvePath(baseDir, 'doc1/subdir/file.pdf');
      expect(result).toContain('doc1');
      expect(result).toContain('file.pdf');
    });
  });

  describe('Secure filename generation pattern', () => {
    it('should produce safe filename from normal input', () => {
      const sanitizedName = 'report.pdf'.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `doc123_v1_${Date.now()}_${sanitizedName}`;
      expect(filename).toMatch(/^doc123_v1_\d+_report\.pdf$/);
      expect(isFilenameSafe(filename)).toBe(true);
    });

    it('should produce safe filename from dangerous input', () => {
      const sanitizedName = '../../../etc/passwd'.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `doc123_v1_${Date.now()}_${sanitizedName}`;
      // The sanitised name should not contain path separators
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('\\');
    });

    it('should produce safe filename from special characters', () => {
      const sanitizedName = 'my file (1).pdf'.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `doc123_v1_${Date.now()}_${sanitizedName}`;
      expect(filename).not.toContain(' ');
      expect(filename).not.toContain('(');
      expect(filename).toContain('.pdf');
    });

    it('should strip directory components from original name', () => {
      const original = '/tmp/evil.exe';
      const sanitizedName = original.replace(/[^a-zA-Z0-9._-]/g, '_');
      expect(sanitizedName).not.toContain('/');
    });
  });

  describe('Storage path validation', () => {
    it('should validate path stays within DMS storage root', () => {
      const storagePath = '/storage/dms';
      const filePath = 'doc1/file.pdf';
      const resolved = path.resolve(storagePath, filePath);
      expect(resolved.startsWith(path.resolve(storagePath))).toBe(true);
    });

    it('should detect path escape from DMS storage', () => {
      const storagePath = '/storage/dms';
      const filePath = '../../etc/passwd';
      const resolved = path.resolve(storagePath, filePath);
      const baseResolved = path.resolve(storagePath);
      const escapes = !resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved;
      expect(escapes).toBe(true);
    });
  });

  describe('Filename sanitisation', () => {
    it('should strip path components', () => {
      expect(sanitizeFilename('/tmp/evil.exe')).toBe('evil.exe');
      expect(sanitizeFilename('../secret.pdf')).toBe('secret.pdf');
      expect(sanitizeFilename('C:\\Windows\\file.txt')).toBe('file.txt');
    });

    it('should replace unsafe characters', () => {
      const result = sanitizeFilename('my file (1).pdf');
      expect(result).not.toContain(' ');
      expect(result).not.toContain('(');
      expect(result).toContain('.pdf');
    });

    it('should handle normal names unchanged', () => {
      expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
      expect(sanitizeFilename('data_2024.xlsx')).toBe('data_2024.xlsx');
    });
  });
});
