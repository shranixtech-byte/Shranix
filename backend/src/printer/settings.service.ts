import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * Printer Settings — KV store (shranix_gst_audit_settings, group 'printer').
 * Printers: Invoice / Barcode / Thermal / Label + Default.
 * Layout: Paper Size, Margins (mm), Copies.
 */
@Injectable()
export class PrinterSettingsService {
  private readonly GROUP = 'printer';
  private readonly ALLOWED_KEYS = [
    'invoicePrinter',
    'barcodePrinter',
    'thermalPrinter',
    'labelPrinter',
    'defaultPrinter',
    'paperSize',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'copies',
  ];

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
    const out: Record<string, unknown> = {};
    for (const r of rows?.data || []) {
      const row = r as any;
      out[String(row.settingKey)] = this.parseValue(
        row.settingValue,
        String(row.dataType || 'text'),
      );
    }
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
    return this.getSettings();
  }
}
