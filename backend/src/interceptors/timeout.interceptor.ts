import { NestInterceptor, ExecutionContext, CallHandler} from '@nestjs/common';
import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { Observable} from 'rxjs';
import { TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

import { TIMEOUT_DEFAULT, TIMEOUT_UPLOAD } from '../constants/app.constants';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const isUpload = request.url?.includes('upload') || (request.method === 'POST' && request.is('multipart/form-data'));
    const duration = isUpload ? TIMEOUT_UPLOAD : TIMEOUT_DEFAULT;

    return next.handle().pipe(
      timeout(duration),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timed out');
        }
        throw err;
      }),
    );
  }
}
