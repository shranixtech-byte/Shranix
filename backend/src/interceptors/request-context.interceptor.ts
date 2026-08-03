import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequestContextService } from '../common/context/request-context.service';

/** Captures IP / user-agent / user id per request for the audit trail. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest();
    const rawIp = req.ip || req.socket?.remoteAddress || req.headers?.['x-forwarded-for'] || null;
    const userAgent = req.headers?.['user-agent'] || null;
    const userId = req.user?.id || null;
    return this.context.run(
      {
        ip: rawIp ? String(rawIp).split(',')[0].trim() : null,
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
        userId,
      },
      () => next.handle(),
    );
  }
}
