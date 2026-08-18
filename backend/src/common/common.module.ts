import { Module, Global } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { RATE_LIMIT_TTL, RATE_LIMIT_MAX } from '../constants/app.constants';
import { DatabaseService } from '../database/database.service';

import { RequestContextService } from './context/request-context.service';
import { AuditService } from './services/audit.service';
import { CsrfService } from './services/csrf.service';
import { DistributedLockService } from './services/distributed-lock.service';
import { PermissionCacheService } from './services/permission-cache.service';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_TTL * 1000,
        limit: RATE_LIMIT_MAX,
      },
    ]),
  ],
  providers: [
    CsrfService,
    PermissionCacheService,
    AuditService,
    RequestContextService,
    DistributedLockService,
    DatabaseService,
  ],
  exports: [
    CsrfService,
    PermissionCacheService,
    AuditService,
    RequestContextService,
    DistributedLockService,
  ],
})
export class CommonModule {}
