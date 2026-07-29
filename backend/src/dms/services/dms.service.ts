import { Injectable } from '@nestjs/common';

import { AuditService } from '../../common/services/audit.service';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DmsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENT CRUD
  // ═══════════════════════════════════════════════════════════════════
  async createDocument(data: any, userId: string) {
    const doc = await this.database.documents.create({ ...data, createdBy: userId, status: 'draft' });
    await this.audit.log({ userId, event: 'document_created', resource: 'document', action: 'create', details: { id: (doc as any).id, name: data.name } });
    // Auto-start workflow if needed
    return doc;
  }

  async getDocument(id: string) {
    return this.database.documents.findById(id);
  }

  async listDocuments(params: any) {
    return this.database.documents.findAll(params);
  }

  async updateDocument(id: string, data: any, userId: string) {
    const db = this.database as any;
    const updated = await db.documents.update(id, { ...data, updatedBy: userId });
    if (updated) {
      await this.audit.log({ userId, event: 'document_updated', resource: 'document', action: 'update', details: { id, changes: Object.keys(data) } });
    }
    return updated;
  }

  async deleteDocument(id: string, userId: string) {
    const db = this.database as any;
    await db.documents.softDelete(id);
    await this.audit.log({ userId, event: 'document_deleted', resource: 'document', action: 'delete', details: { id } }).catch(() => {});
    return { id, deleted: true };
  }

  // ═══════════════════════════════════════════════════════════════════
  // FOLDERS
  // ═══════════════════════════════════════════════════════════════════
  async createFolder(data: any, userId: string) {
    const folder = await this.database.documentFolders.create({ ...data, createdBy: userId });
    await this.audit.log({ userId, event: 'folder_created', resource: 'folder', action: 'create', details: { id: (folder as any).id, name: data.name } });
    return folder;
  }

  async listFolders() {
    return this.database.documentFolders.findAll({ page: 1, pageSize: 100 });
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERSIONS
  // ═══════════════════════════════════════════════════════════════════
  async createVersion(documentId: string, data: any, userId: string) {
    const doc = await this.database.documents.findById(documentId);
    if (!doc) {return null;}

    const currentVersion = (doc as any).currentVersion || 0;
    const newVersion = currentVersion + 1;
    const version = await this.database.documentVersions.create({
      documentId, versionNumber: newVersion, changeNotes: data.changeNotes,
      storagePath: data.storagePath, fileSize: data.fileSize,
      checksum: data.checksum, isMajor: data.isMajor || false, authorId: userId,
    });

    // Update document's current version
    await this.database.documents.update(documentId, { currentVersion: newVersion, updatedBy: userId } as any);

    await this.audit.log({ userId, event: 'document_version_created', resource: 'document_version', action: 'create', details: { documentId, version: newVersion } });
    return version;
  }

  async getVersionHistory(documentId: string) {
    return this.database.documentVersions.findAll({ page: 1, pageSize: 100, filter: { documentId } } as any);
  }

  async restoreVersion(documentId: string, versionId: string, userId: string) {
    const version = await this.database.documentVersions.findById(versionId);
    if (!version) {return null;}

    const doc = await this.database.documents.findById(documentId);
    if (!doc) {return null;}

    // Create a new version with restored data
    return this.createVersion(documentId, {
      storagePath: (version as any).storagePath,
      fileSize: (version as any).fileSize,
      checksum: (version as any).checksum,
      changeNotes: `Restored from version ${(version as any).versionNumber}`,
      isMajor: false,
    }, userId);
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAGS
  // ═══════════════════════════════════════════════════════════════════
  async createTag(data: any, userId: string) {
    const tag = await this.database.documentTags.create({ ...data, createdBy: userId });
    await this.audit.log({ userId, event: 'tag_created', resource: 'tag', action: 'create', details: { id: (tag as any).id, name: data.name } });
    return tag;
  }

  async listTags() {
    return this.database.documentTags.findAll({ page: 1, pageSize: 100 });
  }

  // ═══════════════════════════════════════════════════════════════════
  // ACCESS LOGS
  // ═══════════════════════════════════════════════════════════════════
  async logAccess(documentId: string, userId: string, action: string, details?: Record<string, unknown>) {
    return this.database.documentAccessLogs.create({
      documentId, userId, action, details: details ? JSON.stringify(details) : null,
      timestamp: new Date().toISOString(), ipAddress: null, userAgent: null,
    } as any);
  }

  async getAccessLogs(documentId: string) {
    return this.database.documentAccessLogs.findAll({ page: 1, pageSize: 50, filter: { documentId } } as any);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DASHBOARD / STATS
  // ═══════════════════════════════════════════════════════════════════
  async getDashboardStats() {
    const db = this.database as any;
    const [documents, folders, versions, tags, signatures] = await Promise.all([
      db.documents.count(),
      db.documentFolders.count(),
      db.documentVersions.count(),
      db.documentTags.count(),
      db.digitalSignatures.count(),
    ]);

    return {
      totalDocuments: documents,
      totalFolders: folders,
      totalVersions: versions,
      totalTags: tags,
      totalSignatures: signatures,
      storageUsed: 0, // would sum file sizes
      pendingOcr: 0,
      storageLimit: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERP INTEGRATION
  // ═══════════════════════════════════════════════════════════════════
  async getDocumentsForEntity(module: string, entityId: string) {
    return this.database.documents.findAll({ page: 1, pageSize: 50, filter: { linkedModule: module, linkedEntityId: entityId } } as any);
  }

  async linkDocumentToEntity(documentId: string, module: string, entityId: string, entityNumber: string, userId: string) {
    return this.updateDocument(documentId, { linkedModule: module, linkedEntityId: entityId, linkedEntityNumber: entityNumber } as any, userId);
  }
}
