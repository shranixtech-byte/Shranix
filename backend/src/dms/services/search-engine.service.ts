import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SearchEngineService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Full-text search across all documents.
   */
  async searchDocuments(
    query: string,
    filters?: {
      category?: string;
      documentType?: string;
      status?: string;
      folderId?: string;
      linkedModule?: string;
      tags?: string[];
      fromDate?: string;
      toDate?: string;
      financialYearId?: string;
    },
    pagination?: { page: number; pageSize: number },
  ) {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    // Build filters array for the enterprise query builder
    const dbFilters: any[] = [];
    if (filters?.category) {
      dbFilters.push({ field: 'category', operator: 'eq', value: filters.category });
    }
    if (filters?.documentType) {
      dbFilters.push({ field: 'documentType', operator: 'eq', value: filters.documentType });
    }
    if (filters?.status) {
      dbFilters.push({ field: 'status', operator: 'eq', value: filters.status });
    }
    if (filters?.folderId) {
      dbFilters.push({ field: 'folderId', operator: 'eq', value: filters.folderId });
    }
    if (filters?.linkedModule) {
      dbFilters.push({ field: 'linkedModule', operator: 'eq', value: filters.linkedModule });
    }

    const allDocs = await this.database.documents.findAll({
      page: 1,
      pageSize: 1000,
      search: query,
      filters: dbFilters.length > 0 ? dbFilters : undefined,
    } as any);
    let results = (allDocs.data || []) as any[];

    // Apply date filters in-memory (not supported by query builder yet)
    if (filters?.fromDate) {
      results = results.filter((d: any) => d.createdAt >= filters!.fromDate!);
    }
    if (filters?.toDate) {
      results = results.filter((d: any) => d.createdAt <= filters!.toDate!);
    }

    // Paginate
    const total = results.length;
    const start = (page - 1) * pageSize;
    const data = results.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Search by OCR extracted content.
   */
  async searchOcrContent(query: string) {
    const ocrResults = await this.database.ocrResults.findAll({ page: 1, pageSize: 100 } as any);
    const q = query.toLowerCase();
    const results = (ocrResults.data || []).filter(
      (o: any) =>
        (o.rawText?.toLowerCase() || '').includes(q) ||
        (o.processedText?.toLowerCase() || '').includes(q) ||
        (o.invoiceNumber?.toLowerCase() || '').includes(q) ||
        (o.poNumber?.toLowerCase() || '').includes(q) ||
        (o.gstNumber?.toLowerCase() || '').includes(q) ||
        (o.supplierName?.toLowerCase() || '').includes(q),
    );

    return { data: results, total: results.length };
  }

  /**
   * Advanced search with combined criteria.
   */
  async advancedSearch(
    criteria: {
      name?: string;
      documentNumber?: string;
      category?: string;
      status?: string;
      tags?: string[];
      linkedModule?: string;
      linkedEntityNumber?: string;
      fromDate?: string;
      toDate?: string;
      ownerId?: string;
    },
    pagination?: { page: number; pageSize: number },
  ) {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    const allDocs = await this.database.documents.findAll({ page: 1, pageSize: 1000 } as any);
    const results = (allDocs.data || []).filter((d: any) => {
      let match = true;
      if (criteria.name && !(d.name?.toLowerCase() || '').includes(criteria.name.toLowerCase())) {
        match = false;
      }
      if (criteria.documentNumber && d.documentNumber !== criteria.documentNumber) {
        match = false;
      }
      if (criteria.category && d.category !== criteria.category) {
        match = false;
      }
      if (criteria.status && d.status !== criteria.status) {
        match = false;
      }
      if (criteria.linkedModule && d.linkedModule !== criteria.linkedModule) {
        match = false;
      }
      if (criteria.linkedEntityNumber && d.linkedEntityNumber !== criteria.linkedEntityNumber) {
        match = false;
      }
      if (criteria.ownerId && d.ownerId !== criteria.ownerId) {
        match = false;
      }
      return match;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    const data = results.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
