/**
 * OCR Provider Interface
 * ======================
 * Clean abstraction for OCR providers.
 * Implementations:
 * - SimulatedOcrProvider (dev/test - returns simulated results)
 * - TesseractOcrProvider (local OCR via Tesseract.js - to be implemented)
 * - CloudOcrProvider (Google Vision / AWS Textract - to be implemented)
 */

export interface OcrExtractedField {
  fieldName: string;
  fieldValue: string;
  confidence: number;
}

export interface OcrResult {
  rawText: string;
  processedText: string;
  fields: OcrExtractedField[];
  confidence: number;
  processingTimeMs: number;
  engine: string;
}

export interface OcrProvider {
  /** Provider name for logging and record-keeping */
  readonly name: string;

  /** Whether this provider is available (e.g., API key configured) */
  isAvailable(): Promise<boolean>;

  /** Process a document buffer and return OCR results */
  processDocument(buffer: Buffer, mimeType: string, documentType?: string): Promise<OcrResult>;
}
