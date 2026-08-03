export const APP_NAME = 'SHRANIX Krushi ERP';
export const API_PREFIX = 'api';
export const API_VERSION = '1.0';
export const SWAGGER_DESCRIPTION = 'Enterprise-grade API for agricultural ERP system';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_KEY = 'requestId';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const TIMEOUT_DEFAULT = 30000; // 30 seconds
export const TIMEOUT_UPLOAD = 120000; // 2 minutes
export const TIMEOUT_PDF = 90000; // 90 seconds — Puppeteer cold launch + render
export const TIMEOUT_BACKUP = 120000; // 120 seconds — VACUUM INTO snapshot + online restore of larger DBs

export const RATE_LIMIT_TTL = 60; // 60 seconds
export const RATE_LIMIT_MAX = 100; // max 100 requests per TTL
