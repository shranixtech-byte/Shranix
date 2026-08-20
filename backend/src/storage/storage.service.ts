import * as fs from 'node:fs';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

export interface StorageAdapter {
  save(path: string, buffer: Buffer, contentType: string): Promise<string>;
  read(path: string): Promise<Buffer>;
  delete(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private adapter: StorageAdapter;
  private adapterType: string;

  constructor() {
    this.adapterType = process.env.STORAGE_ADAPTER || 'local';
    this.adapter = this.createAdapter(this.adapterType);
    this.logger.log(`Storage adapter initialized: ${this.adapterType}`);
  }

  async save(path: string, buffer: Buffer, contentType: string): Promise<string> {
    return this.adapter.save(path, buffer, contentType);
  }

  async read(path: string): Promise<Buffer> {
    return this.adapter.read(path);
  }

  async delete(path: string): Promise<boolean> {
    return this.adapter.delete(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.adapter.exists(path);
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    return this.adapter.getSignedUrl(path, expiresIn);
  }

  private createAdapter(type: string): StorageAdapter {
    switch (type) {
      case 's3':
        return new S3StorageAdapter();
      case 'minio':
        return new MinioStorageAdapter();
      case 'local':
      default:
        return new LocalStorageAdapter();
    }
  }
}

// ── Local Storage Adapter ──────────────────────────────────────
class LocalStorageAdapter implements StorageAdapter {
  private basePath = process.env.LOCAL_STORAGE_PATH || './storage';

  /** H9: Assert the resolved path stays within basePath — prevent path traversal. */
  private assertWithinBase(filePath: string): string {
    const resolved = path.resolve(this.basePath, filePath);
    const baseResolved = path.resolve(this.basePath);
    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      throw new Error('Invalid file path: path traversal detected');
    }
    return resolved;
  }

  async save(filePath: string, buffer: Buffer, _contentType: string): Promise<string> {
    const fullPath = this.assertWithinBase(filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return fullPath;
  }

  async read(filePath: string): Promise<Buffer> {
    const fullPath = this.assertWithinBase(filePath);
    return fs.readFileSync(fullPath);
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = this.assertWithinBase(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.assertWithinBase(filePath);
    return fs.existsSync(fullPath);
  }

  async getSignedUrl(_filePath: string, _expiresIn?: number): Promise<string> {
    return ''; // Local storage doesn't support signed URLs
  }
}

// ── S3 Storage Adapter (placeholder — needs aws-sdk) ──────────
class S3StorageAdapter implements StorageAdapter {
  async save(_path: string, _buffer: Buffer, _contentType: string): Promise<string> {
    throw new Error('S3 adapter requires aws-sdk. Install: npm install @aws-sdk/client-s3');
  }

  async read(_path: string): Promise<Buffer> {
    throw new Error('S3 adapter not configured');
  }

  async delete(_path: string): Promise<boolean> {
    throw new Error('S3 adapter not configured');
  }

  async exists(_path: string): Promise<boolean> {
    throw new Error('S3 adapter not configured');
  }

  async getSignedUrl(_path: string, _expiresIn?: number): Promise<string> {
    throw new Error('S3 adapter not configured');
  }
}

// ── MinIO Storage Adapter (placeholder — needs minio client) ──
class MinioStorageAdapter implements StorageAdapter {
  async save(_path: string, _buffer: Buffer, _contentType: string): Promise<string> {
    throw new Error('MinIO adapter requires minio client. Install: npm install minio');
  }

  async read(_path: string): Promise<Buffer> {
    throw new Error('MinIO adapter not configured');
  }

  async delete(_path: string): Promise<boolean> {
    throw new Error('MinIO adapter not configured');
  }

  async exists(_path: string): Promise<boolean> {
    throw new Error('MinIO adapter not configured');
  }

  async getSignedUrl(_path: string, _expiresIn?: number): Promise<string> {
    throw new Error('MinIO adapter not configured');
  }
}
