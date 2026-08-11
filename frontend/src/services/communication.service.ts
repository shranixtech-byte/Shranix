import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  module?: string | null;
  documentId?: string | null;
  documentType?: string | null;
  instanceId?: string | null;
  taskId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface CommunicationTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  subject?: string | null;
  body: string;
  htmlBody?: string | null;
  variables?: string | null;
  language: string;
  isActive: boolean;
  category?: string | null;
}

export interface CommunicationLog {
  id: string;
  channel: string;
  templateCode?: string | null;
  subject?: string | null;
  messageBody?: string | null;
  recipientType?: string | null;
  recipientId?: string | null;
  recipientAddress?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNumber?: string | null;
  status: string;
  provider?: string | null;
  attempts: number;
  failureReason?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

// ═════════════════════════════════════════════════════════
// IN-APP NOTIFICATIONS (workflow/notifications — existing engine)
// ═════════════════════════════════════════════════════════

export function getMyNotifications(page = 1, limit = 20, unreadOnly = false) {
  return apiRequest<{ data: NotificationItem[]; total: number }>(
    `/workflow/notifications?page=${page}&limit=${limit}${unreadOnly ? '&unreadOnly=true' : ''}`,
  );
}

export function getUnreadNotificationCount() {
  return apiRequest<{ count: number }>('/workflow/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiRequest<{ message: string }>(`/workflow/notifications/${id}/read`, {
    method: 'POST',
  });
}

export function markAllNotificationsRead() {
  return apiRequest<{ message: string }>('/workflow/notifications/mark-all-read', {
    method: 'POST',
  });
}

// ═════════════════════════════════════════════════════════
// COMMUNICATION ENGINE
// ═════════════════════════════════════════════════════════

export function listCommunications(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: CommunicationLog[]; total: number }>(
    `/communications${query ? `?${query}` : ''}`,
  );
}

export function getCommunication(id: string) {
  return apiRequest<CommunicationLog>(`/communications/${id}`);
}

export function sendCommunication(payload: Record<string, unknown>) {
  return apiRequest<CommunicationLog>('/communications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function retryCommunication(id: string) {
  return apiRequest<CommunicationLog>(`/communications/retry/${id}`, {
    method: 'POST',
  });
}

export function getCommunicationReports(params: { dateFrom?: string; dateTo?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.dateFrom) {
    qs.set('dateFrom', params.dateFrom);
  }
  if (params.dateTo) {
    qs.set('dateTo', params.dateTo);
  }
  const query = qs.toString();
  return apiRequest<{
    total: number;
    sent: number;
    failed: number;
    byChannel: Record<string, { sent: number; delivered: number; failed: number }>;
    byStatus: Record<string, number>;
    byTemplate: Record<string, number>;
  }>(`/communications/reports${query ? `?${query}` : ''}`);
}

export function getCommunicationSettings() {
  return apiRequest<Record<string, unknown>>('/communications/settings');
}

export function updateCommunicationSettings(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/communications/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function runCommunicationWorker() {
  return apiRequest<{ processed: number; reminders: Record<string, number> }>(
    '/communications/worker/run-now',
    { method: 'POST' },
  );
}

// ═════════════════════════════════════════════════════════
// TEMPLATES
// ═════════════════════════════════════════════════════════

export function listTemplates(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: CommunicationTemplate[]; total: number }>(
    `/communications/templates${query ? `?${query}` : ''}`,
  );
}

export function createTemplate(payload: Record<string, unknown>) {
  return apiRequest<CommunicationTemplate>('/communications/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateTemplate(id: string, payload: Record<string, unknown>) {
  return apiRequest<CommunicationTemplate>(`/communications/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteTemplate(id: string) {
  return apiRequest<{ message: string }>(`/communications/templates/${id}`, {
    method: 'DELETE',
  });
}

// ═════════════════════════════════════════════════════════
// PREFERENCES
// ═════════════════════════════════════════════════════════

export function getCommunicationPreferences(entityType: string, entityId: string) {
  return apiRequest<{ data: any[]; total: number }>(
    `/communications/preferences?entityType=${entityType}&entityId=${entityId}`,
  );
}

export function setCommunicationPreferences(
  entityType: string,
  entityId: string,
  rows: Array<{ channel: string; category?: string; enabled: boolean; preferred?: boolean }>,
) {
  return apiRequest<{ data: any[]; total: number }>('/communications/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, entityId, rows }),
  });
}

// ═════════════════════════════════════════════════════════
// CAMPAIGNS (bulk)
// ═════════════════════════════════════════════════════════

export function listCampaigns(page = 1, ps = 20) {
  return apiRequest<{ data: any[]; total: number }>(
    `/communications/campaigns?page=${page}&ps=${ps}`,
  );
}

export function createCampaign(payload: Record<string, unknown>) {
  return apiRequest<any>('/communications/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function runCampaign(id: string) {
  return apiRequest<any>(`/communications/campaigns/${id}/run`, { method: 'POST' });
}
