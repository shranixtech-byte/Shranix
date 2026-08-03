import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

import {
  TIMEOUT_DEFAULT,
  TIMEOUT_UPLOAD,
  TIMEOUT_PDF,
  TIMEOUT_BACKUP,
} from '../constants/app.constants';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const isUpload =
      request.url?.includes('upload') ||
      (request.method === 'POST' && request.is('multipart/form-data'));
    // PDF route: Puppeteer cold launch + font load + render 30s se zyada le sakta hai
    // (Docker container par Chromium binary pehli baar extract/start hota hai)
    const isPdf = request.url?.includes('/pdf/');
    // Backup: VACUUM INTO snapshot + online restore bade DBs par lamba chalta hai
    const isBackup = request.url?.includes('/backup');
    const duration = isUpload
      ? TIMEOUT_UPLOAD
      : isPdf
        ? TIMEOUT_PDF
        : isBackup
          ? TIMEOUT_BACKUP
          : TIMEOUT_DEFAULT;

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
