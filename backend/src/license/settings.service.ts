import { existsSync, readdirSync, statSync } from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { loadDatabaseConfig } from '@shranix/database';

import { DatabaseService } from '../database/database.service';

/**
 * License Management — KV store (shranix_gst_audit_settings, group 'license').
 *
 * Plan details: Current Plan, License Expiry, Activation Key, Renew.
 * Limits: Users Allowed, Branches Allowed, Storage (GB) — plan ke hisaab se.
 * Usage (read-only, computed): usersCount, branchesCount, storageUsedBytes.
 *
 * Self-hosted model: renewal expiry date extend karta hai — koi online
 * activation server nahi chahiye. (Vendor-based online licensing bhi yahan
 * plug-in ho sakti hai — bas renewLicense() mein check add karna hoga.)
 */
@Injectable()
export class LicenseSettingsService {
  private readonly logger = new Logger(LicenseSettingsService.name);
  private readonly GROUP = 'license';
  private readonly ALLOWED_KEYS = [
    'currentPlan',
    'licenseExpiry',
    'activationKey',
    'usersAllowed',
    'branchesAllowed',
    'storageLimitGb',
  ];
  private readonly DEFAULTS: Record<string, unknown> = {
    currentPlan: 'Starter',
    licenseExpiry: '',
    activationKey: '',
    usersAllowed: 5,
    branchesAllowed: 1,
    storageLimitGb: 5,
  };

  // Computed usage is expensive (sync fs walk of DMS dir) — short TTL cache,
  // same pattern as NotificationSettingsService.
  private readonly USAGE_TTL = 30_000;
  private usageCache: {
    time: number;
    usage: { usersCount: number; branchesCount: number; storageUsedBytes: number };
  } | null = null;

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

  private async kvGet(): Promise<Record<string, unknown>> {
    const rows = await this.database.gstAuditSettings.findAll({
      filters: [{ field: 'settingGroup', operator: 'eq', value: this.GROUP }],
      pageSize: 100,
    } as any);
    const out: Record<string, unknown> = { ...this.DEFAULTS };
    for (const r of rows?.data || []) {
      const row = r as any;
      out[String(row.settingKey)] = this.parseValue(
        row.settingValue,
        String(row.dataType || 'text'),
      );
    }
    return out;
  }

  private async countAll(repo: unknown): Promise<number> {
    try {
      const finder = (
        repo as {
          findAll: (params?: {
            page?: number;
            pageSize?: number;
          }) => Promise<{ total?: number; data?: unknown[] }>;
        }
      ).findAll;
      const res = await finder({ page: 1, pageSize: 100 });
      return Number(res?.total ?? res?.data?.length ?? 0);
    } catch (err) {
      this.logger.warn(`License usage count failed: ${(err as Error).message}`);
      return 0;
    }
  }

  private resolveDbPath(): string {
    const cfg = loadDatabaseConfig();
    if (cfg.provider !== 'sqlite') {
      // Non-SQLite providers ke liye DB file size measure nahi ho sakti — 0 return
      return '';
    }
    const rel = cfg.url.replace(/^file:(\/\/)?/, '');
    return path.resolve(process.cwd(), rel);
  }

  private dirSize(dir: string): number {
    if (!existsSync(dir)) {
      return 0;
    }
    let total = 0;
    const stack: string[] = [dir];
    while (stack.length > 0) {
      const cur = stack.pop() as string;
      let entries;
      try {
        entries = readdirSync(cur, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) {
          stack.push(full);
        } else if (e.isFile()) {
          total += statSync(full).size;
        }
      }
    }
    return total;
  }

  /** KV settings + live usage (users, branches, storage). Usage 30s ke liye cached. */
  async getSettings(): Promise<Record<string, unknown>> {
    const kv = await this.kvGet();
    const usage = await this.getUsage();
    return { ...kv, ...usage };
  }

  private async getUsage(): Promise<{
    usersCount: number;
    branchesCount: number;
    storageUsedBytes: number;
  }> {
    if (this.usageCache && Date.now() - this.usageCache.time < this.USAGE_TTL) {
      return this.usageCache.usage;
    }
    const dbPath = this.resolveDbPath();
    const dbSize = dbPath && existsSync(dbPath) ? statSync(dbPath).size : 0;
    const dmsPath = process.env.DMS_STORAGE_PATH || path.join(process.cwd(), 'storage', 'dms');
    const storageUsedBytes = dbSize + this.dirSize(dmsPath);
    const usage = {
      usersCount: await this.countAll(this.database.users),
      branchesCount: await this.countAll(this.database.branches),
      storageUsedBytes,
    };
    this.usageCache = { time: Date.now(), usage };
    return usage;
  }

  /** Whitelisted keys only — arbitrary KV writes nahi hote. */
  async updateSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.usageCache = null; // settings badli → usage turant fresh recompute ho
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

  // ── Local-date helpers (UTC midnight parsing se timezone day-shift nahi hota) ──
  private parseLocalDate(value: unknown): Date | null {
    const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) {
      return null;
    }
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private toLocalDateStr(d: Date): string {
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mo}-${da}`;
  }

  /**
   * Renew: license expiry ko aage badhao. Base = max(today, current expiry) —
   * matlab expired license aaj se renew hota hai, active license apni
   * expiry se aage badhta hai (double-counting nahi).
   */
  async renewLicense(months: number): Promise<Record<string, unknown>> {
    const monthsN = Number.isFinite(months) && months > 0 ? Math.min(120, Math.floor(months)) : 12;
    const kv = await this.kvGet();
    const current = this.parseLocalDate(kv.licenseExpiry);
    const base = current && current.getTime() > Date.now() ? current : new Date();
    const next = new Date(base);
    next.setMonth(next.getMonth() + monthsN);
    await this.updateSettings({ licenseExpiry: this.toLocalDateStr(next) });
    return this.getSettings();
  }
}
