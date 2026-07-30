import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../common/services/audit.service';
import { DatabaseService } from '../database/database.service';

export type DocumentType = 'sales_invoice' | 'sales_quotation' | 'proforma_invoice' | 'delivery_challan' | 'sales_return' | 'credit_note' | 'debit_note';
export type ApprovalStatus = 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled' | 'posted' | 'closed';
export type ApprovalLevel = 'single' | 'two_level' | 'three_level' | 'unlimited';
export type ApprovalAction = 'approve' | 'reject' | 'send_back' | 'assign' | 'view';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ApprovalRule {
  id: string; documentType: DocumentType;
  field: string;
  operator: string;
  value: string; value2?: string;
  approverRole: string; approvalLevel: number; priority: number; isActive: boolean;
}
export interface ApproverEntry { level: number; role: string; userId?: string; canOverride: boolean; minAmount?: number; maxAmount?: number; }
export interface ApproveRejectDto { comment: string; reason?: string; }
export interface SendBackDto { comment: string; reason: string; targetLevel?: number; }
export interface AssignDto { assignToUserId: string; assignToUserName: string; comment?: string; }
export interface BulkActionDto { approvalIds: string[]; comment: string; }

@Injectable()
export class SalesApprovalEngineService {
  private readonly logger = new Logger(SalesApprovalEngineService.name);

  private seeded = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    try {
      const existing = await this.database.approvalMatrices.findAll({ page: 1, pageSize: 1 });
      if (existing?.data?.length) { this.seeded = true; return; }
    } catch { /* table may not exist yet */ }

