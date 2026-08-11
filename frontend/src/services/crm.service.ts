import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════

export interface Lead {
  id: string;
  leadNumber: string;
  leadName: string;
  companyName?: string;
  contactPerson?: string;
  mobile?: string;
  altMobile?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  village?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
  source?: string;
  leadType?: string;
  assignedTo?: string;
  expectedValue?: number;
  expectedCloseDate?: string;
  priority?: string;
  status?: string;
  score?: number;
  scoreLevel?: string;
  notes?: string;
  convertedToCustomer?: boolean;
  convertedCustomerId?: string;
  convertedAt?: string;
  wonDate?: string;
  wonValue?: number;
  lostReason?: string;
  createdAt?: string;
  createdBy?: string;
  [key: string]: unknown;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LeadActivity {
  id: string;
  leadId?: string;
  customerId?: string;
  activityType: string;
  title?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  userId?: string;
  happenedAt: string;
}

export interface FollowUp {
  id: string;
  leadId?: string;
  customerId?: string;
  assignedTo?: string;
  followUpType: string;
  scheduledAt: string;
  priority?: string;
  purpose?: string;
  notes?: string;
  outcome?: string;
  nextFollowUpAt?: string;
  status: string;
  completedAt?: string;
  completedBy?: string;
  [key: string]: unknown;
}

export interface CrmTask {
  id: string;
  title: string;
  description?: string;
  leadId?: string;
  customerId?: string;
  assignedTo?: string;
  priority?: string;
  dueDate?: string;
  status: string;
  [key: string]: unknown;
}

export interface CrmDashboard {
  kpis: { key: string; label: string; value: number }[];
  charts: {
    leadTrend: { label: string; Leads: number; Converted: number }[];
    leadSource: { name: string; value: number }[];
    pipelineFunnel: { stage: string; count: number; color: string }[];
    wonVsLost: { name: string; value: number }[];
    salespersonPerformance: { salesperson: string; leads: number }[];
    conversionTrend: { label: string; Rate: number }[];
  };
  pipelineValue: { pipeline: number; weightedOpportunities: number };
}

// ═════════════════════════════════════════════════════════
// Leads
// ═════════════════════════════════════════════════════════

export function getLeads(params: Record<string, string | number | undefined> = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return apiRequest<Paginated<Lead>>(`/crm/leads${q ? `?${q}` : ''}`);
}

export function getLead(id: string) {
  return apiRequest<
    Lead & {
      activities: LeadActivity[];
      followUps: FollowUp[];
      tasks: CrmTask[];
      notes: unknown[];
      opportunities: unknown[];
    }
  >(`/crm/leads/${id}`);
}

export function createLead(data: Partial<Lead>) {
  return apiRequest<Lead>('/crm/leads', { method: 'POST', body: JSON.stringify(data) });
}

export function updateLead(id: string, data: Partial<Lead>) {
  return apiRequest<Lead>(`/crm/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteLead(id: string) {
  return apiRequest(`/crm/leads/${id}`, { method: 'DELETE' });
}

export function assignLead(id: string, assignedTo: string) {
  return apiRequest<Lead>(`/crm/leads/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignedTo }),
  });
}

export function changeLeadStatus(
  id: string,
  status: string,
  extra: { lostReason?: string; wonValue?: number } = {},
) {
  return apiRequest<Lead>(`/crm/leads/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, ...extra }),
  });
}

export function findLeadDuplicates(id: string) {
  return apiRequest<
    {
      customerId: string;
      customerCode: string;
      name: string;
      mobile?: string;
      gstin?: string;
      matchScore: number;
    }[]
  >(`/crm/leads/${id}/duplicates`);
}

export function convertLead(id: string, matchCustomerId?: string) {
  return apiRequest<{
    converted: boolean;
    leadId: string;
    customerId: string;
    method: string;
    matched?: boolean;
  }>(`/crm/leads/${id}/convert`, { method: 'POST', body: JSON.stringify({ matchCustomerId }) });
}

// ═════════════════════════════════════════════════════════
// Follow-ups
// ═════════════════════════════════════════════════════════

export function getFollowUps(params: Record<string, string | number | undefined> = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return apiRequest<Paginated<FollowUp>>(`/crm/follow-ups${q ? `?${q}` : ''}`);
}

export function createFollowUp(data: Partial<FollowUp>) {
  return apiRequest<FollowUp>('/crm/follow-ups', { method: 'POST', body: JSON.stringify(data) });
}

export function updateFollowUp(id: string, data: Partial<FollowUp>) {
  return apiRequest<FollowUp>(`/crm/follow-ups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function completeFollowUp(id: string, data: { outcome?: string; nextFollowUpAt?: string }) {
  return apiRequest<FollowUp>(`/crm/follow-ups/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getFollowUpReminders() {
  return apiRequest<{
    upcoming: FollowUp[];
    dueToday: FollowUp[];
    overdue: FollowUp[];
    missed: FollowUp[];
  }>('/crm/follow-ups/reminders');
}

// ═════════════════════════════════════════════════════════
// Tasks
// ═════════════════════════════════════════════════════════

export function getCrmTasks(params: Record<string, string | number | undefined> = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return apiRequest<Paginated<CrmTask>>(`/crm/tasks${q ? `?${q}` : ''}`);
}

export function createCrmTask(data: Partial<CrmTask>) {
  return apiRequest<CrmTask>('/crm/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCrmTask(id: string, data: Partial<CrmTask>) {
  return apiRequest<CrmTask>(`/crm/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ═════════════════════════════════════════════════════════
// Dashboard + Reports
// ═════════════════════════════════════════════════════════

export function getCrmDashboard() {
  return apiRequest<CrmDashboard>('/crm/dashboard');
}

export function getCrmReport(
  type: string,
  params: Record<string, string | number | undefined> = {},
) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return apiRequest<Paginated<Record<string, unknown>>>(
    `/crm/reports?type=${type}${q ? `&${q}` : ''}`,
  );
}

// ═════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'interested',
  'quotation_sent',
  'negotiation',
  'won',
  'lost',
  'converted',
];

export const LEAD_SOURCES = [
  'website',
  'instagram',
  'facebook',
  'whatsapp',
  'phone_call',
  'walk-in',
  'referral',
  'existing_customer',
  'advertisement',
  'dealer_reference',
  'other',
];

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const FOLLOW_UP_TYPES = [
  'phone',
  'whatsapp',
  'email',
  'meeting',
  'visit',
  'demo',
  'quotation_discussion',
  'payment_followup',
  'other',
];

export const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  interested: 'Interested',
  quotation_sent: 'Quotation Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
  converted: 'Converted',
};

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  contacted: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  qualified: 'bg-violet-500/10 text-violet-600 border-violet-200',
  interested: 'bg-amber-500/10 text-amber-600 border-amber-200',
  quotation_sent: 'bg-pink-500/10 text-pink-600 border-pink-200',
  negotiation: 'bg-orange-500/10 text-orange-600 border-orange-200',
  won: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  lost: 'bg-red-500/10 text-red-600 border-red-200',
  converted: 'bg-lime-500/10 text-lime-700 border-lime-200',
};
