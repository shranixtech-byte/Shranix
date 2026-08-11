import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

export interface TemplateVariable {
  name: string;
  label?: string;
  required?: boolean;
}

export const DEFAULT_TEMPLATES: Array<Record<string, any>> = [
  {
    templateCode: 'SALES_INVOICE_CREATED',
    templateName: 'Sales Invoice Created',
    channel: 'email',
    subject: 'Invoice {{invoice_number}} from {{company_name}}',
    body: 'Dear {{customer_name}},\n\nThank you for your business. Your invoice {{invoice_number}} dated {{invoice_date}} for {{invoice_total}} is now available.\n\nRegards,\n{{company_name}}',
    variables: JSON.stringify([
      { name: 'customer_name', label: 'Customer name', required: true },
      { name: 'invoice_number', label: 'Invoice number', required: true },
      { name: 'invoice_date', label: 'Invoice date' },
      { name: 'invoice_total', label: 'Invoice total' },
      { name: 'company_name', label: 'Company name' },
    ]),
    language: 'en',
    category: 'invoices',
  },
  {
    templateCode: 'PAYMENT_REMINDER',
    templateName: 'Payment Reminder',
    channel: 'email',
    subject: 'Payment reminder for invoice {{invoice_number}}',
    body: 'Dear {{customer_name}},\n\nThis is a reminder that invoice {{invoice_number}} for {{invoice_total}} is due on {{payment_due_date}}. Current outstanding: {{outstanding_amount}}.\n\nPlease arrange payment at your earliest convenience.\n\nRegards,\n{{company_name}}',
    variables: JSON.stringify([
      { name: 'customer_name', label: 'Customer name', required: true },
      { name: 'invoice_number', label: 'Invoice number', required: true },
      { name: 'invoice_total', label: 'Invoice total' },
      { name: 'payment_due_date', label: 'Due date' },
      { name: 'outstanding_amount', label: 'Outstanding amount' },
    ]),
    language: 'en',
    category: 'payments',
  },
  {
    templateCode: 'LOW_STOCK_ALERT',
    templateName: 'Low Stock Alert',
    channel: 'email',
    subject: 'Low stock alert: {{product_name}}',
    body: 'Stock level for {{product_name}} is {{stock_quantity}}, below the reorder level. Please reorder soon.\n\nRegards,\n{{company_name}}',
    variables: JSON.stringify([
      { name: 'product_name', label: 'Product name', required: true },
      { name: 'stock_quantity', label: 'Stock quantity', required: true },
    ]),
    language: 'en',
    category: 'reminders',
  },
  {
    templateCode: 'EXPIRY_ALERT',
    templateName: 'Expiry Alert',
    channel: 'email',
    subject: 'Near expiry: {{product_name}} ({{expiry_date}})',
    body: 'Batch of {{product_name}} expires on {{expiry_date}}. Current stock: {{stock_quantity}}.\n\nRegards,\n{{company_name}}',
    variables: JSON.stringify([
      { name: 'product_name', label: 'Product name', required: true },
      { name: 'expiry_date', label: 'Expiry date', required: true },
      { name: 'stock_quantity', label: 'Stock quantity' },
    ]),
    language: 'en',
    category: 'reminders',
  },
  {
    templateCode: 'CRM_FOLLOWUP_REMINDER',
    templateName: 'CRM Follow-up Reminder',
    channel: 'in_app',
    subject: 'Follow-up due',
    body: 'Follow-up with {{customer_name}} is due {{followup_date}}.',
    variables: JSON.stringify([
      { name: 'customer_name', label: 'Customer name', required: true },
      { name: 'followup_date', label: 'Follow-up date' },
    ]),
    language: 'en',
    category: 'crm',
  },
  {
    templateCode: 'WELCOME_CUSTOMER',
    templateName: 'Welcome Customer',
    channel: 'email',
    subject: 'Welcome to {{company_name}}!',
    body: 'Dear {{customer_name}},\n\nWelcome to {{company_name}}. We look forward to serving you.\n\nRegards,\n{{company_name}}',
    variables: JSON.stringify([{ name: 'customer_name', label: 'Customer name', required: true }]),
    language: 'en',
    category: 'system',
  },
];

@Injectable()
export class TemplateEngineService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { page?: number; pageSize?: number; channel?: string; search?: string } = {}) {
    const filters: any[] = [];
    if (query.channel) {
      filters.push({ field: 'channel', operator: 'eq', value: query.channel });
    }
    return this.database.communicationTemplates.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      ...(query.search
        ? {
            search: query.search,
            searchFields: ['templateCode', 'templateName', 'body'],
          }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
  }

  async findById(id: string) {
    const tpl = await this.database.communicationTemplates.findById(id);
    if (!tpl || tpl.isDeleted) {
      throw new NotFoundException('Template not found');
    }
    return tpl;
  }

