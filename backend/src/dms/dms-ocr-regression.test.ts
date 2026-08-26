/**
 * DMS OCR Provider Abstraction Regression Tests
 * ==============================================
 * Tests that the OCR engine uses a clean provider abstraction
 * and the simulated provider is clearly marked.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

describe('DMS OCR Provider Abstraction Tests', () => {
  describe('OCR Provider Interface', () => {
    it('ocr-provider.interface.ts defines proper interface', () => {
      const filePath = join(process.cwd(), 'src', 'dms', 'services', 'ocr-provider.interface.ts');
      const source = readFileSync(filePath, 'utf-8');

      expect(source).toContain('export interface OcrProvider');
      expect(source).toContain('readonly name: string');
      expect(source).toContain('isAvailable()');
      expect(source).toContain('processDocument(');
    });
  });

  describe('Simulated OCR Provider', () => {
    it('simulated-ocr.provider.ts is clearly marked as simulated', () => {
      const filePath = join(process.cwd(), 'src', 'dms', 'services', 'simulated-ocr.provider.ts');
      const source = readFileSync(filePath, 'utf-8');

      expect(source).toContain('SimulatedOcrProvider');
      expect(source).toContain('NOT real OCR');
      expect(source).toContain("readonly name = 'simulated'");
      expect(source).toContain('SIMULATED OCR');
    });

    it('simulated provider always returns available', async () => {
      const { SimulatedOcrProvider } = await import('../dms/services/simulated-ocr.provider');
      const provider = new SimulatedOcrProvider();

      expect(provider.name).toBe('simulated');
      expect(await provider.isAvailable()).toBe(true);
    });

    it('simulated provider returns simulated results', async () => {
      const { SimulatedOcrProvider } = await import('../dms/services/simulated-ocr.provider');
      const provider = new SimulatedOcrProvider();

      const result = await provider.processDocument(
        Buffer.from('test'),
        'application/pdf',
        'invoice',
      );

      expect(result.engine).toBe('simulated');
      expect(result.rawText).toContain('SIMULATED OCR');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.fields.length).toBeGreaterThan(0);
    });
  });

  describe('OCR Engine uses provider abstraction', () => {
    it('ocr-engine.service.ts imports and uses OcrProvider', () => {
      const filePath = join(process.cwd(), 'src', 'dms', 'services', 'ocr-engine.service.ts');
      const source = readFileSync(filePath, 'utf-8');

      expect(source).toContain("import { OcrProvider, OcrResult } from './ocr-provider.interface'");
      expect(source).toContain("import { SimulatedOcrProvider } from './simulated-ocr.provider'");
      expect(source).toContain('private provider: OcrProvider');
      expect(source).toContain('setProvider(provider: OcrProvider)');
      expect(source).toContain('this.provider.name');
    });

    it('engine falls back to simulated provider by default', () => {
      const filePath = join(process.cwd(), 'src', 'dms', 'services', 'ocr-engine.service.ts');
      const source = readFileSync(filePath, 'utf-8');

      expect(source).toContain('new SimulatedOcrProvider()');
    });

    it('engine result includes isSimulated flag', () => {
      const filePath = join(process.cwd(), 'src', 'dms', 'services', 'ocr-engine.service.ts');
      const source = readFileSync(filePath, 'utf-8');

      expect(source).toContain('isSimulated');
    });
  });
});
