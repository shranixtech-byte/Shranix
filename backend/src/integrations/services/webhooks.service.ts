import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class WebhooksService {
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

  async trigger(webhookId: string, payload: any) {
    const webhook = await this.database.webhooks.findById(webhookId);
    if (!webhook || !webhook.isActive) {
      return;
    }
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': String(webhook.secret) } : {}),
        },
        body: JSON.stringify(payload),
      });
      await this.database.webhooks.update(webhookId, { lastTriggeredAt: new Date().toISOString() });
    } catch {
      await this.database.webhooks.update(webhookId, {
        failureCount: (webhook.failureCount || 0) + 1,
      });
    }
  }

  /** Real delivery check — actual response status/error report karta hai (settings UI ke liye). */
  async test(webhookId: string): Promise<{ success: boolean; status?: number; message: string }> {
    const webhook = await this.database.webhooks.findById(webhookId);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret ? { 'X-Webhook-Secret': String(webhook.secret) } : {}),
        },
        body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10_000),
      });
      await this.database.webhooks.update(webhookId, { lastTriggeredAt: new Date().toISOString() });
      return {
        success: res.ok,
        status: res.status,
        message: res.ok ? 'Webhook delivered ✓' : `Webhook responded with HTTP ${res.status}`,
      };
    } catch (err) {
      await this.database.webhooks.update(webhookId, {
        failureCount: (webhook.failureCount || 0) + 1,
      });
      return { success: false, message: `Delivery failed: ${(err as Error).message}` };
    }
  }
}
