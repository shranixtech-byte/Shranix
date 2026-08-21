import { createReadStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import * as path from 'path';

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { getRawClient, loadDatabaseConfig } from '@shranix/database';

import { logUploadSecurityEvent, safeContentDisposition } from '../common/utils/file-validation';
import { DatabaseService } from '../database/database.service';

export interface BackupMeta {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
  kind: 'manual' | 'auto';
}

export interface BackupOverview {
  folder: string;
  dbPath: string;
  dbSize: number;
  backups: BackupMeta[];
}

/**
 * SQLite backup & restore engine.
 * - Backup: `VACUUM INTO` — consistent single-file snapshot (WAL-safe), no file-lock tricks.
 * - Restore: online ATTACH + per-table copy — server restart ki zaroorat nahi.
 * - Auto-backup: KV settings (shranix_gst_audit_settings, group 'backup') + hourly check.
 */
@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly GROUP = 'backup';
  private readonly ALLOWED_KEYS = ['enabled', 'frequency', 'keepCount', 'cloudProvider'];
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly database: DatabaseService) {}

  private startupRetried = false;

  onModuleInit(): void {
    // Thoda delay — DatabaseService ka client abhi initialize ho raha ho sakta hai
    setTimeout(() => {
      void this.maybeRunAutoBackup();
    }, 5000);
    this.timer = setInterval(
      () => {
        void this.maybeRunAutoBackup();
      },
      60 * 60 * 1000,
    ); // hourly check
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  // ── Path resolution ────────────────────────────────────
  private resolveDbPath(): string {
    const cfg = loadDatabaseConfig();
    if (cfg.provider !== 'sqlite') {
      throw new BadRequestException('Backup is only supported for the SQLite provider');
    }
    const rel = cfg.url.replace(/^file:(\/\/)?/, '');
    return path.resolve(process.cwd(), rel);
  }

  private backupDir(): string {
    const dbPath = this.resolveDbPath();
    return path.join(path.dirname(dbPath), 'backups');
  }

  private ensureDir(): void {
    mkdirSync(this.backupDir(), { recursive: true });
  }

  private safeName(name: string): string {
    const raw = String(name || '');
    const base = path.basename(raw);
    // path.basename already strips separators — the real guard is the .. check
    if (!base.startsWith('backup-') || !base.endsWith('.db') || base.includes('..')) {
      logUploadSecurityEvent('BACKUP-NAME-REJECTED', {
        filename: raw,
        reason: 'invalid backup name format',
        endpoint: 'backup',
      });
      throw new BadRequestException('Invalid backup name');
    }
    // H12: Additional path traversal check on the raw input
    if (raw !== base || raw.includes('/') || raw.includes('\\') || raw.includes('\0')) {
      logUploadSecurityEvent('BACKUP-PATH-TRAVERSAL', {
        filename: raw,
        reason: 'path traversal in backup name',
        endpoint: 'backup',
      });
      throw new BadRequestException('Invalid backup name');
    }
    return base;
  }

  // ── Backup operations ──────────────────────────────────
  async createBackup(kind: 'manual' | 'auto' = 'manual'): Promise<BackupMeta> {
    this.ensureDir();
    // Milliseconds granularity — same-second double-click ko VACUUM INTO collision se bachata hai
    const ts = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 17); // YYYYMMDDHHmmssSSS
    const fileName = `backup-${kind === 'auto' ? 'auto-' : ''}${ts}.db`;
    const target = path.join(this.backupDir(), fileName);
    const sqlPath = target.replace(/\\/g, '/');
    const raw = getRawClient(loadDatabaseConfig());
    await raw.execute(`VACUUM INTO '${sqlPath}'`);
    const st = statSync(target);
    this.logger.log(`${kind} backup created: ${fileName} (${st.size} bytes)`);
    return { id: fileName, fileName, size: st.size, createdAt: st.mtime.toISOString(), kind };
  }

  async listBackups(): Promise<BackupMeta[]> {
    const dir = this.backupDir();
    if (!existsSync(dir)) {
      return [];
    }
    return readdirSync(dir)
      .filter((f) => f.startsWith('backup-') && f.endsWith('.db'))
      .map((f) => {
        const st = statSync(path.join(dir, f));
        return {
          id: f,
          fileName: f,
          size: st.size,
          createdAt: st.mtime.toISOString(),
          kind: f.includes('auto-') ? ('auto' as const) : ('manual' as const),
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async overview(): Promise<BackupOverview> {
    const dbPath = this.resolveDbPath();
    return {
      folder: this.backupDir(),
      dbPath,
      dbSize: existsSync(dbPath) ? statSync(dbPath).size : 0,
      backups: await this.listBackups(),
    };
  }

  downloadBackup(name: string): StreamableFile {
    const fileName = this.safeName(name);
    const full = path.join(this.backupDir(), fileName);
    // H12: Verify resolved path stays within backup directory
    const resolved = path.resolve(full);
    const baseResolved = path.resolve(this.backupDir());
    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      logUploadSecurityEvent('BACKUP-PATH-ESCAPE', {
        filename: name,
        reason: 'resolved path escapes backup directory',
        endpoint: 'backup/download',
      });
      throw new BadRequestException('Invalid file path');
    }
    if (!existsSync(full)) {
      throw new NotFoundException('Backup not found');
    }
    return new StreamableFile(createReadStream(full), {
      type: 'application/octet-stream',
      disposition: safeContentDisposition(fileName),
    });
  }

  /**
   * Online restore: ATTACH the backup as `restore_db`, then DELETE+INSERT every
   * table from main. SQLite connection open rehta hai — koi restart nahi chahiye.
   * Auto-increment counters (sqlite_sequence) bhi copy hote hain.
   */
  async restoreBackup(name: string): Promise<{ restored: number; message: string }> {
    const fileName = this.safeName(name);
    const full = path.join(this.backupDir(), fileName);
    if (!existsSync(full)) {
      throw new NotFoundException('Backup not found');
    }
    const raw = getRawClient(loadDatabaseConfig());
    const sqlPath = full.replace(/\\/g, '/');

    await raw.execute('PRAGMA foreign_keys = OFF');
    await raw.execute(`ATTACH DATABASE '${sqlPath}' AS restore_db`);
    try {
      const tablesRes = await raw.execute(
        `SELECT name FROM restore_db.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      );
      const tables = tablesRes.rows.map((r) => String((r as unknown as { name?: unknown }).name));
      if (tables.length === 0) {
        throw new BadRequestException('Backup contains no tables');
      }

      await raw.execute('BEGIN');
      try {
        for (const t of tables) {
          await raw.execute(`DELETE FROM main."${t}"`);
          await raw.execute(`INSERT INTO main."${t}" SELECT * FROM restore_db."${t}"`);
        }
        // sqlite_sequence counters (only if both sides have the table)
        const seqMain = await raw.execute(
          `SELECT name FROM main.sqlite_master WHERE name='sqlite_sequence'`,
        );
        if (seqMain.rows.length > 0) {
          await raw.execute('DELETE FROM main.sqlite_sequence');
          await raw.execute(
            'INSERT INTO main.sqlite_sequence SELECT * FROM restore_db.sqlite_sequence',
          );
        }
        await raw.execute('COMMIT');
      } catch (err) {
        try {
          await raw.execute('ROLLBACK');
        } catch {
          /* ignore */
        }
        throw err;
      }
      // Schema-drift warning: main-only tables ki purani data untouched rehti hai
      const mainTablesRes = await raw.execute(
        `SELECT name FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
      );
      const mainTables = mainTablesRes.rows.map((r) =>
        String((r as unknown as { name?: unknown }).name),
      );
      const onlyInMain = mainTables.filter((t) => !tables.includes(t)).length;
      this.logger.log(`Restored ${tables.length} tables from ${fileName}`);
      const warning =
        onlyInMain > 0
          ? ` ${onlyInMain} table(s) only exist in the current DB and were left untouched (schema differs).`
          : '';
      return {
        restored: tables.length,
        message: `Restored ${tables.length} tables from ${fileName}.${warning}`,
      };
    } finally {
      try {
        await raw.execute('DETACH DATABASE restore_db');
      } catch {
        /* ignore */
      }
    }
  }

  async deleteBackup(name: string): Promise<{ message: string }> {
    const fileName = this.safeName(name);
    const full = path.join(this.backupDir(), fileName);
    if (!existsSync(full)) {
      throw new NotFoundException('Backup not found');
    }
    unlinkSync(full);
    return { message: `Deleted ${fileName}` };
  }

  // ── Auto-backup KV settings (GstConfigService pattern) ──
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

  // ── Auto-backup loop ───────────────────────────────────
  private async maybeRunAutoBackup(): Promise<void> {
    try {
      const s = await this.getSettings();
      if (String(s.enabled) !== 'true') {
        return;
      }
      const freq = String(s.frequency || 'daily');
      const keep = Math.max(1, Number(s.keepCount) || 10);
      const auto = (await this.listBackups()).filter((b) => b.kind === 'auto');
      const last = auto[0]; // sorted desc
      const now = Date.now();
      let due = false;
      if (!last) {
        due = true;
      } else {
        const elapsed = now - new Date(last.createdAt).getTime();
        if (freq === 'weekly') {
          due = elapsed >= 7 * 24 * 3600 * 1000;
        } else if (freq === 'monthly') {
          due = elapsed >= 30 * 24 * 3600 * 1000;
        } else {
          due = elapsed >= 24 * 3600 * 1000;
        }
      }
      if (!due) {
        return;
      }
      await this.createBackup('auto');
      // Prune old auto backups — keep latest N
      const all = (await this.listBackups()).filter((b) => b.kind === 'auto');
      for (const b of all.slice(keep)) {
        try {
          unlinkSync(path.join(this.backupDir(), b.fileName));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      this.logger.error(`Auto backup failed: ${(err as Error).message}`);
      // Startup par DB ready na hone ki wajah se fail hua ho to ek baar 60s baad retry
      if (!this.startupRetried) {
        this.startupRetried = true;
        setTimeout(() => {
          void this.maybeRunAutoBackup();
        }, 60 * 1000);
      }
    }
  }
}
