import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.departmentName) {
      throw new BadRequestException('departmentName is required');
    }
    // Duplicate name prevention
    const dup = await this.database.departments
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'departmentName', operator: 'eq', value: data.departmentName }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((dup.data || []).length > 0) {
      throw new BadRequestException(`Department "${data.departmentName}" already exists`);
    }
    const code =
      data.departmentCode || data.departmentName.toUpperCase().replace(/\s+/g, '_').slice(0, 20);
    const dept = await this.database.departments.create({
      ...data,
      departmentCode: code,
      status: data.status || 'active',
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'department.created',
      resource: 'hr',
      action: 'create',
      details: { departmentId: dept.id },
    });
    return dept;
  }

  async findAll(query: { page?: number; pageSize?: number; search?: string }) {
    return this.database.departments.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      ...(query.search
        ? { search: query.search, searchFields: ['departmentCode', 'departmentName'] }
        : {}),
    } as any);
  }

  async findById(id: string) {
    const dept = await this.database.departments.findById(id);
    if (!dept || dept.isDeleted) {
      throw new NotFoundException('Department not found');
    }
    return dept;
  }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.departments.update(id, data as any);
    await this.audit.log({
      userId,
      event: 'department.updated',
      resource: 'hr',
      action: 'update',
      details: { departmentId: id },
    });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.departments.softDelete(id);
    await this.audit.log({
      userId,
      event: 'department.deleted',
      resource: 'hr',
      action: 'delete',
      details: { departmentId: id },
    });
    return { deleted: true };
  }
}

@Injectable()
export class DesignationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.designationName) {
      throw new BadRequestException('designationName is required');
    }
    const code =
      data.designationCode || data.designationName.toUpperCase().replace(/\s+/g, '_').slice(0, 20);
    const d = await this.database.designations.create({
      ...data,
      designationCode: code,
      status: data.status || 'active',
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'designation.created',
      resource: 'hr',
      action: 'create',
      details: { designationId: d.id },
    });
    return d;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    departmentId?: string;
  }) {
    const filters: any[] = [];
    if (query.departmentId) {
      filters.push({ field: 'departmentId', operator: 'eq', value: query.departmentId });
    }
    return this.database.designations.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      ...(query.search
        ? { search: query.search, searchFields: ['designationCode', 'designationName'] }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async findById(id: string) {
    const d = await this.database.designations.findById(id);
    if (!d || d.isDeleted) {
      throw new NotFoundException('Designation not found');
    }
    return d;
  }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.designations.update(id, data as any);
    await this.audit.log({
      userId,
      event: 'designation.updated',
      resource: 'hr',
      action: 'update',
      details: { designationId: id },
    });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.designations.softDelete(id);
    await this.audit.log({
      userId,
      event: 'designation.deleted',
      resource: 'hr',
      action: 'delete',
      details: { designationId: id },
    });
    return { deleted: true };
  }
}

@Injectable()
export class ShiftsService {
  constructor(private readonly database: DatabaseService) {}

  async create(data: any) {
    if (!data.shiftName || !data.startTime || !data.endTime) {
      throw new BadRequestException('shiftName, startTime and endTime are required');
    }
    return this.database.shifts.create({ ...data, isActive: data.isActive !== false } as any);
  }

  async findAll(query: { page?: number; pageSize?: number }) {
    return this.database.shifts.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
    } as any);
  }

  async update(id: string, data: any) {
    return this.database.shifts.update(id, data as any);
  }

  async softDelete(id: string) {
    await this.database.shifts.softDelete(id);
    return { deleted: true };
  }
}

@Injectable()
export class HolidaysService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.holidayName || !data.holidayDate) {
      throw new BadRequestException('holidayName and holidayDate are required');
    }
    const dup = await this.database.holidays
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'holidayDate', operator: 'eq', value: data.holidayDate }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((dup.data || []).length > 0) {
      throw new BadRequestException(`Holiday already exists for ${data.holidayDate}`);
    }
    const h = await this.database.holidays.create({
      ...data,
      holidayType: data.holidayType || 'festival',
    } as any);
    await this.audit.log({
      userId,
      event: 'holiday.created',
      resource: 'hr',
      action: 'create',
      details: { holidayId: h.id },
    });
    return h;
  }

  async findAll(query: { page?: number; pageSize?: number; year?: string }) {
    const filters: any[] = [];
    if (query.year) {
      filters.push({ field: 'holidayDate', operator: 'gte', value: `${query.year}-01-01` });
      filters.push({ field: 'holidayDate', operator: 'lte', value: `${query.year}-12-31` });
    }
    return this.database.holidays.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 100,
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async softDelete(id: string, userId: string) {
    await this.database.holidays.softDelete(id);
    await this.audit.log({
      userId,
      event: 'holiday.deleted',
      resource: 'hr',
      action: 'delete',
      details: { holidayId: id },
    });
    return { deleted: true };
  }
}
