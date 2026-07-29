import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const emp = await this.database.employees.create({ ...data, id: crypto.randomUUID(), status: 'active', createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'employee.created', resource: 'employees', action: 'create', details: { employeeId: emp.id, code: data.employeeCode } });
    return emp;
  }

  async findAll(params: { page: number; pageSize: number; search?: string; status?: string }) { return this.database.employees.findAll(params); }
  async findById(id: string) { return this.database.employees.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.employees.update(id, data);
    await this.audit.log({ userId, event: 'employee.updated', resource: 'employees', action: 'update', details: { employeeId: id } });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.employees.softDelete(id);
    await this.audit.log({ userId, event: 'employee.deleted', resource: 'employees', action: 'delete', details: { employeeId: id } });
  }
}
