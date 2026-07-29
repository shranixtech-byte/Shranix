import { SetMetadata } from '@nestjs/common';

import { WORKFLOW_DOCUMENT_KEY } from '../../workflow/interceptors/workflow-auto-start.interceptor';

export interface WorkflowDocumentMetadata {
  module: string;
  documentType: string;
  templateCode: string;
  templateName: string;
  amountField?: string;
  numberField?: string;
}

/**
 * Decorator that marks a POST endpoint to auto-start a workflow after document creation.
 *
 * Usage:
 *   @Post()
 *   @WorkflowDocument({ module: 'purchase', documentType: 'purchase_order', templateCode: 'purchase-order', templateName: 'Purchase Order Workflow', amountField: 'totalAmount', numberField: 'orderNumber' })
 *   async create(@Body() dto: CreateDto, @CurrentUser() u: {id:string}) { ... }
 */
export const WorkflowDocument = (metadata: WorkflowDocumentMetadata) =>
  SetMetadata(WORKFLOW_DOCUMENT_KEY, metadata);
