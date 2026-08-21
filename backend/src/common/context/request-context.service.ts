import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';

export interface RequestContextData {
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  requestId?: string | null;
}

/**
 * Per-request context (AsyncLocalStorage) so services deep in the call tree can
 * read the caller's IP / user-agent / user id without threading them through
 * every method signature. Populated by RequestContextInterceptor.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run<T>(data: RequestContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  getContext(): RequestContextData {
    return this.storage.getStore() || {};
  }

  getIp(): string | null {
    const ip = this.getContext().ip;
    return ip && String(ip).trim() ? String(ip).trim() : null;
  }

  getUserAgent(): string | null {
    const ua = this.getContext().userAgent;
    return ua && String(ua).trim() ? String(ua).slice(0, 500) : null;
  }

  getUserId(): string | null {
    return this.getContext().userId || null;
  }

  /** Parse a user-agent string into a friendly "Device · Browser · OS" label. */
  static parseDevice(userAgent?: string | null): string {
    if (!userAgent) {
      return 'Unknown';
    }
    const ua = userAgent.toLowerCase();
    let type = 'Desktop';
    if (/iphone|ipod|android.*mobile|mobile.*safari|windows phone/i.test(ua)) {
      type = 'Mobile';
    } else if (
      /ipad|tablet|kindle|playbook|silk/i.test(ua) ||
      (/android/i.test(ua) && !/mobile/i.test(ua))
    ) {
      type = 'Tablet';
    }

    let browser = 'Browser';
    if (/edg\//.test(ua)) {
      browser = 'Edge';
    } else if (/opr\/|opera/i.test(ua)) {
      browser = 'Opera';
    } else if (/chrome|crios/i.test(ua)) {
      browser = 'Chrome';
    } else if (/firefox|fxios/i.test(ua)) {
      browser = 'Firefox';
    } else if (/safari/i.test(ua)) {
      browser = 'Safari';
    }

    let os = 'OS';
    if (/windows nt 10|windows nt 11/i.test(ua)) {
      os = 'Windows 10/11';
    } else if (/windows nt 6\.1/i.test(ua)) {
      os = 'Windows 7';
    } else if (/windows/i.test(ua)) {
      os = 'Windows';
    } else if (/android/i.test(ua)) {
      os = 'Android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = 'iOS';
    } else if (/mac os x/i.test(ua)) {
      os = 'macOS';
    } else if (/linux/i.test(ua)) {
      os = 'Linux';
    }

    return `${type} · ${browser} · ${os}`;
  }
}
