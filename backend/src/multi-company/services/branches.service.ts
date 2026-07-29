import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class BranchesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const branch = await this.database.branches.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'branch.created', resource: 'branches', action: 'create', details: { branchId: branch.id } });
    return branch;
  }

  async findAll(params: { page: number; pageSize: number; companyId?: string; search?: string }) {
    return this.database.branches.findAll(params);
  }

  async findById(id: string) { return this.database.branches.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.branches.update(id, data);
    await this.audit.log({ userId, event: 'branch.updated', resource: 'branches', action: 'update', details: { branchId: id } });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.branches.softDelete(id);
    await this.audit.log({ userId, event: 'branch.deleted', resource: 'branches', action: 'delete', details: { branchId: id } });
  }
}
