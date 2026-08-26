import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface StorageProvider {
  save(
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ storagePath: string; checksum: string; fileSize: number }>;
  retrieve(storagePath: string): Promise<Buffer | null>;
  delete(storagePath: string): Promise<boolean>;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly storagePath: string;
  private readonly maxFileSize: number = 50 * 1024 * 1024; // 50MB default

  constructor(private readonly database: DatabaseService) {
    this.storagePath = process.env.DMS_STORAGE_PATH || path.join(process.cwd(), 'storage', 'dms');
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Save a file to local storage with SHA-256 checksum.
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    _mimeType: string,
    documentId: string,
    versionNumber: number,
  ): Promise<{ storagePath: string; checksum: string; fileSize: number }> {
    // Validate file size
    if (buffer.length > this.maxFileSize) {
      throw new BadRequestException(
        `File exceeds maximum size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Generate secure filename
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${documentId}_v${versionNumber}_${Date.now()}_${sanitizedName}`;

    // Create document directory
    const docDir = path.join(this.storagePath, documentId);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
    }

    // Compute SHA-256 checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Write file
    const storagePath = path.join(docDir, filename);
    fs.writeFileSync(storagePath, buffer);

    this.logger.log(
      `File saved: ${storagePath} (${buffer.length} bytes, SHA-256: ${checksum.substring(0, 16)}...)`,
    );

    return { storagePath, checksum, fileSize: buffer.length };
  }

  /**
   * Read a file from local storage.
   */
  async readFile(storagePath: string): Promise<Buffer> {
    const fullPath = path.resolve(this.storagePath, storagePath);

    // Security: prevent path traversal
    if (!fullPath.startsWith(path.resolve(this.storagePath))) {
      throw new BadRequestException('Invalid file path');
    }

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }

    return fs.readFileSync(fullPath);
  }

  /**
   * Delete a file from local storage.
   */
  async deleteFile(storagePath: string): Promise<boolean> {
    const fullPath = path.resolve(this.storagePath, storagePath);

    if (!fullPath.startsWith(path.resolve(this.storagePath))) {
      throw new BadRequestException('Invalid file path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`File deleted: ${storagePath}`);
      return true;
    }
    return false;
  }

  /**
   * Verify file integrity against stored checksum.
   */
  async verifyIntegrity(storagePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const buffer = await this.readFile(storagePath);
      const actualChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
      return actualChecksum === expectedChecksum;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics.
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    storagePath: string;
    maxFileSize: number;
  }> {
    let totalFiles = 0;
    let totalSize = 0;

    if (fs.existsSync(this.storagePath)) {
      const walkDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile()) {
            totalFiles++;
            totalSize += fs.statSync(fullPath).size;
          }
        }
      };
      walkDir(this.storagePath);
    }

    return { totalFiles, totalSize, storagePath: this.storagePath, maxFileSize: this.maxFileSize };
  }

  /**
   * Enforce retention policy: delete expired documents.
   */
  async enforceRetention(): Promise<number> {
    const expired = await this.database.documents.findAll({
      page: 1,
      pageSize: 1000,
      filters: [{ field: 'status', operator: 'eq', value: 'archived' }],
    } as any);
    let deleted = 0;
    for (const doc of expired.data || []) {
      const docRecord = doc as any;
      if (docRecord.expiryDate && new Date(docRecord.expiryDate) < new Date()) {
        if (docRecord.storagePath) {
          await this.deleteFile(docRecord.storagePath);
        }
        await this.database.documents.softDelete(docRecord.id);
        deleted++;
      }
    }
    return deleted;
  }
}
