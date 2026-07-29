// Multi-Company & PRM-013 Schema Definitions
// Actual Drizzle table definitions live in the @shranix/database package.
// This file provides TypeScript interfaces for the schema entities
// used by backend services and controllers.

export interface Company {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string;
  currency?: string;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  isHeadOffice?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessUnit {
  id: string;
  companyId: string;
  branchId?: string;
  code: string;
  name: string;
  type?: string;
  parentId?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  companyId: string;
  branchId?: string;
  code: string;
  name: string;
  headUserId?: string;
  parentId?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  companyId?: string;
  fiscalYear: string;
  name: string;
  version?: string;
  type?: string;
  status?: string;
  totalAmount?: number;
  description?: string;
  approvedBy?: string;
  approvedAt?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetCategory {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  depreciationMethod?: string;
  usefulLifeYears?: number;
  depreciationRate?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FixedAsset {
  id: string;
  companyId?: string;
  categoryId?: string;
  branchId?: string;
  code: string;
  name: string;
  description?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  salvageValue?: number;
  depreciationMethod?: string;
  usefulLifeYears?: number;
  accumulatedDepreciation?: number;
  status?: string;
  location?: string;
  barcode?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetDepreciation {
  id: string;
  assetId: string;
  period: string;
  amount: number;
  bookValueBefore?: number;
  bookValueAfter?: number;
  isPosted?: boolean;
  postedAt?: string;
  createdAt?: string;
}

export interface Lead {
  id: string;
  companyId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: string;
  notes?: string;
  assignedTo?: string;
  convertedToCustomer?: boolean;
  convertedAt?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Opportunity {
  id: string;
  companyId?: string;
  leadId?: string;
  name: string;
  stage?: string;
  amount?: number;
  probability?: number;
  expectedCloseDate?: string;
  assignedTo?: string;
  notes?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  companyId?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  employeeCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  pan?: string;
  uan?: string;
  pfNumber?: string;
  esiNumber?: string;
  status?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeDesignation {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  grade?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveType {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  daysAllowed?: number;
  isPaid?: boolean;
  isCarryForward?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status?: string;
  approvedBy?: string;
  approvedAt?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Webhook {
  id: string;
  companyId?: string;
  name: string;
  url: string;
  events?: any;
  secret?: string;
  isActive?: boolean;
  lastTriggeredAt?: string;
  failureCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiKey {
  id: string;
  companyId?: string;
  name: string;
  key: string;
  permissions?: any;
  isActive?: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportLog {
  id: string;
  companyId?: string;
  module: string;
  fileName: string;
  fileType: string;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  status?: string;
  errorLog?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface DataRetentionPolicy {
  id: string;
  companyId?: string;
  module: string;
  retentionDays: number;
  action?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalHold {
  id: string;
  companyId?: string;
  caseNumber: string;
  description?: string;
  modules?: any;
  startDate: string;
  endDate?: string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
