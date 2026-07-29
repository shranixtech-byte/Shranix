import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DesignationsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const d = await this.database.employeeDesignations.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'designation.created', resource: 'employee_designations', action: 'create', details: { designationId: d.id } });
    return d;
  }
  async findAll(params: any) { return this.database.employeeDesignations.findAll(params); }
  async findById(id: string) { return this.database.employeeDesignations.findById(id); }
  async update(id: string, data: any, userId: string) {
    const u = await this.database.employeeDesignations.update(id, data);
    await this.audit.log({ userId, event: 'designation.updated', resource: 'employee_designations', action: 'update', details: { designationId: id } });
    return u;
  }
  async softDelete(id: string) { await this.database.employeeDesignations.softDelete(id); }
}
