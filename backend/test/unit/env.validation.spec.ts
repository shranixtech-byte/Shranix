import { EnvValidationService } from '../../src/validation/env.validation';

describe('EnvValidationService', () => {
  let service: EnvValidationService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set required vars
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-32-char';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
    service = new EnvValidationService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validate()', () => {
    it('should pass with all required vars set', () => {
      const result = service.validate();
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('JWT_SECRET');
    });

    it('should fail when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      const result = service.validate();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('DATABASE_URL');
    });

    it('should warn when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short';
      const result = service.validate();
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings[0]).toContain('JWT_SECRET');
    });

    it('should warn when DATABASE_URL has unexpected scheme', () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost/test';
      const result = service.validate();
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings[0]).toContain('DATABASE_URL');
    });

    it('should require MinIO vars when STORAGE_ADAPTER=minio', () => {
      process.env.STORAGE_ADAPTER = 'minio';
      delete process.env.MINIO_ENDPOINT;
      const result = service.validate();
      expect(result.missing).toContain('MINIO_ENDPOINT');
    });

    it('should warn when SMTP_HOST is set but SMTP_USER is missing', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      const result = service.validate();
      const smtpWarning = result.warnings.find((w) => w.includes('SMTP_HOST'));
      expect(smtpWarning).toBeDefined();
    });
  });

  describe('getRedactedEnv()', () => {
    it('should redact secret values', () => {
      process.env.JWT_SECRET = 'my-super-secret-key-thats-long-enough';
      const env = service.getRedactedEnv();
      expect(env.JWT_SECRET).toContain('****');
      expect(env.JWT_SECRET).not.toContain('super-secret');
    });

    it('should show non-secret values in full', () => {
      process.env.NODE_ENV = 'test';
      const env = service.getRedactedEnv();
      expect(env.NODE_ENV).toBe('test');
    });
  });
});
