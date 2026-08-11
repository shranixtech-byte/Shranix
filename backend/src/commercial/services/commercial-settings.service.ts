import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';
import { actor } from '../numbering.util';

const GROUP = 'commercial';

const DEFAULTS: Record<string, any> = {
  paymentProvider: 'simulated',
  webhookSecret: '',
  autoRenewEnabled: false,
  reminderEnabled: true,
  trialAutoActivate: false,
  suspensionRetentionDays: 30,
  renewalReminderDays: [7, 3, 1],
  overdueReminderDays: [1, 3],
  graceEndReminderDays: 1,
  tenantCustomerId: '',
};

/**
 * Commercial settings — KV store (shranix_gst_audit_settings, group 'commercial').
 * Same pattern as license/notification settings. Secrets (webhookSecret) are
 * never returned by getSettings().
 */
@Injectable()
export class CommercialSettingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private parseValue(raw: string | null | undefined, dataType: string): any {
    if (raw === null || raw === undefined) {
      return null;
    }
    if (dataType === 'number') {
      return Number(raw);
    }
    if (dataType === 'boolean') {
      return raw === 'true' || raw === '1';
    }
    if (dataType === 'json') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }

  async getSettings(): Promise<Record<string, any>> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [{ field: 'settingGroup', operator: 'eq', value: GROUP }],
      pageSize: 100,
    } as any);
    const out: Record<string, any> = { ...DEFAULTS };
    for (const r of rows?.data || []) {
      const row = r as any;
      out[String(row.settingKey)] = this.parseValue(
        row.settingValue,
        String(row.dataType || 'text'),
      );
    }
    // Never leak secrets
    if (out.webhookSecret) {
      out.webhookSecret = '';
    }
    return out;
  }

  async getSecret(key: string): Promise<string> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [
        { field: 'settingGroup', operator: 'eq', value: GROUP },
        { field: 'settingKey', operator: 'eq', value: key },
      ],
      pageSize: 5,
    } as any);
    const row = (rows?.data || [])[0] as any;
    return row ? String(row.settingValue || '') : '';
  }

  async updateSettings(
    payload: Record<string, any>,
    userId?: string,
  ): Promise<Record<string, any>> {
    const allowed = Object.keys(DEFAULTS);
    const changed: string[] = [];
    for (const [key, value] of Object.entries(payload || {})) {
      if (!allowed.includes(key)) {
        continue;
      }
      // Skip secret unless explicitly provided (never display old secret)
      if (key === 'webhookSecret' && !String(value || '')) {
        continue;
      }
      const existing = await this.database.gstAuditSettings.findAll({
        filters: [
          { field: 'settingGroup', operator: 'eq', value: GROUP },
          { field: 'settingKey', operator: 'eq', value: key },
        ],
        pageSize: 5,
      } as any);
      const row = (existing?.data || [])[0] as any;
      const dataType =
        typeof value === 'boolean'
          ? 'boolean'
          : typeof value === 'number'
            ? 'number'
            : Array.isArray(value)
              ? 'json'
              : 'text';
      const raw =
        typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
      if (row) {
        await this.database.gstAuditSettings.update(row.id, { settingValue: raw, dataType } as any);
      } else {
        await this.database.gstAuditSettings.create({
          settingGroup: GROUP,
          settingKey: key,
          settingValue: raw,
          dataType,
        } as any);
      }
      changed.push(key);
    }
    if (changed.length > 0) {
      await this.audit.log({
        userId: actor(userId),
        event: 'commercial.settings_changed',
        resource: 'CommercialSettings',
        action: 'update',
        details: { changed },
      });
    }
    return this.getSettings();
  }
}
