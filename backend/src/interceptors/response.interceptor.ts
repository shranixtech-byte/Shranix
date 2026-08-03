import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
  method: string;
}

export type InterceptorResult<T> = SuccessResponse<T> | Buffer | StreamableFile;

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, InterceptorResult<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<InterceptorResult<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => {
        // Binary responses (PDF, file downloads) ko envelope mein wrap mat karo —
        // nahi to JSON serialise hokar file corrupt ho jati hai.
        if (Buffer.isBuffer(data) || data instanceof StreamableFile) {
          return data;
        }
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        };
      }),
    );
  }
}
