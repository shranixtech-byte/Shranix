import { Injectable, Logger } from '@nestjs/common';

import { TransactionManager } from '../../automation/transaction.manager';

import { WorkflowInstancesService } from './instances.service';
import { StateMachineService} from './state-machine.service';
import { DEFAULT_WORKFLOW_STATES, DEFAULT_TRANSITIONS } from './state-machine.service';
import { WorkflowTemplatesService } from './templates.service';

export interface WorkflowIntegrationConfig {
  module: string;
  documentType: string;
  templateCode: string;
  templateName: string;
  amount?: number;
  departmentId?: string;
  branchId?: string;
  userId?: string;
  documentId: string;
  documentNumber?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class WorkflowIntegrationService {
  private readonly logger = new Logger(WorkflowIntegrationService.name);

  constructor(
    private readonly instancesService: WorkflowInstancesService,
    private readonly templatesService: WorkflowTemplatesService,
    private readonly stateMachine: StateMachineService,
    private readonly transactionManager: TransactionManager,
  ) {}

  /**
   * Start a workflow for a business document.
   * Auto-creates a workflow template if none exists for the document type.
   */
  async startWorkflowForDocument(config: WorkflowIntegrationConfig): Promise<any> {
    return this.transactionManager.executeInTransaction(async (_context) => {
      // Find or create template
      let template = await this.templatesService.findByCode(config.templateCode);
      if (!template) {
        template = await this.createDefaultTemplate(config);
      }

      // Start the workflow instance
      const instance = await this.instancesService.startWorkflow(
        {
          templateId: template.id,
          documentId: config.documentId,
          documentType: config.documentType,
          documentNumber: config.documentNumber,
          module: config.module,
          initiatorId: config.userId,
          amount: config.amount || 0,
          departmentId: config.departmentId,
          branchId: config.branchId,
          metadata: config.metadata,
        },
        config.userId,
      );

      this.logger.log(`Workflow started for ${config.documentType} #${config.documentNumber || config.documentId}`);
      return instance;
    });
  }

  /**
   * Create a default workflow template for a document type if none exists.
   */
  private async createDefaultTemplate(config: WorkflowIntegrationConfig): Promise<any> {
    const template = await this.templatesService.create(
      {
        name: config.templateName,
        code: config.templateCode,
        description: `Default workflow for ${config.documentType}`,
        module: config.module,
        documentType: config.documentType,
        states: DEFAULT_WORKFLOW_STATES,
        transitions: DEFAULT_TRANSITIONS,
        config: {
          autoStartOnCreate: true,
          requireApproval: true,
          requireCommentOnReject: true,
        },
        initialState: 'draft',
      },
      config.userId,
    );

    // Register in state machine
    this.stateMachine.registerTemplate(template.id, DEFAULT_WORKFLOW_STATES, DEFAULT_TRANSITIONS);

    this.logger.log(`Default workflow template created: ${config.templateCode}`);
    return template;
  }

  /**
   * Check if a document's workflow allows a specific action.
   * Throws BadRequestException if the action is not allowed.
   */
  async checkWorkflowState(documentType: string, documentId: string, expectedState: string): Promise<boolean> {
    const instance = await this.instancesService.findByDocument(documentType, documentId);
    if (!instance) {return false;}
    return (instance as any).currentState === expectedState;
  }

  /**
   * Get the current workflow state for a document.
   */
  async getDocumentWorkflowState(documentType: string, documentId: string): Promise<string | null> {
    const instance = await this.instancesService.findByDocument(documentType, documentId);
    if (!instance) {return null;}
    return (instance as any).currentState;
  }

  /**
   * Check if a document has been approved.
   */
  async isApproved(documentType: string, documentId: string): Promise<boolean> {
    const state = await this.getDocumentWorkflowState(documentType, documentId);
    return state === 'approved' || state === 'completed' || state === 'closed';
  }

  /**
   * Check if a document is still in draft (editable).
   */
  async isDraft(documentType: string, documentId: string): Promise<boolean> {
    const state = await this.getDocumentWorkflowState(documentType, documentId);
    return state === 'draft' || state === null;
  }
}
