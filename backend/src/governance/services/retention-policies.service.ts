import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class RetentionPoliciesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  async create(data: any, userId: string) {
    const policy = await this.database.dataRetentionPolicies.create({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    await this.audit.log({ userId, event: 'retention_policy.created', resource: 'data_retention_policies', action: 'create', details: { policyId: policy.id } });
    return policy;
  }

  async findAll(params: any) { return this.database.dataRetentionPolicies.findAll(params); }
  async findById(id: string) { return this.database.dataRetentionPolicies.findById(id); }

  async update(id: string, data: any, userId: string) {
    const updated = await this.database.dataRetentionPolicies.update(id, data);
    await this.audit.log({ userId, event: 'retention_policy.updated', resource: 'data_retention_policies', action: 'update', details: { policyId: id } });
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.database.dataRetentionPolicies.softDelete(id);
    await this.audit.log({ userId, event: 'retention_policy.deleted', resource: 'data_retention_policies', action: 'delete', details: { policyId: id } });
  }
}
