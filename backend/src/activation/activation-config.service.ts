import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

/**
 * Activation / update configuration (KV store `shranix_gst_audit_settings`,
 * group 'activation'). All values are configurable — nothing hardcoded:
 *
 *  - offlineTtlDays   Signed offline-token validity (bounded, default 7).
 *                     Offline mode is an exceptional recovery path, NEVER an
 *                     unlimited bypass.
 *  - trialEnabled     Whether "Continue Trial" first-run flow is offered.
 *  - trialTtlDays     Trial token validity.
 *  - revalidateHours  How often the desktop client should revalidate online.
 *  - updateChannel / latestVersion / minVersion / updateUrl
 *                     Update-check metadata served by GET /activation/update.
 *
 * Environment variables override the KV values (used by Phase 16 deployment).
 */
@Injectable()
export class ActivationConfigService {
  private readonly logger = new Logger(ActivationConfigService.name);
  private readonly GROUP = 'activation';

  private readonly ALLOWED_KEYS = [
    'offlineTtlDays',
    'trialEnabled',
    'trialTtlDays',
    'revalidateHours',
    'updateChannel',
    'latestVersion',
    'minVersion',
    'updateUrl',
    'signatureRequired',
  ];

  private readonly DEFAULTS: Record<string, unknown> = {
    offlineTtlDays: 7,
    trialEnabled: false,
    trialTtlDays: 14,
    revalidateHours: 12,
    updateChannel: 'stable',
    latestVersion: '',
    minVersion: '',
    updateUrl: '',
    signatureRequired: true,
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

  async getConfig(): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = { ...this.DEFAULTS };
    try {
      const rows = await this.database.gstAuditSettings.findAll({
        filters: [{ field: 'settingGroup', operator: 'eq', value: this.GROUP }],
        pageSize: 100,
      } as any);
      for (const r of rows?.data || []) {
        const row = r as any;
        out[String(row.settingKey)] = this.parseValue(
          row.settingValue,
          String(row.dataType || 'text'),
        );
      }
    } catch {
      /* defaults on KV failure */
    }

    // Environment overrides (documented in .env.example / deployment guide)
    const env = process.env as Record<string, string | undefined>;
    if (env.ACTIVATION_OFFLINE_TTL_DAYS) {
      out.offlineTtlDays = Number(env.ACTIVATION_OFFLINE_TTL_DAYS);
    }
    if (env.ACTIVATION_TRIAL_ENABLED === '1' || env.ACTIVATION_TRIAL_ENABLED === 'true') {
      out.trialEnabled = true;
    }
    if (env.ACTIVATION_REVALIDATE_HOURS) {
      out.revalidateHours = Number(env.ACTIVATION_REVALIDATE_HOURS);
    }
    if (env.UPDATE_CHANNEL) {
      out.updateChannel = env.UPDATE_CHANNEL;
    }
    if (env.UPDATE_LATEST_VERSION) {
      out.latestVersion = env.UPDATE_LATEST_VERSION;
    }
    if (env.UPDATE_MIN_VERSION) {
      out.minVersion = env.UPDATE_MIN_VERSION;
    }
    if (env.UPDATE_URL) {
      out.updateUrl = env.UPDATE_URL;
    }
    return out;
  }

  async updateSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(input || {})) {
      if (!this.ALLOWED_KEYS.includes(key)) {
        continue;
      }
      const dataType =
        typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text';
      const existing = await this.database.gstAuditSettings
        .findAll({
          filters: [
            { field: 'settingGroup', operator: 'eq', value: this.GROUP },
            { field: 'settingKey', operator: 'eq', value: key },
          ],
          pageSize: 1,
        } as any)
        .catch(() => ({ data: [] }));
      const row = (existing?.data || [])[0];
      if (row) {
        await this.database.gstAuditSettings
          .update(row.id, { settingValue: String(value), dataType } as any)
          .catch(() => undefined);
      } else {
        await this.database.gstAuditSettings
          .create({
            settingGroup: this.GROUP,
            settingKey: key,
            settingValue: String(value),
            dataType,
          } as any)
          .catch(() => undefined);
      }
    }
    this.logger.log(`Activation settings updated (${Object.keys(input || {}).length} keys)`);
    return this.getConfig();
  }
}
