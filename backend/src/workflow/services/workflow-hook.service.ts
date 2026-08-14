import { Injectable, Logger } from '@nestjs/common';

import { WorkflowIntegrationService } from './workflow-integration.service';

/**
 * Simple post-create hook class that modules can call after document creation
 * to auto-start workflows. Injected globally through the WorkflowModule.
 */
@Injectable()
export class WorkflowHookService {
  private readonly logger = new Logger(WorkflowHookService.name);

  constructor(private readonly integration: WorkflowIntegrationService) {}

  /**
   * Called by any module after document creation.
   * Triggers an automatic workflow start for the document.
   */
  async afterCreate(params: {
    module: string;
    documentType: string;
    documentId: string;
    documentNumber?: string;
    templateCode: string;
    templateName: string;
    amount?: number;
    userId?: string;
    supplierId?: string;
    customerId?: string;
    departmentId?: string;
    branchId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.integration.startWorkflowForDocument({
        module: params.module,
        documentType: params.documentType,
        templateCode: params.templateCode,
        templateName: params.templateName,
        documentId: params.documentId,
        documentNumber: params.documentNumber,
        amount: params.amount || 0,
        departmentId: params.departmentId,
        branchId: params.branchId,
        userId: params.userId,
        metadata: params.metadata,
      });
      this.logger.log(
        `Workflow auto-started for ${params.documentType} #${params.documentNumber || params.documentId}`,
      );
    } catch (error) {
      // Workflow start should never block document creation
      this.logger.warn(
        `Failed to start workflow for ${params.documentType} #${params.documentId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Called after a document status change.
   * Triggers workflow action (submit → review → approve → complete).
   */
  async afterStatusChange(params: {
    documentType: string;
    documentId: string;
    oldStatus: string;
    newStatus: string;
    userId?: string;
    comment?: string;
  }): Promise<void> {
    try {
      const instance = await this.integration['instancesService'].findByDocument(
        params.documentType,
        params.documentId,
      );
      if (!instance) {
        return;
      }

      const actionMap: Record<string, Record<string, string>> = {
        draft: { submitted: 'submit' },
        submitted: {
          approved: 'approve',
          rejected: 'reject',
          draft: 'return',
          under_review: 'review',
        },
        under_review: { approved: 'approve', rejected: 'reject', draft: 'return' },
        approved: { completed: 'complete' },
      };

      const action = actionMap[params.oldStatus]?.[params.newStatus];
      if (!action) {
        return;
      }

      // H2: system-triggered transitions carry a server-side system actor —
      // they are document-status driven, not human approval decisions.
      await this.integration['instancesService'].executeAction(
        (instance as any).id,
        {
          action,
          comment: params.comment,
        },
        { id: params.userId || 'system', source: 'system' },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to execute workflow action for ${params.documentType} #${params.documentId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Check if workflow allows a status change.
   */
  async canChangeStatus(documentType: string, documentId: string): Promise<boolean> {
    return this.integration.isDraft(documentType, documentId);
  }
}
