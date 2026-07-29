import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SearchEngineService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Full-text search across all documents.
   */
  async searchDocuments(query: string, filters?: {
    category?: string;
    documentType?: string;
    status?: string;
    folderId?: string;
    linkedModule?: string;
    tags?: string[];
    fromDate?: string;
    toDate?: string;
    financialYearId?: string;
  }, pagination?: { page: number; pageSize: number }) {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    // In production, this would use PostgreSQL full-text search or SQLite FTS5
    // For now, we filter by category/type with basic search
    const allDocs = await this.database.documents.findAll({ page: 1, pageSize: 1000 } as any);
    let results = (allDocs.data || []) as any[];

    // Apply search query
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((d: any) =>
        (d.name?.toLowerCase() || '').includes(q) ||
        (d.documentNumber?.toLowerCase() || '').includes(q) ||
        (d.description?.toLowerCase() || '').includes(q) ||
        (d.linkedEntityNumber?.toLowerCase() || '').includes(q)
      );
    }

    // Apply filters
    if (filters?.category) {results = results.filter((d: any) => d.category === filters.category);}
    if (filters?.documentType) {results = results.filter((d: any) => d.documentType === filters.documentType);}
    if (filters?.status) {results = results.filter((d: any) => d.status === filters.status);}
    if (filters?.folderId) {results = results.filter((d: any) => d.folderId === filters.folderId);}
    if (filters?.linkedModule) {results = results.filter((d: any) => d.linkedModule === filters.linkedModule);}
    if (filters?.fromDate) {results = results.filter((d: any) => d.createdAt >= filters!.fromDate!);}
    if (filters?.toDate) {results = results.filter((d: any) => d.createdAt <= filters!.toDate!);}

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
    const results = (ocrResults.data || []).filter((o: any) =>
      (o.rawText?.toLowerCase() || '').includes(q) ||
      (o.processedText?.toLowerCase() || '').includes(q) ||
      (o.invoiceNumber?.toLowerCase() || '').includes(q) ||
      (o.poNumber?.toLowerCase() || '').includes(q) ||
      (o.gstNumber?.toLowerCase() || '').includes(q) ||
      (o.supplierName?.toLowerCase() || '').includes(q)
    );

    return { data: results, total: results.length };
  }

  /**
   * Advanced search with combined criteria.
   */
  async advancedSearch(criteria: {
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
  }, pagination?: { page: number; pageSize: number }) {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    const allDocs = await this.database.documents.findAll({ page: 1, pageSize: 1000 } as any);
    const results = (allDocs.data || []).filter((d: any) => {
      let match = true;
      if (criteria.name && !(d.name?.toLowerCase() || '').includes(criteria.name.toLowerCase())) {match = false;}
      if (criteria.documentNumber && d.documentNumber !== criteria.documentNumber) {match = false;}
      if (criteria.category && d.category !== criteria.category) {match = false;}
      if (criteria.status && d.status !== criteria.status) {match = false;}
      if (criteria.linkedModule && d.linkedModule !== criteria.linkedModule) {match = false;}
      if (criteria.linkedEntityNumber && d.linkedEntityNumber !== criteria.linkedEntityNumber) {match = false;}
      if (criteria.ownerId && d.ownerId !== criteria.ownerId) {match = false;}
      return match;
    });

    const total = results.length;
    const start = (page - 1) * pageSize;
    const data = results.slice(start, start + pageSize);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
