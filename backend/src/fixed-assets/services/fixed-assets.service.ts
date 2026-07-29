import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class FixedAssetsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const asset = await this.database.fixedAssets.create({
      ...data, id: crypto.randomUUID(), currentValue: data.purchaseCost || 0, accumulatedDepreciation: 0, status: 'active',
      createdAt: new Date().toISOString(),
    });
    await this.audit.log({ userId, event: 'asset.created', resource: 'fixed_assets', action: 'create', details: { assetId: asset.id, code: data.code } });
    return asset;
  }

  async findAll(params: { page: number; pageSize: number; search?: string }) { return this.database.fixedAssets.findAll(params); }
  async findById(id: string) { return this.database.fixedAssets.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.fixedAssets.update(id, data);
    await this.audit.log({ userId, event: 'asset.updated', resource: 'fixed_assets', action: 'update', details: { assetId: id } });
    return updated;
  }

  async softDelete(id: string, _userId: string) {
    await this.database.fixedAssets.softDelete(id);
    await this.audit.log({ userId: _userId, event: 'asset.deleted', resource: 'fixed_assets', action: 'delete', details: { assetId: id } });
  }

  async calculateDepreciation(assetId: string, period: string) {
    const asset = await this.database.fixedAssets.findById(assetId);
    if (!asset) {throw new NotFoundException('Asset not found');}

    let amount = 0;
    if (asset.depreciationMethod === 'straight_line' && asset.usefulLifeYears > 0) {
      amount = (asset.purchaseCost - asset.salvageValue) / (asset.usefulLifeYears * 12);
    } else if (asset.depreciationMethod === 'written_down_value') {
      amount = asset.currentValue * (asset.depreciationRate || 0.1) / 12;
    }

    const newAccumulated = (asset.accumulatedDepreciation || 0) + amount;
    const newValue = asset.purchaseCost - newAccumulated;

    await this.database.fixedAssets.update(assetId, {
      accumulatedDepreciation: newAccumulated,
      currentValue: Math.max(newValue, 0),
    });

    await this.database.assetDepreciation.create({
      id: crypto.randomUUID(), assetId, period, amount,
      bookValueBefore: asset.currentValue, bookValueAfter: Math.max(newValue, 0),
      isPosted: true, postedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    });

    return { assetId, period, amount, bookValueAfter: Math.max(newValue, 0) };
  }

  async transferAsset(assetId: string, toBranchId: string, _notes?: string, _userId?: string) {
    const asset = await this.database.fixedAssets.findById(assetId);
    if (!asset) {throw new NotFoundException('Asset not found');}

    await this.database.fixedAssets.update(assetId, { branchId: toBranchId, location: _notes });
    return { transferred: true, assetId, toBranchId };
  }

  async disposeAsset(assetId: string, disposalValue: number, _notes?: string, _userId?: string) {
    const asset = await this.database.fixedAssets.findById(assetId);
    if (!asset) {throw new NotFoundException('Asset not found');}

    await this.database.fixedAssets.update(assetId, {
      status: 'disposed', currentValue: disposalValue,
    });
    return { disposed: true, assetId, disposalValue };
  }

  async getDepreciationHistory(_assetId: string) {
    return this.database.assetDepreciation.findAll({ page: 1, pageSize: 100 });
  }
}
