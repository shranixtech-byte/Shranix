import { Injectable } from '@nestjs/common';

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string; name: string }> = [
  {
    pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    replacement: 'password: ***MASKED***',
    name: 'password',
  },
  {
    pattern: /\b(?:secret|api[_-]?key|api_key)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    replacement: 'api_key: ***MASKED***',
    name: 'api_key',
  },
  {
    pattern: /\bJWT[_-]?SECRET\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    replacement: 'JWT_SECRET: ***MASKED***',
    name: 'jwt_secret',
  },
  {
    pattern: /\b(?:token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
    replacement: 'token: ***MASKED***',
    name: 'token',
  },
  { pattern: /\b\d{16}\b/g, replacement: '****-****-****-****', name: 'card_number' },
  { pattern: /\b[A-Z]{4}0[A-Z0-9]{11}\b/g, replacement: '****0***********', name: 'ifsc_code' },
  { pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, replacement: '*****9999*', name: 'pan_number' },
  { pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\d{10}\b/g, replacement: '**********', name: 'phone' },
  { pattern: /\b\d{9,18}\b/g, replacement: '***ACCOUNT***', name: 'account_number' },
  {
    pattern: /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}\b/g,
    replacement: '**XXXXX9999X*',
    name: 'gstin',
  },
  { pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/g, replacement: '***@***.com', name: 'email' },
];

@Injectable()
export class DataMaskService {
  mask(text: string, role?: string): string {
    let masked = text;

    // Admin role sees full data - no masking needed
    if (role === 'admin') {
      return text;
    }

    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        masked = masked.replace(pattern, replacement);
        // For audit purposes, track what was masked
        if (matches.length > 0) {
          // Masking was applied
        }
      }
    }

    return masked;
  }

  isSensitiveContent(text: string): { sensitive: boolean; types: string[] } {
    const types: string[] = [];
    for (const { pattern, name } of SENSITIVE_PATTERNS) {
      if (pattern.test(text)) {
        types.push(name);
        pattern.lastIndex = 0; // Reset regex state
      }
    }
    return { sensitive: types.length > 0, types };
  }

  maskPrompt(
    messages: Array<{ role: string; content: string }>,
    role?: string,
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      ...msg,
      content: this.mask(msg.content, role),
    }));
  }
}
