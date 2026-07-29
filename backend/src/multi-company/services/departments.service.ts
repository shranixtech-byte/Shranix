import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}
  async create(data: any, userId: string) {
    const item = await this.database.departments.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'department.created', resource: 'departments', action: 'create', details: { deptId: item.id } });
    return item;
  }
  async findAll(params: any) { return this.database.departments.findAll(params); }
  async findById(id: string) { return this.database.departments.findById(id); }
  async update(id: string, data: any, userId: string) {
    const u = await this.database.departments.update(id, data);
    await this.audit.log({ userId, event: 'department.updated', resource: 'departments', action: 'update', details: { deptId: id } });
    return u;
  }
  async softDelete(id: string) { await this.database.departments.softDelete(id); }
}
