import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

const RULE_ACTIONS = ['allow', 'block', 'warn', 'require_approval', 'notify', 'escalate', 'lock'];
const SEVERITIES = ['info', 'warning', 'error', 'critical'];

export interface RuleEvaluationResult {
  triggered: boolean;
  rule?: any;
  action?: string;
  message?: string;
  severity?: string;
}

/**
 * Safe condition evaluator — NEVER uses eval(). Supports:
 *   { field, operator, value }               → single condition
 *   { and: [cond, cond, ...] }               → ALL must pass
 *   { or: [cond, cond, ...] }                → ANY may pass
 *   { field, operator: 'between', value: [min, max] }
 *   { field, operator: 'in', value: [...] }
 */
export function evaluateCondition(condition: any, context: Record<string, any>): boolean {
  if (!condition) {
    return false;
  }
  // Nested AND / OR
  if (Array.isArray(condition.and)) {
    return condition.and.every((c: any) => evaluateCondition(c, context));
  }
  if (Array.isArray(condition.or)) {
    return condition.or.some((c: any) => evaluateCondition(c, context));
  }
  const field = condition.field;
  if (!field) {
    return false;
  }
  const actual = context[field];
  const expected = condition.value;
  const op = condition.operator || 'eq';

  switch (op) {
    case 'eq':
      return String(actual ?? '') === String(expected ?? '');
    case 'neq':
      return String(actual ?? '') !== String(expected ?? '');
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'contains':
      return String(actual ?? '')
        .toLowerCase()
        .includes(String(expected ?? '').toLowerCase());
    case 'between': {
      const [min, max] = Array.isArray(expected) ? expected : [0, 0];
      return Number(actual) >= Number(min) && Number(actual) <= Number(max);
    }
    case 'in':
      return Array.isArray(expected) ? expected.includes(String(actual ?? '')) : false;
    case 'not_in':
      return Array.isArray(expected) ? !expected.includes(String(actual ?? '')) : true;
    default:
      return false;
  }
}

