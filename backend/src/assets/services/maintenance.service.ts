import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

const MAINT_TYPES = ['preventive', 'breakdown', 'routine', 'repair', 'service', 'other'];
const MAINT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

@Injectable()
export class AssetMaintenanceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async nextMaintenanceNumber(): Promise<string> {
    const all = await this.database.assetMaintenance
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    let max = 0;
    for (const row of all.data || []) {
      const m = /MNT-(\d+)/.exec(String(row.maintenanceNumber || ''));
      if (m) {
        max = Math.max(max, Number(m[1]));
      }
    }
    return `MNT-${String(max + 1).padStart(6, '0')}`;
  }

  async create(data: any, userId: string) {
    if (!data.assetId) {
      throw new BadRequestException('assetId is required');
    }
    const asset = await this.database.assets.findById(data.assetId);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    if (data.maintenanceType && !MAINT_TYPES.includes(data.maintenanceType)) {
      throw new BadRequestException(`Invalid maintenance type: ${data.maintenanceType}`);
    }
    const partsCost = Number(data.partsCost) || 0;
    const laborCost = Number(data.laborCost) || 0;
    const otherCost = Number(data.otherCost) || 0;
    const totalCost = Math.round((partsCost + laborCost + otherCost) * 100) / 100;

    // Auto next-service date when frequency provided
    let nextServiceDate = data.nextServiceDate || null;
    if (!nextServiceDate && data.serviceFrequencyDays && data.serviceDate) {
      const d = new Date(data.serviceDate);
      d.setDate(d.getDate() + Number(data.serviceFrequencyDays));
      nextServiceDate = d.toISOString().slice(0, 10);
    }

    const maint = await this.database.assetMaintenance.create({
      maintenanceNumber: await this.nextMaintenanceNumber(),
      assetId: data.assetId,
      maintenanceType: data.maintenanceType || 'routine',
      serviceDate: data.serviceDate || new Date().toISOString().slice(0, 10),
      nextServiceDate,
      serviceFrequencyDays: data.serviceFrequencyDays || null,
      reminderDays: data.reminderDays ?? 7,
      vendor: data.vendor || null,
      description: data.description || null,
      partsCost,
      laborCost,
      otherCost,
      totalCost,
      warrantyCovered: data.warrantyCovered || false,
      status: data.status || 'scheduled',
      remarks: data.remarks || null,
      createdBy: userId,
    } as any);

    // If maintenance is in progress → asset under maintenance
    if (maint.status === 'in_progress' && asset.status !== 'disposed') {
      await this.database.assets.update(data.assetId, {
        status: 'under_maintenance',
        updatedBy: userId,
      } as any);
    }
    await this.audit.log({
      userId,
      event: 'asset.maintenance_created',
      resource: 'asset',
      action: 'maintenance',
      details: { assetId: data.assetId, maintenanceId: maint.id, totalCost },
    });
    return maint;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    assetId?: string;
    status?: string;
    type?: string;
  }) {
    const filters: any[] = [];
    if (query.assetId) {
      filters.push({ field: 'assetId', operator: 'eq', value: query.assetId });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.type) {
      filters.push({ field: 'maintenanceType', operator: 'eq', value: query.type });
    }
    const result = await this.database.assetMaintenance.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(filters.length ? { filters } : {}),
    } as any);
    const rows = result.data || [];
    const assetIds = [...new Set(rows.map((r: any) => r.assetId).filter(Boolean))];
    const assets = assetIds.length
      ? await this.database.assets
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'id', operator: 'in', value: assetIds.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const assetMap = new Map(
      (assets.data || []).map((a: any) => [
        a.id,
        { assetCode: a.assetCode, assetName: a.assetName },
      ]),
    );
    return {
      ...result,
      data: rows.map((r: any) => ({
        ...r,
        assetCode: assetMap.get(r.assetId)?.assetCode || null,
        assetName: assetMap.get(r.assetId)?.assetName || null,
      })),
    };
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.assetMaintenance.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Maintenance record not found');
    }
    if (data.status && !MAINT_STATUSES.includes(data.status)) {
      throw new BadRequestException(`Invalid status: ${data.status}`);
    }
    const updated = await this.database.assetMaintenance.update(id, {
      ...data,
      updatedBy: userId,
    } as any);

    // Completion → restore asset from maintenance, schedule next service if due
    if (data.status === 'completed' && existing.status !== 'completed') {
      const asset = await this.database.assets.findById(existing.assetId).catch(() => null);
      if (asset && asset.status === 'under_maintenance') {
        await this.database.assets.update(existing.assetId, {
          status: asset.assignedEmployeeId ? 'assigned' : 'available',
          condition: data.assetCondition || asset.condition,
          updatedBy: userId,
        } as any);
      }
    }
    await this.audit.log({
      userId,
      event: 'asset.maintenance_updated',
      resource: 'asset',
      action: 'maintenance',
      details: { maintenanceId: id },
    });
    return updated;
  }

  /** Service schedule report — upcoming / due / overdue services. */
  async serviceSchedule(query: { horizonDays?: number; status?: string }) {
    const horizon = Number(query.horizonDays) || 30;
    const today = new Date().toISOString().slice(0, 10);
    const horizonDate = new Date(Date.now() + horizon * 864e5).toISOString().slice(0, 10);
    const all = await this.database.assetMaintenance
      .findAll({ page: 1, pageSize: 2000 } as any)
      .catch(() => ({ data: [] }));
    let rows = (all.data || []).filter((m: any) => m.status === 'scheduled' && m.nextServiceDate);
    if (query.status === 'overdue') {
      rows = rows.filter((m: any) => m.nextServiceDate < today);
    } else if (query.status === 'due') {
      rows = rows.filter(
        (m: any) => m.nextServiceDate >= today && m.nextServiceDate <= horizonDate,
      );
    } else {
      rows = rows.filter((m: any) => m.nextServiceDate <= horizonDate);
    }
    rows.sort((a: any, b: any) =>
      String(a.nextServiceDate).localeCompare(String(b.nextServiceDate)),
    );

    const assetIds = [...new Set(rows.map((r: any) => r.assetId))];
    const assets = assetIds.length
      ? await this.database.assets
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'id', operator: 'in', value: assetIds.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const assetMap = new Map(
      (assets.data || []).map((a: any) => [
        a.id,
        { assetCode: a.assetCode, assetName: a.assetName },
      ]),
    );
    return {
      data: rows.map((r: any) => ({
        id: r.id,
        maintenanceNumber: r.maintenanceNumber,
        assetId: r.assetId,
        assetCode: assetMap.get(r.assetId)?.assetCode || null,
        assetName: assetMap.get(r.assetId)?.assetName || null,
        maintenanceType: r.maintenanceType,
        nextServiceDate: r.nextServiceDate,
        vendor: r.vendor,
        status: r.nextServiceDate < today ? 'overdue' : 'due',
        daysLeft: Math.round((new Date(r.nextServiceDate).getTime() - Date.now()) / 864e5),
      })),
      total: rows.length,
    };
  }

  async softDelete(id: string, userId: string) {
    await this.database.assetMaintenance.softDelete(id);
    await this.audit.log({
      userId,
      event: 'asset.maintenance_deleted',
      resource: 'asset',
      action: 'maintenance',
      details: { maintenanceId: id },
    });
    return { deleted: true };
  }
}
