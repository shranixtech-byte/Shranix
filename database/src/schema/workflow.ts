import { sqliteTable as sqliteTableBase, text as sqliteText, integer as sqliteInteger, real as sqliteReal, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { pgTable as pgTableBase, text as pgText, integer as pgInteger, real as pgReal, uuid as pgUuid, timestamp as pgTimestamp, uniqueIndex as pgUniqueIndex, boolean as pgBoolean, index as pgIndex } from 'drizzle-orm/pg-core';
import crypto from 'node:crypto';

const sqliteBase = { id: sqliteText('id').primaryKey().$defaultFn(() => crypto.randomUUID()), createdAt: sqliteText('created_at').notNull().$defaultFn(() => new Date().toISOString()), updatedAt: sqliteText('updated_at').notNull().$defaultFn(() => new Date().toISOString()).$onUpdateFn(() => new Date().toISOString()), deletedAt: sqliteText('deleted_at'), isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false) };
const pgBase = { id: pgUuid('id').primaryKey().defaultRandom(), createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()), deletedAt: pgTimestamp('deleted_at', { withTimezone: true }), isDeleted: pgBoolean('is_deleted').notNull().default(false) };

// ═══════════════════════════════════════════════════════════════
// 1. WORKFLOW TEMPLATES — Reusable workflow blueprints
// ═══════════════════════════════════════════════════════════════
export const sqliteWorkflowTemplates = sqliteTableBase('shranix_workflow_templates', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  code: sqliteText('code').notNull(),
  description: sqliteText('description'),
  module: sqliteText('module').notNull(), // purchase, sales, finance, inventory, gst
  documentType: sqliteText('document_type').notNull(), // purchase_order, sales_invoice, journal_entry, etc.
  version: sqliteInteger('version').notNull().default(1),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  initialState: sqliteText('initial_state').notNull().default('draft'),
  states: sqliteText('states').notNull(), // JSON array of allowed states
  transitions: sqliteText('transitions').notNull(), // JSON array of valid transitions
  config: sqliteText('config'), // JSON: escalation, reminders, auto-approval settings
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({
  templateCodeIdx: uniqueIndex('wf_template_code_idx').on(table.code),
  templateModuleDocIdx: index('wf_template_module_doc_idx').on(table.module, table.documentType),
}));

