/**
 * H14 — Cache-Control middleware for sensitive API endpoints.
 *
 * Adds `Cache-Control: no-store` to responses for authentication,
 * user profile, admin, and other sensitive endpoints to prevent
 * browser/proxy caching of confidential data.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

/**
 * Patterns that match sensitive API paths requiring no-cache.
 * Uses path prefix matching against the request URL.
 */
const SENSITIVE_PATH_PATTERNS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/change-password',
  '/auth/me',
  '/auth/csrf',
  '/auth/logout',
  '/portal/auth/login',
  '/portal/auth/forgot-password',
  '/portal/auth/reset-password',
  '/portal/auth/change-password',
  '/portal/auth/me',
  '/backup',
  '/activation/activate',
  '/activation/trial',
  '/activation/offline',
];

@Injectable()
export class SensitiveCacheControlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const url = req.url || '';

    // Check if this is a sensitive endpoint
    const isSensitive = SENSITIVE_PATH_PATTERNS.some((pattern) => url.includes(pattern));

    if (isSensitive) {
      // Prevent caching of sensitive responses
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  }
}
