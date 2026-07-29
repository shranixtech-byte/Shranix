// ── Application ─────────────────────────────────────────
export const APP_NAME = 'SHRANIX Krushi ERP';
export const APP_VERSION = '1.0.0';
export const COMPANY_NAME = 'SHRANIX Technologies';

// ── API ─────────────────────────────────────────────────
export const API_BASE_URL = '/api/v1';
export const API_TIMEOUT = 30000;
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY = 1000;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },
  MASTERS: {
    ITEMS: '/masters/items',
    PARTIES: '/masters/parties',
    USERS: '/masters/users',
  },
  INVENTORY: {
    STOCK: '/inventory/stock',
    MOVEMENTS: '/inventory/movements',
  },
  TRANSACTIONS: {
    PURCHASE: '/transactions/purchase',
    SALES: '/transactions/sales',
    PAYMENTS: '/transactions/payments',
  },
  REPORTS: '/reports',
  HEALTH: '/health',
} as const;

// ── Pagination ──────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE = 1;

// ── UI ──────────────────────────────────────────────────
export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const HEADER_HEIGHT = 56;
export const DRAWER_WIDTH = 480;
export const MODAL_WIDTH = 560;

export const DEBOUNCE_DELAY = 300;
export const SEARCH_DELAY = 500;
export const TOAST_DURATION = 4000;

// ── Validation ──────────────────────────────────────────
export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_LENGTH: 10,
  PINCODE_LENGTH: 6,
  GST_LENGTH: 15,
  EMAIL_MAX_LENGTH: 254,
  TEXTAREA_MAX_LENGTH: 2000,
} as const;

// ── Date / Time ─────────────────────────────────────────
export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATE_FORMAT_DISPLAY = 'dd MMM yyyy';
export const TIME_FORMAT = 'HH:mm:ss';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm:ss';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const LOCALE = 'en-IN';
