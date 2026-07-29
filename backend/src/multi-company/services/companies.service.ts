import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string): Promise<any> {
    const company = await this.database.companies.create({
      ...data,
      id: crypto.randomUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
    });

    await this.audit.log({
      userId,
      event: 'company.created',
      resource: 'companies',
      action: 'create',
      details: { companyId: company.id, code: data.code },
    });

    return company;
  }

  async findAll(params: { page: number; pageSize: number; search?: string }): Promise<{ data: any[]; total: number }> {
    const result = await this.database.companies.findAll(params);
    return result;
  }

  async findById(id: string): Promise<any> {
    return this.database.companies.findById(id);
  }

  async update(id: string, data: any, userId: string): Promise<any> {
    const updated = await this.database.companies.update(id, data);

    await this.audit.log({
      userId,
      event: 'company.updated',
      resource: 'companies',
      action: 'update',
      details: { companyId: id },
    });

    return updated;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.database.companies.softDelete(id);
    await this.audit.log({
      userId,
      event: 'company.deleted',
      resource: 'companies',
      action: 'delete',
      details: { companyId: id },
    });
  }

  async switchCompany(userId: string, companyId: string): Promise<void> {
    await this.audit.log({
      userId,
      event: 'company.switched',
      resource: 'companies',
      action: 'switch',
      details: { companyId },
    });
  }

  async getCompanyContext(_userId: string): Promise<{ data: any[]; total: number }> {
    return this.database.companies.findAll({ page: 1, pageSize: 100 });
  }
}
