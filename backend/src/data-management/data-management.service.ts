import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { getRawClient, loadDatabaseConfig } from '@shranix/database';
import * as XLSX from 'xlsx';

import { DatabaseService } from '../database/database.service';

import {
  ARCHIVE_ENTITIES,
  DELETABLE_ENTITIES,
  IMPORT_EXPORT_ENTITIES,
  findArchiveEntity,
  findDeletableEntity,
  findImportExportEntity,
  type DeletableEntity,
  type ImportExportEntity,
} from './entities';

interface ExportResult {
  fileName: string;
  buffer: Buffer;
  mime: string;
}

interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  entity: string;
  mode: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
}

/** Chunk an id array so SQLite variable limits are never hit. */
function chunkIds(ids: string[], size = 400): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

function parseBool(v: unknown): boolean {
  if (v === undefined || v === null) {
    return false;
  }
  return ['true', '1', 'yes', 'y', 'on'].includes(String(v).trim().toLowerCase());
}

function parseNum(v: unknown, fallback = 0): number {
  if (v === undefined || v === null || v === '') {
    return fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class DataManagementService {
  private readonly logger = new Logger(DataManagementService.name);

  constructor(private readonly database: DatabaseService) {}

  // ── raw client (mirrors BackupService — sqlite online operations) ──
  private get raw(): any {
    return getRawClient(loadDatabaseConfig());
  }

  private get provider(): string {
    return String(loadDatabaseConfig().provider || 'sqlite');
  }

  /** The deleted/cleanup/archive engines run raw SQLite SQL — mirror BackupService's gating. */
  private assertSqlite(): void {
    if (this.provider !== 'sqlite') {
      throw new BadRequestException('Data management is only supported for the SQLite provider');
    }
  }

  private resolveDbPath(): string {
    const cfg = loadDatabaseConfig();
    const rel = String(cfg.url || '').replace(/^file:(\/\/)?/, '');
    return path.resolve(process.cwd(), rel);
  }

  private archiveDir(): string {
    const dbPath = this.resolveDbPath();
    return path.join(path.dirname(dbPath), 'archives');
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════

  private async fetchAllActive(entity: ImportExportEntity): Promise<Record<string, unknown>[]> {
    const repo = (this.database as any)[entity.repo] as {
      findAll: (p: any) => Promise<{ data: any[] }>;
    };
    const pageSize = 500;
    const rows: Record<string, unknown>[] = [];
    let page = 1;
    for (;;) {
      const pageRows = await repo.findAll({
        page,
        pageSize,
        filters: entity.ledgerType
          ? [{ field: 'ledgerType', operator: 'eq', value: entity.ledgerType }]
          : undefined,
      } as any);
      const data = (pageRows?.data || []) as Record<string, unknown>[];
      rows.push(...data);
      if (data.length < pageSize) {
        break;
      }
      page += 1;
    }
    return rows;
  }

  /** Convert DB rows → friendly export rows (customers unpack their notes JSON). */
  private toExportRows(
    entity: ImportExportEntity,
    rows: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    return rows.map((row) => {
      let notes: Record<string, unknown> = {};
      if (typeof row.notes === 'string' && row.notes) {
        try {
          notes = JSON.parse(row.notes);
        } catch {
          notes = {};
        }
      }
      const out: Record<string, unknown> = {};
      for (const f of entity.fields) {
        let v: unknown = f.inNotes ? notes[f.col] : (row as any)[f.col];
        if (f.type === 'number') {
          v = v === null || v === undefined || v === '' ? 0 : Number(v);
        }
        if (f.type === 'boolean') {
          v = v ? 'Yes' : 'No';
        }
        if (f.inNotes && (v === undefined || v === null)) {
          v = '';
        }
        out[f.header] = v ?? '';
      }
      return out;
    });
  }

  private buildCsv(rows: Record<string, unknown>[]): Buffer {
    const headers = Object.keys(rows[0] || {});
    const escape = (v: unknown): string => {
      const s = String(v ?? '');
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8');
  }

  async exportData(entityKey: string, format: string): Promise<ExportResult> {
    const entity = findImportExportEntity(entityKey);
    if (!entity) {
      throw new BadRequestException(`Unknown entity "${entityKey}"`);
    }
    const fmt = String(format || 'csv').toLowerCase();
    if (!['excel', 'csv', 'json'].includes(fmt)) {
      throw new BadRequestException('Format must be excel, csv or json');
    }

    const rows = this.toExportRows(entity, await this.fetchAllActive(entity));
    const ts = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);

    if (fmt === 'json') {
      return {
        fileName: `${entity.key}-${ts}.json`,
        buffer: Buffer.from(JSON.stringify(rows, null, 2), 'utf8'),
        mime: 'application/json',
      };
    }
    if (fmt === 'csv') {
      return {
        fileName: `${entity.key}-${ts}.csv`,
        buffer: this.buildCsv(rows),
        mime: 'text/csv; charset=utf-8',
      };
    }
    // excel
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = entity.fields.map((f) => ({
      wch: Math.min(Math.max(f.header.length + 2, 12), 32),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entity.label);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      fileName: `${entity.key}-${ts}.xlsx`,
      buffer: Buffer.from(buffer),
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT
  // ═══════════════════════════════════════════════════════════════

  private parseUpload(
    entity: ImportExportEntity,
    fileName: string,
    buffer: Buffer,
  ): Record<string, unknown>[] {
    const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
    if (ext === 'json') {
      const parsed = JSON.parse(buffer.toString('utf8'));
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('JSON file must contain an array of records');
      }
      return parsed as Record<string, unknown>[];
    }
    // xlsx / xls / csv
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer' });
    } catch (err) {
      throw new BadRequestException(`Could not read spreadsheet: ${(err as Error).message}`);
    }
    const first = wb.SheetNames[0];
    if (!first) {
      throw new BadRequestException('Spreadsheet contains no sheets');
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], {
      defval: '',
    });
    return rows;
  }

  private findRowValue(
    row: Record<string, unknown>,
    field: { header: string; col: string },
  ): unknown {
    for (const key of [
      field.header,
      field.col,
      field.col.toLowerCase(),
      field.col.replace(/([A-Z])/g, '_$1').toLowerCase(),
    ]) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return row[key];
      }
    }
    return undefined;
  }

  private buildRecord(
    entity: ImportExportEntity,
    row: Record<string, unknown>,
    idx: number,
  ): { record: Record<string, unknown>; notes: Record<string, unknown> } {
    const record: Record<string, unknown> = { ...entity.importDefaults };
    const notes: Record<string, unknown> = {};
    for (const f of entity.fields) {
      if (f.exportOnly) {
        continue;
      }
      const raw = this.findRowValue(row, f);
      if (raw === undefined) {
        continue;
      }
      // Non-empty values that fail Number() are typos (e.g. "150O") — surface as a row error
      // instead of silently writing 0 into the database.
      if (f.type === 'number') {
        const s = String(raw).trim();
        if (s !== '' && !Number.isFinite(Number(s))) {
          throw new Error(`"${f.header}" must be a number (got "${s.slice(0, 20)}")`);
        }
      }
      const val =
        f.type === 'number'
          ? parseNum(raw)
          : f.type === 'boolean'
            ? parseBool(raw)
            : String(raw).trim();
      if (f.inNotes) {
        notes[f.col] = val;
      } else {
        record[f.col] = val;
      }
    }
    // required checks
    for (const f of entity.fields) {
      if (!f.required) {
        continue;
      }
      const v = f.inNotes ? notes[f.col] : record[f.col];
      if (v === undefined || v === null || String(v).trim() === '') {
        throw new Error(`"${f.header}" is required`);
      }
    }
    // customers live in ledger_master — build the ledger row
    if (entity.key === 'customers') {
      const name = String(record.partyId ?? '');
      const code = String(notes.code ?? '').trim();
      record.accountId = code || `CUST-${Date.now()}-${idx}`;
      record.ledgerType = 'customer';
      record.openingBalance = 0;
      record.openingBalanceType = 'debit';
      record.currentBalance = 0;
      const status = String(notes.status ?? 'active').toLowerCase();
      record.isActive = !['inactive', 'blocked'].includes(status);
      record.notes = JSON.stringify(notes);
      delete record.partyId;
      record.partyId = name;
    }
    return { record, notes };
  }

  private async matchExisting(
    entity: ImportExportEntity,
    record: Record<string, unknown>,
    notes: Record<string, unknown>,
  ): Promise<string | null> {
    // Build where conditions from match keys that are actually present
    const conditions: { sql: string; args: string[] }[] = [];
    for (const key of entity.matchKeys) {
      const v = String(entity.key === 'customers' ? notes[key] : (record[key] ?? '')).trim();
      if (!v) {
        continue;
      }
      conditions.push({ sql: `${key === 'mobile' ? 'mobile' : key} = ?`, args: [v] });
    }
    if (conditions.length === 0) {
      return null;
    }

    if (entity.key === 'customers') {
      // email/mobile live in the notes JSON — pull candidate rows and match in memory
      const res = await this.raw.execute({
        sql: 'SELECT id, notes FROM shranix_ledger_master WHERE ledger_type = ? AND is_deleted = 0',
        args: ['customer'],
      });
      for (const r of (res.rows || []) as { id: string; notes: string | null }[]) {
        let n: Record<string, unknown> = {};
        try {
          n = r.notes ? JSON.parse(r.notes) : {};
        } catch {
          /* ignore */
        }
        for (const key of entity.matchKeys) {
          const want = String(notes[key] ?? '').trim();
          const have = String(n[key] ?? '').trim();
          if (want && have && want.toLowerCase() === have.toLowerCase()) {
            return r.id;
          }
        }
      }
      return null;
    }

    const where = conditions.map((c) => c.sql).join(' OR ');
    const args = conditions.flatMap((c) => c.args);
    const res = await this.raw.execute({
      sql: `SELECT id FROM ${entity.table} WHERE is_deleted = 0 AND (${where}) LIMIT 1`,
      args,
    });
    return (res.rows?.[0] as { id?: string } | undefined)?.id || null;
  }

  async importData(
    entityKey: string,
    fileName: string,
    buffer: Buffer,
    mode: 'insert' | 'upsert',
  ): Promise<ImportResult> {
    this.assertSqlite();
    const entity = findImportExportEntity(entityKey);
    if (!entity) {
      throw new BadRequestException(`Unknown entity "${entityKey}"`);
    }
    if (!['insert', 'upsert'].includes(mode)) {
      throw new BadRequestException('Mode must be insert or upsert');
    }

    const rows = this.parseUpload(entity, fileName, buffer);
    if (rows.length === 0) {
      return { entity: entity.key, mode, imported: 0, updated: 0, skipped: 0, errors: [] };
    }
    if (rows.length > 5000) {
      throw new BadRequestException('File is too large — maximum 5,000 rows per import');
    }

    const repo = (this.database as any)[entity.repo] as {
      create: (data: any) => Promise<any>;
      update: (id: string, data: any) => Promise<any>;
    };

    const result = {
      entity: entity.key,
      mode,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as ImportRowError[],
    };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const { record, notes } = this.buildRecord(entity, row, i);
        const existingId = await this.matchExisting(entity, record, notes);

        if (existingId && mode === 'insert') {
          result.skipped += 1;
          continue;
        }
        if (existingId) {
          await repo.update(existingId, record);
          result.updated += 1;
        } else {
          await repo.create(record);
          result.imported += 1;
        }
      } catch (err) {
        result.errors.push({ row: i + 2, message: (err as Error).message });
      }
    }

    this.logger.log(
      `Import ${entity.key}: +${result.imported} ~${result.updated} -${result.skipped} errors:${result.errors.length}`,
    );
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // DELETED RECORDS
  // ═══════════════════════════════════════════════════════════════

  private async deletedCount(def: DeletableEntity): Promise<number> {
    const extra = def.ledgerType ? ' AND ledger_type = ?' : '';
    const args = def.ledgerType ? [def.ledgerType] : [];
    const res = await this.raw.execute({
      sql: `SELECT COUNT(*) AS c FROM ${def.table} WHERE is_deleted = 1${extra}`,
      args,
    });
    return Number((res.rows?.[0] as { c?: number } | undefined)?.c ?? 0);
  }

  async getDeletedOverview(): Promise<{
    total: number;
    entities: { key: string; label: string; count: number }[];
  }> {
    this.assertSqlite();
    const entities: { key: string; label: string; count: number }[] = [];
    let total = 0;
    for (const def of DELETABLE_ENTITIES) {
      const count = await this.deletedCount(def);
      total += count;
      entities.push({ key: def.key, label: def.label, count });
    }
    return { total, entities };
  }

  async listDeleted(
    entityKey: string,
    limit = 50,
  ): Promise<{ count: number; rows: Record<string, unknown>[] }> {
    this.assertSqlite();
    const def = findDeletableEntity(entityKey);
    if (!def) {
      throw new BadRequestException(`Unknown entity "${entityKey}"`);
    }
    const extra = def.ledgerType ? ' AND ledger_type = ?' : '';
    const args: unknown[] = def.ledgerType ? [def.ledgerType] : [];
    const countRes = await this.raw.execute({
      sql: `SELECT COUNT(*) AS c FROM ${def.table} WHERE is_deleted = 1${extra}`,
      args,
    });
    const count = Number((countRes.rows?.[0] as { c?: number } | undefined)?.c ?? 0);
    const res = await this.raw.execute({
      sql: `SELECT * FROM ${def.table} WHERE is_deleted = 1${extra} ORDER BY updated_at DESC LIMIT ?`,
      args: [...args, Math.min(Math.max(limit, 1), 200)],
    });
    const displayCol = entityKey === 'customers' ? 'party_id' : 'name';
    const rows = ((res.rows || []) as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      displayName: String((r as any)[displayCol] || r.code || r.id || '').slice(0, 80),
      deletedAt: r.deleted_at,
      updatedAt: r.updated_at,
    }));
    return { count, rows };
  }

  private async collectDeletedIds(def: DeletableEntity, ids?: string[]): Promise<string[]> {
    if (ids && ids.length > 0) {
      return ids;
    }
    const extra = def.ledgerType ? ' AND ledger_type = ?' : '';
    const args: unknown[] = def.ledgerType ? [def.ledgerType] : [];
    const res = await this.raw.execute({
      sql: `SELECT id FROM ${def.table} WHERE is_deleted = 1${extra}`,
      args,
    });
    return ((res.rows || []) as { id: string }[]).map((r) => r.id);
  }

  async restoreDeleted(
    entityKey: string,
    ids?: string[],
  ): Promise<{ restored: number; message: string }> {
    this.assertSqlite();
    const def = findDeletableEntity(entityKey);
    if (!def) {
      throw new BadRequestException(`Unknown entity "${entityKey}"`);
    }
    const idList = await this.collectDeletedIds(def, ids);
    if (idList.length === 0) {
      return { restored: 0, message: 'Nothing to restore' };
    }
    let restored = 0;
    for (const chunk of chunkIds(idList)) {
      const extra = def.ledgerType ? ' AND ledger_type = ?' : '';
      const placeholders = chunk.map(() => '?').join(',');
      const args: unknown[] = [...chunk, ...(def.ledgerType ? [def.ledgerType] : [])];
      const res = await this.raw.execute({
        sql: `UPDATE ${def.table} SET is_deleted = 0, deleted_at = NULL WHERE id IN (${placeholders}) AND is_deleted = 1${extra}`,
        args,
      });
      restored += Number((res as any).rowsAffected ?? chunk.length);
    }
    this.logger.log(`Restored ${restored} ${entityKey}`);
    return { restored, message: `Restored ${restored} ${def.label.toLowerCase()}` };
  }

  async purgeDeleted(
    entityKey: string,
    ids?: string[],
  ): Promise<{ purged: number; message: string }> {
    this.assertSqlite();
    const def = findDeletableEntity(entityKey);
    if (!def) {
      throw new BadRequestException(`Unknown entity "${entityKey}"`);
    }
    const idList = await this.collectDeletedIds(def, ids);
    if (idList.length === 0) {
      return { purged: 0, message: 'Nothing to purge' };
    }
    let purged = 0;
    for (const chunk of chunkIds(idList)) {
      const extra = def.ledgerType ? ' AND ledger_type = ?' : '';
      const placeholders = chunk.map(() => '?').join(',');
      const args: unknown[] = [...chunk, ...(def.ledgerType ? [def.ledgerType] : [])];
      const res = await this.raw.execute({
        sql: `DELETE FROM ${def.table} WHERE id IN (${placeholders}) AND is_deleted = 1${extra}`,
        args,
      });
      purged += Number((res as any).rowsAffected ?? chunk.length);
      // clean up child rows so no orphans are left behind
      for (const child of def.childTables || []) {
        await this.raw.execute({
          sql: `DELETE FROM ${child.table} WHERE ${child.fkCol} IN (${placeholders})`,
          args: [...chunk],
        });
      }
    }
    this.logger.log(`Purged ${purged} ${entityKey}`);
    return { purged, message: `Permanently deleted ${purged} ${def.label.toLowerCase()}` };
  }

  // ═══════════════════════════════════════════════════════════════
  // DATABASE CLEANUP (purge all soft-deleted + VACUUM)
  // ═══════════════════════════════════════════════════════════════

  async cleanupAll(): Promise<{
    purged: Record<string, number>;
    total: number;
    dbSizeBefore: number;
    dbSizeAfter: number;
    vacuumed: boolean;
    message: string;
  }> {
    this.assertSqlite();
    const dbPath = this.resolveDbPath();
    const sizeOf = (): number => (existsSync(dbPath) ? statSync(dbPath).size : 0);
    const dbSizeBefore = sizeOf();
    const purged: Record<string, number> = {};
    let total = 0;
    for (const def of DELETABLE_ENTITIES) {
      const count = await this.deletedCount(def);
      if (count > 0) {
        const r = await this.purgeDeleted(def.key);
        purged[def.key] = r.purged;
        total += r.purged;
      }
    }
    let vacuumed = false;
    if (this.provider === 'sqlite') {
      await this.raw.execute('VACUUM');
      vacuumed = true;
    }
    const dbSizeAfter = sizeOf();
    this.logger.log(
      `Cleanup done: ${total} records purged, db ${dbSizeBefore} → ${dbSizeAfter} bytes`,
    );
    return {
      purged,
      total,
      dbSizeBefore,
      dbSizeAfter,
      vacuumed,
      message: `Purged ${total} soft-deleted records${vacuumed ? ' and compacted the database' : ''}.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ARCHIVE (old closed transactions → archive file + soft-delete)
  // ═══════════════════════════════════════════════════════════════

  async archiveData(
    entityKey: string,
    beforeDate: string,
  ): Promise<{ archived: number; fileName: string; filePath: string; message: string }> {
    this.assertSqlite();
    const def = findArchiveEntity(entityKey);
    if (!def) {
      throw new BadRequestException(`Unknown archive entity "${entityKey}"`);
    }
    const cutoff = String(beforeDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
      throw new BadRequestException('Provide a cutoff date (YYYY-MM-DD)');
    }

    const statuses = def.statuses.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
    const res = await this.raw.execute({
      sql: `SELECT * FROM ${def.table} WHERE is_deleted = 0 AND status IN (${statuses}) AND ${def.dateCol} < ?`,
      args: [cutoff],
    });
    const records = (res.rows || []) as Record<string, unknown>[];
    if (records.length === 0) {
      return {
        archived: 0,
        fileName: '',
        filePath: '',
        message: `No ${def.label.toLowerCase()} before ${cutoff} to archive`,
      };
    }

    const dir = this.archiveDir();
    mkdirSync(dir, { recursive: true });
    const ts = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
    const fileName = `${entityKey}-archive-${cutoff}-${ts}.json`;
    const filePath = path.join(dir, fileName);
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          entity: entityKey,
          label: def.label,
          cutoff,
          exportedAt: new Date().toISOString(),
          count: records.length,
          records,
        },
        null,
        2,
      ),
    );

    const ids = records.map((r) => String(r.id));
    await this.raw.execute('BEGIN');
    try {
      for (const chunk of chunkIds(ids)) {
        const placeholders = chunk.map(() => '?').join(',');
        const now = new Date().toISOString();
        await this.raw.execute({
          sql: `UPDATE ${def.table} SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
          args: [now, now, ...chunk],
        });
        for (const child of def.childTables) {
          if (child.softDelete) {
            await this.raw.execute({
              sql: `UPDATE ${child.table} SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE ${child.fkCol} IN (${placeholders})`,
              args: [now, now, ...chunk],
            });
          } else {
            await this.raw.execute({
              sql: `DELETE FROM ${child.table} WHERE ${child.fkCol} IN (${placeholders})`,
              args: chunk,
            });
          }
        }
      }
      await this.raw.execute('COMMIT');
    } catch (err) {
      try {
        await this.raw.execute('ROLLBACK');
      } catch {
        /* ignore */
      }
      // If the transaction failed, remove the archive file to avoid a phantom export
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch {
        /* ignore */
      }
      throw err;
    }

    this.logger.log(`Archived ${records.length} ${entityKey} → ${fileName}`);
    return {
      archived: records.length,
      fileName,
      filePath,
      message: `Archived ${records.length} ${def.label.toLowerCase()} to ${fileName}. Archived invoices can be restored from the Deleted Records section (headers) or re-imported from the archive file.`,
    };
  }

  getMeta(): {
    importExport: { key: string; label: string; fields: string[] }[];
    archive: { key: string; label: string; statuses: string[] }[];
  } {
    return {
      importExport: IMPORT_EXPORT_ENTITIES.map((e) => ({
        key: e.key,
        label: e.label,
        fields: e.fields.map((f) => f.header),
      })),
      archive: ARCHIVE_ENTITIES.map((e) => ({ key: e.key, label: e.label, statuses: e.statuses })),
    };
  }
}
