import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

export type NotificationChannel = 'sms' | 'whatsapp' | 'email' | 'telegram' | 'push';

/**
 * Notification Settings — KV store (shranix_gst_audit_settings, group 'notification').
 * Channels: SMS / WhatsApp / Email / Telegram / Push.
 * Alerts: Low Stock, Payment Reminder, Due Reminder, Expiry Alert (+ thresholds).
 */
@Injectable()
export class NotificationSettingsService {
  private readonly GROUP = 'notification';
  private readonly ALLOWED_KEYS = [
    // Channels
    'smsEnabled',
    'whatsappEnabled',
    'emailEnabled',
    'telegramEnabled',
    'pushEnabled',
    // Channel targets
    'smsPhone',
    'whatsappNumber',
    'alertEmail',
    'telegramChatId',
    // Alerts
    'lowStockAlert',
    'paymentReminder',
    'dueReminder',
    'expiryAlert',
    // Alert config
    'lowStockThreshold',
    'dueDays',
    'expiryDays',
  ];

  private readonly CACHE_TTL = 30_000; // 30s — send bursts mein har message ke liye DB hit na ho
  private cache: { time: number; settings: Record<string, unknown> } | null = null;

  constructor(private readonly database: DatabaseService) {}

  private parseValue(raw: unknown, dataType: string): unknown {
    const v = String(raw ?? '');
    if (dataType === 'boolean') {
      return v === 'true' || v === '1';
    }
    if (dataType === 'number') {
      return Number(v);
    }
    return v;
  }

  async getSettings(): Promise<Record<string, unknown>> {
    if (this.cache && Date.now() - this.cache.time < this.CACHE_TTL) {
      return this.cache.settings;
    }
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [{ field: 'settingGroup', operator: 'eq', value: this.GROUP }],
      pageSize: 100,
    } as any);
    const out: Record<string, unknown> = {};
    for (const r of rows?.data || []) {
      const row = r as any;
      out[String(row.settingKey)] = this.parseValue(
        row.settingValue,
        String(row.dataType || 'text'),
      );
    }
    this.cache = { time: Date.now(), settings: out };
    return out;
  }

  async updateSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Only whitelisted keys save hote hain (arbitrary KV writes se bachao)
    for (const [key, value] of Object.entries(payload || {})) {
      if (!this.ALLOWED_KEYS.includes(key)) {
        continue;
      }
      const existing = await this.database.gstAuditSettings.findAll({
        filters: [{ field: 'settingKey', operator: 'eq', value: key }],
        pageSize: 1,
      } as any);
      const dataType =
        typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text';
      const settingValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
      if (existing.data.length > 0) {
        await this.database.gstAuditSettings.update(existing.data[0].id, {
          settingValue,
          dataType,
        });
      } else {
        await this.database.gstAuditSettings.create({
          settingKey: key,
          settingValue,
          settingGroup: this.GROUP,
          dataType,
          description: key,
          isSystem: 'yes',
        });
      }
    }
    this.cache = null; // invalidate — save ke baad turant fresh read
    return this.getSettings();
  }

  /** Channel enabled hai ya nahi — NotificationService send gates ke liye. */
  async isChannelEnabled(channel: NotificationChannel): Promise<boolean> {
    const s = await this.getSettings();
    const key = `${channel}Enabled`;
    const v = s[key];
    return v === true || v === 'true' || v === '1';
  }
}
