import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

const FIELD_TYPES = [
  'text',
  'number',
  'decimal',
  'date',
  'boolean',
  'dropdown',
  'multi_select',
  'file',
  'long_text',
];

@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ── Definitions ────────────────────────────────────────
  async createDefinition(data: any, userId: string) {
    if (!data.fieldCode || !data.fieldName || !data.module || !data.documentType) {
      throw new BadRequestException('fieldCode, fieldName, module and documentType are required');
    }
    if (!FIELD_TYPES.includes(data.fieldType)) {
      throw new BadRequestException(`Invalid fieldType: ${data.fieldType}`);
    }
    const existing = await this.database.customFields
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [
          { field: 'documentType', operator: 'eq', value: data.documentType },
          { field: 'fieldCode', operator: 'eq', value: data.fieldCode },
        ],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException(
        `Field "${data.fieldCode}" already exists for ${data.documentType}`,
      );
    }
    const field = await this.database.customFields.create({
      ...data,
      id: undefined,
      options: data.options ? JSON.stringify(data.options) : null,
      isRequired: data.isRequired || false,
      isActive: data.isActive !== false,
      sortOrder: Number(data.sortOrder) || 0,
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'custom_field.created',
      resource: 'custom_fields',
      action: 'create',
      details: { fieldId: field.id, fieldCode: field.fieldCode },
    });
    return field;
  }

  async listDefinitions(module?: string, documentType?: string) {
    const filters: any[] = [];
    if (module) {
      filters.push({ field: 'module', operator: 'eq', value: module });
    }
    if (documentType) {
      filters.push({ field: 'documentType', operator: 'eq', value: documentType });
    }
    const res = await this.database.customFields
      .findAll({
        page: 1,
        pageSize: 500,
        ...(filters.length ? { filters } : {}),
      } as any)
      .catch(() => ({ data: [] }));
    return (res.data || []).map((f: any) => ({ ...f, options: this.safeParse(f.options) }));
  }

  private safeParse(json: string): any {
    try {
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  async updateDefinition(id: string, data: any, userId: string) {
    const existing = await this.database.customFields.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Custom field not found');
    }
    if (data.options) {
      data.options = JSON.stringify(data.options);
    }
    await this.database.customFields.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'custom_field.updated',
      resource: 'custom_fields',
      action: 'update',
      details: { fieldId: id },
    });
    return { updated: true, id };
  }

  async deleteDefinition(id: string, userId: string) {
    await this.database.customFields.softDelete(id);
    // Remove stored values too
    const values = await this.database.customFieldValues
      .findAll({
        page: 1,
        pageSize: 5000,
        filters: [{ field: 'fieldId', operator: 'eq', value: id }],
      } as any)
      .catch(() => ({ data: [] }));
    for (const v of values.data || []) {
      await this.database.customFieldValues.softDelete(v.id).catch(() => undefined);
    }
    await this.audit.log({
      userId,
      event: 'custom_field.deleted',
      resource: 'custom_fields',
      action: 'delete',
      details: { fieldId: id },
    });
    return { deleted: true };
  }

  // ── Values ─────────────────────────────────────────────
  /** Upsert values for a record. Validates required + type rules. */
  async saveValues(
    documentType: string,
    recordId: string,
    values: Record<string, any>,
    userId: string,
  ) {
    const definitions = await this.listDefinitions(undefined, documentType);
    const byCode = new Map(definitions.map((d: any) => [d.fieldCode, d]));
    const saved: Record<string, any> = {};

    // Merge previously-saved values so a partial update (single field change)
    // still passes required-field validation without re-sending saved fields.
    const merged = { ...(await this.getValues(documentType, recordId)), ...(values || {}) };

    // Required-field validation — even fields absent from the payload must be
    // present if marked required (empty/absent → error).
    for (const def of definitions) {
      if (
        def.isRequired &&
        (merged[def.fieldCode] === undefined ||
          merged[def.fieldCode] === null ||
          merged[def.fieldCode] === '')
      ) {
        throw new BadRequestException(`Field "${def.fieldName}" is required`);
      }
    }

    for (const [code, rawValue] of Object.entries(values || {})) {
      const def = byCode.get(code);
      if (!def) {
        continue; // ignore unknown fields silently (defensive)
      }
      const value = this.validateValue(def, rawValue);
      // Upsert
      const existing = await this.database.customFieldValues
        .findAll({
          page: 1,
          pageSize: 1,
          filters: [
            { field: 'recordId', operator: 'eq', value: recordId },
            { field: 'fieldId', operator: 'eq', value: def.id },
          ],
        } as any)
        .catch(() => ({ data: [] }));
      if ((existing.data || []).length > 0) {
        await this.database.customFieldValues.update(existing.data[0].id, {
          value: JSON.stringify(value),
          updatedBy: userId,
        } as any);
      } else {
        await this.database.customFieldValues.create({
          fieldId: def.id,
          documentType,
          recordId,
          value: JSON.stringify(value),
          updatedBy: userId,
        } as any);
      }
      saved[code] = value;
    }
    return saved;
  }

  private validateValue(def: any, raw: any): any {
    const type = def.fieldType;
    if (raw === undefined || raw === null || raw === '') {
      if (def.isRequired) {
        throw new BadRequestException(`Field "${def.fieldName}" is required`);
      }
      return null;
    }
    switch (type) {
      case 'number':
      case 'decimal': {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          throw new BadRequestException(`Field "${def.fieldName}" must be a number`);
        }
        if (def.minValue !== null && def.minValue !== undefined && n < Number(def.minValue)) {
          throw new BadRequestException(`Field "${def.fieldName}" must be >= ${def.minValue}`);
        }
        if (def.maxValue !== null && def.maxValue !== undefined && n > Number(def.maxValue)) {
          throw new BadRequestException(`Field "${def.fieldName}" must be <= ${def.maxValue}`);
        }
        return n;
      }
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}/.test(String(raw))) {
          throw new BadRequestException(`Field "${def.fieldName}" must be a date (YYYY-MM-DD)`);
        }
        return String(raw);
      case 'boolean':
        return raw === true || raw === 'true' || raw === 1;
      case 'dropdown': {
        const options = this.safeParse(def.options) || [];
        if (!options.includes(String(raw))) {
          throw new BadRequestException(
            `Field "${def.fieldName}" must be one of: ${options.join(', ')}`,
          );
        }
        return String(raw);
      }
      case 'multi_select': {
        const options = this.safeParse(def.options) || [];
        const selected = Array.isArray(raw)
          ? raw
          : String(raw)
              .split(',')
              .map((s: string) => s.trim());
        for (const s of selected) {
          if (!options.includes(s)) {
            throw new BadRequestException(`Field "${def.fieldName}" has invalid option: ${s}`);
          }
        }
        return selected;
      }
      case 'text':
      case 'long_text':
      case 'file': {
        if (def.pattern) {
          const re = new RegExp(def.pattern);
          if (!re.test(String(raw))) {
            throw new BadRequestException(
              `Field "${def.fieldName}" does not match the required pattern`,
            );
          }
        }
        return String(raw);
      }
      default:
        return String(raw);
    }
  }

  /** Get all custom field values for a record, keyed by field code. */
  async getValues(documentType: string, recordId: string) {
    const [definitions, values] = await Promise.all([
      this.listDefinitions(undefined, documentType),
      this.database.customFieldValues
        .findAll({
          page: 1,
          pageSize: 500,
          filters: [{ field: 'recordId', operator: 'eq', value: recordId }],
        } as any)
        .catch(() => ({ data: [] })),
    ]);
    const defMap = new Map(definitions.map((d: any) => [d.id, d]));
    const result: Record<string, any> = {};
    for (const v of values.data || []) {
      const def = defMap.get(v.fieldId);
      if (def) {
        result[def.fieldCode] = this.safeParse(v.value);
      }
    }
    return result;
  }
}
