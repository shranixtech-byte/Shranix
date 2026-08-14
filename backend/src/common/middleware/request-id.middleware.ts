import { randomUUID } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Phase 17.23/17.25 — Request ID / correlation ID middleware.
 * - Generates a `x-request-id` when the client does not supply one.
 * - Echoes it back in the response header so clients can correlate.
 * - Stores it on `req.requestId` for loggers and error responses.
 * Never logs tokens/passwords — only the opaque request id.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const headerName = 'x-request-id';
    const incoming = req.headers[headerName];
    const requestId =
      typeof incoming === 'string' && incoming.trim()
        ? incoming.trim().slice(0, 128)
        : randomUUID();
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader(headerName, requestId);
    next();
  }
}
