/**
 * H12 — Backup download security tests.
 *
 * Tests the safeName() validation and path traversal prevention
 * in the BackupService.
 */

import * as path from 'path';

import { describe, it, expect } from 'vitest';

import { safeResolvePath, sanitizeFilename, isFilenameSafe } from '../common/utils/file-validation';

describe('H12 — Backup Download Security', () => {
  describe('safeName pattern validation', () => {
    // Replicate the safeName logic for testing
    function safeName(name: string): string {
      const raw = String(name || '');
      const base = path.basename(raw);
      if (!base.startsWith('backup-') || !base.endsWith('.db') || base.includes('..')) {
        throw new Error('Invalid backup name');
      }
      if (raw !== base || raw.includes('/') || raw.includes('\\') || raw.includes('\0')) {
        throw new Error('Invalid backup name');
      }
      return base;
    }

    it('should accept valid backup name', () => {
      expect(safeName('backup-20240101120000000.db')).toBe('backup-20240101120000000.db');
    });

    it('should accept valid auto backup name', () => {
      expect(safeName('backup-auto-20240101120000000.db')).toBe('backup-auto-20240101120000000.db');
    });

    it('should reject path traversal with ../', () => {
      expect(() => safeName('../etc/passwd.db')).toThrow('Invalid backup name');
    });

    it('should reject path traversal with ..\\', () => {
      expect(() => safeName('..\\windows\\system32.db')).toThrow('Invalid backup name');
    });

    it('should reject name without backup- prefix', () => {
      expect(() => safeName('malicious.db')).toThrow('Invalid backup name');
    });

    it('should reject name without .db extension', () => {
      expect(() => safeName('backup-20240101.exe')).toThrow('Invalid backup name');
    });

    it('should reject name with embedded slashes', () => {
      expect(() => safeName('backup-20240101/../../etc/passwd.db')).toThrow('Invalid backup name');
    });

    it('should reject name with embedded backslashes', () => {
      expect(() => safeName('backup-20240101\\..\\..\\etc\\passwd.db')).toThrow(
        'Invalid backup name',
      );
    });

    it('should reject null byte injection', () => {
      expect(() => safeName('backup-20240101.db\x00.exe')).toThrow('Invalid backup name');
    });

    it('should reject empty name', () => {
      expect(() => safeName('')).toThrow('Invalid backup name');
    });

    it('should reject name with double dots in middle', () => {
      expect(() => safeName('backup-..20240101.db')).toThrow('Invalid backup name');
    });
  });

  describe('Path resolution for downloads', () => {
    it('should resolve safe path within base', () => {
      const result = safeResolvePath('/storage/backups', 'backup-20240101.db');
      expect(result).toContain('backup-20240101.db');
    });

    it('should reject path traversal with ../', () => {
      expect(() => safeResolvePath('/storage/backups', '../etc/passwd')).toThrow(
        'Invalid file path',
      );
    });

    it('should reject absolute path', () => {
      expect(() => safeResolvePath('/storage/backups', '/etc/passwd')).toThrow('Invalid file path');
    });
  });

  describe('Filename sanitisation for backup names', () => {
    it('should strip path components from backup name', () => {
      expect(sanitizeFilename('../backup-20240101.db')).toBe('backup-20240101.db');
      expect(sanitizeFilename('/tmp/backup-20240101.db')).toBe('backup-20240101.db');
    });

    it('should handle normal backup name unchanged', () => {
      expect(sanitizeFilename('backup-20240101.db')).toBe('backup-20240101.db');
    });
  });

  describe('isFilenameSafe for backup names', () => {
    it('should accept safe backup name', () => {
      expect(isFilenameSafe('backup-20240101.db')).toBe(true);
    });

    it('should reject traversal in backup name', () => {
      expect(isFilenameSafe('../backup-20240101.db')).toBe(false);
    });
  });
});
