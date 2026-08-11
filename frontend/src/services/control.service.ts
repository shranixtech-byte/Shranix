import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface BusinessRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  module: string;
  documentType?: string | null;
  description?: string | null;
  condition: any;
  action: string;
  severity?: string;
  message?: string | null;
  priority?: number;
  status?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface CustomField {
  id: string;
  fieldCode: string;
  fieldName: string;
  module: string;
  documentType: string;
  fieldType: string;
  isRequired?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  pattern?: string | null;
  options?: any;
  defaultValue?: string | null;
  placeholder?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Tag {
  id: string;
  tagName: string;
  tagColor?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export interface SearchResultGroup {
  key: string;
  label: string;
  total: number;
  items: SearchResultItem[];
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  results: SearchResultGroup[];
}

export interface RuleEvaluationResponse {
  triggered: boolean;
  action?: string;
  message?: string;
  severity?: string;
  rule?: BusinessRule;
}

export interface ControlDashboard {
  pendingApprovals: number;
  myPendingApprovals: number;
  overdueApprovals: number;
  approvedToday: number;
  rejectedToday: number;
  returnedToday: number;
  activeRules: number;
  blockRules: number;
  requireApprovalRules: number;
  ruleViolations: {
    ruleCode: string;
    ruleName: string;
    module: string;
    action: string;
    severity: string;
    message: string;
  }[];
  averageApprovalHours: number | null;
  moduleBreakdown: { module: string; count: number }[];
  pendingByType: { documentType: string; count: number }[];
  escalated: any[];
}

// ═════════════════════════════════════════════════════════
// BUSINESS RULES
// ═════════════════════════════════════════════════════════

export const businessRuleApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        q.set(k, String(v));
      }
    });
    const qs = q.toString();
    return apiRequest<{ data: BusinessRule[]; total: number }>(
      `/business-rules${qs ? `?${qs}` : ''}`,
    );
  },
  get: (id: string) => apiRequest<BusinessRule>(`/business-rules/${id}`),
  create: (data: Partial<BusinessRule>) =>
    apiRequest<BusinessRule>('/business-rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<BusinessRule>) =>
    apiRequest<{ updated: boolean }>(`/business-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/business-rules/${id}`, { method: 'DELETE' }),
  evaluate: (body: {
    module: string;
    documentType?: string;
    amount?: number;
    data: Record<string, any>;
  }) =>
    apiRequest<RuleEvaluationResponse>('/business-rules/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ═════════════════════════════════════════════════════════
// CUSTOM FIELDS
// ═════════════════════════════════════════════════════════

export const customFieldApi = {
  list: (module?: string, documentType?: string) => {
    const q = new URLSearchParams();
    if (module) {
      q.set('module', module);
    }
    if (documentType) {
      q.set('documentType', documentType);
    }
    const qs = q.toString();
    return apiRequest<CustomField[]>(`/custom-fields${qs ? `?${qs}` : ''}`);
  },
  create: (data: Partial<CustomField>) =>
    apiRequest<CustomField>('/custom-fields', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CustomField>) =>
    apiRequest<{ updated: boolean }>(`/custom-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/custom-fields/${id}`, { method: 'DELETE' }),
  getValues: (documentType: string, recordId: string) =>
    apiRequest<Record<string, any>>(`/custom-fields/values/${documentType}/${recordId}`),
  saveValues: (documentType: string, recordId: string, values: Record<string, any>) =>
    apiRequest<Record<string, any>>(`/custom-fields/values/${documentType}/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(values),
    }),
};

// ═════════════════════════════════════════════════════════
// TAGS
// ═════════════════════════════════════════════════════════

export const tagApi = {
  list: (search?: string) =>
    apiRequest<Tag[]>(`/tags${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  create: (data: Partial<Tag>) =>
    apiRequest<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Tag>) =>
    apiRequest<{ updated: boolean }>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/tags/${id}`, { method: 'DELETE' }),
  recordTags: (recordType: string, recordId: string) =>
    apiRequest<Tag[]>(`/tags/record/${recordType}/${recordId}`),
  assign: (tagId: string, recordType: string, recordId: string) =>
    apiRequest<any>('/tags/assign', {
      method: 'POST',
      body: JSON.stringify({ tagId, recordType, recordId }),
    }),
  unassign: (tagId: string, recordType: string, recordId: string) =>
    apiRequest<{ unassigned: boolean }>('/tags/assign', {
      method: 'DELETE',
      body: JSON.stringify({ tagId, recordType, recordId }),
    }),
};

// ═════════════════════════════════════════════════════════
// GLOBAL SEARCH
// ═════════════════════════════════════════════════════════

export const globalSearchApi = {
  search: (q: string, limit?: number) =>
    apiRequest<GlobalSearchResponse>(
      `/global-search?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`,
    ),
};

// ═════════════════════════════════════════════════════════
// BUSINESS CONTROL
// ═════════════════════════════════════════════════════════

export const businessControlApi = {
  dashboard: () => apiRequest<ControlDashboard>('/business-control/dashboard'),
  violations: () => apiRequest<{ data: any[]; total: number }>('/business-control/violations'),
  evaluate: (body: {
    module: string;
    documentType?: string;
    amount?: number;
    data: Record<string, any>;
  }) =>
    apiRequest<RuleEvaluationResponse>('/business-control/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
