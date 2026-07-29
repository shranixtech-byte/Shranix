import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ApiKeysService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const key = `sk_${crypto.randomUUID().replace(/-/g, '')}`;
    const item = await this.database.apiKeys.create({ ...data, id: crypto.randomUUID(), key, isActive: true, createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'api_key.created', resource: 'api_keys', action: 'create', details: { keyId: item.id } });
    return item;
  }
  async findAll(params: any) { return this.database.apiKeys.findAll(params); }
  async findById(id: string) { return this.database.apiKeys.findById(id); }
  async update(id: string, data: any, userId: string) {
    const u = await this.database.apiKeys.update(id, data);
    await this.audit.log({ userId, event: 'api_key.updated', resource: 'api_keys', action: 'update', details: { keyId: id } });
    return u;
  }
  async delete(id: string) { await this.database.apiKeys.softDelete(id); }
}
