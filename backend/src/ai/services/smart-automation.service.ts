import { Injectable, Logger } from '@nestjs/common';

import { AiService } from './ai.service';

export interface AutomationSuggestion {
  type: 'approval_routing' | 'reorder' | 'supplier_recommendation' | 'inventory_transfer' | 'task_prioritization' | 'reminder';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  actionData?: Record<string, unknown>;
}

@Injectable()
export class SmartAutomationService {
  private readonly logger = new Logger(SmartAutomationService.name);

  constructor(private readonly aiService: AiService) {}

  async getSuggestions(systemState?: Record<string, unknown>): Promise<AutomationSuggestion[]> {
    try {
      const state = systemState || this.getDefaultSystemState();
      const response = await this.aiService.completeWithTemplate('smart-automation', {
        systemState: JSON.stringify(state),
      });

      return this.parseSuggestions(response.content);
    } catch (error) {
      this.logger.error(`Smart automation failed: ${(error as Error).message}`);
      return this.fallbackSuggestions();
    }
  }

  async suggestApprovalRouting(amount: number, department: string, _module: string): Promise<AutomationSuggestion> {
    const routing: string[] = [];
    if (amount <= 50000) {routing.push('Supervisor');}
    else if (amount <= 200000) {routing.push('Manager', 'Supervisor');}
    else {routing.push('Director', 'Manager', 'Supervisor');}

    return {
      type: 'approval_routing',
      title: `Approval Routing for ${department} (${amount.toLocaleString()})`,
      description: `Suggested approval chain: ${routing.join(' → ')}`,
      priority: 'high',
      confidence: 0.85,
      actionData: { amount, department, routing },
    };
  }

  async suggestReorder(itemName: string, currentStock: number, reorderLevel: number, leadTimeDays: number): Promise<AutomationSuggestion | null> {
    if (currentStock > reorderLevel) {return null;}

    const suggestedQty = Math.max(reorderLevel * 2 - currentStock, reorderLevel);
    const urgency = currentStock <= 0 ? 'high' : currentStock < reorderLevel * 0.5 ? 'high' : 'medium';

    return {
      type: 'reorder',
      title: `Reorder Required: ${itemName}`,
      description: `Current stock (${currentStock}) is below reorder level (${reorderLevel}). Suggested order: ${suggestedQty} units. Lead time: ${leadTimeDays} days.`,
      priority: urgency as 'high' | 'medium' | 'low',
      confidence: 0.9,
      actionData: { itemName, currentStock, reorderLevel, suggestedQty, leadTimeDays },
    };
  }

  private parseSuggestions(_content: string): AutomationSuggestion[] {
    return this.fallbackSuggestions();
  }

  private fallbackSuggestions(): AutomationSuggestion[] {
    return [
      {
        type: 'task_prioritization',
        title: 'Review Pending Approvals',
        description: 'You have pending approvals that require attention. Prioritize approvals over ₹2,00,000 for Director-level review.',
        priority: 'high',
        confidence: 0.85,
      },
      {
        type: 'reminder',
        title: 'GST Return Due Soon',
        description: 'Monthly GST return filing is approaching. Ensure all invoices are posted and reconciled.',
        priority: 'high',
        confidence: 0.8,
      },
      {
        type: 'approval_routing',
        title: 'Optimize Approval Workflow',
        description: 'Consider setting up auto-approval for recurring low-value purchase orders under ₹5,000 to reduce processing time.',
        priority: 'medium',
        confidence: 0.7,
      },
    ];
  }

  private getDefaultSystemState(): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      pendingApprovals: true,
      lowStock: true,
      pendingGstReturns: true,
      moduleStatus: 'active',
    };
  }
}
