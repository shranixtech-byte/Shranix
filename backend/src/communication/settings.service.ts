import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * Communication provider settings — KV store (group 'communication').
 *
 * SMTP / SMS / WhatsApp provider configuration. Secret values (passwords,
 * API keys) are stored but NEVER returned to the frontend — the public
 * getter masks them.
 */
@Injectable()
export class CommunicationSettingsService {
  private readonly GROUP = 'communication';

  // Keys that hold secrets — masked on read.
  private readonly SECRET_KEYS = new Set([
    'smtpPassword',
    'smsApiKey',
    'whatsappApiKey',
    'whatsappAccessToken',
  ]);

  private readonly ALLOWED_KEYS = [
    // Email / SMTP
    'emailProvider',
    'smtpHost',
    'smtpPort',
    'smtpSecure',
    'smtpUser',
    'smtpPassword',
    'fromName',
    'fromEmail',
    'replyTo',
    // SMS
    'smsProvider',
    'smsApiKey',
    'smsSenderId',
    'smsTemplateId',
    // WhatsApp
    'whatsappProvider',
    'whatsappApiKey',
    'whatsappAccessToken',
    'whatsappBusinessAccountId',
    'whatsappPhoneNumberId',
    // System
    'retryCount',
    'retryDelayMinutes',
    'rateLimitPerMinute',
    'queueEnabled',
  ];

  private readonly CACHE_TTL = 15_000;
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

  /** Public view — secret values masked. */
  async getPublicSettings(): Promise<Record<string, unknown>> {
    const s = await this.getSettings();
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(s)) {
      out[key] = this.SECRET_KEYS.has(key) && value ? '••••••••' : value;
    }
    return out;
  }

  async updateSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(payload || {})) {
      if (!this.ALLOWED_KEYS.includes(key)) {
        continue;
      }
      // Never overwrite an existing secret with the masked placeholder.
      if (this.SECRET_KEYS.has(key) && value === '••••••••') {
        continue;
      }
      const existing = await this.database.gstAuditSettings.findAll({
        filters: [{ field: 'settingKey', operator: 'eq', value: key }],
        pageSize: 1,
      } as any);
      const dataType =
        typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text';
      const settingValue =
        typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value ?? '');
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
    this.cache = null;
    return this.getPublicSettings();
  }

  /** Provider-ready config (secrets included) — server-side only. */
  async getProviderConfig(): Promise<Record<string, unknown>> {
    return this.getSettings();
  }

  async retryConfig(): Promise<{ maxAttempts: number; retryDelayMinutes: number }> {
    const s = await this.getSettings();
    return {
      maxAttempts: Math.max(1, Number(s.retryCount) || 3),
      retryDelayMinutes: Math.max(1, Number(s.retryDelayMinutes) || 5),
    };
  }

  async rateLimitPerMinute(): Promise<number> {
    const s = await this.getSettings();
    return Math.max(1, Number(s.rateLimitPerMinute) || 60);
  }
}