  /** Find an active template by code + channel (+language). */
  async findByCode(code: string, channel?: string, language = 'en'): Promise<any | null> {
    const filters: any[] = [
      { field: 'templateCode', operator: 'eq', value: code },
      { field: 'language', operator: 'eq', value: language },
    ];
    if (channel) {
      filters.push({ field: 'channel', operator: 'eq', value: channel });
    }
    const res = await this.database.communicationTemplates.findAll({
      page: 1,
      pageSize: 5,
      filters,
    } as any);
    return (res.data || []).find((t: any) => !t.isDeleted) || null;
  }

  async create(data: any, userId?: string) {
    if (!data.templateCode || !data.body) {
      throw new BadRequestException('templateCode and body are required');
    }
    const dup = await this.findByCode(data.templateCode, data.channel, data.language || 'en');
    if (dup) {
      throw new BadRequestException(
        `Template ${data.templateCode} already exists for channel ${data.channel} (${data.language || 'en'})`,
      );
    }
    const tpl = await this.database.communicationTemplates.create({
      templateCode: data.templateCode,
      templateName: data.templateName || data.templateCode,
      channel: data.channel || 'email',
      subject: data.subject || null,
      body: data.body,
      htmlBody: data.htmlBody || null,
      variables:
        typeof data.variables === 'string'
          ? data.variables
          : data.variables
            ? JSON.stringify(data.variables)
            : null,
      language: data.language || 'en',
      isActive: data.isActive !== false,
      category: data.category || null,
      createdBy: userId || null,
    } as any);
    await this.audit.log({
      userId: userId || '',
      event: 'template.created',
      resource: 'communication',
      action: 'create',
      details: { templateId: tpl.id, templateCode: data.templateCode },
    });
    return tpl;
  }

  async update(id: string, data: any, userId?: string) {
    const existing = await this.database.communicationTemplates.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Template not found');
    }
    const updated = await this.database.communicationTemplates.update(id, {
      ...(data.templateName !== undefined ? { templateName: data.templateName } : {}),
      ...(data.subject !== undefined ? { subject: data.subject } : {}),
      ...(data.body !== undefined ? { body: data.body } : {}),
      ...(data.htmlBody !== undefined ? { htmlBody: data.htmlBody } : {}),
      ...(data.variables !== undefined
        ? {
            variables:
              typeof data.variables === 'string' ? data.variables : JSON.stringify(data.variables),
          }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive !== false } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      updatedBy: userId || null,
    } as any);
    await this.audit.log({
      userId: userId || '',
      event: 'template.updated',
      resource: 'communication',
      action: 'update',
      details: { templateId: id, templateCode: existing.templateCode },
    });
    return updated;
  }

  async remove(id: string, userId?: string) {
    const existing = await this.database.communicationTemplates.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Template not found');
    }
    await this.database.communicationTemplates.softDelete(id);
    await this.audit.log({
      userId: userId || '',
      event: 'template.deleted',
      resource: 'communication',
      action: 'delete',
      details: { templateId: id, templateCode: existing.templateCode },
    });
    return { message: 'Template deleted' };
  }

  /**
   * Render a template body/subject with variable substitution.
   * Uses a strict replace (no template-language evaluation) to prevent
   * template injection. Unknown variables are left as-is or blanked on demand.
   */
  render(
    template: { subject?: string | null; body: string; htmlBody?: string | null },
    variables: Record<string, unknown> = {},
    opts: { leaveUnknown?: boolean } = {},
  ): { subject: string; body: string; htmlBody?: string | null } {
    const resolve = (key: string): string => {
      const v = variables[key];
      if (v === undefined || v === null) {
        return opts.leaveUnknown ? `{{${key}}}` : '';
      }
      return String(v);
    };
    const renderText = (input: string): string =>
      String(input || '').replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (m, key: string) =>
        resolve(key),
      );
    return {
      subject: renderText(template.subject || ''),
      body: renderText(template.body),
      htmlBody: template.htmlBody ? renderText(template.htmlBody) : null,
    };
  }

  /** Seed default templates if none exist. */
  async seedDefaults(): Promise<number> {
    const existing = await this.database.communicationTemplates.findAll({
      page: 1,
      pageSize: 1,
    } as any);
    if ((existing as any)?.total > 0) {
      return 0;
    }
    let count = 0;
    for (const tpl of DEFAULT_TEMPLATES) {
      try {
        await this.database.communicationTemplates.create({
          templateCode: tpl.templateCode,
          templateName: tpl.templateName,
          channel: tpl.channel,
          subject: tpl.subject,
          body: tpl.body,
          variables: tpl.variables,
          language: tpl.language || 'en',
          isActive: true,
          category: tpl.category || null,
        } as any);
        count += 1;
      } catch {
        /* best-effort seed */
      }
    }
    return count;
  }
}
