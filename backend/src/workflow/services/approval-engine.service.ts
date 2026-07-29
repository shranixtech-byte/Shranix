import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface ApprovalLevelConfig {
  level: number;
  approvalType: string;
  approverRole?: string;
  approverUserId?: string;
  departmentId?: string;
  isSequential: boolean;
  isParallel: boolean;
  requiredApprovals: number;
  minAmount: number;
  maxAmount?: number;
}

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(
    private readonly database: DatabaseService,
  ) {}

  /**
   * Determine approval levels based on document type, amount, and department.
   * Queries the Approval Matrix for matching rules.
   */
  async determineApprovalLevels(params: {
    module: string;
    documentType: string;
    amount: number;
    departmentId?: string;
  }): Promise<ApprovalLevelConfig[]> {
    const result = await this.database.approvalMatrix.findAll({
      page: 1,
      pageSize: 50,
      filter: {
        module: params.module,
        documentType: params.documentType,
        isActive: true,
      } as any,
    } as any);

    if (!result.data || result.data.length === 0) {
      // Default: single-level approval if no matrix configured
      return [{
        level: 1,
        approvalType: 'role',
        approverRole: 'manager',
        isSequential: true,
        isParallel: false,
        requiredApprovals: 1,
        minAmount: 0,
      }];
    }

    // Filter by amount range and sort by level
    const levels: ApprovalLevelConfig[] = result.data
      .filter((rule: any) => {
        const minOk = params.amount >= Number(rule.minAmount || 0);
        const maxOk = !rule.maxAmount || params.amount <= Number(rule.maxAmount);
        return minOk && maxOk && rule.isActive;
      })
      .sort((a: any, b: any) => a.level - b.level)
      .map((rule: any) => ({
        level: rule.level || 1,
        approvalType: rule.approvalType || 'role',
        approverRole: rule.approverRole || null,
        approverUserId: rule.approverUserId || null,
        departmentId: rule.departmentId || null,
        isSequential: rule.isSequential !== false,
        isParallel: rule.isParallel === true,
        requiredApprovals: rule.requiredApprovals || 1,
        minAmount: Number(rule.minAmount || 0),
        maxAmount: rule.maxAmount ? Number(rule.maxAmount) : undefined,
      }));

    return levels.length > 0 ? levels : [{
      level: 1,
      approvalType: 'role',
      approverRole: 'manager',
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      minAmount: 0,
    }];
  }

  /**
   * Process an approval action (approve, reject, return).
   */
  async processApprovalAction(instance: any, dto: { action: string; userId: string; comment?: string }, _transition: any): Promise<void> {
    const approvalLevel = instance.approvalLevel || 0;
    const maxLevel = instance.maxApprovalLevel || 1;

    if (dto.action === 'approve') {
      // If parallel approval, check if enough approvals received
      const nextLevel = approvalLevel + 1;
      await this.database.workflowInstances.update(instance.id, { approvalLevel: nextLevel } as any);

      // If all levels approved, transition to approved state
      if (nextLevel >= maxLevel) {
        this.logger.log(`All ${maxLevel} approval levels completed for ${instance.id}`);
      }
    }

    if (dto.action === 'reject') {
      this.logger.log(`Workflow ${instance.id} rejected at level ${approvalLevel} by ${dto.userId}`);
    }
  }

  /**
   * Check if the current approval level is complete.
   */
  async isApprovalComplete(instanceId: string): Promise<boolean> {
    const instance = await this.database.workflowInstances.findById(instanceId);
    if (!instance) {return false;}
    const approvalLevel = (instance as any).approvalLevel || 0;
    const maxLevel = (instance as any).maxApprovalLevel || 1;
    return approvalLevel >= maxLevel;
  }

  /**
   * Get the next approver for sequential approval.
   */
  async getNextApprover(instance: any, currentLevel: number): Promise<{ userId?: string; role?: string }> {
    const levels = await this.determineApprovalLevels({
      module: instance.module,
      documentType: instance.documentType,
      amount: instance.amount || 0,
      departmentId: instance.departmentId,
    });

    const nextLevel = levels.find((l) => l.level === currentLevel + 1);
    if (!nextLevel) {return {};}

    if (nextLevel.approvalType === 'user') {
      return { userId: nextLevel.approverUserId };
    }
    return { role: nextLevel.approverRole || 'manager' };
  }
}
