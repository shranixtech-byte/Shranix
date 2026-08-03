import { Module, Global } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { RATE_LIMIT_TTL, RATE_LIMIT_MAX } from '../constants/app.constants';

import { RequestContextService } from './context/request-context.service';
import { AuditService } from './services/audit.service';
import { CsrfService } from './services/csrf.service';
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
  providers: [CsrfService, PermissionCacheService, AuditService, RequestContextService],
  exports: [CsrfService, PermissionCacheService, AuditService, RequestContextService],
})
export class CommonModule {}
