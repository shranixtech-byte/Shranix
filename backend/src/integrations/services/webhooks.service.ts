import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const webhook = await this.database.webhooks.create({ ...data, id: crypto.randomUUID(), failureCount: 0, createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'webhook.created', resource: 'webhooks', action: 'create', details: { webhookId: webhook.id } });
    return webhook;
  }

  async findAll(params: any) { return this.database.webhooks.findAll(params); }
  async findById(id: string) { return this.database.webhooks.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.webhooks.update(id, data);
    await this.audit.log({ userId, event: 'webhook.updated', resource: 'webhooks', action: 'update', details: { webhookId: id } });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.database.webhooks.softDelete(id);
    await this.audit.log({ userId, event: 'webhook.deleted', resource: 'webhooks', action: 'delete', details: { webhookId: id } });
  }

  async trigger(webhookId: string, payload: any) {
    const webhook = await this.database.webhooks.findById(webhookId);
    if (!webhook || !webhook.isActive) {return;}
    try {
      await fetch(webhook.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await this.database.webhooks.update(webhookId, { lastTriggeredAt: new Date().toISOString() });
    } catch { await this.database.webhooks.update(webhookId, { failureCount: (webhook.failureCount || 0) + 1 }); }
  }
}
