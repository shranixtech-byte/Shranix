import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Header,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkflowDocument } from '../../common/decorators/workflow-document.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  createFileFilter,
  createUploadLimits,
  DMS_ALLOWED_MIMES,
  DMS_ALLOWED_EXTENSIONS,
  DMS_MAX_FILES,
  safeContentDisposition,
  logUploadSecurityEvent,
} from '../../common/utils/file-validation';
import {
  THROTTLE_UPLOAD_SINGLE,
  THROTTLE_UPLOAD_MULTIPLE,
  THROTTLE_SEARCH,
  THROTTLE_DASHBOARD,
  throttle,
} from '../../common/utils/rate-limit-policies';
import { DigitalSignatureService } from '../services/digital-signature.service';
import { DmsService } from '../services/dms.service';
import { FileStorageService } from '../services/file-storage.service';
import { OcrEngineService } from '../services/ocr-engine.service';
import { SearchEngineService } from '../services/search-engine.service';

@ApiTags('Document Management')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dms')
export class DmsController {
  constructor(
    private readonly dms: DmsService,
    private readonly storage: FileStorageService,
    private readonly ocr: OcrEngineService,
    private readonly signatures: DigitalSignatureService,
    private readonly search: SearchEngineService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════
  @Post('documents')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.create')
  @WorkflowDocument({
    module: 'dms',
    documentType: 'document',
    templateCode: 'dms-document',
    templateName: 'DMS Document Workflow',
    amountField: 'fileSize',
    numberField: 'documentNumber',
  })
  @ApiOperation({ summary: 'Create a new document record' })
  @HttpCode(HttpStatus.CREATED)
  async createDocument(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.dms.createDocument(body, u?.id);
  }

  @Get('documents')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'List all documents' })
  @HttpCode(HttpStatus.OK)
  async listDocuments(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.dms.listDocuments({
      page: parseInt(page || '1'),
      pageSize: parseInt(pageSize || '20'),
    });
  }

  @Get('documents/:id')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get document by ID' })
  @HttpCode(HttpStatus.OK)
  async getDocument(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    const doc = await this.dms.getDocument(id);
    if (doc) {
      await this.dms.logAccess(id, u?.id, 'view');
    }
    return doc;
  }

  @Put('documents/:id')
  @Roles('admin', 'manager')
  @Permissions('dms.update')
  @ApiOperation({ summary: 'Update document metadata' })
  @HttpCode(HttpStatus.OK)
  async updateDocument(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() u: { id: string },
  ) {
    return this.dms.updateDocument(id, body, u?.id);
  }

  @Delete('documents/:id')
  @Roles('admin')
  @Permissions('dms.delete')
  @ApiOperation({ summary: 'Soft delete a document' })
  @HttpCode(HttpStatus.OK)
  async deleteDocument(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    return this.dms.deleteDocument(id, u?.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // FOLDERS
  // ═══════════════════════════════════════════════════════════════════
  @Post('folders')
  @Roles('admin', 'manager')
  @Permissions('dms.create')
  @ApiOperation({ summary: 'Create a document folder' })
  @HttpCode(HttpStatus.CREATED)
  async createFolder(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.dms.createFolder(body, u?.id);
  }

  @Get('folders')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'List all folders' })
  @HttpCode(HttpStatus.OK)
  async listFolders() {
    return this.dms.listFolders();
  }

  // ═══════════════════════════════════════════════════════════════════
  // VERSIONS
  // ═══════════════════════════════════════════════════════════════════
  @Post('documents/:id/versions')
  @Roles('admin', 'manager')
  @Permissions('dms.create')
  @ApiOperation({ summary: 'Create a new document version' })
  @HttpCode(HttpStatus.CREATED)
  async createVersion(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() u: { id: string },
  ) {
    return this.dms.createVersion(id, body, u?.id);
  }

  @Get('documents/:id/versions')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get version history for a document' })
  @HttpCode(HttpStatus.OK)
  async getVersionHistory(@Param('id') id: string) {
    return this.dms.getVersionHistory(id);
  }

  @Post('documents/:docId/versions/:verId/restore')
  @Roles('admin', 'manager')
  @Permissions('dms.update')
  @ApiOperation({ summary: 'Restore a previous version' })
  @HttpCode(HttpStatus.OK)
  async restoreVersion(
    @Param('docId') docId: string,
    @Param('verId') verId: string,
    @CurrentUser() u: { id: string },
  ) {
    return this.dms.restoreVersion(docId, verId, u?.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAGS
  // ═══════════════════════════════════════════════════════════════════
  @Post('tags')
  @Roles('admin', 'manager')
  @Permissions('dms.create')
  @ApiOperation({ summary: 'Create a document tag' })
  @HttpCode(HttpStatus.CREATED)
  async createTag(@Body() body: any, @CurrentUser() u: { id: string }) {
    return this.dms.createTag(body, u?.id);
  }

  @Get('tags')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'List all tags' })
  @HttpCode(HttpStatus.OK)
  async listTags() {
    return this.dms.listTags();
  }

  // ═══════════════════════════════════════════════════════════════════
  // DIGITAL SIGNATURES
  // ═══════════════════════════════════════════════════════════════════
  @Post('documents/:id/sign')
  @Roles('admin', 'manager')
  @Permissions('dms.sign')
  @WorkflowDocument({
    module: 'dms',
    documentType: 'document_signature',
    templateCode: 'dms-signature',
    templateName: 'DMS Signature Workflow',
  })
  @ApiOperation({ summary: 'Sign a document digitally' })
  @HttpCode(HttpStatus.OK)
  async signDocument(@Param('id') id: string, @Body() body: any, @CurrentUser() u: { id: string }) {
    return this.signatures.signDocument(id, u?.id, body);
  }

  @Get('documents/:id/signatures')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get document signatures' })
  @HttpCode(HttpStatus.OK)
  async getDocumentSignatures(@Param('id') id: string) {
    return this.signatures.getDocumentSignatures(id);
  }

  @Post('signatures/:id/verify')
  @Roles('admin', 'manager')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Verify a digital signature' })
  @HttpCode(HttpStatus.OK)
  async verifySignature(@Param('id') id: string) {
    return this.signatures.verifySignature(id);
  }

  @Post('documents/:id/tamper-check')
  @Roles('admin', 'manager')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Check document for tampering' })
  @HttpCode(HttpStatus.OK)
  async checkTampering(@Param('id') id: string, @Body() body: { checksum: string }) {
    return this.signatures.detectTampering(id, body.checksum);
  }

  // ═══════════════════════════════════════════════════════════════════
  // OCR
  // ═══════════════════════════════════════════════════════════════════
  @Post('documents/:id/ocr')
  @Roles('admin', 'manager')
  @Permissions('dms.create')
  @ApiOperation({ summary: 'Process OCR for a document' })
  @HttpCode(HttpStatus.OK)
  async processOcr(@Param('id') id: string) {
    return this.ocr.processDocument(id);
  }

  @Get('documents/:id/ocr')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get OCR results for a document' })
  @HttpCode(HttpStatus.OK)
  async getOcrResults(@Param('id') id: string) {
    return this.ocr.getOcrResults(id);
  }

  @Get('ocr/queue')
  @Roles('admin', 'manager')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get OCR processing queue' })
  @HttpCode(HttpStatus.OK)
  async getOcrQueue() {
    return this.ocr.getOcrQueue();
  }

  // ═══════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════
  @Get('search')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @Throttle(throttle(THROTTLE_SEARCH))
  @ApiOperation({ summary: 'Search documents' })
  @HttpCode(HttpStatus.OK)
  async searchDocuments(
    @Query('q') q: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('module') linkedModule?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.search.searchDocuments(
      q,
      { category, status, linkedModule },
      { page: parseInt(page || '1'), pageSize: parseInt(pageSize || '20') },
    );
  }

  @Get('search/ocr')
  @Roles('admin', 'manager')
  @Permissions('dms.read')
  @Throttle(throttle(THROTTLE_SEARCH))
  @ApiOperation({ summary: 'Search OCR content' })
  @HttpCode(HttpStatus.OK)
  async searchOcr(@Query('q') q: string) {
    return this.search.searchOcrContent(q);
  }

  @Post('search/advanced')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Advanced document search' })
  @HttpCode(HttpStatus.OK)
  async advancedSearch(@Body() body: any) {
    return this.search.advancedSearch(body);
  }

  // ═══════════════════════════════════════════════════════════════════
  // FILE UPLOAD / DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════
  @Post('documents/upload')
  @Roles('admin', 'manager')
  @Permissions('dms.upload')
  @Throttle(throttle(THROTTLE_UPLOAD_SINGLE))
  @UseInterceptors(
    FileInterceptor('file', {
      limits: createUploadLimits(),
      fileFilter: createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document'),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to a new document' })
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(@UploadedFile() file: any, @Body() body: any, @CurrentUser() u: { id: string }) {
    if (!file) {
      logUploadSecurityEvent('UPLOAD-EMPTY', {
        reason: 'no file in request',
        endpoint: 'dms/documents/upload',
        userId: u?.id,
      });
      return { success: false, message: 'No file provided' };
    }

    // Create document record
    const doc = await this.dms.createDocument(
      {
        name: body.name || file.originalname,
        description: body.description,
        category: body.category,
        documentType: file.mimetype.split('/')[1] || 'file',
        mimeType: file.mimetype,
        fileExtension: file.originalname.split('.').pop(),
        ownerId: u?.id,
        linkedModule: body.linkedModule,
        linkedEntityId: body.linkedEntityId,
        linkedEntityNumber: body.linkedEntityNumber,
      },
      u?.id,
    );

    // Save file to storage
    const docId = (doc as any).id;
    const storageResult = await this.storage.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      docId,
      1,
    );

    // Update document with storage info
    const updated = await this.dms.updateDocument(
      docId,
      {
        storagePath: storageResult.storagePath,
        checksum: storageResult.checksum,
        fileSize: storageResult.fileSize,
      },
      u?.id,
    );

    await this.dms.logAccess(docId, u?.id, 'upload', {
      originalName: file.originalname,
      fileSize: file.buffer.length,
    });

    logUploadSecurityEvent('UPLOAD-SUCCESS', {
      filename: file.originalname,
      mimetype: file.mimetype,
      endpoint: 'dms/documents/upload',
      userId: u?.id,
    });

    return { success: true, data: updated };
  }

  @Post('documents/upload-multiple')
  @Roles('admin', 'manager')
  @Permissions('dms.upload')
  @Throttle(throttle(THROTTLE_UPLOAD_MULTIPLE))
  @UseInterceptors(
    FilesInterceptor('files', DMS_MAX_FILES, {
      limits: createUploadLimits(),
      fileFilter: createFileFilter(DMS_ALLOWED_MIMES, DMS_ALLOWED_EXTENSIONS, 'document'),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files to documents' })
  @HttpCode(HttpStatus.CREATED)
  async uploadMultipleFiles(@UploadedFiles() files: any[], @CurrentUser() u: { id: string }) {
    if (!files || files.length === 0) {
      logUploadSecurityEvent('UPLOAD-EMPTY', {
        reason: 'no files in request',
        endpoint: 'dms/documents/upload-multiple',
        userId: u?.id,
      });
      return { success: false, message: 'No files provided' };
    }

    const results = [];
    for (const file of files) {
      const doc = await this.dms.createDocument(
        { name: file.originalname, mimeType: file.mimetype },
        u?.id,
      );
      const docId = (doc as any).id;
      const storageResult = await this.storage.saveFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        docId,
        1,
      );
      await this.dms.updateDocument(
        docId,
        {
          storagePath: storageResult.storagePath,
          checksum: storageResult.checksum,
          fileSize: storageResult.fileSize,
        },
        u?.id,
      );
      results.push({
        documentId: docId,
        originalName: file.originalname,
        fileSize: file.buffer.length,
      });
    }

    return { success: true, count: results.length, results };
  }

  @Get('documents/:id/download')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.download')
  @Header('Content-Type', 'application/octet-stream')
  @ApiOperation({ summary: 'Download a document file' })
  @HttpCode(HttpStatus.OK)
  async downloadDocument(
    @Param('id') id: string,
    @CurrentUser() u: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const doc = await this.dms.getDocument(id);
    if (!doc) {
      logUploadSecurityEvent('DOWNLOAD-NOT-FOUND', {
        filename: id,
        reason: 'document not found',
        endpoint: 'dms/documents/:id/download',
        userId: u?.id,
      });
      res.status(HttpStatus.NOT_FOUND);
      return { success: false, message: 'Document not found' };
    }

    const docRecord = doc as any;
    if (!docRecord.storagePath) {
      res.status(HttpStatus.NOT_FOUND);
      return { success: false, message: 'No file stored for this document' };
    }

    // H12: Verify object-level authorization — user must have dms.download permission
    // (already enforced by @Permissions('dms.download') above)

    const buffer = await this.storage.readFile(docRecord.storagePath);
    await this.dms.logAccess(id, u?.id, 'download');

    // H12: Sanitise Content-Disposition to prevent header injection
    const safeFilename = (docRecord.name || 'document').replace(/[\r\n\0]/g, '_');
    res.set({
      'Content-Type': docRecord.mimeType || 'application/octet-stream',
      'Content-Disposition': safeContentDisposition(safeFilename),
      'Content-Length': buffer.length,
    });
    return new StreamableFile(buffer);
  }

  @Delete('documents/:id/file')
  @Roles('admin', 'manager')
  @Permissions('dms.delete')
  @ApiOperation({ summary: 'Delete a document file from storage' })
  @HttpCode(HttpStatus.OK)
  async deleteDocumentFile(@Param('id') id: string, @CurrentUser() u: { id: string }) {
    const doc = await this.dms.getDocument(id);
    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    const docRecord = doc as any;
    if (docRecord.storagePath) {
      await this.storage.deleteFile(docRecord.storagePath);
      await this.dms.updateDocument(id, { storagePath: null, checksum: null, fileSize: 0 }, u?.id);
    }

    return { success: true, message: 'File deleted from storage' };
  }

  @Post('documents/:id/verify')
  @Roles('admin', 'manager')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Verify document file integrity' })
  @HttpCode(HttpStatus.OK)
  async verifyFileIntegrity(@Param('id') id: string) {
    const doc = await this.dms.getDocument(id);
    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    const docRecord = doc as any;
    if (!docRecord.storagePath || !docRecord.checksum) {
      return { success: false, message: 'No file or checksum stored' };
    }

    const isValid = await this.storage.verifyIntegrity(docRecord.storagePath, docRecord.checksum);
    return { success: true, isValid, documentId: id };
  }

  @Get('storage/stats')
  @Roles('admin')
  @Permissions('dms.read')
  @Throttle(throttle(THROTTLE_DASHBOARD))
  @ApiOperation({ summary: 'Get storage statistics' })
  @HttpCode(HttpStatus.OK)
  async getStorageStats() {
    return this.storage.getStorageStats();
  }

  // ═══════════════════════════════════════════════════════════════════
  // ACCESS LOGS
  // ═══════════════════════════════════════════════════════════════════
  @Get('documents/:id/access-logs')
  @Roles('admin')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get access logs for a document' })
  @HttpCode(HttpStatus.OK)
  async getAccessLogs(@Param('id') id: string) {
    return this.dms.getAccessLogs(id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERP INTEGRATION
  // ═══════════════════════════════════════════════════════════════════
  @Get('entity/:module/:entityId')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @ApiOperation({ summary: 'Get documents linked to an ERP entity' })
  @HttpCode(HttpStatus.OK)
  async getEntityDocuments(@Param('module') module: string, @Param('entityId') entityId: string) {
    return this.dms.getDocumentsForEntity(module, entityId);
  }

  @Post('documents/:id/link')
  @Roles('admin', 'manager')
  @Permissions('dms.update')
  @ApiOperation({ summary: 'Link document to an ERP entity' })
  @HttpCode(HttpStatus.OK)
  async linkDocument(
    @Param('id') id: string,
    @Body() body: { module: string; entityId: string; entityNumber: string },
    @CurrentUser() u: { id: string },
  ) {
    return this.dms.linkDocumentToEntity(id, body.module, body.entityId, body.entityNumber, u?.id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════
  @Get('dashboard')
  @Roles('admin', 'manager', 'accountant')
  @Permissions('dms.read')
  @Throttle(throttle(THROTTLE_DASHBOARD))
  @ApiOperation({ summary: 'Get DMS dashboard stats' })
  @HttpCode(HttpStatus.OK)
  async getDashboard() {
    return this.dms.getDashboardStats();
  }
}
