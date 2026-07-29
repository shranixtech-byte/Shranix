import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AssetCategoriesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const cat = await this.database.assetCategories.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'asset_category.created', resource: 'asset_categories', action: 'create', details: { categoryId: cat.id } });
    return cat;
  }

  async findAll(params: any) { return this.database.assetCategories.findAll(params); }
  async findById(id: string) { return this.database.assetCategories.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.assetCategories.update(id, data);
    await this.audit.log({ userId, event: 'asset_category.updated', resource: 'asset_categories', action: 'update', details: { categoryId: id } });
    return updated;
  }

  async softDelete(id: string, userId: string) {
    await this.database.assetCategories.softDelete(id);
    await this.audit.log({ userId, event: 'asset_category.deleted', resource: 'asset_categories', action: 'delete', details: { categoryId: id } });
  }
}
