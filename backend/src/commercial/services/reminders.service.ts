import { Injectable } from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { DatabaseService } from '../../database/database.service';

/**
 * Reminder history — deduped by (subscription_id, reminder_type, period_key).
 * A unique index guarantees a reminder is never sent twice for the same target.
 */
@Injectable()
export class RemindersService {
  constructor(private readonly database: DatabaseService) {}

  async createIfAbsent(input: {
    subscriptionId: string;
    reminderType: string;
    periodKey: string;
    scheduledFor: string;
    sentTo?: string;
    channel?: string;
    metadata?: Record<string, any>;
    userId?: string;
  }): Promise<{ created: boolean; reminder?: any }> {
    try {
      const reminder = await this.database.commercialReminders.create({
        subscriptionId: input.subscriptionId,
        reminderType: input.reminderType,
        periodKey: input.periodKey,
        scheduledFor: input.scheduledFor,
        sentAt: null,
        sentTo: input.sentTo || null,
        channel: input.channel || 'notification',
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdBy: input.userId || null,
      } as any);
      return { created: true, reminder };
    } catch (err: any) {
      if (isUniqueConstraintError(err)) {
        return { created: false };
      }
      return { created: false };
    }
  }

  async markSent(reminderId: string): Promise<void> {
    try {
      await this.database.commercialReminders.update(reminderId, {
        sentAt: new Date().toISOString(),
      } as any);
    } catch {
      /* best-effort */
    }
  }

  async history(subscriptionId: string): Promise<any[]> {
    const res = await this.database.commercialReminders.findAll({
      page: 1,
      pageSize: 500,
      filters: [{ field: 'subscriptionId', operator: 'eq', value: subscriptionId }],
    } as any);
    return (res?.data || [])
      .filter((r: any) => !r.isDeleted)
      .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
}
