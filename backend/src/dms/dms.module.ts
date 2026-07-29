import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { WorkflowModule } from '../workflow/workflow.module';

import { DmsController } from './controllers/dms.controller';
import { DigitalSignatureService } from './services/digital-signature.service';
import { DmsService } from './services/dms.service';
import { FileStorageService } from './services/file-storage.service';
import { OcrEngineService } from './services/ocr-engine.service';
import { DmsPermissionSeedService } from './services/permission-seed.service';
import { SearchEngineService } from './services/search-engine.service';

@Module({
  imports: [
    WorkflowModule,
    MulterModule.register({
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  controllers: [DmsController],
  providers: [
    DmsService,
    FileStorageService,
    OcrEngineService,
    DigitalSignatureService,
    SearchEngineService,
    DmsPermissionSeedService,
  ],
  exports: [
    DmsService,
    FileStorageService,
    OcrEngineService,
    DigitalSignatureService,
    SearchEngineService,
  ],
})
export class DmsModule {}
