import { Injectable } from '@nestjs/common';

interface PromptGuardResult {
  safe: boolean;
  reason?: string;
}

// Common prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)/i,
  /system\s+(prompt|instruction|message)/i,
  /you\s+(are\s+)?(now|must|will)/i,
  /act\s+(as\s+)?(if|like)/i,
  /do\s+(not\s+)?(follow|obey|listen)/i,
  /forget\s+(all\s+)?(previous|instructions|directives)/i,
  /new\s+(prompt|instruction|directive)/i,
  /override/i,
  /hack/i,
  /jailbreak/i,
  /dan\s*mode/i,
  /developer\s*mode/i,
  /gpt\s*\d+\s*mode/i,
  /\b(?:echo|exec|eval|system\s*\()/i,
  /<\s*script/i,
  /onerror\s*=/i,
  /onload\s*=/i,
];

@Injectable()
export class PromptGuardService {
  check(prompt: string): PromptGuardResult {
    if (prompt === null || prompt === undefined || typeof prompt !== 'string') {
      return { safe: false, reason: 'Invalid prompt format' };
    }

    // Check prompt length
    if (prompt.length > 10000) {
      return { safe: false, reason: 'Prompt exceeds maximum length (10000 characters)' };
    }

    // Check for injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(prompt)) {
        return { safe: false, reason: `Prompt contains suspicious pattern: ${pattern.source}` };
      }
    }

    return { safe: true };
  }

  sanitize(prompt: string): string {
    // Remove null bytes and control characters
    let sanitized = prompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Strip excessive whitespace
    sanitized = sanitized.replace(/\s{3,}/g, ' ').trim();

    return sanitized;
  }
}