export const pgWorkflowTemplates = pgTableBase('shranix_workflow_templates', {
  ...pgBase,
  name: pgText('name').notNull(),
  code: pgText('code').notNull(),
  description: pgText('description'),
  module: pgText('module').notNull(),
  documentType: pgText('document_type').notNull(),
  version: pgInteger('version').notNull().default(1),
  isActive: pgBoolean('is_active').notNull().default(true),
  initialState: pgText('initial_state').notNull().default('draft'),
  states: pgText('states').notNull(),
  transitions: pgText('transitions').notNull(),
  config: pgText('config'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({
  templateCodeIdx: pgUniqueIndex('wf_template_code_idx').on(table.code),
  templateModuleDocIdx: pgIndex('wf_template_module_doc_idx').on(table.module, table.documentType),
}));

// ═══════════════════════════════════════════════════════════════
// 2. WORKFLOW INSTANCES — Active workflow runs for documents
// ═══════════════════════════════════════════════════════════════
export const sqliteWorkflowInstances = sqliteTableBase('shranix_workflow_instances', {
  ...sqliteBase,
  templateId: sqliteText('template_id').notNull(),
  documentId: sqliteText('document_id').notNull(),
  documentType: sqliteText('document_type').notNull(),
  documentNumber: sqliteText('document_number'),
  module: sqliteText('module').notNull(),
  currentState: sqliteText('current_state').notNull().default('draft'),
  previousState: sqliteText('previous_state'),
  status: sqliteText('status').notNull().default('active'), // active, completed, cancelled, rejected
  priority: sqliteText('priority').notNull().default('normal'), // low, normal, high, urgent
  initiatorId: sqliteText('initiator_id'),
  assignedToId: sqliteText('assigned_to_id'),
  assignedRole: sqliteText('assigned_role'),
  approvalLevel: sqliteInteger('approval_level').notNull().default(0),
  maxApprovalLevel: sqliteInteger('max_approval_level').notNull().default(1),
  amount: sqliteReal('amount').notNull().default(0),
  departmentId: sqliteText('department_id'),
  branchId: sqliteText('branch_id'),
  dueDate: sqliteText('due_date'),
  completedAt: sqliteText('completed_at'),
  completedBy: sqliteText('completed_by'),
  variables: sqliteText('variables'), // JSON: workflow variables
  metadata: sqliteText('metadata'), // JSON: additional metadata
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({
  instanceDocIdx: uniqueIndex('wf_instance_doc_idx').on(table.documentType, table.documentId),
  instanceStateIdx: index('wf_instance_state_idx').on(table.currentState),
  instanceAssigneeIdx: index('wf_instance_assignee_idx').on(table.assignedToId),
  instanceDocTypeIdx: index('wf_instance_doc_type_idx').on(table.documentType),
}));

export const pgWorkflowInstances = pgTableBase('shranix_workflow_instances', {
  ...pgBase,
  templateId: pgUuid('template_id').notNull(),
  documentId: pgUuid('document_id').notNull(),
  documentType: pgText('document_type').notNull(),
  documentNumber: pgText('document_number'),
  module: pgText('module').notNull(),
  currentState: pgText('current_state').notNull().default('draft'),
  previousState: pgText('previous_state'),
  status: pgText('status').notNull().default('active'),
  priority: pgText('priority').notNull().default('normal'),
  initiatorId: pgUuid('initiator_id'),
  assignedToId: pgUuid('assigned_to_id'),
  assignedRole: pgText('assigned_role'),
  approvalLevel: pgInteger('approval_level').notNull().default(0),
  maxApprovalLevel: pgInteger('max_approval_level').notNull().default(1),
  amount: pgReal('amount').notNull().default(0),
  departmentId: pgUuid('department_id'),
  branchId: pgUuid('branch_id'),
  dueDate: pgTimestamp('due_date', { withTimezone: true }),
  completedAt: pgTimestamp('completed_at', { withTimezone: true }),
  completedBy: pgUuid('completed_by'),
  variables: pgText('variables'),
  metadata: pgText('metadata'),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({
  instanceDocIdx: pgUniqueIndex('wf_instance_doc_idx').on(table.documentType, table.documentId),
  instanceStateIdx: pgIndex('wf_instance_state_idx').on(table.currentState),
  instanceAssigneeIdx: pgIndex('wf_instance_assignee_idx').on(table.assignedToId),
  instanceDocTypeIdx: pgIndex('wf_instance_doc_type_idx').on(table.documentType),
}));

// ═══════════════════════════════════════════════════════════════
// 3. WORKFLOW HISTORY — Every action, state change, timestamp
// ═══════════════════════════════════════════════════════════════
export const sqliteWorkflowHistory = sqliteTableBase('shranix_workflow_history', {
  ...sqliteBase,
  instanceId: sqliteText('instance_id').notNull(),
  documentId: sqliteText('document_id'),
  documentType: sqliteText('document_type'),
  action: sqliteText('action').notNull(), // submit, approve, reject, return, cancel, reopen, escalate
  actionLabel: sqliteText('action_label'),
  fromState: sqliteText('from_state'),
  toState: sqliteText('to_state'),
  userId: sqliteText('user_id').notNull(),
  userName: sqliteText('user_name'),
  userRole: sqliteText('user_role'),
  comment: sqliteText('comment'),
  approvalLevel: sqliteInteger('approval_level'),
  ipAddress: sqliteText('ip_address'),
  userAgent: sqliteText('user_agent'),
  metadata: sqliteText('metadata'), // JSON: additional data
  auditLogId: sqliteText('audit_log_id'),
}, (table) => ({
  historyInstanceIdx: index('wf_history_instance_idx').on(table.instanceId),
  historyUserIdIdx: index('wf_history_user_idx').on(table.userId),
  historyActionIdx: index('wf_history_action_idx').on(table.action),
  historyTimestampIdx: index('wf_history_timestamp_idx').on(table.createdAt),
}));

export const pgWorkflowHistory = pgTableBase('shranix_workflow_history', {
  ...pgBase,
  instanceId: pgUuid('instance_id').notNull(),
  documentId: pgUuid('document_id'),
  documentType: pgText('document_type'),
  action: pgText('action').notNull(),
  actionLabel: pgText('action_label'),
  fromState: pgText('from_state'),
  toState: pgText('to_state'),
  userId: pgUuid('user_id').notNull(),
  userName: pgText('user_name'),
  userRole: pgText('user_role'),
  comment: pgText('comment'),
  approvalLevel: pgInteger('approval_level'),
  ipAddress: pgText('ip_address'),
  userAgent: pgText('user_agent'),
  metadata: pgText('metadata'),
  auditLogId: pgUuid('audit_log_id'),
}, (table) => ({
  historyInstanceIdx: pgIndex('wf_history_instance_idx').on(table.instanceId),
  historyUserIdIdx: pgIndex('wf_history_user_idx').on(table.userId),
  historyActionIdx: pgIndex('wf_history_action_idx').on(table.action),
  historyTimestampIdx: pgIndex('wf_history_timestamp_idx').on(table.createdAt),
}));

// ═══════════════════════════════════════════════════════════════
// 4. APPROVAL MATRIX — Configurable approval rules
// ═══════════════════════════════════════════════════════════════
export const sqliteApprovalMatrix = sqliteTableBase('shranix_approval_matrix', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  module: sqliteText('module').notNull(),
  documentType: sqliteText('document_type').notNull(),
  level: sqliteInteger('level').notNull().default(1),
  minAmount: sqliteReal('min_amount').notNull().default(0),
  maxAmount: sqliteReal('max_amount'),
  approvalType: sqliteText('approval_type').notNull().default('role'), // role, user, department, conditional
  approverRole: sqliteText('approver_role'),
  approverUserId: sqliteText('approver_user_id'),
  departmentId: sqliteText('department_id'),
  condition: sqliteText('condition'), // JSON condition expression
  isSequential: sqliteInteger('is_sequential', { mode: 'boolean' }).notNull().default(true),
  isParallel: sqliteInteger('is_parallel', { mode: 'boolean' }).notNull().default(false),
  requiredApprovals: sqliteInteger('required_approvals').notNull().default(1),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  priority: sqliteInteger('priority').notNull().default(0),
  createdBy: sqliteText('created_by'),
  updatedBy: sqliteText('updated_by'),
}, (table) => ({
  matrixModuleDocIdx: index('wf_matrix_module_doc_idx').on(table.module, table.documentType),
}));

export const pgApprovalMatrix = pgTableBase('shranix_approval_matrix', {
  ...pgBase,
  name: pgText('name').notNull(),
  module: pgText('module').notNull(),
  documentType: pgText('document_type').notNull(),
  level: pgInteger('level').notNull().default(1),
  minAmount: pgReal('min_amount').notNull().default(0),
  maxAmount: pgReal('max_amount'),
  approvalType: pgText('approval_type').notNull().default('role'),
  approverRole: pgText('approver_role'),
  approverUserId: pgUuid('approver_user_id'),
  departmentId: pgUuid('department_id'),
  condition: pgText('condition'),
  isSequential: pgBoolean('is_sequential').notNull().default(true),
  isParallel: pgBoolean('is_parallel').notNull().default(false),
  requiredApprovals: pgInteger('required_approvals').notNull().default(1),
  isActive: pgBoolean('is_active').notNull().default(true),
  priority: pgInteger('priority').notNull().default(0),
  createdBy: pgUuid('created_by'),
  updatedBy: pgUuid('updated_by'),
}, (table) => ({
  matrixModuleDocIdx: pgIndex('wf_matrix_module_doc_idx').on(table.module, table.documentType),
}));

// ═══════════════════════════════════════════════════════════════
// 5. WORKFLOW TASKS — Pending/MyApprovals/Completed tasks
// ═══════════════════════════════════════════════════════════════
export const sqliteWorkflowTasks = sqliteTableBase('shranix_workflow_tasks', {
  ...sqliteBase,
  instanceId: sqliteText('instance_id').notNull(),
  documentId: sqliteText('document_id'),
  documentType: sqliteText('document_type'),
  documentNumber: sqliteText('document_number'),
  module: sqliteText('module').notNull(),
  title: sqliteText('title').notNull(),
  description: sqliteText('description'),
  taskType: sqliteText('task_type').notNull().default('approval'), // approval, review, action, notification
  priority: sqliteText('priority').notNull().default('normal'),
  status: sqliteText('status').notNull().default('pending'), // pending, completed, rejected, delegated, cancelled
  assignedToId: sqliteText('assigned_to_id'),
  assignedRole: sqliteText('assigned_role'),
  assignedByName: sqliteText('assigned_by_name'),
  initiatedById: sqliteText('initiated_by_id'),
  initiatedByName: sqliteText('initiated_by_name'),
  approvalLevel: sqliteInteger('approval_level').notNull().default(1),
  dueDate: sqliteText('due_date'),
  completedAt: sqliteText('completed_at'),
  completedBy: sqliteText('completed_by'),
  delegatedFromId: sqliteText('delegated_from_id'),
  delegatedToId: sqliteText('delegated_to_id'),
  isOverdue: sqliteInteger('is_overdue', { mode: 'boolean' }).notNull().default(false),
  metadata: sqliteText('metadata'),
  createdBy: sqliteText('created_by'),
}, (table) => ({
  taskAssigneeIdx: index('wf_task_assignee_idx').on(table.assignedToId),
  taskStatusIdx: index('wf_task_status_idx').on(table.status),
  taskInstanceIdx: index('wf_task_instance_idx').on(table.instanceId),
  taskDueDateIdx: index('wf_task_due_date_idx').on(table.dueDate),
}));

export const pgWorkflowTasks = pgTableBase('shranix_workflow_tasks', {
  ...pgBase,
  instanceId: pgUuid('instance_id').notNull(),
  documentId: pgUuid('document_id'),
  documentType: pgText('document_type'),
  documentNumber: pgText('document_number'),
  module: pgText('module').notNull(),
  title: pgText('title').notNull(),
  description: pgText('description'),
  taskType: pgText('task_type').notNull().default('approval'),
  priority: pgText('priority').notNull().default('normal'),
  status: pgText('status').notNull().default('pending'),
  assignedToId: pgUuid('assigned_to_id'),
  assignedRole: pgText('assigned_role'),
  assignedByName: pgText('assigned_by_name'),
  initiatedById: pgUuid('initiated_by_id'),
  initiatedByName: pgText('initiated_by_name'),
  approvalLevel: pgInteger('approval_level').notNull().default(1),
  dueDate: pgTimestamp('due_date', { withTimezone: true }),
  completedAt: pgTimestamp('completed_at', { withTimezone: true }),
  completedBy: pgUuid('completed_by'),
  delegatedFromId: pgUuid('delegated_from_id'),
  delegatedToId: pgUuid('delegated_to_id'),
  isOverdue: pgBoolean('is_overdue').notNull().default(false),
  metadata: pgText('metadata'),
  createdBy: pgUuid('created_by'),
}, (table) => ({
  taskAssigneeIdx: pgIndex('wf_task_assignee_idx').on(table.assignedToId),
  taskStatusIdx: pgIndex('wf_task_status_idx').on(table.status),
  taskInstanceIdx: pgIndex('wf_task_instance_idx').on(table.instanceId),
  taskDueDateIdx: pgIndex('wf_task_due_date_idx').on(table.dueDate),
}));

// ═══════════════════════════════════════════════════════════════
// 6. NOTIFICATIONS — In-app + email/SMS/push ready
// ═══════════════════════════════════════════════════════════════
export const sqliteNotifications = sqliteTableBase('shranix_notifications', {
  ...sqliteBase,
  userId: sqliteText('user_id').notNull(),
  title: sqliteText('title').notNull(),
  message: sqliteText('message').notNull(),
  type: sqliteText('type').notNull().default('info'), // info, approval, escalation, reminder, system
  module: sqliteText('module'),
  documentId: sqliteText('document_id'),
  documentType: sqliteText('document_type'),
  instanceId: sqliteText('instance_id'),
  taskId: sqliteText('task_id'),
  isRead: sqliteInteger('is_read', { mode: 'boolean' }).notNull().default(false),
  readAt: sqliteText('read_at'),
  isEmailSent: sqliteInteger('is_email_sent', { mode: 'boolean' }).notNull().default(false),
  isSmsSent: sqliteInteger('is_sms_sent', { mode: 'boolean' }).notNull().default(false),
  isPushSent: sqliteInteger('is_push_sent', { mode: 'boolean' }).notNull().default(false),
  emailReady: sqliteText('email_ready'), // JSON: prepared email content
  smsReady: sqliteText('sms_ready'), // JSON: prepared SMS content
  pushReady: sqliteText('push_ready'), // JSON: prepared push content
  metadata: sqliteText('metadata'),
}, (table) => ({
  notifUserIdx: index('wf_notif_user_idx').on(table.userId),
  notifReadIdx: index('wf_notif_read_idx').on(table.isRead),
  notifUserReadIdx: index('wf_notif_user_read_idx').on(table.userId, table.isRead),
}));

export const pgNotifications = pgTableBase('shranix_notifications', {
  ...pgBase,
  userId: pgUuid('user_id').notNull(),
  title: pgText('title').notNull(),
  message: pgText('message').notNull(),
  type: pgText('type').notNull().default('info'),
  module: pgText('module'),
  documentId: pgUuid('document_id'),
  documentType: pgText('document_type'),
  instanceId: pgUuid('instance_id'),
  taskId: pgUuid('task_id'),
  isRead: pgBoolean('is_read').notNull().default(false),
  readAt: pgTimestamp('read_at', { withTimezone: true }),
  isEmailSent: pgBoolean('is_email_sent').notNull().default(false),
  isSmsSent: pgBoolean('is_sms_sent').notNull().default(false),
  isPushSent: pgBoolean('is_push_sent').notNull().default(false),
  emailReady: pgText('email_ready'),
  smsReady: pgText('sms_ready'),
  pushReady: pgText('push_ready'),
  metadata: pgText('metadata'),
}, (table) => ({
  notifUserIdx: pgIndex('wf_notif_user_idx').on(table.userId),
  notifReadIdx: pgIndex('wf_notif_read_idx').on(table.isRead),
  notifUserReadIdx: pgIndex('wf_notif_user_read_idx').on(table.userId, table.isRead),
}));

// ═══════════════════════════════════════════════════════════════
// 7. ESCALATION RULES — Time-based escalation config
// ═══════════════════════════════════════════════════════════════
export const sqliteEscalationRules = sqliteTableBase('shranix_escalation_rules', {
  ...sqliteBase,
  name: sqliteText('name').notNull(),
  module: sqliteText('module').notNull(),
  documentType: sqliteText('document_type').notNull(),
  triggerState: sqliteText('trigger_state').notNull(), // state that triggers escalation
  escalationType: sqliteText('escalation_type').notNull().default('time'), // time, manual
  timeoutHours: sqliteReal('timeout_hours').notNull().default(24),
  reminderIntervalHours: sqliteReal('reminder_interval_hours').default(0),
  maxReminders: sqliteInteger('max_reminders').default(3),
  escalateToRole: sqliteText('escalate_to_role'),
  escalateToUserId: sqliteText('escalate_to_user_id'),
  escalateToLevel: sqliteInteger('escalate_to_level').default(1),
  autoApproveAfterHours: sqliteReal('auto_approve_after_hours').default(0),
  isActive: sqliteInteger('is_active', { mode: 'boolean' }).notNull().default(true),
  notifyInitiator: sqliteInteger('notify_initiator', { mode: 'boolean' }).notNull().default(true),
  createdBy: sqliteText('created_by'),
}, (table) => ({
  escalationModuleIdx: index('wf_escalation_module_idx').on(table.module, table.documentType),
}));

export const pgEscalationRules = pgTableBase('shranix_escalation_rules', {
  ...pgBase,
  name: pgText('name').notNull(),
  module: pgText('module').notNull(),
  documentType: pgText('document_type').notNull(),
  triggerState: pgText('trigger_state').notNull(),
  escalationType: pgText('escalation_type').notNull().default('time'),
  timeoutHours: pgReal('timeout_hours').notNull().default(24),
  reminderIntervalHours: pgReal('reminder_interval_hours').default(0),
  maxReminders: pgInteger('max_reminders').default(3),
  escalateToRole: pgText('escalate_to_role'),
  escalateToUserId: pgUuid('escalate_to_user_id'),
  escalateToLevel: pgInteger('escalate_to_level').default(1),
  autoApproveAfterHours: pgReal('auto_approve_after_hours').default(0),
  isActive: pgBoolean('is_active').notNull().default(true),
  notifyInitiator: pgBoolean('notify_initiator').notNull().default(true),
  createdBy: pgUuid('created_by'),
}, (table) => ({
  escalationModuleIdx: pgIndex('wf_escalation_module_idx').on(table.module, table.documentType),
}));

// ═══════════════════════════════════════════════════════════════
// 8. COMMENTS — Universal comments with mentions and attachments
// ═══════════════════════════════════════════════════════════════
export const sqliteWorkflowComments = sqliteTableBase('shranix_workflow_comments', {
  ...sqliteBase,
  instanceId: sqliteText('instance_id').notNull(),
  documentId: sqliteText('document_id'),
  documentType: sqliteText('document_type'),
  userId: sqliteText('user_id').notNull(),
  userName: sqliteText('user_name'),
  commentType: sqliteText('comment_type').notNull().default('comment'), // comment, approve, reject, return, note
  message: sqliteText('message').notNull(),
  mentions: sqliteText('mentions'), // JSON array of mentioned user IDs
  attachmentUrl: sqliteText('attachment_url'),
  attachmentName: sqliteText('attachment_name'),
  isInternal: sqliteInteger('is_internal', { mode: 'boolean' }).notNull().default(false),
  metadata: sqliteText('metadata'),
}, (table) => ({
  commentInstanceIdx: index('wf_comment_instance_idx').on(table.instanceId),
  commentUserIdx: index('wf_comment_user_idx').on(table.userId),
}));

export const pgWorkflowComments = pgTableBase('shranix_workflow_comments', {
  ...pgBase,
  instanceId: pgUuid('instance_id').notNull(),
  documentId: pgUuid('document_id'),
  documentType: pgText('document_type'),
  userId: pgUuid('user_id').notNull(),
  userName: pgText('user_name'),
  commentType: pgText('comment_type').notNull().default('comment'),
  message: pgText('message').notNull(),
  mentions: pgText('mentions'),
  attachmentUrl: pgText('attachment_url'),
  attachmentName: pgText('attachment_name'),
  isInternal: pgBoolean('is_internal').notNull().default(false),
  metadata: pgText('metadata'),
}, (table) => ({
  commentInstanceIdx: pgIndex('wf_comment_instance_idx').on(table.instanceId),
  commentUserIdx: pgIndex('wf_comment_user_idx').on(table.userId),
}));
