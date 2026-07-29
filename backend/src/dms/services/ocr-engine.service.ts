import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class OcrEngineService {
  private readonly logger = new Logger(OcrEngineService.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Process OCR for a document. In production, this would integrate with
   * Tesseract.js, Google Cloud Vision, or AWS Textract.
   */
  async processDocument(documentId: string) {
    const doc = await this.database.documents.findById(documentId);
    if (!doc) {return { success: false, message: 'Document not found' };}

    try {
      // Create OCR record
      const ocr = await this.database.ocrResults.create({
        documentId,
        status: 'processing',
        engine: 'tesseract',
        confidence: 0,
      } as any);

      // Simulate OCR processing — in production, integrate with actual OCR engine
      const extractedFields = this.extractFieldsFromDocument(doc);
      const processed = await this.database.ocrResults.update((ocr as any).id, {
        ...extractedFields,
        status: 'completed',
        confidence: 0.85,
        processingTime: Math.floor(Math.random() * 5000) + 1000,
      } as any);

      this.logger.log(`OCR completed for document ${documentId}`);
      return { success: true, data: processed, fields: extractedFields };
    } catch (error) {
      this.logger.error(`OCR failed for document ${documentId}`, (error as Error).message);
      await this.database.ocrResults.create({
        documentId, status: 'failed', errorMessage: (error as Error).message,
      } as any);
      return { success: false, message: 'OCR processing failed', error: (error as Error).message };
    }
  }

  /**
   * Extract fields from document based on its category.
   */
  private extractFieldsFromDocument(doc: any) {
    const baseFields = {
      rawText: `Extracted text from ${doc.name || 'document'}`,
      processedText: `Processed text from ${doc.name || 'document'}`,
    };

    // Category-specific extraction patterns
    switch (doc.category) {
      case 'invoice':
        return {
          ...baseFields,
          invoiceNumber: `INV-${Date.now()}`,
          supplierName: 'Extracted Supplier',
          gstNumber: '22AAAAA0000A1Z5',
          documentDate: new Date().toISOString().split('T')[0],
          totalAmount: 0,
          taxAmount: 0,
        };
      case 'purchase_order':
        return {
          ...baseFields,
          poNumber: `PO-${Date.now()}`,
          supplierName: 'Extracted Supplier',
          documentDate: new Date().toISOString().split('T')[0],
          totalAmount: 0,
        };
      case 'gst_return':
        return {
          ...baseFields,
          gstNumber: '22AAAAA0000A1Z5',
          documentDate: new Date().toISOString().split('T')[0],
          totalAmount: 0,
        };
      default:
        return baseFields;
    }
  }

  /**
   * Link OCR results to ERP records based on extracted fields.
   */
  async linkOcrToErp(documentId: string) {
    const ocrResults = await this.getOcrResults(documentId);
    if (!ocrResults) {return { success: false, message: 'No OCR results found' };}

    const erpLinks: Record<string, string> = {};

    // Link by invoice number
    if ((ocrResults as any).invoiceNumber) {
      // Search sales/purchase invoices by number
      erpLinks.invoice = (ocrResults as any).invoiceNumber;
    }

    // Link by PO number
    if ((ocrResults as any).poNumber) {
      erpLinks.purchaseOrder = (ocrResults as any).poNumber;
    }

    // Link by GST number
    if ((ocrResults as any).gstNumber) {
      erpLinks.gstRegistration = (ocrResults as any).gstNumber;
    }

    return { success: true, erpLinks };
  }

  async getOcrResults(documentId: string) {
    const results = await this.database.ocrResults.findAll({ page: 1, pageSize: 10, filter: { documentId } } as any);
    return results.data?.[0] || null;
  }

  async getOcrQueue() {
    const pending = await this.database.ocrResults.findAll({ page: 1, pageSize: 50, filter: { status: 'pending' } } as any);
    return pending;
  }
}
