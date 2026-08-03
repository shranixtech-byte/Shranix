import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

/**
 * API Settings — KV store (shranix_gst_audit_settings, group 'api').
 *
 * Developer Access: developerAccess toggle (API / Swagger docs gate).
 * OAuth: oauthEnabled + client id/secret/callback/scopes (future-ready).
 * Third-party credentials: SMS gateway, email, WhatsApp, Telegram keys —
 * provider integrations launch hone par yahan se use honge.
 *
 * Actual API tokens & webhooks `apiKeys` / `webhooks` tables mein manage
 * hote hain (integrations/api-keys & integrations/webhooks endpoints).
 */
@Injectable()
export class ApiSettingsService {
  private readonly GROUP = 'api';
  private readonly ALLOWED_KEYS = [
    // Developer Access
    'developerAccess',
    // OAuth
    'oauthEnabled',
    'oauthClientId',
    'oauthClientSecret',
    'oauthCallbackUrl',
    'oauthScopes',
    // Third-party provider credentials
    'smsGatewayApiKey',
    'smsGatewaySenderId',
    'whatsappApiKey',
    'emailApiKey',
    'emailFromAddress',
    'telegramBotToken',
  ];
  // Live credentials — GET par masked return hote hain (write-only).
  // PUT mein mask placeholder bheja to value badli nahi jaati.
  private readonly SECRET_KEYS = new Set<string>([
    'oauthClientSecret',
    'smsGatewayApiKey',
    'whatsappApiKey',
    'emailApiKey',
    'telegramBotToken',
  ]);
  private readonly MASK = '••••••••••';

  private readonly DEFAULTS: Record<string, unknown> = {
    developerAccess: true,
    oauthEnabled: false,
    oauthClientId: '',
    oauthClientSecret: '',
    oauthCallbackUrl: '',
    oauthScopes: '',
    smsGatewayApiKey: '',
    smsGatewaySenderId: '',
    whatsappApiKey: '',
    emailApiKey: '',
    emailFromAddress: '',
    telegramBotToken: '',
  };

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
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [{ field: 'settingGroup', operator: 'eq', value: this.GROUP }],
      pageSize: 100,
    } as any);
    const out: Record<string, unknown> = { ...this.DEFAULTS };
    for (const r of rows?.data || []) {
      const row = r as any;
      const key = String(row.settingKey);
      const value = this.parseValue(row.settingValue, String(row.dataType || 'text'));
      // Secrets ko masked karo — real value sirf PUT se set hoti hai
      out[key] = this.SECRET_KEYS.has(key) && value !== '' ? this.MASK : value;
    }
    return out;
  }

  /** Whitelisted keys only — arbitrary KV writes nahi hote. */
  async updateSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(payload || {})) {
      if (!this.ALLOWED_KEYS.includes(key)) {
        continue;
      }
      // Mask placeholder aaya → value untouched rehti hai (GET par mask dikha tha)
      if (this.SECRET_KEYS.has(key) && String(value) === this.MASK) {
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
    return this.getSettings();
  }
}
