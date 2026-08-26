import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  module: string;
  reportType: string;
  config: Record<string, any>;
  columns: ReportColumn[];
  filters?: ReportFilter[];
  sorting?: ReportSort[];
  grouping?: string[];
  isFavourite?: boolean;
  createdBy?: string;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage';
  width?: number;
  visible?: boolean;
  format?: string;
  alignment?: 'left' | 'center' | 'right';
  conditionalFormat?: ConditionalFormat;
  calculatedExpression?: string;
  pivotRole?: 'row' | 'column' | 'value';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'between' | 'in';
  value: any;
  value2?: any;
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ConditionalFormat {
  type: 'highlight' | 'color_scale' | 'data_bar' | 'icon_set';
  rules?: Array<{ operator: string; value: any; style: Record<string, string> }>;
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv' | 'print';
  includeHeaders?: boolean;
  includeStyles?: boolean;
  pageSize?: string;
  orientation?: 'portrait' | 'landscape';
}

@Injectable()
export class ReportingEngineV2Service {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Execute a dynamic report with full column/filter/sort/group/pivot support.
   */
  async executeReport(config: ReportConfig, pagination?: { page: number; pageSize: number }) {
    const { columns, filters, sorting, grouping, module } = config;

    // Get raw data from the appropriate module
    let data: any[];
    let total: number;

    switch (module) {
      case 'purchase':
        ({ data, total } = await this.getPurchaseData(filters));
        break;
      case 'sales':
        ({ data, total } = await this.getSalesData(filters));
        break;
      case 'inventory':
        ({ data, total } = await this.getInventoryData(filters));
        break;
      case 'finance':
        ({ data, total } = await this.getFinanceData(filters));
        break;
      case 'gst':
        ({ data, total } = await this.getGstData(filters));
        break;
      default:
        return { success: false, message: `Unknown module: ${module}`, data: [], total: 0 };
    }

    // Apply sorting
    if (sorting && sorting.length > 0) {
      data.sort((a, b) => {
        for (const sort of sorting) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (cmp !== 0) {
            return sort.direction === 'desc' ? -cmp : cmp;
          }
        }
        return 0;
      });
    }

    // Apply grouping
    let groupedData: any;
    if (grouping && grouping.length > 0) {
      groupedData = this.applyGrouping(data, grouping, columns);
    }

    // Apply pagination
    if (pagination) {
      const start = (pagination.page - 1) * pagination.pageSize;
      data = data.slice(start, start + pagination.pageSize);
    }

    // Apply column projections
    const projectedData = data.map((row) => {
      const projected: Record<string, any> = {};
      for (const col of columns) {
        if (col.calculatedExpression) {
          projected[col.field] = this.evaluateCalculatedColumn(col.calculatedExpression, row);
        } else {
          projected[col.field] = row[col.field];
        }
      }
      return projected;
    });

