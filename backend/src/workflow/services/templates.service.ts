import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

import {
  StateMachineService,
  StateDefinition,
  TransitionDefinition,
} from './state-machine.service';

export interface CreateWorkflowTemplateDto {
  name: string;
  code: string;
  description?: string;
  module: string;
  documentType: string;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  config?: Record<string, any>;
  initialState?: string;
}

export interface UpdateWorkflowTemplateDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  states?: StateDefinition[];
  transitions?: TransitionDefinition[];
  config?: Record<string, any>;
  initialState?: string;
}

@Injectable()
export class WorkflowTemplatesService {
  private readonly logger = new Logger(WorkflowTemplatesService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly stateMachine: StateMachineService,
  ) {}

  async findAll(page = 1, pageSize = 50, search?: string, module?: string) {
    // NOTE: `filters` (array of {field, operator, value}) is the format the
    // enterprise query builder understands — a plain `filter` object is silently
    // ignored and would return every template (module filter never applied).
    const filters: any[] = [];
    if (module) {
      filters.push({ field: 'module', operator: 'eq', value: module });
    }
    const result = await this.database.workflowTemplates.findAll({
      page,
      pageSize,
      search,
      filters,
    } as any);
    return result;
  }

  async findById(id: string) {
    const record = await this.database.workflowTemplates.findById(id);
    if (!record) {
      throw new NotFoundException(`Workflow template with id "${id}" not found`);
    }
    return record;
  }

  async findByCode(code: string) {
    // NOTE: use exact-match filter instead of text search to avoid matching
    // partial codes (e.g. 'sales' matching 'sales-invoice').
    const result = await this.database.workflowTemplates.findAll({
      page: 1,
      pageSize: 1,
      filters: [{ field: 'code', operator: 'eq', value: code }],
    } as any);
    if (result.data.length > 0) {
      return result.data[0];
    }
    return null;
  }

  async create(data: CreateWorkflowTemplateDto, userId?: string) {
    // Check unique code
    const existing = await this.findByCode(data.code);
    if (existing) {
      throw new ConflictException(`Workflow template with code "${data.code}" already exists`);
    }

    const record = await this.database.workflowTemplates.create({
      name: data.name,
      code: data.code,
      description: data.description || null,
      module: data.module,
      documentType: data.documentType,
      version: 1,
      isActive: true,
      initialState: data.initialState || 'draft',
      states: JSON.stringify(data.states || this.stateMachine.getDefaultStates()),
      transitions: JSON.stringify(data.transitions || this.stateMachine.getDefaultTransitions()),
      config: data.config ? JSON.stringify(data.config) : null,
      createdBy: userId || null,
      updatedBy: userId || null,
    } as any);

    // Register in state machine
    this.stateMachine.registerTemplate(
      record.id,
      data.states || this.stateMachine.getDefaultStates(),
      data.transitions || this.stateMachine.getDefaultTransitions(),
    );

    if (userId) {
      await this.audit.log({
        userId,
        event: 'workflow_template_created' as any,
        resource: 'workflow_template',
        action: 'create',
        details: { id: record.id, code: data.code },
      });
    }
    this.logger.log(`Workflow template created: ${data.code} (${record.id})`);
    return record;
  }

  async update(id: string, data: UpdateWorkflowTemplateDto, userId?: string) {
    const record = await this.findById(id);

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.initialState !== undefined) {
      updateData.initialState = data.initialState;
    }
    if (data.states !== undefined) {
      updateData.states = JSON.stringify(data.states);
    }
    if (data.transitions !== undefined) {
      updateData.transitions = JSON.stringify(data.transitions);
    }
    if (data.config !== undefined) {
      updateData.config = JSON.stringify(data.config);
    }
    updateData.version = (record as any).version + 1;
    updateData.updatedBy = userId || null;

    const updated = await this.database.workflowTemplates.update(id, updateData as any);

    // Re-register in state machine with new config
    if (data.states || data.transitions) {
      this.stateMachine.registerTemplate(
        id,
        data.states || JSON.parse((record as any).states || '[]'),
        data.transitions || JSON.parse((record as any).transitions || '[]'),
      );
    }

    if (userId) {
      await this.audit.log({
        userId,
        event: 'workflow_template_updated' as any,
        resource: 'workflow_template',
        action: 'update',
        details: { id, changes: Object.keys(data) },
      });
    }
    return updated;
  }

  async delete(id: string, userId?: string) {
    await this.findById(id);
    await this.database.workflowTemplates.softDelete(id);
    if (userId) {
      await this.audit.log({
        userId,
        event: 'workflow_template_deleted' as any,
        resource: 'workflow_template',
        action: 'delete',
        details: { id },
      });
    }
    return { message: 'Workflow template deleted successfully' };
  }

  async getDefaultStates() {
    return this.stateMachine.getDefaultStates();
  }

  async getDefaultTransitions() {
    return this.stateMachine.getDefaultTransitions();
  }
}
