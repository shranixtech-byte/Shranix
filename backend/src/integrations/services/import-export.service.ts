import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ImportExportService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async importData(module: string, fileType: string, data: any[], userId: string) {
    const log = await this.database.importLogs.create({
      id: crypto.randomUUID(), module, fileName: `${module}_import`, fileType,
      totalRows: data.length, successRows: 0, failedRows: 0,
      status: 'processing', startedAt: new Date().toISOString(), createdBy: userId, createdAt: new Date().toISOString(),
    });
    await this.audit.log({ userId, event: 'import.started', resource: 'import_logs', action: 'import', details: { logId: log.id, module, rows: data.length } });
    return { importId: log.id, totalRows: data.length };
  }

  async exportData(module: string, format: string, _params: any) {
    return { module, format, totalRecords: 0, data: [], exportedAt: new Date().toISOString() };
  }

  async getImportLogs(params: any) { return this.database.importLogs.findAll(params); }
}
