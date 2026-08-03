const API_PREFIX = '/sales/approvals/workflow';

import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export type DocumentType =
  | 'sales_invoice'
  | 'sales_quotation'
  | 'proforma_invoice'
  | 'delivery_challan'
  | 'sales_return'
  | 'credit_note'
  | 'debit_note';

export type ApprovalStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'posted'
  | 'closed';

export interface ApprovalMaster {
  id: string;
  documentType: DocumentType;
  documentId: string;
  documentNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  discountAmount: number;
  discountPercent: number;
  gstAmount: number;
  createdBy: string;
  createdByName: string;
  currentLevel: number;
  totalLevels: number;
  status: ApprovalStatus;
  priority: string;
  risk: string;
  creditStatus: string;
  assignedTo: string;
  assignedToName: string;
  isOverdue: boolean;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  history?: ApprovalHistory[];
  comments?: ApprovalComment[];
}

export interface ApprovalHistory {
  id: string;
  approvalId: string;
  action: string;
  actionBy: string;
  actionByName: string;
  fromStatus: string;
  toStatus: string;
  level: number;
  comment: string;
  timestamp: string;
}

export interface ApprovalComment {
  id: string;
  approvalId: string;
  userId: string;
  userName: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ApprovalNotification {
  id: string;
  approvalId: string;
  recipientId: string;
  recipientRole: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApprovalDashboardStats {
  pendingCount: number;
  underReviewCount: number;
  approvedToday: number;
  rejectedCount: number;
  totalCount: number;
  overdueCount: number;
  averageApprovalTime: number;
  byDocumentType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ApprovalMatrix {
  id: string;
  name: string;
  documentType: DocumentType;
  levels: string;
  levelCount: number;
  approvers: ApproverEntry[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApproverEntry {
  level: number;
  role: string;
  userId?: string;
  canOverride: boolean;
  minAmount?: number;
  maxAmount?: number;
}

// ═════════════════════════════════════════════════════════
// API METHODS
// ═════════════════════════════════════════════════════════

export async function getApprovals(
  params: {
    page?: number;
    pageSize?: number;
    status?: string;
    documentType?: string;
    search?: string;
    assignedTo?: string;
  } = {},
): Promise<{
  data: ApprovalMaster[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const qs = new URLSearchParams();
  if (params.page) {
    qs.set('page', String(params.page));
  }
  if (params.pageSize) {
    qs.set('pageSize', String(params.pageSize));
  }
  if (params.status) {
    qs.set('status', params.status);
  }
  if (params.documentType) {
    qs.set('documentType', params.documentType);
  }
  if (params.search) {
    qs.set('search', params.search);
  }
  if (params.assignedTo) {
    qs.set('assignedTo', params.assignedTo);
  }
  const query = qs.toString();
  return apiRequest(`${API_PREFIX}${query ? `?${query}` : ''}`);
}

export async function getApprovalById(id: string): Promise<ApprovalMaster> {
  return apiRequest<ApprovalMaster>(`${API_PREFIX}/${id}`);
}

export async function submitForApproval(dto: {
  documentType: DocumentType;
  documentId: string;
  documentNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  discountAmount: number;
  discountPercent: number;
  gstAmount: number;
  priority?: string;
}): Promise<ApprovalMaster> {
  return apiRequest<ApprovalMaster>(`${API_PREFIX}`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function approveApproval(
  id: string,
  comment: string,
  reason?: string,
): Promise<ApprovalMaster> {
  return apiRequest<ApprovalMaster>(`${API_PREFIX}/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment, reason }),
  });
}

export async function rejectApproval(
  id: string,
  comment: string,
  reason?: string,
): Promise<ApprovalMaster> {
  return apiRequest<ApprovalMaster>(`${API_PREFIX}/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ comment, reason }),
  });
}

export async function sendBackApproval(
  id: string,
  comment: string,
  reason: string,
  targetLevel?: number,
): Promise<ApprovalMaster> {
  return apiRequest<ApprovalMaster>(`${API_PREFIX}/${id}/send-back`, {
    method: 'POST',
    body: JSON.stringify({ comment, reason, targetLevel }),
  });
}

export async function assignApproval(
  id: string,
  assignToUserId: string,
  assignToUserName: string,
  comment?: string,
): Promise<ApprovalMaster> {
  return apiRequest<ApprovalMaster>(`${API_PREFIX}/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignToUserId, assignToUserName, comment }),
  });
}

export async function addApprovalComment(
  id: string,
  comment: string,
  isInternal = false,
): Promise<ApprovalComment> {
  return apiRequest<ApprovalComment>(`${API_PREFIX}/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment, isInternal }),
  });
}

export async function getApprovalComments(id: string): Promise<ApprovalComment[]> {
  return apiRequest<ApprovalComment[]>(`${API_PREFIX}/${id}/comments`);
}

export async function getApprovalHistory(id: string): Promise<ApprovalHistory[]> {
  return apiRequest<ApprovalHistory[]>(`${API_PREFIX}/${id}/history`);
}

export async function getMyApprovalNotifications(
  unreadOnly = false,
): Promise<ApprovalNotification[]> {
  return apiRequest<ApprovalNotification[]>(
    `${API_PREFIX}/notifications/mine?unreadOnly=${unreadOnly}`,
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  return apiRequest<void>(`${API_PREFIX}/notifications/${id}/read`, { method: 'POST' });
}

export async function getApprovalDashboardStats(): Promise<ApprovalDashboardStats> {
  return apiRequest<ApprovalDashboardStats>(`${API_PREFIX}/dashboard/stats`);
}

export async function getApprovalMatrices(): Promise<ApprovalMatrix[]> {
  return apiRequest<ApprovalMatrix[]>(`${API_PREFIX}/settings/matrices`);
}

export async function updateApprovalMatrix(
  id: string,
  data: Partial<ApprovalMatrix>,
): Promise<ApprovalMatrix> {
  return apiRequest<ApprovalMatrix>(`${API_PREFIX}/settings/matrices/${id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
