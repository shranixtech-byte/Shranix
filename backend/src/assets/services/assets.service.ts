import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueConstraintError } from '@shranix/database';

import { GlPostingEngine } from '../../automation/gl-posting.engine';
import { AuditService } from '../../common/services/audit.service';
import { CommunicationService } from '../../communication/communication.service';
import { DatabaseService } from '../../database/database.service';

const ASSET_STATUSES = ['available', 'assigned', 'under_maintenance', 'disposed'];
const CONDITIONS = ['new', 'good', 'fair', 'damaged', 'under_repair', 'unserviceable', 'disposed'];

@Injectable()
export class AssetsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly glPosting?: GlPostingEngine,
    private readonly communication?: CommunicationService,
  ) {}

  /** Next sequential asset code — AST-000001, AST-000002 …
   * Uses maxFieldValue() which scans ALL rows — including soft-deleted —
   * because the unique index on assetCode prevents code reuse after soft-delete. */
  async nextAssetCode(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.assets.maxFieldValue('assetCode');
      if (maxVal) {
        const m = /AST-(\d+)/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `AST-${String(max + 1).padStart(6, '0')}`;
  }

  async create(data: any, userId: string) {
    if (!data.assetName) {
      throw new BadRequestException('assetName is required');
    }
    // Race-safety: auto-code is read-then-write → retry on duplicate.
    let attempts = 0;
    while (attempts < 5) {
      try {
        return await this.createOnce(data, userId);
      } catch (err: any) {
        const isDuplicate =
          isUniqueConstraintError(err) || /asset_code|assetCode/i.test(String(err?.message || ''));
        if (!isDuplicate || attempts >= 4) {
          throw err;
        }
        attempts += 1;
      }
    }
    throw new BadRequestException('Could not allocate a unique asset code');
  }

  private async createOnce(data: any, userId: string) {
    const assetCode = data.assetCode || (await this.nextAssetCode());
    const purchaseCost = Number(data.purchaseCost) || 0;
    const additionalCost = Number(data.additionalCost) || 0;
    const capitalizedCost =
      data.capitalizedCost !== undefined
        ? Number(data.capitalizedCost)
        : purchaseCost + additionalCost;
    const clean = {
      ...data,
      id: undefined,
      assetCode,
      purchaseCost,
      additionalCost,
      capitalizedCost,
      currentBookValue: capitalizedCost,
      accumulatedDepreciation: 0,
      salvageValue: Number(data.salvageValue) || 0,
      depreciationMethod: data.depreciationMethod || 'straight_line',
      status: data.status || 'available',
      condition: data.condition || 'good',
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    const asset = await this.database.assets.create(clean as any);

    // Condition history entry on create
    await this.database.assetConditionHistory
      .create({
        assetId: asset.id,
        condition: clean.condition,
        changedAt: new Date().toISOString(),
        remarks: 'Asset created',
        changedBy: userId,
      } as any)
      .catch(() => undefined);

    await this.audit.log({
      userId,
      event: 'asset.created',
      resource: 'asset',
      action: 'create',
      details: { assetId: asset.id, assetCode, cost: capitalizedCost },
    });
    return asset;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    categoryId?: string;
    employeeId?: string;
    departmentId?: string;
  }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: query.categoryId });
    }
    if (query.employeeId) {
      filters.push({ field: 'assignedEmployeeId', operator: 'eq', value: query.employeeId });
    }
    if (query.departmentId) {
      filters.push({ field: 'departmentId', operator: 'eq', value: query.departmentId });
    }
    const result = await this.database.assets.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      ...(query.search
        ? {
            search: query.search,
            searchFields: ['assetCode', 'assetName', 'serialNumber', 'barcode', 'brand', 'model'],
          }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);

    // Resolve category / supplier / employee names
    const rows = result.data || [];
    const catIds = [...new Set(rows.map((r: any) => r.categoryId).filter(Boolean))];
    const supIds = [...new Set(rows.map((r: any) => r.supplierId).filter(Boolean))];
    const empIds = [...new Set(rows.map((r: any) => r.assignedEmployeeId).filter(Boolean))];
    const [cats, sups, emps] = await Promise.all([
      catIds.length
        ? this.database.assetCategories
            .findAll({
              page: 1,
              pageSize: 500,
              filters: [{ field: 'id', operator: 'in', value: catIds.join(',') }],
            } as any)
            .catch(() => ({ data: [] }))
        : { data: [] },
      supIds.length
        ? this.database.suppliers
            .findAll({
              page: 1,
              pageSize: 500,
              filters: [{ field: 'id', operator: 'in', value: supIds.join(',') }],
            } as any)
            .catch(() => ({ data: [] }))
        : { data: [] },
      empIds.length
        ? this.database.employees
            .findAll({
              page: 1,
              pageSize: 500,
              filters: [{ field: 'id', operator: 'in', value: empIds.join(',') }],
            } as any)
            .catch(() => ({ data: [] }))
        : { data: [] },
    ]);
    const catMap = new Map((cats.data || []).map((c: any) => [c.id, c.categoryName]));
    const supMap = new Map((sups.data || []).map((s: any) => [s.id, s.supplierName || s.name]));
    const empMap = new Map(
      (emps.data || []).map((e: any) => [e.id, `${e.firstName} ${e.lastName || ''}`.trim()]),
    );

    return {
      ...result,
      data: rows.map((r: any) => ({
        ...r,
        categoryName: catMap.get(r.categoryId) || null,
        supplierName: supMap.get(r.supplierId) || null,
        assignedEmployeeName: empMap.get(r.assignedEmployeeId) || null,
      })),
    };
  }

  async findById(id: string) {
    const asset = await this.database.assets.findById(id);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    const [history, allocations, maintenance, depreciation, transfers, disposals] =
      await Promise.all([
        this.database.assetConditionHistory
          .findAll({
            page: 1,
            pageSize: 100,
            filters: [{ field: 'assetId', operator: 'eq', value: id }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.assetAllocations
          .findAll({
            page: 1,
            pageSize: 100,
            filters: [{ field: 'assetId', operator: 'eq', value: id }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.assetMaintenance
          .findAll({
            page: 1,
            pageSize: 100,
            filters: [{ field: 'assetId', operator: 'eq', value: id }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.assetDepreciation
          .findAll({
            page: 1,
            pageSize: 500,
            filters: [{ field: 'assetId', operator: 'eq', value: id }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.assetTransfers
          .findAll({
            page: 1,
            pageSize: 100,
            filters: [{ field: 'assetId', operator: 'eq', value: id }],
          } as any)
          .catch(() => ({ data: [] })),
        this.database.assetDisposals
          .findAll({
            page: 1,
            pageSize: 50,
            filters: [{ field: 'assetId', operator: 'eq', value: id }],
          } as any)
          .catch(() => ({ data: [] })),
      ]);
    return {
      ...asset,
      history: history.data || [],
      allocations: allocations.data || [],
      maintenance: maintenance.data || [],
      depreciation: (depreciation.data || []).sort((a: any, b: any) =>
        String(b.period).localeCompare(String(a.period)),
      ),
      transfers: transfers.data || [],
      disposals: disposals.data || [],
    };
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.assets.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    if (existing.status === 'disposed' && data.status !== 'disposed') {
      throw new BadRequestException('Disposed assets cannot be reactivated');
    }
    // Condition change → history
    if (data.condition && data.condition !== existing.condition) {
      if (!CONDITIONS.includes(data.condition)) {
        throw new BadRequestException(`Invalid condition: ${data.condition}`);
      }
      await this.database.assetConditionHistory
        .create({
          assetId: id,
          condition: data.condition,
          changedAt: new Date().toISOString(),
          remarks: data.conditionRemarks || 'Condition updated',
          changedBy: userId,
        } as any)
        .catch(() => undefined);
    }
    if (data.status && !ASSET_STATUSES.includes(data.status)) {
      throw new BadRequestException(`Invalid status: ${data.status}`);
    }
    const updated = await this.database.assets.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'asset.updated',
      resource: 'asset',
      action: 'update',
      details: { assetId: id },
    });
    return updated;
  }

  // ── Allocation ─────────────────────────────────────────
  async assign(
    id: string,
    data: {
      assignedToType: string;
      assignedToId: string;
      assignmentDate?: string;
      expectedReturnDate?: string;
      remarks?: string;
    },
    userId: string,
  ) {
    const asset = await this.database.assets.findById(id);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.status === 'disposed') {
      throw new BadRequestException('Disposed assets cannot be assigned');
    }
    if (!data.assignedToType || !data.assignedToId) {
      throw new BadRequestException('assignedToType and assignedToId are required');
    }
    const allocation = await this.database.assetAllocations.create({
      assetId: id,
      assignedToType: data.assignedToType,
      assignedToId: data.assignedToId,
      assignmentDate: data.assignmentDate || new Date().toISOString().slice(0, 10),
      expectedReturnDate: data.expectedReturnDate || null,
      remarks: data.remarks || null,
      status: 'assigned',
      assignedBy: userId,
    } as any);
    const updates: any = { status: 'assigned', updatedBy: userId };
    if (data.assignedToType === 'employee') {
      updates.assignedEmployeeId = data.assignedToId;
    } else if (data.assignedToType === 'department') {
      updates.departmentId = data.assignedToId;
    } else if (data.assignedToType === 'location') {
      updates.location = data.assignedToId;
    }
    await this.database.assets.update(id, updates);
    await this.audit.log({
      userId,
      event: 'asset.assigned',
      resource: 'asset',
      action: 'assign',
      details: {
        assetId: id,
        assignedToType: data.assignedToType,
        assignedToId: data.assignedToId,
      },
    });
    return allocation;
  }

  async returnAsset(id: string, allocationId: string, userId: string) {
    const allocation = await this.database.assetAllocations.findById(allocationId);
    if (!allocation || allocation.assetId !== id) {
      throw new NotFoundException('Allocation not found');
    }
    if (allocation.status === 'returned') {
      throw new BadRequestException('Asset already returned');
    }
    await this.database.assetAllocations.update(allocationId, {
      status: 'returned',
      returnedAt: new Date().toISOString(),
    } as any);
    // Clear assignment if this is the active one
    const asset = await this.database.assets.findById(id);
    if (asset) {
      const updates: any = { updatedBy: userId };
      if (
        allocation.assignedToType === 'employee' &&
        asset.assignedEmployeeId === allocation.assignedToId
      ) {
        updates.assignedEmployeeId = null;
        updates.status = 'available';
      }
      if (
        allocation.assignedToType === 'department' &&
        asset.departmentId === allocation.assignedToId
      ) {
        updates.departmentId = null;
        updates.status = 'available';
      }
      await this.database.assets.update(id, updates);
    }
    await this.audit.log({
      userId,
      event: 'asset.returned',
      resource: 'asset',
      action: 'return',
      details: { assetId: id, allocationId },
    });
    return { returned: true, allocationId };
  }

  // ── Transfer ───────────────────────────────────────────
  async nextTransferNumber(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.assetTransfers.maxFieldValue('transferNumber');
      if (maxVal) {
        const m = /TRF-(\d+)/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `TRF-${String(max + 1).padStart(6, '0')}`;
  }

  async createTransfer(
    id: string,
    data: { toType: string; toId: string; transferDate?: string; reason?: string },
    userId: string,
  ) {
    const asset = await this.database.assets.findById(id);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    if (!data.toType || !data.toId) {
      throw new BadRequestException('toType and toId are required');
    }
    const transfer = await this.database.assetTransfers.create({
      transferNumber: await this.nextTransferNumber(),
      assetId: id,
      transferDate: data.transferDate || new Date().toISOString().slice(0, 10),
      fromType: asset.assignedEmployeeId ? 'employee' : asset.departmentId ? 'department' : null,
      fromId: asset.assignedEmployeeId || asset.departmentId || null,
      toType: data.toType,
      toId: data.toId,
      reason: data.reason || null,
      status: 'pending',
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'asset.transfer_requested',
      resource: 'asset',
      action: 'transfer',
      details: { assetId: id, transferId: transfer.id },
    });
    return transfer;
  }

  async approveTransfer(transferId: string, userId: string) {
    const transfer = await this.database.assetTransfers.findById(transferId);
    if (!transfer || transfer.isDeleted) {
      throw new NotFoundException('Transfer not found');
    }
    if (transfer.status !== 'pending') {
      throw new BadRequestException(`Transfer already ${transfer.status}`);
    }
    await this.database.assetTransfers.update(transferId, {
      status: 'completed',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
    } as any);
    // Apply the destination on the asset
    const updates: any = { updatedBy: userId };
    if (transfer.toType === 'employee') {
      updates.assignedEmployeeId = transfer.toId;
      updates.status = 'assigned';
    } else if (transfer.toType === 'department') {
      updates.departmentId = transfer.toId;
      updates.status = 'assigned';
    } else if (transfer.toType === 'location') {
      updates.location = transfer.toId;
    } else if (transfer.toType === 'warehouse' || transfer.toType === 'branch') {
      updates.branchId = transfer.toId;
    }
    await this.database.assets.update(transfer.assetId, updates);
    await this.audit.log({
      userId,
      event: 'asset.transferred',
      resource: 'asset',
      action: 'transfer',
      details: { assetId: transfer.assetId, transferId },
    });
    return { transferred: true, transferId };
  }

  async cancelTransfer(transferId: string, userId: string) {
    const transfer = await this.database.assetTransfers.findById(transferId);
    if (!transfer || transfer.isDeleted) {
      throw new NotFoundException('Transfer not found');
    }
    if (transfer.status !== 'pending') {
      throw new BadRequestException(`Transfer already ${transfer.status}`);
    }
    await this.database.assetTransfers.update(transferId, { status: 'cancelled' } as any);
    await this.audit.log({
      userId,
      event: 'asset.transfer_cancelled',
      resource: 'asset',
      action: 'transfer',
      details: { transferId },
    });
    return { cancelled: true, transferId };
  }

  // ── Depreciation engine ────────────────────────────────
  async calculateDepreciation(assetId: string, period: string, userId?: string) {
    const asset = await this.database.assets.findById(assetId);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.status === 'disposed') {
      throw new BadRequestException('Depreciation stopped for disposed assets');
    }
    // Duplicate protection — one posting per asset+period
    const existing = await this.database.assetDepreciation
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'assetId', operator: 'eq', value: assetId },
          { field: 'period', operator: 'eq', value: period },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException(`Depreciation already posted for ${period}`);
    }

    const cost = Number(asset.capitalizedCost) || Number(asset.purchaseCost) || 0;
    const salvage = Number(asset.salvageValue) || 0;
    const accumulated = Number(asset.accumulatedDepreciation) || 0;
    const bookBefore = Math.max(0, cost - accumulated);

    let amount = 0;
    if (asset.depreciationMethod === 'straight_line' && Number(asset.usefulLifeYears) > 0) {
      amount = Math.round(((cost - salvage) / (Number(asset.usefulLifeYears) * 12)) * 100) / 100;
    } else if (asset.depreciationMethod === 'written_down_value') {
      amount =
        Math.round(((bookBefore * (Number(asset.depreciationRate) || 0.1)) / 12) * 100) / 100;
    }
    // Never depreciate below salvage value
    if (amount > 0) {
      amount = Math.min(amount, Math.max(0, bookBefore - salvage));
    }
    amount = Math.round(amount * 100) / 100;
    // At/below salvage — nothing to post (don't create a pointless zero row)
    if (amount <= 0) {
      return {
        assetId,
        period,
        amount: 0,
        bookValueAfter: bookBefore,
        note: 'No depreciation — book value at/below salvage',
      };
    }

    const newAccumulated = Math.round((accumulated + amount) * 100) / 100;
    const bookAfter = Math.max(0, cost - newAccumulated);

    // GL posting: Dr Depreciation Expense / Cr Accumulated Depreciation
    // Look up real account IDs from Chart of Accounts (hardcoded strings
    // like 'DEPRECIATION_EXPENSE' are not valid UUIDs and always fail
    // validation in GlPostingEngine).
    let glEntryId: string | null = null;
    let glPosted = false;
    if (this.glPosting && amount > 0) {
      const accountsRes = await this.database.chartOfAccounts
        .findAll({ page: 1, pageSize: 500 } as any)
        .catch(() => ({ data: [] }));
      const accounts = accountsRes?.data || [];
      const findAccount = (patterns: string[]): string | null => {
        for (const pattern of patterns) {
          const match = accounts.find(
            (a: any) =>
              (a.accountName || '').toLowerCase().includes(pattern.toLowerCase()) ||
              (a.accountCode || '').toLowerCase().includes(pattern.toLowerCase()),
          );
          if (match) {
            return match.id;
          }
        }
        return null;
      };
      const depExpAccountId = findAccount(['depreciation expense', 'depreciation']);
      const accDepAccountId = findAccount(['accumulated depreciation', 'acc. dep']);

      if (depExpAccountId && accDepAccountId) {
        const result = await this.glPosting.postEntries(
          [
            {
              entryDate: period ? `${period}-01` : new Date().toISOString().slice(0, 10),
              accountId: depExpAccountId,
              voucherId: `DEP-${asset.assetCode}-${period}`,
              voucherType: 'DEPRECIATION',
              voucherNumber: `${asset.assetCode}-${period}`,
              debit: amount,
              credit: 0,
              narration: `Depreciation for ${asset.assetName} (${period})`,
            },
            {
              entryDate: period ? `${period}-01` : new Date().toISOString().slice(0, 10),
              accountId: accDepAccountId,
              voucherId: `DEP-${asset.assetCode}-${period}`,
              voucherType: 'DEPRECIATION',
              voucherNumber: `${asset.assetCode}-${period}`,
              debit: 0,
              credit: amount,
              narration: `Depreciation for ${asset.assetName} (${period})`,
            },
          ],
          { userId },
        );
        if (result.success) {
          glEntryId = result.entries?.[0]?.entryNumber || null;
          glPosted = true;
        }
      }
    }

    await this.database.assetDepreciation.create({
      assetId,
      period,
      amount,
      bookValueBefore: bookBefore,
      bookValueAfter: bookAfter,
      isPosted: glPosted,
      postedAt: glPosted ? new Date().toISOString() : null,
      glEntryId,
    } as any);
    await this.database.assets.update(assetId, {
      accumulatedDepreciation: newAccumulated,
      currentBookValue: bookAfter,
      updatedBy: userId || null,
    } as any);
    await this.audit.log({
      userId: userId || 'system',
      event: 'asset.depreciation_posted',
      resource: 'asset',
      action: 'depreciate',
      details: { assetId, period, amount, bookValueAfter: bookAfter },
    });
    return { assetId, period, amount, bookValueAfter: bookAfter, glEntryId };
  }

  // ── Disposal ───────────────────────────────────────────
  async nextDisposalNumber(): Promise<string> {
    let max = 0;
    try {
      const maxVal = await this.database.assetDisposals.maxFieldValue('disposalNumber');
      if (maxVal) {
        const m = /DSP-(\d+)/.exec(String(maxVal));
        if (m) {
          max = Number(m[1]);
        }
      }
    } catch {
      /* best-effort */
    }
    return `DSP-${String(max + 1).padStart(6, '0')}`;
  }

  async dispose(
    id: string,
    data: {
      disposalType?: string;
      disposalDate?: string;
      reason?: string;
      saleValue?: number;
      disposalCost?: number;
    },
    userId: string,
  ) {
    const asset = await this.database.assets.findById(id);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.status === 'disposed') {
      throw new BadRequestException('Asset already disposed');
    }
    const saleValue = Number(data.saleValue) || 0;
    const disposalCost = Number(data.disposalCost) || 0;
    const bookValue = Number(asset.currentBookValue) || 0;
    const cost = Number(asset.capitalizedCost) || Number(asset.purchaseCost) || 0;
    const netProceeds = Math.round((saleValue - disposalCost) * 100) / 100;
    const gainLoss = Math.round((netProceeds - bookValue) * 100) / 100;

    // GL — balanced: Dr Cash/Bank (net proceeds) + Dr Acc. Depreciation + Dr Loss/Cr Gain
    // against Cr Fixed Assets (capitalized cost). Verified: debits always equal credits.
    // Look up real account IDs from Chart of Accounts (hardcoded strings like
    // 'CASH', 'FIXED_ASSETS' are not valid UUIDs and always fail validation).
    let glEntryId: string | null = null;
    if (this.glPosting) {
      const accumulated = Number(asset.accumulatedDepreciation) || 0;
      const accountsRes = await this.database.chartOfAccounts
        .findAll({ page: 1, pageSize: 500 } as any)
        .catch(() => ({ data: [] }));
      const accounts = accountsRes?.data || [];
      const findAccount = (patterns: string[]): string | null => {
        for (const pattern of patterns) {
          const match = accounts.find(
            (a: any) =>
              (a.accountName || '').toLowerCase().includes(pattern.toLowerCase()) ||
              (a.accountCode || '').toLowerCase().includes(pattern.toLowerCase()),
          );
          if (match) {
            return match.id;
          }
        }
        return null;
      };

      const cashAccountId = findAccount(['cash']);
      const accDepAccountId = findAccount(['accumulated depreciation', 'acc. dep']);
      const fixedAssetAccountId = findAccount(['fixed asset', 'asset account', 'property plant']);
      const gainAccountId = findAccount(['gain on disposal', 'profit on disposal']);
      const lossAccountId = findAccount(['loss on disposal', 'profit on disposal']);

      // Only post if the critical accounts exist
      if (cashAccountId && accDepAccountId && fixedAssetAccountId) {
        const entries: any[] = [
          {
            entryDate: data.disposalDate || new Date().toISOString().slice(0, 10),
            accountId: cashAccountId,
            voucherId: `DSP-${asset.assetCode}`,
            voucherType: 'ASSET_DISPOSAL',
            voucherNumber: asset.assetCode,
            debit: Math.max(netProceeds, 0),
            credit: netProceeds < 0 ? Math.abs(netProceeds) : 0,
            narration: `Disposal proceeds (net of costs) for ${asset.assetName}`,
          },
          {
            entryDate: data.disposalDate || new Date().toISOString().slice(0, 10),
            accountId: accDepAccountId,
            voucherId: `DSP-${asset.assetCode}`,
            voucherType: 'ASSET_DISPOSAL',
            voucherNumber: asset.assetCode,
            debit: accumulated,
            credit: 0,
            narration: `Accumulated depreciation written off for ${asset.assetName}`,
          },
          {
            entryDate: data.disposalDate || new Date().toISOString().slice(0, 10),
            accountId: fixedAssetAccountId,
            voucherId: `DSP-${asset.assetCode}`,
            voucherType: 'ASSET_DISPOSAL',
            voucherNumber: asset.assetCode,
            debit: 0,
            credit: cost,
            narration: `Asset cost removed for ${asset.assetName}`,
          },
        ];
        if (gainLoss > 0 && gainAccountId) {
          entries.push({
            entryDate: data.disposalDate || new Date().toISOString().slice(0, 10),
            accountId: gainAccountId,
            voucherId: `DSP-${asset.assetCode}`,
            voucherType: 'ASSET_DISPOSAL',
            voucherNumber: asset.assetCode,
            debit: 0,
            credit: gainLoss,
            narration: `Gain on disposal of ${asset.assetName}`,
          });
        } else if (gainLoss < 0 && lossAccountId) {
          entries.push({
            entryDate: data.disposalDate || new Date().toISOString().slice(0, 10),
            accountId: lossAccountId,
            voucherId: `DSP-${asset.assetCode}`,
            voucherType: 'ASSET_DISPOSAL',
            voucherNumber: asset.assetCode,
            debit: Math.abs(gainLoss),
            credit: 0,
            narration: `Loss on disposal of ${asset.assetName}`,
          });
        }
        const result = await this.glPosting.postEntries(entries, { userId });
        if (result.success) {
          glEntryId = result.entries?.[0]?.entryNumber || null;
        }
      }
    }

    const disposal = await this.database.assetDisposals.create({
      disposalNumber: await this.nextDisposalNumber(),
      assetId: id,
      disposalDate: data.disposalDate || new Date().toISOString().slice(0, 10),
      reason: data.reason || null,
      disposalType: data.disposalType || 'sale',
      saleValue,
      disposalCost,
      bookValue,
      gainLoss,
      status: 'completed',
      approvedBy: userId,
      approvalDate: new Date().toISOString(),
      glEntryId,
      createdBy: userId,
    } as any);

    await this.database.assets.update(id, {
      status: 'disposed',
      condition: 'disposed',
      currentBookValue: 0,
      updatedBy: userId,
    } as any);
    await this.database.assetConditionHistory
      .create({
        assetId: id,
        condition: 'disposed',
        changedAt: new Date().toISOString(),
        remarks: `Disposed (${disposal.disposalType}) — ${data.reason || 'no reason'}`,
        changedBy: userId,
      } as any)
      .catch(() => undefined);

    await this.audit.log({
      userId,
      event: 'asset.disposed',
      resource: 'asset',
      action: 'dispose',
      details: { assetId: id, disposalId: disposal.id, saleValue, bookValue, gainLoss },
    });

    // Notification
    if (this.communication) {
      this.communication
        .send({
          channel: 'in_app',
          to: userId,
          recipientType: 'user',
          recipientId: userId,
          subject: `Asset disposed`,
          message: `${asset.assetName} (${asset.assetCode}) disposed — gain/loss ₹${gainLoss}`,
          referenceType: 'asset',
          referenceId: id,
          referenceNumber: asset.assetCode,
          userId,
          skipPreference: true,
        })
        .catch(() => undefined);
    }
    return disposal;
  }

  async softDelete(id: string, userId: string) {
    const asset = await this.database.assets.findById(id);
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found');
    }
    await this.database.assets.softDelete(id);
    await this.audit.log({
      userId,
      event: 'asset.deleted',
      resource: 'asset',
      action: 'delete',
      details: { assetId: id },
    });
    return { deleted: true };
  }

  // ── Dashboard + reports ────────────────────────────────
  async dashboard() {
    const all = await this.database.assets
      .findAll({ page: 1, pageSize: 5000 } as any)
      .catch(() => ({ data: [] }));
    const rows = (all.data || []).filter((a: any) => !a.isDeleted);
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

    const [maintenance, disposals, cats] = await Promise.all([
      this.database.assetMaintenance
        .findAll({ page: 1, pageSize: 1000 } as any)
        .catch(() => ({ data: [] })),
      this.database.assetDisposals
        .findAll({ page: 1, pageSize: 1000 } as any)
        .catch(() => ({ data: [] })),
      this.database.assetCategories
        .findAll({ page: 1, pageSize: 200 } as any)
        .catch(() => ({ data: [] })),
    ]);

    const totalCost = rows.reduce(
      (s: number, a: any) => s + (Number(a.capitalizedCost) || Number(a.purchaseCost) || 0),
      0,
    );
    const accumulated = rows.reduce(
      (s: number, a: any) => s + (Number(a.accumulatedDepreciation) || 0),
      0,
    );
    const netValue = Math.round((totalCost - accumulated) * 100) / 100;
    const maintenanceCost = (maintenance.data || []).reduce(
      (s: number, m: any) => s + (Number(m.totalCost) || 0),
      0,
    );

    const catMap = new Map((cats.data || []).map((c: any) => [c.id, c.categoryName]));
    const byCat: Record<string, number> = {};
    const byCatValue: Record<string, number> = {};
    for (const a of rows) {
      const name = catMap.get(a.categoryId) || 'Uncategorized';
      byCat[name] = (byCat[name] || 0) + 1;
      byCatValue[name] =
        (byCatValue[name] || 0) + (Number(a.capitalizedCost) || Number(a.purchaseCost) || 0);
    }

    const upcomingServices = (maintenance.data || [])
      .filter(
        (m: any) => m.status === 'scheduled' && m.nextServiceDate && m.nextServiceDate <= in30,
      )
      .sort((a: any, b: any) => String(a.nextServiceDate).localeCompare(String(b.nextServiceDate)))
      .slice(0, 8);
    const expiredWarranty = rows.filter((a: any) => a.warrantyEnd && a.warrantyEnd < today).length;
    const expiringWarranty = rows.filter(
      (a: any) => a.warrantyEnd && a.warrantyEnd >= today && a.warrantyEnd <= in30,
    ).length;
    const insuranceExpiring = rows.filter(
      (a: any) => a.insuranceExpiry && a.insuranceExpiry >= today && a.insuranceExpiry <= in30,
    ).length;

    return {
      totalAssets: rows.length,
      activeAssets: rows.filter((a: any) => a.status === 'available' || a.status === 'assigned')
        .length,
      underMaintenance: rows.filter((a: any) => a.status === 'under_maintenance').length,
      assignedAssets: rows.filter((a: any) => a.status === 'assigned').length,
      availableAssets: rows.filter((a: any) => a.status === 'available').length,
      disposedAssets: rows.filter((a: any) => a.status === 'disposed').length,
      totalAssetCost: Math.round(totalCost * 100) / 100,
      accumulatedDepreciation: Math.round(accumulated * 100) / 100,
      netAssetValue: netValue,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      upcomingServices,
      expiredWarrantyAssets: expiredWarranty,
      expiringWarrantyAssets: expiringWarranty,
      insuranceExpiringAssets: insuranceExpiring,
      categoryDistribution: Object.entries(byCat).map(([name, count]) => ({ name, count })),
      categoryValueDistribution: Object.entries(byCatValue).map(([name, value]) => ({
        name,
        value,
      })),
      totalDisposals: (disposals.data || []).length,
      recentAssets: rows
        .sort((a: any, b: any) =>
          String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
        )
        .slice(0, 8)
        .map((a: any) => ({
          id: a.id,
          assetCode: a.assetCode,
          assetName: a.assetName,
          category: catMap.get(a.categoryId) || null,
          status: a.status,
          currentBookValue: a.currentBookValue,
        })),
    };
  }

  async reports(query: { status?: string; categoryId?: string; departmentId?: string }) {
    const filters: any[] = [];
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    if (query.categoryId) {
      filters.push({ field: 'categoryId', operator: 'eq', value: query.categoryId });
    }
    if (query.departmentId) {
      filters.push({ field: 'departmentId', operator: 'eq', value: query.departmentId });
    }
    const all = await this.database.assets
      .findAll({ page: 1, pageSize: 5000, ...(filters.length ? { filters } : {}) } as any)
      .catch(() => ({ data: [] }));
    const rows = (all.data || []).filter((a: any) => !a.isDeleted);
    const catIds = [...new Set(rows.map((r: any) => r.categoryId).filter(Boolean))];
    const cats = catIds.length
      ? await this.database.assetCategories
          .findAll({
            page: 1,
            pageSize: 200,
            filters: [{ field: 'id', operator: 'in', value: catIds.join(',') }],
          } as any)
          .catch(() => ({ data: [] }))
      : { data: [] };
    const catMap = new Map((cats.data || []).map((c: any) => [c.id, c.categoryName]));
    return {
      data: rows.map((a: any) => ({
        id: a.id,
        assetCode: a.assetCode,
        assetName: a.assetName,
        category: catMap.get(a.categoryId) || null,
        brand: a.brand,
        model: a.model,
        serialNumber: a.serialNumber,
        purchaseDate: a.purchaseDate,
        capitalizedCost: a.capitalizedCost,
        accumulatedDepreciation: a.accumulatedDepreciation,
        currentBookValue: a.currentBookValue,
        status: a.status,
        condition: a.condition,
      })),
      total: rows.length,
    };
  }
}
