import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { REQUEST_ID_HEADER, REQUEST_ID_KEY } from '../constants/app.constants';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers[REQUEST_ID_HEADER] as string) || uuidv4();
    Object.assign(req, { [REQUEST_ID_KEY]: requestId });
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
