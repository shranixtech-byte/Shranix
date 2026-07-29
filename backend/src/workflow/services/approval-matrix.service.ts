import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ApprovalMatrixService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, pageSize = 50, search?: string, module?: string, documentType?: string) {
    const filter: Record<string, any> = {};
    if (module) {filter.module = module;}
    if (documentType) {filter.documentType = documentType;}
    return this.database.approvalMatrix.findAll({ page, pageSize, search, filter } as any);
  }

  async findById(id: string) {
    const record = await this.database.approvalMatrix.findById(id);
    if (!record) {throw new NotFoundException(`Approval matrix entry with id "${id}" not found`);}
    return record;
  }

  async create(data: any, userId?: string) {
    const record = await this.database.approvalMatrix.create({
      ...data,
      minAmount: Number(data.minAmount || 0),
      maxAmount: data.maxAmount !== undefined ? Number(data.maxAmount) : null,
      level: Number(data.level || 1),
      requiredApprovals: Number(data.requiredApprovals || 1),
      createdBy: userId || null,
      updatedBy: userId || null,
    } as any);

    if (userId) {
      await this.audit.log({ userId, event: 'approval_matrix_created' as any, resource: 'approval_matrix', action: 'create', details: { id: record.id, name: data.name } });
    }
    return record;
  }

  async update(id: string, data: any, userId?: string) {
    await this.findById(id);
    const updateData = { ...data, updatedBy: userId || null };
    if (data.minAmount !== undefined) {updateData.minAmount = Number(data.minAmount);}
    if (data.maxAmount !== undefined) {updateData.maxAmount = data.maxAmount !== null ? Number(data.maxAmount) : null;}
    const record = await this.database.approvalMatrix.update(id, updateData as any);

    if (userId) {
      await this.audit.log({ userId, event: 'approval_matrix_updated' as any, resource: 'approval_matrix', action: 'update', details: { id, changes: Object.keys(data) } });
    }
    return record;
  }

  async delete(id: string, userId?: string) {
    await this.findById(id);
    await this.database.approvalMatrix.softDelete(id);
    if (userId) {
      await this.audit.log({ userId, event: 'approval_matrix_deleted' as any, resource: 'approval_matrix', action: 'delete', details: { id } });
    }
    return { message: 'Approval matrix entry deleted' };
  }
}
