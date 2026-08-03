import { NestInterceptor, ExecutionContext, CallHandler, Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = ctx.getResponse();
          this.logger.log(`${method} ${url} ${response.statusCode} - ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} - ${error.status || 500} - ${duration}ms`,
            error.stack,
          );
        },
      }),
    );
  }
}
