import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';

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

/**
 * Server-derived approval actor. `source: 'system'` marks transitions triggered
 * by document status changes (auto-approvals via WorkflowHookService) which are
 * NOT human approval decisions; `source: 'user'` is an authenticated session
 * and MUST satisfy the designated-approver rule.
 */
export interface ApprovalActor {
  id: string;
  source: 'user' | 'system';
  roles?: string[];
  departmentId?: string;
}

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(private readonly database: DatabaseService) {}

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
    // NOTE: `filters` (array of {field, operator, value}) is the format the
    // enterprise query builder understands — a plain `filter` object is silently
    // ignored and would let approval rules from OTHER modules leak in, causing
    // the wrong designated approver to win (H2 root-cause fix).
    const result = await this.database.approvalMatrix.findAll({
      page: 1,
      pageSize: 50,
      filters: [
        { field: 'module', operator: 'eq' as const, value: params.module },
        { field: 'documentType', operator: 'eq' as const, value: params.documentType },
        { field: 'isActive', operator: 'eq' as const, value: true },
      ],
    } as any);

    if (!result.data || result.data.length === 0) {
      // Default: single-level approval if no matrix configured
      return [
        {
          level: 1,
          approvalType: 'role',
          approverRole: 'manager',
          isSequential: true,
          isParallel: false,
          requiredApprovals: 1,
          minAmount: 0,
        },
      ];
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

    return levels.length > 0
      ? levels
      : [
          {
            level: 1,
            approvalType: 'role',
            approverRole: 'manager',
            isSequential: true,
            isParallel: false,
            requiredApprovals: 1,
            minAmount: 0,
          },
        ];
  }

  /**
   * Resolve the approval-level configuration for the NEXT pending level of an
   * instance (approvalLevel + 1). Falls back to the documented default: single
   * role-based level where 'manager' is the approver.
   */
  async getApprovalLevelConfig(instance: any, level: number): Promise<ApprovalLevelConfig> {
    const levels = await this.determineApprovalLevels({
      module: instance.module,
      documentType: instance.documentType,
      amount: instance.amount || 0,
      departmentId: instance.departmentId,
    });
    const config = levels.find((l) => l.level === level);
    if (config) {
      return config;
    }
    return {
      level,
      approvalType: 'role',
      approverRole: 'manager',
      isSequential: true,
      isParallel: false,
      requiredApprovals: 1,
      minAmount: 0,
    };
  }

  /**
   * H2 — designated-approver check against the approval matrix for the current
   * (next pending) level. The actor is server-derived; a client-supplied userId
   * can never change who is eligible.
   *
   * - approvalType 'user'       → only the exact designated user may act
   * - approvalType 'role'       → the actor must hold the configured role
   * - approvalType 'department' → the actor's employee department must match
   * - default (no matrix)       → 'manager' role
   *
   * Generic permission alone (e.g. workflow.create) is NOT sufficient.
   */
  async isEligibleApprover(
    instance: any,
    actor: ApprovalActor,
    config: ApprovalLevelConfig,
  ): Promise<boolean> {
    switch (config.approvalType) {
      case 'user':
        return !!config.approverUserId && actor.id === config.approverUserId;
      case 'department':
        return !!config.departmentId && actor.departmentId === config.departmentId;
      case 'role':
      default: {
        const requiredRole = config.approverRole || 'manager';
        return (actor.roles || []).includes(requiredRole);
      }
    }
  }

  /**
   * H2 — verify the authenticated actor is the designated approver for the next
   * pending approval step. Throws ForbiddenException (safe, non-revealing) when
   * the actor is not eligible. Returns the level config on success.
   */
  async verifyApproverEligibility(
    instance: any,
    actor: ApprovalActor,
  ): Promise<ApprovalLevelConfig> {
    const level = (instance.approvalLevel || 0) + 1;
    const config = await this.getApprovalLevelConfig(instance, level);
    const eligible = await this.isEligibleApprover(instance, actor, config);
    if (!eligible) {
      throw new ForbiddenException('You are not the designated approver for this workflow step');
    }
    return config;
  }

  /**
   * Process an approval action (approve, reject, return).
   *
   * H2 hardening:
   *  - actor is server-derived (never dto.userId)
   *  - approve/reject require designated-approver eligibility for user actors
   *  - state protection: inactive workflows and duplicate approvals are rejected
   *  - reject now actually persists status = 'rejected'
   */
  async processApprovalAction(
    instance: any,
    dto: { action: string; comment?: string },
    _transition: any,
    actor: ApprovalActor,
  ): Promise<void> {
    if ((instance as any).status !== 'active') {
      throw new BadRequestException(
        `Workflow is ${(instance as any).status || 'inactive'}. Cannot ${dto.action} a non-active workflow.`,
      );
    }

    const approvalLevel = (instance as any).approvalLevel || 0;
    const maxLevel = (instance as any).maxApprovalLevel || 1;

    if (dto.action === 'approve') {
      // Duplicate-approval guard: never increment past the configured max.
      if (approvalLevel >= maxLevel) {
        throw new BadRequestException('Workflow has already been fully approved');
      }
      if (actor.source === 'user') {
        await this.verifyApproverEligibility(instance, actor);
      }
      const nextLevel = approvalLevel + 1;
      await this.database.workflowInstances.update(instance.id, {
        approvalLevel: nextLevel,
        updatedBy: actor.id,
      } as any);
      if (nextLevel >= maxLevel) {
        this.logger.log(`All ${maxLevel} approval levels completed for ${instance.id}`);
      }
    }

    if (dto.action === 'reject') {
      if (actor.source === 'user') {
        await this.verifyApproverEligibility(instance, actor);
      }
      await this.database.workflowInstances.update(instance.id, {
        status: 'rejected',
        updatedBy: actor.id,
      } as any);
      this.logger.log(`Workflow ${instance.id} rejected at level ${approvalLevel} by ${actor.id}`);
    }

    if (dto.action === 'return') {
      // H2: 'return' is an approval-step action — only the designated approver
      // may send the workflow back to draft (same eligibility rule as reject).
      if (actor.source === 'user') {
        await this.verifyApproverEligibility(instance, actor);
      }
      this.logger.log(`Workflow ${instance.id} returned to draft by ${actor.id}`);
    }

    // 'return' intentionally does not mutate the approval level or status here —
    // the state machine transition (under_review → draft) drives the state change.
  }

  /**
   * Check if the current approval level is complete.
   */
  async isApprovalComplete(instanceId: string): Promise<boolean> {
    const instance = await this.database.workflowInstances.findById(instanceId);
    if (!instance) {
      return false;
    }
    const approvalLevel = (instance as any).approvalLevel || 0;
    const maxLevel = (instance as any).maxApprovalLevel || 1;
    return approvalLevel >= maxLevel;
  }

  /**
   * Get the next approver for sequential approval.
   */
  async getNextApprover(
    instance: any,
    currentLevel: number,
  ): Promise<{ userId?: string; role?: string }> {
    const levels = await this.determineApprovalLevels({
      module: instance.module,
      documentType: instance.documentType,
      amount: instance.amount || 0,
      departmentId: instance.departmentId,
    });

    const nextLevel = levels.find((l) => l.level === currentLevel + 1);
    if (!nextLevel) {
      return {};
    }

    if (nextLevel.approvalType === 'user') {
      return { userId: nextLevel.approverUserId };
    }
    return { role: nextLevel.approverRole || 'manager' };
  }
}
