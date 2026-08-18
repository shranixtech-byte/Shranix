import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

/** H6 — Retryable HTTP status codes (server errors + rate limit). */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** H7 — Maximum payload_ref size in bytes (4KB). */
const MAX_PAYLOAD_REF_BYTES = 4096;

/** H7 — Default delivery retention in days. */
const DEFAULT_RETENTION_DAYS = 90;

/** H6 — Maximum delivery attempts (default). */
const DEFAULT_MAX_ATTEMPTS = 3;

/** H6 — Retry delay in minutes (doubles each attempt). */
const BASE_RETRY_DELAY_MIN = 5;

/** H6 — Request timeout for outbound webhook calls. */
const WEBHOOK_TIMEOUT_MS = 10_000;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private assertValidUrl(data: any): void {
    if (data?.url && !/^https?:\/\//i.test(String(data.url))) {
      throw new BadRequestException('Webhook URL must start with http:// or https://');
    }
  }

  async create(data: any, userId: string) {
    this.assertValidUrl(data);
    const webhook = await this.database.webhooks.create({
      ...data,
      id: crypto.randomUUID(),
      failureCount: 0,
      createdAt: new Date().toISOString(),
    });
    await this.audit.log({
      userId,
      event: 'webhook.created',
      resource: 'webhooks',
      action: 'create',
      details: { webhookId: webhook.id },
    });
    return webhook;
  }

  async findAll(params: any) {
    return this.database.webhooks.findAll(params);
  }
  async findById(id: string) {
    return this.database.webhooks.findById(id);
  }

  async update(id: string, data: any, userId: string) {
    this.assertValidUrl(data);
    const updated = await this.database.webhooks.update(id, data);
    await this.audit.log({
      userId,
      event: 'webhook.updated',
      resource: 'webhooks',
      action: 'update',
      details: { webhookId: id },
    });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.database.webhooks.softDelete(id);
    await this.audit.log({
      userId,
      event: 'webhook.deleted',
      resource: 'webhooks',
      action: 'delete',
      details: { webhookId: id },
    });
  }

  /**
   * H6+H7 — Fire outbound webhook with timeout, retry metadata, delivery history,
   * and event context persistence for reliable retry.
   *
   * Flow:
   *   1. Create delivery record with event_type + payload_ref (attempt 1)
   *   2. POST with AbortSignal.timeout(10s)
   *   3. On success → mark delivered
   *   4. On retryable failure → set nextRetryAt (exponential backoff)
   *   5. On permanent failure → mark failed, stop retrying
   */
  async trigger(webhookId: string, payload: any) {
    const webhook = await this.database.webhooks.findById(webhookId);
    if (!webhook || !webhook.isActive) {
      return;
    }
    const maxAttempts = Number(webhook.maxAttempts) || DEFAULT_MAX_ATTEMPTS;
    await this.attemptDelivery(webhook, payload, 1, maxAttempts);
  }

  /**
   * H7 — Sanitize payload for storage: remove secrets, truncate to MAX_PAYLOAD_REF_BYTES.
   */
  private sanitizePayload(payload: any): string {
    try {
      const safe = { ...payload };
      // Remove known secret fields
      delete safe.secret;
      delete safe.signature;
      delete safe.headers;
      const json = JSON.stringify(safe);
      if (json.length > MAX_PAYLOAD_REF_BYTES) {
        return `${json.slice(0, MAX_PAYLOAD_REF_BYTES)}...[truncated]`;
      }
      return json;
    } catch {
      return '';
    }
  }

  /**
   * H7 — Extract event type from payload (best-effort).
   */
  private extractEventType(payload: any): string {
    if (payload?.event?.type) {
      return String(payload.event.type);
    }
    if (payload?.event_type) {
      return String(payload.event_type);
    }
    if (payload?.event) {
      return String(payload.event);
    }
    return 'unknown';
  }

  /**
   * H6+H7 — Single delivery attempt with history recording and event context.
   */
  private async attemptDelivery(
    webhook: any,
    payload: any,
    attempt: number,
    maxAttempts: number,
  ): Promise<void> {
    const deliveryId = crypto.randomUUID();
    const triggeredAt = new Date().toISOString();
    const eventType = this.extractEventType(payload);
    const payloadRef = this.sanitizePayload(payload);

    // Create delivery history record with H7 event context
    await this.createDeliveryRecord({
      id: deliveryId,
      webhookId: webhook.id,
      attempt,
      status: 'sending',
      triggeredAt,
      eventType,
      payloadRef,
    });

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': String(webhook.secret) } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      if (res.ok) {
        // Success
        await this.updateDeliveryRecord(deliveryId, {
          status: 'delivered',
          httpStatus: res.status,
          completedAt: new Date().toISOString(),
        });
        await this.database.webhooks.update(webhook.id, {
          lastTriggeredAt: new Date().toISOString(),
          failureCount: 0,
        });
        return;
      }

      // Non-2xx response
      const isRetryable = RETRYABLE_STATUS.has(res.status);
      const errorMsg = `HTTP ${res.status}`;

      await this.updateDeliveryRecord(deliveryId, {
        status: isRetryable && attempt < maxAttempts ? 'retrying' : 'failed',
        httpStatus: res.status,
        error: errorMsg,
        completedAt: new Date().toISOString(),
      });

      if (isRetryable && attempt < maxAttempts) {
        await this.scheduleRetry(webhook, attempt, maxAttempts);
      } else {
        // Permanent failure (4xx business error or max attempts reached)
        await this.database.webhooks.update(webhook.id, {
          failureCount: (webhook.failureCount || 0) + 1,
        });
      }
    } catch (err: any) {
      const errorMsg = String(err?.message || 'delivery error');
      const isTimeout = err?.name === 'TimeoutError' || errorMsg.includes('timeout');
      const isRetryable =
        isTimeout || err?.name === 'AbortError' || !errorMsg.includes('ENOTFOUND');

      await this.updateDeliveryRecord(deliveryId, {
        status: isRetryable && attempt < maxAttempts ? 'retrying' : 'failed',
        error: errorMsg,
        completedAt: new Date().toISOString(),
      });

      if (isRetryable && attempt < maxAttempts) {
        await this.scheduleRetry(webhook, attempt, maxAttempts);
      } else {
        await this.database.webhooks.update(webhook.id, {
          failureCount: (webhook.failureCount || 0) + 1,
        });
      }
    }
  }

  /**
   * H6 — Schedule next retry with exponential backoff.
   */
  private async scheduleRetry(webhook: any, attempt: number, maxAttempts: number): Promise<void> {
    const delayMin = BASE_RETRY_DELAY_MIN * Math.pow(2, attempt - 1);
    const nextRetryAt = new Date(Date.now() + delayMin * 60_000).toISOString();
    await this.database.webhooks.update(webhook.id, {
      nextRetryAt,
      retryAttempt: attempt + 1,
      retryMaxAttempts: maxAttempts,
      failureCount: (webhook.failureCount || 0) + 1,
    });
    this.logger.log(
      `Webhook ${webhook.id} retry scheduled: attempt ${attempt + 1}/${maxAttempts} in ${delayMin}min`,
    );
  }

  /**
   * H6+H7 — Process pending webhook retries with original event context.
   *
   * H7: Reads the stored payload_ref from the most recent delivery record
   * and uses it for retry instead of a synthetic payload.
   */
  async processRetries(): Promise<{ processed: number }> {
    const now = new Date().toISOString();
    const webhooks = await this.database.webhooks.findAll({
      page: 1,
      pageSize: 100,
      filters: [
        { field: 'nextRetryAt', operator: 'lte', value: now },
        { field: 'nextRetryAt', operator: 'ne', value: null },
      ],
    } as any);
    let processed = 0;
    for (const wh of (webhooks.data || []) as any[]) {
      const attempt = Number(wh.retryAttempt) || 1;
      const maxAttempts = Number(wh.retryMaxAttempts) || DEFAULT_MAX_ATTEMPTS;
      if (attempt > maxAttempts) {
        // Exceeded max attempts — clear retry metadata
        await this.database.webhooks.update(wh.id, {
          nextRetryAt: null,
          retryAttempt: null,
          retryMaxAttempts: null,
        });
        continue;
      }
      // Clear retry metadata before re-triggering to prevent duplicate processing
      await this.database.webhooks.update(wh.id, {
        nextRetryAt: null,
        retryAttempt: null,
        retryMaxAttempts: null,
      });

      // H7: Reconstruct retry payload from stored event context
      let retryPayload: any;
      try {
        const stored = await this.database.webhookDeliveries.findLatestPayload(wh.id);
        if (stored?.payloadRef) {
          retryPayload = JSON.parse(stored.payloadRef);
        }
      } catch {
        /* best-effort: if payload lookup fails, fall through to synthetic */
      }
      if (!retryPayload) {
        retryPayload = { event: 'webhook.retry', webhookId: wh.id, timestamp: now };
      }

      try {
        await this.attemptDelivery(wh, retryPayload, attempt, maxAttempts);
        processed += 1;
      } catch {
        /* continue */
      }
    }
    return { processed };
  }

  /**
   * H7 — Cleanup old delivery records. Returns count of deleted records.
   */
  async cleanupOldDeliveries(retentionDays?: number): Promise<{ deleted: number }> {
    const days = retentionDays || DEFAULT_RETENTION_DAYS;
    const deleted = await this.database.webhookDeliveries.cleanupOlderThan(days);
    return { deleted };
  }

  /**
   * H6 — Create a webhook delivery history record.
   */
  private async createDeliveryRecord(data: {
    id: string;
    webhookId: string;
    attempt: number;
    status: string;
    triggeredAt: string;
    eventType?: string;
    payloadRef?: string;
  }): Promise<void> {
    try {
      await this.database.webhookDeliveries.create(data as any);
    } catch {
      /* best-effort — delivery history is observability, not correctness */
    }
  }

  /**
   * H6 — Update a webhook delivery history record.
   */
  private async updateDeliveryRecord(id: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.database.webhookDeliveries.update(id, data as any);
    } catch {
      /* best-effort */
    }
  }

  /** Real delivery check — actual response status/error report karta hai (settings UI ke liye). */
  async test(webhookId: string): Promise<{ success: boolean; status?: number; message: string }> {
    const webhook = await this.database.webhooks.findById(webhookId);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    const deliveryId = crypto.randomUUID();
    const triggeredAt = new Date().toISOString();
    await this.createDeliveryRecord({
      id: deliveryId,
      webhookId,
      attempt: 1,
      status: 'sending',
      triggeredAt,
    });
    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': String(webhook.secret) } : {}),
        },
        body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      await this.updateDeliveryRecord(deliveryId, {
        status: res.ok ? 'delivered' : 'failed',
        httpStatus: res.status,
        completedAt: new Date().toISOString(),
      });
      await this.database.webhooks.update(webhookId, { lastTriggeredAt: new Date().toISOString() });
      return {
        success: res.ok,
        status: res.status,
        message: res.ok ? 'Webhook delivered ✓' : `Webhook responded with HTTP ${res.status}`,
      };
    } catch (err) {
      await this.updateDeliveryRecord(deliveryId, {
        status: 'failed',
        error: String((err as Error).message),
        completedAt: new Date().toISOString(),
      });
      await this.database.webhooks.update(webhookId, {
        failureCount: (webhook.failureCount || 0) + 1,
      });
      return { success: false, message: `Delivery failed: ${(err as Error).message}` };
    }
  }

  /**
   * H6 — List delivery history for a webhook.
   */
  async listDeliveries(webhookId: string, params?: { page?: number; pageSize?: number }) {
    return this.database.webhookDeliveries.findAll({
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      filters: [{ field: 'webhookId', operator: 'eq', value: webhookId }],
    } as any);
  }
}
