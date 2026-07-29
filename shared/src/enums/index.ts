// ── Status Enums ────────────────────────────────────────
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

export enum RecordStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
}

// ── Business Enums ──────────────────────────────────────
export enum TransactionType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  PAYMENT = 'payment',
  RECEIPT = 'receipt',
  JOURNAL = 'journal',
  CONTRA = 'contra',
}

export enum TaxType {
  GST = 'gst',
  IGST = 'igst',
  CGST = 'cgst',
  SGST = 'sgst',
  NONE = 'none',
}

export enum UnitType {
  PIECES = 'pcs',
  KILOGRAM = 'kg',
  GRAM = 'g',
  LITRE = 'l',
  MILLILITRE = 'ml',
  METER = 'm',
  SQUARE_METER = 'sqm',
  BOX = 'box',
  PACKET = 'pkt',
  DOZEN = 'doz',
}

export enum PaymentMode {
  CASH = 'cash',
  CHEQUE = 'cheque',
  BANK_TRANSFER = 'bank_transfer',
  UPI = 'upi',
  CARD = 'card',
  ONLINE = 'online',
}

// ── User Enums ──────────────────────────────────────────
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

// ── UI Enums ────────────────────────────────────────────
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum SidebarState {
  EXPANDED = 'expanded',
  COLLAPSED = 'collapsed',
}

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// ── Financial Enums ─────────────────────────────────────
export enum FinancialYear {
  APR_MAR = 'apr_mar',
  JAN_DEC = 'jan_dec',
}

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  INCOME = 'income',
  EXPENSE = 'expense',
  EQUITY = 'equity',
}
