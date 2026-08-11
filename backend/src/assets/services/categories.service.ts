import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AssetCategoriesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.categoryName) {
      throw new BadRequestException('categoryName is required');
    }
    const existing = await this.database.assetCategories
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'categoryName', operator: 'eq', value: data.categoryName }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException(`Asset category "${data.categoryName}" already exists`);
    }
    const cat = await this.database.assetCategories.create({ ...data, createdBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'asset.category_created',
      resource: 'asset',
      action: 'create',
      details: { categoryId: cat.id },
    });
    return cat;
  }

  async findAll() {
    const res = await this.database.assetCategories
      .findAll({ page: 1, pageSize: 500 } as any)
      .catch(() => ({ data: [] }));
    return res.data || [];
  }

  async update(id: string, data: any, userId: string) {
    const cat = await this.database.assetCategories.findById(id);
    if (!cat || cat.isDeleted) {
      throw new NotFoundException('Asset category not found');
    }
    await this.database.assetCategories.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'asset.category_updated',
      resource: 'asset',
      action: 'update',
      details: { categoryId: id },
    });
    return { updated: true, id };
  }

  async softDelete(id: string, userId: string) {
    const cat = await this.database.assetCategories.findById(id);
    if (!cat || cat.isDeleted) {
      throw new NotFoundException('Asset category not found');
    }
    const inUse = await this.database.assets
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'categoryId', operator: 'eq', value: id }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((inUse.data || []).length > 0) {
      throw new BadRequestException('Category cannot be deleted — assets exist in this category');
    }
    await this.database.assetCategories.softDelete(id);
    await this.audit.log({
      userId,
      event: 'asset.category_deleted',
      resource: 'asset',
      action: 'delete',
      details: { categoryId: id },
    });
    return { deleted: true };
  }
}