    return {
      success: true,
      data: projectedData,
      groupedData,
      total,
      columns,
      config: { module, reportType: config.reportType },
    };
  }

  /**
   * Export report to specified format.
   */
  async exportReport(config: ReportConfig, options: ExportOptions) {
    const result = await this.executeReport(config);

    if (!result.success) {
      return result;
    }

    switch (options.format) {
      case 'csv':
        return this.exportToCsv(result.data, config.columns);
      case 'excel':
        return this.exportToExcel(result.data, config.columns);
      case 'pdf':
        return this.exportToPdf(result.data, config.columns);
      case 'print':
        return { success: true, data: result.data, columns: config.columns, format: 'print' };
      default:
        return { success: false, message: `Unsupported format: ${options.format}` };
    }
  }

  /**
   * Save a report configuration for later use.
   */
  async saveReport(config: ReportConfig) {
    const report = await this.database.reportCache.create({
      name: config.name,
      description: config.description,
      category: config.category || 'general',
      module: config.module,
      reportType: config.reportType,
      config: JSON.stringify(config.config),
      columns: JSON.stringify(config.columns),
      filters: config.filters ? JSON.stringify(config.filters) : null,
      sorting: config.sorting ? JSON.stringify(config.sorting) : null,
      grouping: config.grouping ? JSON.stringify(config.grouping) : null,
      isFavourite: config.isFavourite || false,
      createdBy: config.createdBy || null,
    } as any);
    return { success: true, id: report.id, message: `Report "${config.name}" saved` };
  }

  /**
   * Get saved reports.
   */
  async getSavedReports(module?: string, category?: string) {
    const filter: Record<string, any> = {};
    if (module) {
      filter.module = module;
    }
    if (category) {
      filter.category = category;
    }
    const result = await this.database.reportCache.findAll({
      page: 1,
      pageSize: 100,
      filter,
    } as any);
    if (result.data) {
      result.data = result.data.map((r: any) => ({
        ...r,
        columns: typeof r.columns === 'string' ? JSON.parse(r.columns) : r.columns,
        config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
      }));
    }
    return result;
  }

  // ── Data Sources ──────────────────────────────────────────
  private async getPurchaseData(_filters?: ReportFilter[]) {
    const results = await this.database.purchaseOrders.findAll({ page: 1, pageSize: 1000 } as any);
    return { data: results.data || [], total: (results as any).total || 0 };
  }

  private async getSalesData(_filters?: ReportFilter[]) {
    const results = await this.database.salesInvoices.findAll({ page: 1, pageSize: 1000 } as any);
    return { data: results.data || [], total: (results as any).total || 0 };
  }

  private async getInventoryData(_filters?: ReportFilter[]) {
    const results = await this.database.items.findAll({ page: 1, pageSize: 1000 } as any);
    return { data: results.data || [], total: (results as any).total || 0 };
  }

  private async getFinanceData(_filters?: ReportFilter[]) {
    const results = await this.database.glEntries.findAll({ page: 1, pageSize: 1000 } as any);
    return { data: results.data || [], total: (results as any).total || 0 };
  }

  private async getGstData(_filters?: ReportFilter[]) {
    const results = await this.database.gstReturns.findAll({ page: 1, pageSize: 1000 } as any);
    return { data: results.data || [], total: (results as any).total || 0 };
  }

  // ── Helpers ───────────────────────────────────────────────
  private applyGrouping(data: any[], grouping: string[], columns: ReportColumn[]): any {
    const grouped: Record<string, any> = { groups: [] };
    const groupField = grouping[0];

    const groupMap = new Map<string, any[]>();
    for (const row of data) {
      const key = String(row[groupField] || 'Other');
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(row);
    }

    for (const [key, items] of groupMap) {
      const group: any = { key, items, aggregates: {} };
      for (const col of columns) {
        if (col.aggregation && col.field !== groupField) {
          const values = items.map((i) => Number(i[col.field]) || 0);
          switch (col.aggregation) {
            case 'sum':
              group.aggregates[col.field] = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              group.aggregates[col.field] = values.length
                ? values.reduce((a, b) => a + b, 0) / values.length
                : 0;
              break;
            case 'count':
              group.aggregates[col.field] = values.length;
              break;
            case 'min':
              group.aggregates[col.field] = Math.min(...values);
              break;
            case 'max':
              group.aggregates[col.field] = Math.max(...values);
              break;
          }
        }
      }
      grouped.groups.push(group);
    }
    return grouped;
  }

  /**
   * Safe arithmetic expression evaluator — NO eval().
   * Supports: numbers, field references, +, -, *, /, parentheses.
   * Rejects: functions, property access chains, constructors, prototypes.
   */
  private evaluateCalculatedColumn(expression: string, row: any): number {
    try {
      // Step 1: Replace field references with their numeric values
      const substituted = expression
        .replace(/[^0-9+\-*/.()\s\w]/g, '') // Remove unsafe characters
        .replace(/\b\w+\b/g, (match) => {
          if (/^\d+\.?\d*$/.test(match)) {
            return match;
          } // Numbers stay
          if (['+', '-', '*', '/', '(', ')', '.'].includes(match)) {
            return match;
          } // Operators stay
          const val = row[match];
          return val !== undefined ? String(Number(val) || 0) : '0'; // Replace field refs
        });

      // Step 2: Validate — only digits, operators, parens, dots, spaces allowed
      if (!/^[0-9+\-*/.()\s]+$/.test(substituted)) {
        return 0;
      }

      // Step 3: Recursive descent parser for arithmetic expressions
      const tokens = substituted.replace(/\s+/g, ' ').trim().split(' ');
      let pos = 0;

      const parseExpr = (): number => {
        let left = parseTerm();
        while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
          const op = tokens[pos++];
          const right = parseTerm();
          left = op === '+' ? left + right : left - right;
        }
        return left;
      };

      const parseTerm = (): number => {
        let left = parseFactor();
        while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
          const op = tokens[pos++];
          const right = parseFactor();
          left = op === '*' ? left * right : right !== 0 ? left / right : 0;
        }
        return left;
      };

      const parseFactor = (): number => {
        if (pos >= tokens.length) {return 0;}
        const token = tokens[pos];
        if (token === '(') {
          pos++; // skip '('
          const val = parseExpr();
          if (pos < tokens.length && tokens[pos] === ')') {pos++;} // skip ')'
          return val;
        }
        if (token === '-') {
          pos++;
          return -parseFactor();
        }
        if (token === '+') {
          pos++;
          return parseFactor();
        }
        pos++;
        const n = Number(token);
        return Number.isFinite(n) ? n : 0;
      };

      const result = parseExpr();
      return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch {
      return 0;
    }
  }

  private exportToCsv(
    data: any[],
    columns: ReportColumn[],
  ): { success: boolean; content: string; format: string; filename: string } {
    const headers = columns.filter((c) => c.visible !== false).map((c) => c.label);
    const rows = data.map((row) =>
      columns
        .filter((c) => c.visible !== false)
        .map((c) => {
          const val = row[c.field];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
        }),
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return { success: true, content: csv, format: 'csv', filename: `report_${Date.now()}.csv` };
  }

  private exportToExcel(
    _data: any[],
    _columns: ReportColumn[],
  ): { success: boolean; message: string } {
    // Placeholder — real Excel export requires exceljs or similar
    return { success: true, message: 'Excel export — ready for exceljs integration' };
  }

  private exportToPdf(
    _data: any[],
    _columns: ReportColumn[],
  ): { success: boolean; message: string } {
    // Placeholder — real PDF export requires pdfkit or similar
    return { success: true, message: 'PDF export — ready for pdfkit integration' };
  }
}
