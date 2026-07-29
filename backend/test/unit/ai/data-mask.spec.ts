import { DataMaskService } from '../../../src/ai/services/data-mask.service';

describe('DataMaskService', () => {
  let service: DataMaskService;

  beforeEach(() => {
    service = new DataMaskService();
  });

  describe('mask', () => {
    it('should mask email addresses', () => {
      const result = service.mask('Contact: user@example.com');
      expect(result).toContain('***@***.com');
      expect(result).not.toContain('user@example.com');
    });

    it('should mask phone numbers', () => {
      const result = service.mask('Phone: 9876543210');
      expect(result).toContain('**********');
    });

    it('should mask API keys', () => {
      const result = service.mask('api_key: sk-1234567890abcdef');
      expect(result).toContain('***MASKED***');
    });

    it('should mask PAN numbers', () => {
      const result = service.mask('PAN: ABCDE1234F');
      expect(result).toContain('*****9999*');
    });

    it('should mask GSTIN', () => {
      const result = service.mask('GST: 22AAAAA0000A1Z5');
      expect(result).not.toContain('22AAAAA0000A1Z5');
    });

    it('should not mask for admin role', () => {
      const result = service.mask('Email: admin@company.com', 'admin');
      expect(result).toContain('admin@company.com');
    });

    it('should handle empty text', () => {
      expect(service.mask('')).toBe('');
    });

    it('should handle text without sensitive data', () => {
      const result = service.mask('This is normal text about sales data');
      expect(result).toBe('This is normal text about sales data');
    });
  });

  describe('isSensitiveContent', () => {
    it('should detect sensitive content', () => {
      const result = service.isSensitiveContent('My email is user@test.com');
      expect(result.sensitive).toBe(true);
      expect(result.types).toContain('email');
    });

    it('should not detect non-sensitive content', () => {
      const result = service.isSensitiveContent('What are today\'s sales?');
      expect(result.sensitive).toBe(false);
    });
  });

  describe('maskPrompt', () => {
    it('should mask all user messages', () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'My email is user@test.com' },
      ];
      const masked = service.maskPrompt(messages);
      expect(masked[1].content).toContain('***@***.com');
    });
  });
});
