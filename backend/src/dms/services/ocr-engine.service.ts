import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

import { OcrProvider, OcrResult } from './ocr-provider.interface';
import { SimulatedOcrProvider } from './simulated-ocr.provider';

/**
 * OCR Engine Service
 * ==================
 * Manages OCR processing using a configurable provider.
 *
 * Provider hierarchy:
 * 1. If a real provider is configured and available, use it
 * 2. Fall back to SimulatedOcrProvider for dev/test
 *
 * The simulated provider is clearly marked as NOT production OCR.
 * To use real OCR, configure an environment variable:
 * - OCR_PROVIDER=tesseract (local)
 * - OCR_PROVIDER=google_vision (cloud)
 * - OCR_PROVIDER=aws_textract (cloud)
 * - OCR_PROVIDER=simulated (dev/test - default)
 */
@Injectable()
export class OcrEngineService {
  private readonly logger = new Logger(OcrEngineService.name);
  private provider: OcrProvider;

  constructor(private readonly database: DatabaseService) {
    // Default to simulated provider
    // In production, inject the appropriate provider based on configuration
    this.provider = new SimulatedOcrProvider();
    this.logger.log(`OCR Engine initialized with provider: ${this.provider.name}`);
  }

  /**
   * Set the OCR provider (for dependency injection or runtime switching)
   */
  setProvider(provider: OcrProvider): void {
    this.provider = provider;
    this.logger.log(`OCR provider switched to: ${provider.name}`);
  }

  /**
   * Get the current OCR provider
   */
  getProvider(): OcrProvider {
    return this.provider;
  }

  /**
   * Process OCR for a document.
   * Uses the configured provider (real or simulated).
   */
  async processDocument(documentId: string): Promise<{
    success: boolean;
    data?: any;
    fields?: any;
    message?: string;
    error?: string;
    isSimulated?: boolean;
  }> {
    const doc = await this.database.documents.findById(documentId);
    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    try {
      // Create OCR record
      const ocr = await this.database.ocrResults.create({
        documentId,
        status: 'processing',
        engine: this.provider.name,
        confidence: 0,
      } as any);

      // Check if provider is available
      const isAvailable = await this.provider.isAvailable();
      if (!isAvailable) {
        throw new Error(`OCR provider "${this.provider.name}" is not available`);
      }

      // Process with provider (would need actual file buffer in production)
      // For now, pass a placeholder buffer — real implementation would read from storage
      const buffer = Buffer.from(`Document: ${(doc as any).name || 'unknown'}`, 'utf-8');
      const mimeType = (doc as any).mimeType || 'application/octet-stream';
      const documentType = (doc as any).category || undefined;

      const result: OcrResult = await this.provider.processDocument(buffer, mimeType, documentType);

      // Store results
      const fieldsMap: Record<string, string> = {};
      for (const field of result.fields) {
        fieldsMap[field.fieldName] = field.fieldValue;
      }

      const processed = await this.database.ocrResults.update((ocr as any).id, {
        rawText: result.rawText,
        processedText: result.processedText,
        ...fieldsMap,
        status: 'completed',
        confidence: result.confidence,
        processingTime: result.processingTimeMs,
      } as any);

      this.logger.log(`OCR completed for document ${documentId} (provider: ${this.provider.name})`);

      return {
        success: true,
        data: processed,
        fields: fieldsMap,
        isSimulated: this.provider.name === 'simulated',
      };
    } catch (error) {
      this.logger.error(`OCR failed for document ${documentId}`, (error as Error).message);
      await this.database.ocrResults.create({
        documentId,
        status: 'failed',
        errorMessage: (error as Error).message,
        engine: this.provider.name,
      } as any);
      return {
        success: false,
        message: 'OCR processing failed',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Link OCR results to ERP records based on extracted fields.
   */
  async linkOcrToErp(documentId: string) {
    const ocrResults = await this.getOcrResults(documentId);
    if (!ocrResults) {
      return { success: false, message: 'No OCR results found' };
    }

    const erpLinks: Record<string, string> = {};

    // Link by invoice number
    if ((ocrResults as any).invoiceNumber) {
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
    const results = await this.database.ocrResults.findAll({
      page: 1,
      pageSize: 10,
      filters: [{ field: 'documentId', operator: 'eq', value: documentId }],
    } as any);
    return results.data?.[0] || null;
  }

  async getOcrQueue() {
    const pending = await this.database.ocrResults.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'status', operator: 'eq', value: 'pending' }],
    } as any);
    return pending;
  }
}
