import { Injectable, Logger } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';

export interface AiAuditEntry {
  userId?: string;
  action: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  endpoint: string;
  conversationId?: string;
}

@Injectable()
export class AiAuditService {
  private readonly logger = new Logger(AiAuditService.name);

  constructor(private readonly auditService: AuditService) {}

  async logAiInteraction(entry: AiAuditEntry): Promise<void> {
    try {
      await this.auditService.log({
        userId: entry.userId || 'system',
        event: `ai.${entry.action}`,
        action: entry.action,
        resource: 'ai',
        details: {
          provider: entry.provider,
          model: entry.model,
          promptTokens: entry.promptTokens,
          completionTokens: entry.completionTokens,
          totalTokens: entry.totalTokens,
          latencyMs: entry.latencyMs,
          success: entry.success,
          error: entry.error,
          endpoint: entry.endpoint,
        },
        ipAddress: 'internal',
        userAgent: 'ai-service',
        severity: entry.success ? 'info' : 'warning',
      });
    } catch (error) {
      this.logger.error(`Failed to log AI audit entry: ${(error as Error).message}`);
    }
  }

  async logSecurityViolation(userId: string | undefined, reason: string, extra: Record<string, unknown>): Promise<void> {
    try {
      await this.auditService.log({
        userId: userId || 'unknown',
        event: 'ai.security_violation',
        action: 'security_violation',
        resource: 'ai',
        details: { reason, ...extra },
        ipAddress: 'internal',
        userAgent: 'ai-service',
        severity: 'critical',
      });
    } catch (error) {
      this.logger.error(`Failed to log security violation: ${(error as Error).message}`);
    }
  }
}
