import * as crypto from 'node:crypto';

import { Injectable } from '@nestjs/common';

@Injectable()
export class CsrfService {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
    if (!cookieToken || !headerToken) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  }

  getCookieOptions() {
    return {
      httpOnly: false, // Must be accessible by frontend JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
