import { Module } from '@nestjs/common';

import { SecurityModule } from '../security/security.module';

import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';
import { ReleasePermissionSeedService } from './services/release-permission-seed.service';

@Module({
  imports: [SecurityModule],
  controllers: [ReleasesController],
  providers: [ReleasesService, ReleasePermissionSeedService],
  exports: [ReleasesService],
})
export class ReleasesModule {}
