import { apiRequest } from './api-client';

// ═════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  mobile?: string | null;
  email?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  reportingManagerId?: string | null;
  joiningDate?: string | null;
  confirmationDate?: string | null;
  employmentType?: string;
  workLocation?: string | null;
  branchId?: string | null;
  status?: string;
  pan?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  upi?: string | null;
  userId?: string | null;
  shiftId?: string | null;
  notes?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  timeline?: EmployeeTimelineEvent[];
}

export interface EmployeeTimelineEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  eventDate?: string | null;
}

export interface Department {
  id: string;
  departmentCode: string;
  departmentName: string;
  managerId?: string | null;
  status?: string;
}

export interface Designation {
  id: string;
  designationCode: string;
  designationName: string;
  departmentId?: string | null;
  level?: number;
  status?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  attendanceDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workingHours?: number | null;
  overtimeHours?: number | null;
  status: string;
  remarks?: string | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason?: string | null;
  status: string;
  approvedBy?: string | null;
  approvalDate?: string | null;
  remarks?: string | null;
}

export interface LeaveBalance {
  leaveType: string;
  openingBalance: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  employeeCount: number;
  grossTotal: number;
  deductionTotal: number;
  netTotal: number;
  status: string;
  paidAt?: string | null;
  paymentMode?: string | null;
}

export interface PayrollLine {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  attendanceDays: number;
  overtimeHours: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
}

export interface HrDashboard {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveToday: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingLeaveRequests: number;
  pendingPayroll: number;
  totalPayrollNet: number;
  departmentDistribution: { name: string; count: number }[];
  recentJoining: {
    id: string;
    employeeCode: string;
    name: string;
    department: string | null;
    joiningDate: string | null;
    status: string;
  }[];
}

// ═════════════════════════════════════════════════════════
// EMPLOYEES
// ═════════════════════════════════════════════════════════

export function getHrDashboard() {
  return apiRequest<HrDashboard>('/hr/employees/dashboard');
}

export function getEmployees(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: Employee[]; total: number }>(
    `/hr/employees${query ? `?${query}` : ''}`,
  );
}

export function getEmployee(id: string) {
  return apiRequest<Employee>(`/hr/employees/${id}`);
}

export function createEmployee(payload: Record<string, unknown>) {
  return apiRequest<Employee>('/hr/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(id: string, payload: Record<string, unknown>) {
  return apiRequest<Employee>(`/hr/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(id: string) {
  return apiRequest<{ deleted: boolean }>(`/hr/employees/${id}`, { method: 'DELETE' });
}

export function getNextEmployeeCode() {
  return apiRequest<{ nextCode: string }>('/hr/employees/next-code');
}

export function mapEmployeeUser(id: string, payload: { userId?: string; username?: string }) {
  return apiRequest<{ mapped: boolean }>(`/hr/employees/${id}/map-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getEmployeeReport(params: Record<string, string | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) {
      qs.set(k, v);
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: any[]; total: number }>(
    `/hr/employees/reports${query ? `?${query}` : ''}`,
  );
}

// ═════════════════════════════════════════════════════════
// DEPARTMENTS / DESIGNATIONS / SHIFTS / HOLIDAYS
// ═════════════════════════════════════════════════════════

export function getDepartments(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: Department[]; total: number }>(
    `/hr/departments${query ? `?${query}` : ''}`,
  );
}

export function createDepartment(payload: Record<string, unknown>) {
  return apiRequest<Department>('/hr/departments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getDesignations(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: Designation[]; total: number }>(
    `/hr/designations${query ? `?${query}` : ''}`,
  );
}

export function createDesignation(payload: Record<string, unknown>) {
  return apiRequest<Designation>('/hr/designations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ═════════════════════════════════════════════════════════
// ATTENDANCE
// ═════════════════════════════════════════════════════════

export function markAttendance(payload: Record<string, unknown>) {
  return apiRequest<AttendanceRecord>('/hr/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getAttendance(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: AttendanceRecord[]; total: number }>(
    `/hr/attendance${query ? `?${query}` : ''}`,
  );
}

export function getAttendanceSummary(date: string) {
  return apiRequest<Record<string, unknown>>(`/hr/attendance/summary?date=${date}`);
}

// ═════════════════════════════════════════════════════════
// LEAVE
// ═════════════════════════════════════════════════════════

export function getLeaveBalances(employeeId: string) {
  return apiRequest<LeaveBalance[]>(`/hr/leave/balances?employeeId=${employeeId}`);
}

export function allocateLeave(payload: {
  employeeId: string;
  leaveType: string;
  days: number;
  opening?: boolean;
}) {
  return apiRequest<LeaveBalance>('/hr/leave/allocate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function submitLeave(payload: Record<string, unknown>) {
  return apiRequest<LeaveRequest>('/hr/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getLeaveRequests(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: LeaveRequest[]; total: number }>(
    `/hr/leave${query ? `?${query}` : ''}`,
  );
}

export function approveLeave(id: string, remarks?: string) {
  return apiRequest<{ approved: boolean }>(`/hr/leave/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remarks: remarks || undefined }),
  });
}

export function rejectLeave(id: string, remarks?: string) {
  return apiRequest<{ rejected: boolean }>(`/hr/leave/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remarks: remarks || undefined }),
  });
}

// ═════════════════════════════════════════════════════════
// PAYROLL
// ═════════════════════════════════════════════════════════

export function getSalaryStructures(employeeId?: string) {
  const qs = employeeId ? `?employeeId=${employeeId}` : '';
  return apiRequest<{ data: any[]; total: number }>(`/hr/payroll/salary-structures${qs}`);
}

export function createSalaryStructure(payload: Record<string, unknown>) {
  return apiRequest<any>('/hr/payroll/salary-structures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function generatePayrollRun(payload: Record<string, unknown>) {
  return apiRequest<PayrollRun>('/hr/payroll/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function getPayrollRuns(params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  }
  const query = qs.toString();
  return apiRequest<{ data: PayrollRun[]; total: number }>(
    `/hr/payroll${query ? `?${query}` : ''}`,
  );
}

export function getPayrollRun(id: string) {
  return apiRequest<PayrollRun & { lines: PayrollLine[] }>(`/hr/payroll/${id}`);
}

export function approvePayrollRun(id: string) {
  return apiRequest<{ approved: boolean }>(`/hr/payroll/${id}/approve`, { method: 'POST' });
}

export function markPayrollPaid(id: string, paymentMode?: string) {
  return apiRequest<PayrollRun>(`/hr/payroll/${id}/paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMode: paymentMode || 'bank' }),
  });
}

export function getPayslip(employeeId: string, payrollRunId?: string) {
  const qs = new URLSearchParams({ employeeId });
  if (payrollRunId) {
    qs.set('payrollRunId', payrollRunId);
  }
  return apiRequest<any>(`/hr/payroll/payslip?${qs.toString()}`);
}
