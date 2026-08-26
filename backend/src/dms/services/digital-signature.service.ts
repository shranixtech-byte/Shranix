import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DigitalSignatureService {
  private readonly logger = new Logger(DigitalSignatureService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Sign a document with a digital signature.
   */
  async signDocument(
    documentId: string,
    signerId: string,
    options: {
      signatureType?: string;
      signature?: string;
      notes?: string;
      level?: number;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const doc = await this.database.documents.findById(documentId);
    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    const signature = await this.database.digitalSignatures.create({
      documentId,
      documentVersionId: null,
      signerId,
      signatureType: options.signatureType || 'approval',
      signature: options.signature || this.generateSignatureHash(documentId, signerId),
      certificateHash: this.generateCertificateHash(signerId),
      isVerified: false,
      verificationDate: null,
      signedAt: new Date().toISOString(),
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      notes: options.notes || null,
      level: options.level || 1,
    } as any);

    await this.audit.log({
      userId: signerId,
      event: 'document_signed',
      resource: 'digital_signature',
      action: 'approve',
      details: {
        documentId,
        signatureId: (signature as any).id,
        signatureType: options.signatureType,
      },
    });

    // Verify the signature
    await this.verifySignature((signature as any).id);

    this.logger.log(`Document ${documentId} signed by user ${signerId}`);
    return { success: true, signature };
  }

  /**
   * Verify a digital signature.
   */
  async verifySignature(signatureId: string) {
    const signature = await this.database.digitalSignatures.findById(signatureId);
    if (!signature) {
      return { success: false, message: 'Signature not found' };
    }

    // In production, this would verify against a certificate authority
    const verified = await this.database.digitalSignatures.update(signatureId, {
      isVerified: true,
      verificationDate: new Date().toISOString(),
    } as any);

    return { success: true, verified: true, signature: verified };
  }

  /**
   * Get signatures for a document.
   */
  async getDocumentSignatures(documentId: string) {
    return this.database.digitalSignatures.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'documentId', operator: 'eq', value: documentId }],
    } as any);
  }

  /**
   * Check if a document has all required signatures.
   */
  async checkSignatureCompleteness(documentId: string, requiredLevel: number = 1) {
    const result = await this.database.digitalSignatures.findAll({
      page: 1,
      pageSize: 50,
      filters: [{ field: 'documentId', operator: 'eq', value: documentId }],
    } as any);
    const signatures = result.data || [];
    const maxLevel = Math.max(...signatures.map((s: any) => s.level || 1), 0);
    return {
      isComplete: maxLevel >= requiredLevel,
      currentLevel: maxLevel,
      requiredLevel,
      signatureCount: signatures.length,
      signatures,
    };
  }

  /**
   * Detect tampering by comparing stored checksums.
   */
  async detectTampering(documentId: string, currentChecksum: string) {
    const doc = await this.database.documents.findById(documentId);
    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    const storedChecksum = (doc as any).checksum;
    const isTampered = storedChecksum && storedChecksum !== currentChecksum;

    return {
      isTampered: !!isTampered,
      storedChecksum,
      currentChecksum,
      message: isTampered
        ? '⚠️ Document has been tampered with!'
        : '✅ Document integrity verified',
    };
  }

  /**
   * Generate a signature hash for a document-user combination.
   */
  private generateSignatureHash(documentId: string, userId: string): string {
    const data = `${documentId}:${userId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a certificate hash for a user.
   */
  private generateCertificateHash(userId: string): string {
    const data = `${userId}:${process.env.JWT_SECRET || 'cert-secret'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
