import { Injectable, Logger } from '@nestjs/common';

import { AiService } from './ai.service';

export interface BusinessInsight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'info';
  category: 'sales' | 'inventory' | 'finance' | 'purchase' | 'gst' | 'operations';
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
  actionLabel?: string;
  actionPath?: string;
  generatedAt: Date;
}

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly aiService: AiService) {}

  async generateInsights(userId: string): Promise<BusinessInsight[]> {
    try {
      // Generate AI-powered insights
      const response = await this.aiService.completeWithTemplate('insight-analysis', {
        data: JSON.stringify(this.getSystemSnapshot()),
      }, userId);

      // Parse AI response into structured insights
      return this.parseInsights(response.content);
    } catch (error) {
      this.logger.error(`Insight generation failed: ${(error as Error).message}`);
      // Fall back to rule-based insights
      return this.generateFallbackInsights();
    }
  }

  async generateInsightsForCategory(category: BusinessInsight['category']): Promise<BusinessInsight[]> {
    const allInsights = await this.generateFallbackInsights();
    return allInsights.filter((i) => i.category === category);
  }

  private async parseInsights(_content: string): Promise<BusinessInsight[]> {
    // Parse AI response into insights (in production, parse structured JSON from AI)
    return this.generateFallbackInsights();
  }

  private generateFallbackInsights(): BusinessInsight[] {
    const insights: BusinessInsight[] = [];
    const now = new Date();

    // Sales insights
    insights.push({
      id: `insight-sales-${Date.now()}`,
      type: 'info',
      category: 'sales',
      title: 'Sales Performance Overview',
      description: 'Track your sales performance across quotations, orders, and invoices. Check the Sales Dashboard for detailed metrics.',
      confidence: 0.85,
      actionLabel: 'View Sales Dashboard',
      actionPath: '/sales/dashboard',
      generatedAt: now,
    });

    // Inventory insights
    insights.push({
      id: `insight-inv-${Date.now()}`,
      type: 'positive',
      category: 'inventory',
      title: 'Inventory Health Monitoring',
      description: 'Monitor stock levels, fast-moving items, and aging inventory to optimize your warehouse operations.',
      confidence: 0.9,
      actionLabel: 'View Inventory',
      actionPath: '/inventory/dashboard',
      generatedAt: now,
    });

    // Finance insights
    insights.push({
      id: `insight-fin-${Date.now()}`,
      type: 'info',
      category: 'finance',
      title: 'Financial Health Summary',
      description: 'Review your financial position including revenue, expenses, and cash flow trends.',
      confidence: 0.85,
      actionLabel: 'View Finance Dashboard',
      actionPath: '/finance/dashboard',
      generatedAt: now,
    });

    // Purchase insights
    insights.push({
      id: `insight-pur-${Date.now()}`,
      type: 'info',
      category: 'purchase',
      title: 'Purchase Activity',
      description: 'Monitor purchase orders, GRN status, and supplier performance for better procurement decisions.',
      confidence: 0.85,
      actionLabel: 'View Purchase Dashboard',
      actionPath: '/purchase/dashboard',
      generatedAt: now,
    });

    // GST insights
    insights.push({
      id: `insight-gst-${Date.now()}`,
      type: 'warning',
      category: 'gst',
      title: 'GST Compliance Check',
      description: 'Ensure timely GST return filing and input tax credit reconciliation. Check pending returns and tax liabilities.',
      confidence: 0.75,
      actionLabel: 'View GST Dashboard',
      actionPath: '/gst/dashboard',
      generatedAt: now,
    });

    // Operations insights
    insights.push({
      id: `insight-ops-${Date.now()}`,
      type: 'negative',
      category: 'operations',
      title: 'Pending Approvals',
      description: 'Check your pending workflow approvals and tasks that require attention to keep operations running smoothly.',
      confidence: 0.7,
      actionLabel: 'View Approvals',
      actionPath: '/workflow/approvals',
      generatedAt: now,
    });

    return insights;
  }

  private getSystemSnapshot(): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      modules: ['sales', 'purchase', 'inventory', 'finance', 'gst', 'workflow', 'dms'],
      period: 'current',
      metrics: {
        sales: { status: 'active', trend: 'stable' },
        inventory: { status: 'active', items: 'available' },
        finance: { status: 'active', period: 'current' },
      },
    };
  }
}
