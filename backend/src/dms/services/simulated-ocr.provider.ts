import { OcrProvider, OcrResult } from './ocr-provider.interface';

/**
 * Simulated OCR Provider
 * =======================
 * Returns simulated OCR results for development and testing.
 * Clearly marked as simulated - NOT real OCR.
 *
 * In production, replace with a real provider:
 * - TesseractOcrProvider (local)
 * - CloudOcrProvider (Google Vision, AWS Textract)
 */
export class SimulatedOcrProvider implements OcrProvider {
  readonly name = 'simulated';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async processDocument(
    _buffer: Buffer,
    _mimeType: string,
    documentType?: string,
  ): Promise<OcrResult> {
    const startTime = Date.now();

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const fields = this.generateSimulatedFields(documentType);
    const rawText = this.generateSimulatedText(documentType);

    return {
      rawText,
      processedText: rawText,
      fields,
      confidence: 0.85,
      processingTimeMs: Date.now() - startTime,
      engine: 'simulated',
    };
  }

  private generateSimulatedFields(
    documentType?: string,
  ): { fieldName: string; fieldValue: string; confidence: number }[] {
    const baseFields = [
      { fieldName: 'document_type', fieldValue: documentType || 'unknown', confidence: 0.9 },
    ];

    switch (documentType) {
      case 'invoice':
        return [
          ...baseFields,
          { fieldName: 'invoice_number', fieldValue: `INV-${Date.now()}`, confidence: 0.88 },
          {
            fieldName: 'supplier_name',
            fieldValue: 'Simulated Supplier Pvt Ltd',
            confidence: 0.82,
          },
          { fieldName: 'gst_number', fieldValue: '22AAAAA0000A1Z5', confidence: 0.9 },
          {
            fieldName: 'document_date',
            fieldValue: new Date().toISOString().split('T')[0],
            confidence: 0.95,
          },
          { fieldName: 'total_amount', fieldValue: '0.00', confidence: 0.85 },
          { fieldName: 'tax_amount', fieldValue: '0.00', confidence: 0.8 },
        ];
      case 'purchase_order':
        return [
          ...baseFields,
          { fieldName: 'po_number', fieldValue: `PO-${Date.now()}`, confidence: 0.9 },
          {
            fieldName: 'supplier_name',
            fieldValue: 'Simulated Supplier Pvt Ltd',
            confidence: 0.82,
          },
          {
            fieldName: 'document_date',
            fieldValue: new Date().toISOString().split('T')[0],
            confidence: 0.95,
          },
          { fieldName: 'total_amount', fieldValue: '0.00', confidence: 0.85 },
        ];
      case 'gst_return':
        return [
          ...baseFields,
          { fieldName: 'gstin', fieldValue: '22AAAAA0000A1Z5', confidence: 0.92 },
          {
            fieldName: 'document_date',
            fieldValue: new Date().toISOString().split('T')[0],
            confidence: 0.95,
          },
          { fieldName: 'total_amount', fieldValue: '0.00', confidence: 0.85 },
        ];
      default:
        return baseFields;
    }
  }

  private generateSimulatedText(documentType?: string): string {
    return (
      `[SIMULATED OCR] Document type: ${documentType || 'unknown'}\n` +
      `This is simulated OCR text. In production, this would contain actual extracted text from the document.\n` +
      `Provider: simulated | Confidence: 0.85`
    );
  }
}