@Injectable()
export class BusinessRulesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(data: any, userId: string) {
    if (!data.ruleCode || !data.ruleName || !data.module) {
      throw new BadRequestException('ruleCode, ruleName and module are required');
    }
    if (data.action && !RULE_ACTIONS.includes(data.action)) {
      throw new BadRequestException(`Invalid action: ${data.action}`);
    }
    if (data.severity && !SEVERITIES.includes(data.severity)) {
      throw new BadRequestException(`Invalid severity: ${data.severity}`);
    }
    const existing = await this.database.businessRules
      .findAll({
        page: 1,
        pageSize: 1,
        filters: [{ field: 'ruleCode', operator: 'eq', value: data.ruleCode }],
      } as any)
      .catch(() => ({ data: [] }));
    if ((existing.data || []).length > 0) {
      throw new BadRequestException(`Business rule "${data.ruleCode}" already exists`);
    }
    // Validate the condition JSON parses and evaluates
    const condition = this.parseCondition(data.condition);
    const rule = await this.database.businessRules.create({
      ...data,
      id: undefined,
      condition: JSON.stringify(condition),
      priority: Number(data.priority) || 100,
      status: data.status || 'active',
      createdBy: userId,
    } as any);
    await this.audit.log({
      userId,
      event: 'business_rule.created',
      resource: 'business_rules',
      action: 'create',
      details: { ruleId: rule.id, ruleCode: rule.ruleCode },
    });
    return rule;
  }

  private parseCondition(condition: any): any {
    if (typeof condition === 'string') {
      try {
        return JSON.parse(condition);
      } catch {
        throw new BadRequestException('Invalid condition JSON');
      }
    }
    if (!condition || typeof condition !== 'object') {
      throw new BadRequestException('Condition must be a JSON object');
    }
    return condition;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    module?: string;
    status?: string;
    search?: string;
  }) {
    const filters: any[] = [];
    if (query.module) {
      filters.push({ field: 'module', operator: 'eq', value: query.module });
    }
    if (query.status) {
      filters.push({ field: 'status', operator: 'eq', value: query.status });
    }
    const result = await this.database.businessRules.findAll({
      page: query.page || 1,
      pageSize: query.pageSize || 50,
      ...(query.search
        ? { search: query.search, searchFields: ['ruleCode', 'ruleName', 'description'] }
        : {}),
      ...(filters.length ? { filters } : {}),
    } as any);
    // Return conditions as objects for the frontend
    return {
      ...result,
      data: (result.data || []).map((r: any) => ({ ...r, condition: this.safeParse(r.condition) })),
    };
  }

  private safeParse(json: string): any {
    try {
      return json ? JSON.parse(json) : {};
    } catch {
      return {};
    }
  }

  async findById(id: string) {
    const rule = await this.database.businessRules.findById(id);
    if (!rule || rule.isDeleted) {
      throw new NotFoundException('Business rule not found');
    }
    return { ...rule, condition: this.safeParse(rule.condition) };
  }

  async update(id: string, data: any, userId: string) {
    const existing = await this.database.businessRules.findById(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Business rule not found');
    }
    if (data.condition) {
      data.condition = JSON.stringify(this.parseCondition(data.condition));
    }
    if (data.action && !RULE_ACTIONS.includes(data.action)) {
      throw new BadRequestException(`Invalid action: ${data.action}`);
    }
    await this.database.businessRules.update(id, { ...data, updatedBy: userId } as any);
    await this.audit.log({
      userId,
      event: 'business_rule.updated',
      resource: 'business_rules',
      action: 'update',
      details: { ruleId: id },
    });
    return { updated: true, id };
  }

  async delete(id: string, userId: string) {
    await this.database.businessRules.softDelete(id);
    await this.audit.log({
      userId,
      event: 'business_rule.deleted',
      resource: 'business_rules',
      action: 'delete',
      details: { ruleId: id },
    });
    return { deleted: true };
  }

  /**
   * Evaluate a document against all active rules for its module/documentType.
   * Returns the FIRST blocking/warning rule (highest priority wins for
   * multiple triggers). Used by module integrations before posting.
   */
  async evaluate(context: {
    module: string;
    documentType?: string;
    amount?: number;
    data: Record<string, any>;
  }): Promise<RuleEvaluationResult> {
    const today = new Date().toISOString().slice(0, 10);
    const rules = await this.database.businessRules
      .findAll({
        page: 1,
        pageSize: 1000,
        filters: [{ field: 'module', operator: 'eq', value: context.module }],
      } as any)
      .catch(() => ({ data: [] }));

    const active = (rules.data || []).filter((r: any) => {
      if (r.status !== 'active' || r.isDeleted) {
        return false;
      }
      if (r.documentType && r.documentType !== context.documentType) {
        return false;
      }
      if (r.effectiveFrom && r.effectiveFrom > today) {
        return false;
      }
      if (r.effectiveTo && r.effectiveTo < today) {
        return false;
      }
      return true;
    });

    const evalContext = {
      ...context.data,
      module: context.module,
      documentType: context.documentType,
      amount: context.amount,
    };
    const triggered = active
      .filter((r: any) => evaluateCondition(this.safeParse(r.condition), evalContext))
      .sort((a: any, b: any) => Number(a.priority) - Number(b.priority));

    if (triggered.length === 0) {
      return { triggered: false };
    }
    const rule = triggered[0];
    return {
      triggered: true,
      rule: { ...rule, condition: this.safeParse(rule.condition) },
      action: rule.action,
      message: rule.message || `Business rule "${rule.ruleName}" triggered`,
      severity: rule.severity || 'error',
    };
  }

  /** Audit a rule trigger (used by integrations). */
  async logTrigger(
    userId: string,
    module: string,
    documentId: string,
    result: RuleEvaluationResult,
  ) {
    if (!result.triggered) {
      return;
    }
    await this.audit
      .log({
        userId,
        event: 'business_rule.triggered',
        resource: 'business_rules',
        action: result.action || 'triggered',
        details: { module, documentId, ruleCode: result.rule?.ruleCode, message: result.message },
      })
      .catch(() => undefined);
  }
}
