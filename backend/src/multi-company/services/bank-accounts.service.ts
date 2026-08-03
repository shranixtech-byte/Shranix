import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

export interface BankAccountInput {
  companyId?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  accountType?: string;
  ifsc?: string;
  swiftCode?: string;
  upiId?: string;
  chequeFormat?: string;
  isDefault?: boolean;
  neftEnabled?: boolean;
  rtgsEnabled?: boolean;
  impsEnabled?: boolean;
  isActive?: boolean;
}

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findAll(companyId?: string): Promise<{ data: any[]; total: number }> {
    if (companyId) {
      const result = await this.database.bankAccounts.findAll({
        filters: [
          { field: 'companyId', operator: 'eq', value: companyId },
          { field: 'isDeleted', operator: 'eq', value: false },
        ],
        page: 1,
        pageSize: 100,
      });
      return result;
    }
    return this.database.bankAccounts.findAll({ page: 1, pageSize: 100 });
  }

  async findById(id: string): Promise<any> {
    return this.database.bankAccounts.findById(id);
  }

  async create(data: BankAccountInput, userId: string): Promise<any> {
    // Pehla account ho to auto-default (frontend par bhi hai, lekin API level par bhi robust)
    let isDefault = Boolean(data.isDefault);
    if (data.companyId && !isDefault) {
      const existing = await this.database.bankAccounts.findAll({
        filters: [
          { field: 'companyId', operator: 'eq', value: data.companyId },
          { field: 'isDeleted', operator: 'eq', value: false },
        ],
        page: 1,
        pageSize: 1,
      });
      if (existing.data.length === 0) {
        isDefault = true;
      }
    }

    // Agar ye default hai, to company ke baaki accounts ka default hatao
    if (isDefault && data.companyId) {
      await this.clearDefault(data.companyId);
    }

    const account = await this.database.bankAccounts.create({
      ...data,
      companyId: data.companyId || null,
      accountType: data.accountType || 'savings',
      chequeFormat: data.chequeFormat || 'standard',
      isDefault,
      neftEnabled: data.neftEnabled !== false,
      rtgsEnabled: data.rtgsEnabled !== false,
      impsEnabled: data.impsEnabled !== false,
      isActive: data.isActive !== false,
      createdBy: userId,
    });

    await this.audit.log({
      userId,
      event: 'bank_account.created',
      resource: 'bank_accounts',
      action: 'create',
      details: { bankAccountId: account.id, companyId: data.companyId },
    });

    return account;
  }

  async update(id: string, data: BankAccountInput, userId: string): Promise<any> {
    const existing = await this.database.bankAccounts.findById(id);
    if (!existing) {
      return null;
    }

    // Default toggle → pehle baaki ke clear karo
    if (data.isDefault && existing.companyId) {
      await this.clearDefault(existing.companyId, id);
    }
    // Default hata rahe ho to koi aur default nahi hai — sabse pehla account default bana do
    if (data.isDefault === false && existing.isDefault && existing.companyId) {
      const first = await this.firstAccount(existing.companyId, id);
      if (first) {
        await this.database.bankAccounts.update(first.id, { isDefault: true });
      }
    }

    const updated = await this.database.bankAccounts.update(id, {
      ...data,
      updatedBy: userId,
    });

    await this.audit.log({
      userId,
      event: 'bank_account.updated',
      resource: 'bank_accounts',
      action: 'update',
      details: { bankAccountId: id, companyId: existing.companyId },
    });

    return updated;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    const existing = await this.database.bankAccounts.findById(id);
    await this.database.bankAccounts.softDelete(id);
    // Deleted account default tha → kisi aur ko default banao
    if (existing?.isDefault && existing.companyId) {
      const first = await this.firstAccount(existing.companyId);
      if (first) {
        await this.database.bankAccounts.update(first.id, { isDefault: true });
      }
    }
    await this.audit.log({
      userId,
      event: 'bank_account.deleted',
      resource: 'bank_accounts',
      action: 'delete',
      details: { bankAccountId: id, companyId: existing?.companyId },
    });
  }

  async setDefault(id: string, companyId: string, userId: string): Promise<any> {
    await this.clearDefault(companyId, id);
    const updated = await this.database.bankAccounts.update(id, {
      isDefault: true,
      updatedBy: userId,
    });
    await this.audit.log({
      userId,
      event: 'bank_account.default_changed',
      resource: 'bank_accounts',
      action: 'update',
      details: { bankAccountId: id, companyId },
    });
    return updated;
  }

  private async clearDefault(companyId: string, exceptId?: string): Promise<void> {
    const { data } = await this.database.bankAccounts.findAll({
      filters: [
        { field: 'companyId', operator: 'eq', value: companyId },
        { field: 'isDefault', operator: 'eq', value: true },
        { field: 'isDeleted', operator: 'eq', value: false },
      ],
      page: 1,
      pageSize: 100,
    });
    for (const acc of data) {
      if (acc.id !== exceptId) {
        await this.database.bankAccounts.update(acc.id, { isDefault: false });
      }
    }
  }

  private async firstAccount(companyId: string, exceptId?: string): Promise<any> {
    const { data } = await this.database.bankAccounts.findAll({
      filters: [
        { field: 'companyId', operator: 'eq', value: companyId },
        { field: 'isDeleted', operator: 'eq', value: false },
      ],
      page: 1,
      pageSize: 100,
    });
    return data.find((a: any) => a.id !== exceptId) || null;
  }
}
