import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { WorkflowIntegrationService } from '../services/workflow-integration.service';

export const APPROVAL_REQUIRED_KEY = 'approval:required';

/**
 * Guard that checks if a document's workflow is in approved state before allowing action.
 * Usage:
 *   @Post()
 *   @ApprovalRequired({ documentType: 'sales_invoice', documentIdParam: 'id' })
 *   async post(@Param('id') id: string) { ... }
 *
 *   @Post()
 *   @ApprovalRequired({ documentType: 'journal_entry', documentIdParam: 'id' })
 *   async post(@Param('id') id: string) { ... }
 */
@Injectable()
export class ApprovalGuard implements CanActivate {
  private readonly logger = new Logger(ApprovalGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly workflowIntegration: WorkflowIntegrationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<{
      documentType: string;
      documentIdParam: string;
      message?: string;
    }>(APPROVAL_REQUIRED_KEY, context.getHandler());

    if (!metadata) {
      // No approval required — allow
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const documentId = request.params?.[metadata.documentIdParam];

    if (!documentId) {
      this.logger.warn(
        `ApprovalGuard: No document ID found in param "${metadata.documentIdParam}"`,
      );
      return true; // Let it pass if we can't determine the document
    }

    const isApproved = await this.workflowIntegration.isApproved(metadata.documentType, documentId);

    if (!isApproved) {
      throw new ForbiddenException(
        metadata.message ||
          `Document ${metadata.documentType} #${documentId} has not been approved. ` +
            `Workflow approval is required before this action can be performed.`,
      );
    }

    return true;
  }
}

/**
 * Decorator to mark endpoints that require workflow approval before execution.
 */
export const ApprovalRequired = (metadata: {
  documentType: string;
  documentIdParam: string;
  message?: string;
}) => {
  return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(APPROVAL_REQUIRED_KEY, metadata, descriptor.value);
    return descriptor;
  };
};
