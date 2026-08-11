import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

interface SearchTarget {
  key: string;
  label: string;
  repo: any;
  searchFields: string[];
  titleField: string;
  subtitleFields: string[];
  path: (id: string) => string;
  resultName?: string;
}

@Injectable()
export class GlobalSearchService {
  constructor(private readonly database: DatabaseService) {}

  private buildTargets(): SearchTarget[] {
    return [
      {
        key: 'customers',
        label: 'Customers',
        repo: this.database.customers,
        searchFields: ['name', 'firmName', 'mobile', 'email', 'gstin'],
        titleField: 'name',
        subtitleFields: ['firmName', 'mobile', 'gstin'],
        path: (id) => `/customers/${id}`,
      },
      {
        key: 'suppliers',
        label: 'Suppliers',
        repo: this.database.suppliers,
        searchFields: ['supplierName', 'name', 'mobile', 'email', 'gstin'],
        titleField: 'supplierName',
        subtitleFields: ['mobile', 'gstin'],
        path: (id) => `/suppliers/${id}`,
      },
      {
        key: 'products',
        label: 'Products',
        repo: this.database.items,
        searchFields: ['itemCode', 'name', 'itemName', 'sku', 'barcode'],
        titleField: 'name',
        subtitleFields: ['itemCode', 'sku'],
        path: (id) => `/inventory/products/${id}`,
      },
      {
        key: 'sales_invoices',
        label: 'Sales Invoices',
        repo: this.database.salesInvoices,
        searchFields: ['invoiceNumber', 'customerId', 'reference'],
        titleField: 'invoiceNumber',
        subtitleFields: ['customerName', 'grandTotal'],
        path: (id) => `/sales/invoices/${id}`,
        resultName: 'invoiceNumber',
      },
      {
        key: 'purchase_invoices',
        label: 'Purchase Invoices',
        repo: this.database.purchaseInvoices,
        searchFields: ['invoiceNumber', 'supplierInvoiceNo', 'supplierId'],
        titleField: 'invoiceNumber',
        subtitleFields: ['supplierName', 'grandTotal'],
        path: (id) => `/purchase/invoices/${id}`,
        resultName: 'invoiceNumber',
      },
      {
        key: 'sales_quotations',
        label: 'Quotations',
        repo: this.database.salesQuotations,
        searchFields: ['quoteNumber', 'customerId'],
        titleField: 'quoteNumber',
        subtitleFields: ['customerName', 'grandTotal'],
        path: (id) => `/sales/quotations/${id}`,
        resultName: 'quoteNumber',
      },
      {
        key: 'sales_orders',
        label: 'Sales Orders',
        repo: this.database.salesOrders,
        searchFields: ['orderNumber', 'customerId'],
        titleField: 'orderNumber',
        subtitleFields: ['customerName', 'grandTotal'],
        path: (id) => `/sales/orders/${id}`,
        resultName: 'orderNumber',
      },
      {
        key: 'purchase_orders',
        label: 'Purchase Orders',
        repo: this.database.purchaseOrders,
        searchFields: ['poNumber', 'supplierId'],
        titleField: 'poNumber',
        subtitleFields: ['supplierName', 'grandTotal'],
        path: (id) => `/purchase/orders/${id}`,
        resultName: 'poNumber',
      },
      {
        key: 'leads',
        label: 'Leads',
        repo: this.database.leads,
        searchFields: ['leadNumber', 'leadName', 'company', 'mobile', 'email'],
        titleField: 'leadName',
        subtitleFields: ['company', 'mobile'],
        path: (id) => `/crm/leads/${id}`,
      },
      {
        key: 'employees',
        label: 'Employees',
        repo: this.database.employees,
        searchFields: ['employeeCode', 'firstName', 'lastName', 'mobile', 'email', 'pan'],
        titleField: 'firstName',
        subtitleFields: ['employeeCode', 'mobile'],
        path: (id) => `/hr/employees/${id}`,
      },
      {
        key: 'assets',
        label: 'Assets',
        repo: this.database.assets,
        searchFields: ['assetCode', 'assetName', 'serialNumber', 'barcode'],
        titleField: 'assetName',
        subtitleFields: ['assetCode', 'serialNumber'],
        path: (id) => `/assets/${id}`,
      },
      {
        key: 'expenses',
        label: 'Expenses',
        repo: this.database.expenses,
        searchFields: ['expenseNumber', 'description', 'reference'],
        titleField: 'expenseNumber',
        subtitleFields: ['description', 'totalAmount'],
        path: (id) => `/expenses/${id}`,
        resultName: 'expenseNumber',
      },
    ];
  }

  /**
   * Search across all modules. `limit` per module keeps it fast. Results are
   * grouped by module. Permission scoping is enforced by the caller (frontend
   * hides unauthorized modules; backend can be extended with user roles).
   */
  async search(query: string, opts: { limit?: number; modules?: string[] } = {}) {
    const term = (query || '').trim();
    const limit = opts.limit || 5;
    if (!term) {
      return { query, results: [] };
    }
    const targets = this.buildTargets();
    const selected = opts.modules?.length
      ? targets.filter((t) => opts.modules!.includes(t.key))
      : targets;

    const results = await Promise.all(
      selected.map(async (t) => {
        try {
          const res = await t.repo.findAll({
            page: 1,
            pageSize: limit,
            search: term,
            searchFields: t.searchFields,
          } as any);
          const rows = (res.data || []).filter((r: any) => !r.isDeleted);
          return {
            key: t.key,
            label: t.label,
            total: res.total || rows.length,
            items: rows.slice(0, limit).map((r: any) => {
              const title = r[t.titleField] || r[t.resultName || t.titleField] || r.id;
              const sub = t.subtitleFields
                .map((f) => (r[f] !== undefined && r[f] !== null && r[f] !== '' ? r[f] : null))
                .filter(Boolean)
                .join(' • ');
              return {
                id: r.id,
                title: String(title),
                subtitle: sub ? String(sub) : '',
                path: t.path(r.id),
              };
            }),
          };
        } catch {
          return { key: t.key, label: t.label, total: 0, items: [] };
        }
      }),
    );

    return {
      query: term,
      total: results.reduce((s: number, r: any) => s + r.items.length, 0),
      results: results.filter((r: any) => r.items.length > 0),
    };
  }
}