    const now = new Date().toISOString();
    const seedMatrices = [
      { name: 'Sales Invoice Approval', documentType: 'sales_invoice', levels: 'two_level', levelCount: 2, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false, minAmount: 0, maxAmount: 100000 }, { level: 2, role: 'admin', canOverride: true, minAmount: 100000 }, { level: 2, role: 'finance_head', canOverride: true }]), isActive: true, createdAt: now, updatedAt: now },
      { name: 'Sales Quotation Approval', documentType: 'sales_quotation', levels: 'single', levelCount: 1, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }]), isActive: true, createdAt: now, updatedAt: now },
      { name: 'Delivery Challan Approval', documentType: 'delivery_challan', levels: 'single', levelCount: 1, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }]), isActive: true, createdAt: now, updatedAt: now },
      { name: 'Sales Return Approval', documentType: 'sales_return', levels: 'two_level', levelCount: 2, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false, minAmount: 0, maxAmount: 50000 }, { level: 2, role: 'admin', canOverride: true, minAmount: 50000 }]), isActive: true, createdAt: now, updatedAt: now },
      { name: 'Credit Note Approval', documentType: 'credit_note', levels: 'two_level', levelCount: 2, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }, { level: 2, role: 'admin', canOverride: true }]), isActive: true, createdAt: now, updatedAt: now },
      { name: 'Proforma Invoice Approval', documentType: 'proforma_invoice', levels: 'single', levelCount: 1, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }]), isActive: true, createdAt: now, updatedAt: now },
      { name: 'Debit Note Approval', documentType: 'debit_note', levels: 'two_level', levelCount: 2, approvers: JSON.stringify([{ level: 1, role: 'manager', canOverride: false }, { level: 2, role: 'admin', canOverride: true }]), isActive: true, createdAt: now, updatedAt: now },
    ];
    for (const m of seedMatrices) {
      await this.database.approvalMatrices.create(m);
    }

    // Seed rules
    const seedRules = [
      { documentType: 'sales_invoice', field: 'amount', operator: '>', value: '500000', approverRole: 'accounts', approvalLevel: 1, priority: 1, isActive: true },
      { documentType: 'sales_invoice', field: 'discount_pct', operator: '>', value: '20', approverRole: 'admin', approvalLevel: 2, priority: 2, isActive: true },
      { documentType: 'sales_invoice', field: 'credit_limit', operator: '>', value: '100000', approverRole: 'finance_head', approvalLevel: 1, priority: 3, isActive: true },
      { documentType: 'sales_return', field: 'amount', operator: '>', value: '100000', approverRole: 'admin', approvalLevel: 2, priority: 1, isActive: true },
      { documentType: 'credit_note', field: 'amount', operator: '>', value: '50000', approverRole: 'admin', approvalLevel: 2, priority: 1, isActive: true },
    ];
    for (const r of seedRules) {
      await this.database.approvalRules.create(r);
    }
  }

  // ── Notification Placeholders ──
  private async sendEmail(_to: string, _subject: string, _body: string): Promise<void> { this.logger.log(`[EMAIL] To: ${_to}, Subject: ${_subject}`); }
  private async sendWhatsApp(_to: string, _message: string): Promise<void> { this.logger.log(`[WHATSAPP] To: ${_to}, Message: ${_message}`); }
  private async sendSms(_to: string, _message: string): Promise<void> { this.logger.log(`[SMS] To: ${_to}, Message: ${_message}`); }

  private async addNotification(approvalId: string, recipientId: string, recipientRole: string, _type: string, message: string): Promise<void> {
    await this.database.approvalNotifications.create({
      approvalId, recipientId, recipientRole, type: _type, message, isRead: false, createdAt: new Date().toISOString(),
    }).catch(() => {});
  }

  private async sendNotifications(approvalId: string, documentNumber: string, createdBy: string, createdByName: string, _type: string, message: string): Promise<void> {
    await this.addNotification(approvalId, createdBy, 'creator', _type, message);
    this.sendEmail(createdByName || createdBy, `Approval Update: ${documentNumber}`, message);
    this.sendWhatsApp(createdByName || createdBy, message);
    this.sendSms(createdByName || createdBy, message);
  }

  private async evaluateRules(params: { documentType: DocumentType; amount: number; discountPercent: number; gstAmount: number }): Promise<{ requiresHigherLevel: boolean; requiredRole: string; requiredLevel: number }> {
    const rulesResult = await this.database.approvalRules.findAll({ page: 1, pageSize: 100 });
    const rules = (rulesResult?.data || []).filter((r: any) => r.documentType === params.documentType && r.isActive !== false);
    let requiresHigherLevel = false;
    let requiredRole = '';
    let requiredLevel = 1;
    for (const rule of rules) {
      let matched = false;
      let val = 0;
      if (rule.field === 'amount') val = params.amount;
      else if (rule.field === 'discount_pct') val = params.discountPercent;
      else if (rule.field === 'gst_amount') val = params.gstAmount;
      const ruleVal = Number(rule.value);
      switch (rule.operator) {
        case '>': matched = val > ruleVal; break;
        case '>=': matched = val >= ruleVal; break;
        case '<': matched = val < ruleVal; break;
        case '<=': matched = val <= ruleVal; break;
        case '==': matched = val === ruleVal; break;
        case 'between': matched = val >= ruleVal && val <= Number(rule.value2 || ruleVal); break;
      }
      if (matched && rule.approvalLevel > requiredLevel) {
        requiresHigherLevel = true; requiredLevel = rule.approvalLevel; requiredRole = rule.approverRole;
      }
    }
    return { requiresHigherLevel, requiredRole, requiredLevel };
  }

  async submitForApproval(params: {
    documentType: DocumentType; documentId: string; documentNumber: string; customerId: string; customerName: string;
    amount: number; discountAmount: number; discountPercent: number; gstAmount: number;
    createdBy: string; createdByName: string; priority?: Priority;
  }): Promise<any> {
    await this.ensureSeeded();
    // Check existing
    const existingResult = await this.database.salesApprovals.findAll({ page: 1, pageSize: 10, search: params.documentId });
    const existing = (existingResult?.data || []).find((a: any) => a.documentId === params.documentId && a.status !== 'cancelled' && a.status !== 'closed');
    if (existing) throw new BadRequestException(`Document ${params.documentNumber} is already in approval workflow (${existing.status})`);

    // Find matrix
    const matricesResult = await this.database.approvalMatrices.findAll({ page: 1, pageSize: 50 });
    const matrix = (matricesResult?.data || []).find((m: any) => m.documentType === params.documentType && m.isActive !== false);
    if (!matrix) throw new BadRequestException(`No active approval matrix found for ${params.documentType}`);

    const ruleResult = await this.evaluateRules(params);
    const totalLevels = ruleResult.requiresHigherLevel ? Math.max(matrix.levelCount || 1, ruleResult.requiredLevel) : (matrix.levelCount || 1);
    const now = new Date().toISOString();
    const risk: RiskLevel = params.amount > 500000 ? 'high' : params.amount > 100000 ? 'medium' : 'low';
    const priority: Priority = params.priority || (risk === 'high' ? 'high' : risk === 'medium' ? 'medium' : 'low');
    const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    let approvers: ApproverEntry[] = [];
    try { approvers = JSON.parse(matrix.approvers || '[]'); } catch { approvers = []; }
    const firstApprover = approvers.find((a: ApproverEntry) => a.level === 1);

    const master = await this.database.salesApprovals.create({
      documentType: params.documentType, documentId: params.documentId,
      documentNumber: params.documentNumber, customerId: params.customerId, customerName: params.customerName,
      amount: params.amount, discountAmount: params.discountAmount, discountPercent: params.discountPercent,
      gstAmount: params.gstAmount, createdBy: params.createdBy, createdByName: params.createdByName,
      currentLevel: 1, totalLevels, status: 'pending', priority, risk, creditStatus: 'normal',
      assignedTo: firstApprover?.userId || firstApprover?.role || '', assignedToName: firstApprover?.role || '',
      isOverdue: false, dueDate, createdAt: now, updatedAt: now,
   });

    // Add history
    await this.database.approvalHistory.create({
      approvalId: master.id, action: 'view', actionBy: params.createdBy, actionByName: params.createdByName,
      fromStatus: 'draft', toStatus: 'pending', level: 0, comment: 'Document submitted for approval', timestamp: now,
   });

    this.sendNotifications(master.id, params.documentNumber, params.createdBy, params.createdByName, 'assigned',
      `New ${params.documentType.replace(/_/g, ' ')} ${params.documentNumber} requires your approval`);

    if (this.audit) {
      await this.audit.log({ userId: params.createdBy, event: 'approval_submitted', resource: 'sales_approval', action: 'submit', details: { approvalId: master.id, documentType: params.documentType, documentNumber: params.documentNumber, amount: params.amount } });
    }
    this.logger.log(`Document ${params.documentNumber} submitted for approval [${master.id}]`);
    return master;
  }

  async approve(approvalId: string, userId: string, userName: string, dto: ApproveRejectDto): Promise<any> {
    const master = await this.database.salesApprovals.findById(approvalId);
    if (!master) throw new NotFoundException('Approval record not found');
    this.validateAction(master, 'approve');
    const fromStatus = master.status;
    const currentLevel = master.currentLevel || 1;
    const totalLevels = master.totalLevels || 1;

    let newStatus = '';
    if (currentLevel >= totalLevels) {
      newStatus = 'approved';
    } else {
      newStatus = 'under_review';
    }

    const newLevel = newStatus === 'approved' ? currentLevel : currentLevel + 1;

    // Update master
    const matrixResult = await this.database.approvalMatrices.findAll({ page: 1, pageSize: 50 });
    const matrix = (matrixResult?.data || []).find((m: any) => m.documentType === master.documentType && m.isActive !== false);
    let assignTo = '';
    let assignToName = '';
    if (matrix && newStatus !== 'approved') {
      let approvers: ApproverEntry[] = [];
      try { approvers = JSON.parse(matrix.approvers || '[]'); } catch { approvers = []; }
      const nextApprover = approvers.find((a: ApproverEntry) => a.level === newLevel);
      if (nextApprover) { assignTo = nextApprover.userId || nextApprover.role || ''; assignToName = nextApprover.role || ''; }
    }

    await this.database.salesApprovals.update(approvalId, {
      status: newStatus, currentLevel: newLevel, assignedTo: assignTo, assignedToName: assignToName, updatedAt: new Date().toISOString(),
   });

    // Add history
    await this.database.approvalHistory.create({
      approvalId, action: 'approve', actionBy: userId, actionByName: userName,
      fromStatus, toStatus: newStatus, level: currentLevel, comment: dto.comment || '', timestamp: new Date().toISOString(),
   });

    this.sendNotifications(approvalId, master.documentNumber || '', master.createdBy, master.createdByName || '', 'approved',
      `${master.documentNumber} was ${newStatus === 'approved' ? 'fully approved' : `approved at level ${currentLevel}`}`);

    if (this.audit) {
      await this.audit.log({ userId, event: 'approval_approved', resource: 'sales_approval', action: 'approve', details: { approvalId, documentNumber: master.documentNumber, level: currentLevel } });
    }
    return { ...master, status: newStatus, currentLevel: newLevel };
  }

  async reject(approvalId: string, userId: string, userName: string, dto: ApproveRejectDto): Promise<any> {
    const master = await this.database.salesApprovals.findById(approvalId);
    if (!master) throw new NotFoundException('Approval record not found');
    if (!dto.comment || dto.comment.trim().length === 0) throw new BadRequestException('Comment is mandatory when rejecting');
    this.validateAction(master, 'reject');
    await this.database.salesApprovals.update(approvalId, { status: 'rejected', updatedAt: new Date().toISOString()});
    await this.database.approvalHistory.create({
      approvalId, action: 'reject', actionBy: userId, actionByName: userName,
      fromStatus: master.status, toStatus: 'rejected', level: master.currentLevel || 1,
      comment: dto.comment, timestamp: new Date().toISOString(),
   });
    this.sendNotifications(approvalId, master.documentNumber || '', master.createdBy, master.createdByName || '', 'rejected',
      `${master.documentNumber} was rejected at level ${master.currentLevel}. Reason: ${dto.comment}`);
    if (this.audit) {
      await this.audit.log({ userId, event: 'approval_rejected', resource: 'sales_approval', action: 'reject', details: { approvalId, documentNumber: master.documentNumber, reason: dto.comment } });
    }
    return { ...master, status: 'rejected' };
  }

  async sendBack(approvalId: string, userId: string, userName: string, dto: SendBackDto): Promise<any> {
    const master = await this.database.salesApprovals.findById(approvalId);
    if (!master) throw new NotFoundException('Approval record not found');
    if (!dto.comment || dto.comment.trim().length === 0) throw new BadRequestException('Comment is mandatory when sending back');
    this.validateAction(master, 'send_back');
    const targetLevel = dto.targetLevel || Math.max(1, (master.currentLevel || 1) - 1);
    const newStatus = targetLevel === 0 ? 'draft' : 'pending';
    await this.database.salesApprovals.update(approvalId, { status: newStatus, currentLevel: targetLevel, updatedAt: new Date().toISOString()});
    await this.database.approvalHistory.create({
      approvalId, action: 'send_back', actionBy: userId, actionByName: userName,
      fromStatus: master.status, toStatus: newStatus, level: targetLevel, comment: dto.comment, timestamp: new Date().toISOString(),
   });
    this.sendNotifications(approvalId, master.documentNumber || '', master.createdBy, master.createdByName || '', 'send_back',
      `${master.documentNumber} was sent back to level ${targetLevel}. Reason: ${dto.comment}`);
    if (this.audit) {
      await this.audit.log({ userId, event: 'approval_sent_back', resource: 'sales_approval', action: 'send_back', details: { approvalId, documentNumber: master.documentNumber, targetLevel } });
    }
    return { ...master, status: newStatus, currentLevel: targetLevel };
  }

  async assign(approvalId: string, userId: string, userName: string, dto: AssignDto): Promise<any> {
    const master = await this.database.salesApprovals.findById(approvalId);
    if (!master) throw new NotFoundException('Approval record not found');
    this.validateAction(master, 'assign');
    await this.database.salesApprovals.update(approvalId, { assignedTo: dto.assignToUserId, assignedToName: dto.assignToUserName, updatedAt: new Date().toISOString()});
    await this.database.approvalHistory.create({
      approvalId, action: 'assign', actionBy: userId, actionByName: userName,
      fromStatus: master.status, toStatus: master.status, level: master.currentLevel || 1,
      comment: `Assigned to ${dto.assignToUserName}${dto.comment ? ': ' + dto.comment : ''}`, timestamp: new Date().toISOString(),
   });
    await this.addNotification(approvalId, dto.assignToUserId, 'assigned', 'assigned', `${master.documentNumber} has been assigned to you for review`);
    this.sendEmail(dto.assignToUserName, `New Approval Assigned: ${master.documentNumber}`, `You have been assigned to review ${master.documentNumber}`);
    if (this.audit) {
      await this.audit.log({ userId, event: 'approval_assigned', resource: 'sales_approval', action: 'assign', details: { approvalId, documentNumber: master.documentNumber, assignedTo: dto.assignToUserId } });
    }
    return { ...master, assignedTo: dto.assignToUserId, assignedToName: dto.assignToUserName };
  }

  async bulkApprove(approvalIds: string[], userId: string, userName: string, comment: string): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0; let failed = 0; const errors: string[] = [];
    for (const id of approvalIds) {
      try { await this.approve(id, userId, userName, { comment }); success++; }
      catch (e) { failed++; errors.push(`[${id}] ${(e as Error).message}`); }
    }
    return { success, failed, errors };
  }

  async bulkReject(approvalIds: string[], userId: string, userName: string, comment: string): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0; let failed = 0; const errors: string[] = [];
    for (const id of approvalIds) {
      try { await this.reject(id, userId, userName, { comment }); success++; }
      catch (e) { failed++; errors.push(`[${id}] ${(e as Error).message}`); }
    }
    return { success, failed, errors };
  }

  async bulkAssign(approvalIds: string[], userId: string, userName: string, assignToUserId: string, assignToUserName: string, comment: string): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0; let failed = 0; const errors: string[] = [];
    for (const id of approvalIds) {
      try { await this.assign(id, userId, userName, { assignToUserId, assignToUserName, comment }); success++; }
      catch (e) { failed++; errors.push(`[${id}] ${(e as Error).message}`); }
    }
    return { success, failed, errors };
  }

  async addComment(approvalId: string, userId: string, userName: string, comment: string, isInternal = false): Promise<any> {
    const master = await this.database.salesApprovals.findById(approvalId);
    if (!master) throw new NotFoundException('Approval record not found');
    if (!comment || comment.trim().length === 0) throw new BadRequestException('Comment cannot be empty');
    return this.database.approvalComments.create({
      approvalId, userId, userName, comment, isInternal, createdAt: new Date().toISOString(),
   });
  }

  async findAll(params: { page?: number; pageSize?: number; status?: ApprovalStatus; documentType?: DocumentType; documentId?: string; search?: string; assignedTo?: string; createdBy?: string } = {}): Promise<{ data: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    return this.database.salesApprovals.findAll({ page: params.page || 1, pageSize: params.pageSize || 50 });
  }

  async findById(id: string): Promise<any> {
    return this.database.salesApprovals.findById(id);
  }

  async getHistory(approvalId: string): Promise<any[]> {
    const result = await this.database.approvalHistory.findAll({ page: 1, pageSize: 200, search: approvalId });
    const data = (result?.data || []).filter((h: any) => h.approvalId === approvalId);
    return data.sort((a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || ''));
  }

  async getComments(approvalId: string): Promise<any[]> {
    const result = await this.database.approvalComments.findAll({ page: 1, pageSize: 100, search: approvalId });
    const data = (result?.data || []).filter((c: any) => c.approvalId === approvalId);
    return data.sort((a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  async getNotifications(userId: string, unreadOnly = false): Promise<any[]> {
    const result = await this.database.approvalNotifications.findAll({ page: 1, pageSize: 100, search: userId });
    let data = (result?.data || []).filter((n: any) => n.recipientId === userId || n.recipientRole === userId);
    if (unreadOnly) data = data.filter((n: any) => !n.isRead);
    return data.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.database.approvalNotifications.update(notificationId, { isRead: true});
  }

  async getDashboardStats(): Promise<any> {
    const all = await this.database.salesApprovals.findAll({ page: 1, pageSize: 1000 });
    const data = all?.data || [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    return {
      pendingCount: data.filter((a: any) => a.status === 'pending').length,
      underReviewCount: data.filter((a: any) => a.status === 'under_review').length,
      approvedToday: data.filter((a: any) => a.status === 'approved' && a.updatedAt >= todayStart).length,
      rejectedCount: data.filter((a: any) => a.status === 'rejected').length,
      totalCount: data.length,
      overdueCount: data.filter((a: any) => a.status === 'pending' && a.dueDate && new Date(a.dueDate) < now).length,
      averageApprovalTime: this.calculateAverageApprovalTime(data),
      byDocumentType: this.groupBy(data, 'documentType'),
      byStatus: this.groupBy(data, 'status'),
    };
  }

  async getMatrices(): Promise<any[]> {
    await this.ensureSeeded();
    const result = await this.database.approvalMatrices.findAll({ page: 1, pageSize: 100 });
    return result?.data || [];
  }

  async updateMatrix(id: string, data: Partial<any>): Promise<any> {
    const matrix = await this.database.approvalMatrices.findById(id);
    if (!matrix) throw new NotFoundException('Approval matrix not found');
    return this.database.approvalMatrices.update(id, { ...data, updatedAt: new Date().toISOString()});
  }

  async getRules(): Promise<any[]> {
    await this.ensureSeeded();
    const result = await this.database.approvalRules.findAll({ page: 1, pageSize: 100 });
    return result?.data || [];
  }

  canEditApprovedDocument(userId: string, userRole: string): boolean {
    const overrideRoles = ['admin', 'manager', 'accounts_head'];
    return overrideRoles.includes(userRole) || overrideRoles.some((r) => userId.includes(r));
  }

  private validateAction(master: any, action: string): void {
    if (master.status === 'approved') throw new BadRequestException('Document is already approved');
    if (master.status === 'rejected') throw new BadRequestException('Document has been rejected');
    if (master.status === 'cancelled') throw new BadRequestException('Document approval has been cancelled');
    if (master.status === 'closed') throw new BadRequestException('Document is closed');
    if (master.status === 'draft' && action !== 'assign') throw new BadRequestException('Document has not been submitted for approval');
  }

  private calculateAverageApprovalTime(data: any[]): number {
    const approved = data.filter((a: any) => a.status === 'approved');
    if (approved.length === 0) return 0;
    const total = approved.reduce((s: number, a: any) => s + (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60), 0);
    return Math.round((total / approved.length) * 10) / 10;
  }

  private groupBy(data: any[], key: string): Record<string, number> {
    return data.reduce((acc: Record<string, number>, item: any) => {
      const v = String(item[key] || 'unknown');
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
