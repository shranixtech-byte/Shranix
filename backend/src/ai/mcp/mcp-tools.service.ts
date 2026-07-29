import { Injectable } from '@nestjs/common';

export interface McpTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

@Injectable()
export class McpToolsService {
  private readonly tools: Map<string, McpTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // ERP Data Tools
    this.register({
      name: 'get_sales_data',
      description: 'Retrieve sales data including orders, invoices, and customer information',
      parameters: {
        type: { type: 'string', description: 'Type of sales data (orders, invoices, quotations, returns)', required: true },
        dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        status: { type: 'string', description: 'Filter by status (draft, submitted, approved, completed)' },
        limit: { type: 'number', description: 'Maximum records to return' },
      },
      handler: async (args) => ({ module: 'sales', args, message: 'Sales data tool ready. Implement actual DB query.' }),
    });

    this.register({
      name: 'get_purchase_data',
      description: 'Retrieve purchase data including orders, GRN, and supplier information',
      parameters: {
        type: { type: 'string', description: 'Type of purchase data (orders, grn, invoices, quotations)', required: true },
        dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        supplierId: { type: 'string', description: 'Filter by supplier' },
      },
      handler: async (args) => ({ module: 'purchase', args, message: 'Purchase data tool ready.' }),
    });

    this.register({
      name: 'get_inventory_data',
      description: 'Retrieve inventory and stock data',
      parameters: {
        warehouseId: { type: 'string', description: 'Filter by warehouse' },
        lowStock: { type: 'boolean', description: 'Show only low stock items' },
        category: { type: 'string', description: 'Filter by category' },
      },
      handler: async (args) => ({ module: 'inventory', args, message: 'Inventory data tool ready.' }),
    });

    this.register({
      name: 'get_financial_data',
      description: 'Retrieve financial data including GL entries, trial balance, and reports',
      parameters: {
        reportType: { type: 'string', description: 'Type of report (trial_balance, pnl, balance_sheet, cash_flow)', required: true },
        dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        costCenterId: { type: 'string', description: 'Filter by cost center' },
      },
      handler: async (args) => ({ module: 'finance', args, message: 'Financial data tool ready.' }),
    });

    this.register({
      name: 'get_gst_data',
      description: 'Retrieve GST-related data including returns, tax ledger, and compliance status',
      parameters: {
        type: { type: 'string', description: 'Type of GST data (returns, ledger, registrations)', required: true },
        period: { type: 'string', description: 'Period (e.g., 2024-25)' },
      },
      handler: async (args) => ({ module: 'gst', args, message: 'GST data tool ready.' }),
    });

    this.register({
      name: 'get_workflow_data',
      description: 'Retrieve workflow and approval data',
      parameters: {
        type: { type: 'string', description: 'Type (approvals, tasks, history)', required: true },
        status: { type: 'string', description: 'Filter by status' },
        assignee: { type: 'string', description: 'Filter by assignee' },
      },
      handler: async (args) => ({ module: 'workflow', args, message: 'Workflow data tool ready.' }),
    });

    this.register({
      name: 'get_report_data',
      description: 'Generate and retrieve ERP reports',
      parameters: {
        reportName: { type: 'string', description: 'Name of the report', required: true },
        format: { type: 'string', description: 'Output format (json, csv, pdf)' },
        dateFrom: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      handler: async (args) => ({ module: 'reports', args, message: 'Report generation tool ready.' }),
    });

    // DMS Tools
    this.register({
      name: 'get_document_data',
      description: 'Search and retrieve documents from DMS',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
        type: { type: 'string', description: 'Filter by document type' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      handler: async (args) => ({ module: 'dms', args, message: 'DMS search tool ready.' }),
    });

    // Notification Tools
    this.register({
      name: 'send_notification',
      description: 'Send a notification to a user or group',
      parameters: {
        type: { type: 'string', description: 'Notification type (in_app, email)', required: true },
        userId: { type: 'string', description: 'Target user ID', required: true },
        title: { type: 'string', description: 'Notification title', required: true },
        message: { type: 'string', description: 'Notification message', required: true },
      },
      handler: async (args) => ({ module: 'notifications', args, message: 'Notification tool ready.' }),
    });
  }

  register(tool: McpTool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): McpTool | undefined {
    return this.tools.get(name);
  }

  getAll(): McpTool[] {
    return Array.from(this.tools.values());
  }

  getManifest(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Tool not found: ${name}` };
    }

    try {
      const data = await tool.handler(args);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
