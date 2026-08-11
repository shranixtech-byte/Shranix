import crypto from 'node:crypto';

import {
  pgTable as pgTableBase,
  text as pgText,
  integer as pgInteger,
  uuid as pgUuid,
  timestamp as pgTimestamp,
  boolean as pgBoolean,
  real as pgReal,
  uniqueIndex as pgUniqueIndex,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable as sqliteTableBase,
  text as sqliteText,
  integer as sqliteInteger,
  real as sqliteReal,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

// ── SQLite base ──────────────────────────────────────────
const sqliteBase = {
  id: sqliteText('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: sqliteText('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: sqliteText('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString()),
  deletedAt: sqliteText('deleted_at'),
  isDeleted: sqliteInteger('is_deleted', { mode: 'boolean' }).notNull().default(false),
};

// ── PostgreSQL base ──────────────────────────────────────
const pgBase = {
  id: pgUuid('id').primaryKey().defaultRandom(),
  createdAt: pgTimestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: pgTimestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: pgTimestamp('deleted_at', { withTimezone: true }),
  isDeleted: pgBoolean('is_deleted').notNull().default(false),
};

// ═════════════════════════════════════════════════════════
// LEADS
// ═════════════════════════════════════════════════════════
export const sqliteLeads = sqliteTableBase(
  'shranix_leads',
  {
    ...sqliteBase,
    leadNumber: sqliteText('lead_number').notNull(),
    leadName: sqliteText('lead_name').notNull(),
    companyName: sqliteText('company_name'),
    contactPerson: sqliteText('contact_person'),
    mobile: sqliteText('mobile'),
    altMobile: sqliteText('alt_mobile'),
    whatsapp: sqliteText('whatsapp'),
    email: sqliteText('email'),
    address: sqliteText('address'),
    village: sqliteText('village'),
    taluka: sqliteText('taluka'),
    district: sqliteText('district'),
    state: sqliteText('state'),
    pincode: sqliteText('pincode'),
    source: sqliteText('source').notNull().default('walk-in'),
    leadType: sqliteText('lead_type').notNull().default('individual'),
    assignedTo: sqliteText('assigned_to'),
    assignedBy: sqliteText('assigned_by'),
    assignedAt: sqliteText('assigned_at'),
    expectedValue: sqliteReal('expected_value').notNull().default(0),
    expectedCloseDate: sqliteText('expected_close_date'),
    priority: sqliteText('priority').notNull().default('medium'),
    status: sqliteText('status').notNull().default('new'),
    score: sqliteReal('score').notNull().default(0),
    scoreLevel: sqliteText('score_level').notNull().default('low'),
    notes: sqliteText('notes'),
    convertedToCustomer: sqliteInteger('converted_to_customer', { mode: 'boolean' })
      .notNull()
      .default(false),
    convertedCustomerId: sqliteText('converted_customer_id'),
    convertedAt: sqliteText('converted_at'),
    wonDate: sqliteText('won_date'),
    wonValue: sqliteReal('won_value').notNull().default(0),
    lostReason: sqliteText('lost_reason'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    leadNumberIdx: uniqueIndex('crm_lead_number_idx').on(table.leadNumber),
    leadStatusIdx: index('crm_lead_status_idx').on(table.status),
    leadAssignedIdx: index('crm_lead_assigned_idx').on(table.assignedTo),
  }),
);

export const pgLeads = pgTableBase(
  'shranix_leads',
  {
    ...pgBase,
    leadNumber: pgText('lead_number').notNull(),
    leadName: pgText('lead_name').notNull(),
    companyName: pgText('company_name'),
    contactPerson: pgText('contact_person'),
    mobile: pgText('mobile'),
    altMobile: pgText('alt_mobile'),
    whatsapp: pgText('whatsapp'),
    email: pgText('email'),
    address: pgText('address'),
    village: pgText('village'),
    taluka: pgText('taluka'),
    district: pgText('district'),
    state: pgText('state'),
    pincode: pgText('pincode'),
    source: pgText('source').notNull().default('walk-in'),
    leadType: pgText('lead_type').notNull().default('individual'),
    assignedTo: pgUuid('assigned_to'),
    assignedBy: pgUuid('assigned_by'),
    assignedAt: pgTimestamp('assigned_at', { withTimezone: true }),
    expectedValue: pgReal('expected_value').notNull().default(0),
    expectedCloseDate: pgTimestamp('expected_close_date', { withTimezone: true }),
    priority: pgText('priority').notNull().default('medium'),
    status: pgText('status').notNull().default('new'),
    score: pgReal('score').notNull().default(0),
    scoreLevel: pgText('score_level').notNull().default('low'),
    notes: pgText('notes'),
    convertedToCustomer: pgBoolean('converted_to_customer').notNull().default(false),
    convertedCustomerId: pgUuid('converted_customer_id'),
    convertedAt: pgTimestamp('converted_at', { withTimezone: true }),
    wonDate: pgTimestamp('won_date', { withTimezone: true }),
    wonValue: pgReal('won_value').notNull().default(0),
    lostReason: pgText('lost_reason'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    leadNumberIdx: pgUniqueIndex('crm_lead_number_idx').on(table.leadNumber),
    leadStatusIdx: pgIndex('crm_lead_status_idx').on(table.status),
    leadAssignedIdx: pgIndex('crm_lead_assigned_idx').on(table.assignedTo),
  }),
);

// ═════════════════════════════════════════════════════════
// OPPORTUNITIES
// ═════════════════════════════════════════════════════════
export const sqliteOpportunities = sqliteTableBase(
  'shranix_opportunities',
  {
    ...sqliteBase,
    opportunityNumber: sqliteText('opportunity_number').notNull(),
    name: sqliteText('name').notNull(),
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    estimatedValue: sqliteReal('estimated_value').notNull().default(0),
    probability: sqliteReal('probability').notNull().default(0),
    weightedValue: sqliteReal('weighted_value').notNull().default(0),
    expectedCloseDate: sqliteText('expected_close_date'),
    salespersonId: sqliteText('salesperson_id'),
    stage: sqliteText('stage').notNull().default('lead'),
    status: sqliteText('status').notNull().default('open'),
    notes: sqliteText('notes'),
    wonAt: sqliteText('won_at'),
    wonValue: sqliteReal('won_value').notNull().default(0),
    lostReason: sqliteText('lost_reason'),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    oppNumberIdx: uniqueIndex('crm_opp_number_idx').on(table.opportunityNumber),
    oppStageIdx: index('crm_opp_stage_idx').on(table.stage),
  }),
);

export const pgOpportunities = pgTableBase(
  'shranix_opportunities',
  {
    ...pgBase,
    opportunityNumber: pgText('opportunity_number').notNull(),
    name: pgText('name').notNull(),
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    estimatedValue: pgReal('estimated_value').notNull().default(0),
    probability: pgReal('probability').notNull().default(0),
    weightedValue: pgReal('weighted_value').notNull().default(0),
    expectedCloseDate: pgTimestamp('expected_close_date', { withTimezone: true }),
    salespersonId: pgUuid('salesperson_id'),
    stage: pgText('stage').notNull().default('lead'),
    status: pgText('status').notNull().default('open'),
    notes: pgText('notes'),
    wonAt: pgTimestamp('won_at', { withTimezone: true }),
    wonValue: pgReal('won_value').notNull().default(0),
    lostReason: pgText('lost_reason'),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    oppNumberIdx: pgUniqueIndex('crm_opp_number_idx').on(table.opportunityNumber),
    oppStageIdx: pgIndex('crm_opp_stage_idx').on(table.stage),
  }),
);

// ═════════════════════════════════════════════════════════
// FOLLOW-UPS
// ═════════════════════════════════════════════════════════
export const sqliteFollowUps = sqliteTableBase(
  'shranix_follow_ups',
  {
    ...sqliteBase,
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    assignedTo: sqliteText('assigned_to'),
    followUpType: sqliteText('follow_up_type').notNull().default('phone'),
    scheduledAt: sqliteText('scheduled_at').notNull(),
    priority: sqliteText('priority').notNull().default('medium'),
    purpose: sqliteText('purpose'),
    notes: sqliteText('notes'),
    outcome: sqliteText('outcome'),
    nextFollowUpAt: sqliteText('next_follow_up_at'),
    status: sqliteText('status').notNull().default('scheduled'),
    completedAt: sqliteText('completed_at'),
    completedBy: sqliteText('completed_by'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    fuScheduledIdx: index('crm_fu_scheduled_idx').on(table.scheduledAt),
    fuStatusIdx: index('crm_fu_status_idx').on(table.status),
    fuLeadIdx: index('crm_fu_lead_idx').on(table.leadId),
  }),
);

export const pgFollowUps = pgTableBase(
  'shranix_follow_ups',
  {
    ...pgBase,
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    assignedTo: pgUuid('assigned_to'),
    followUpType: pgText('follow_up_type').notNull().default('phone'),
    scheduledAt: pgTimestamp('scheduled_at', { withTimezone: true }).notNull(),
    priority: pgText('priority').notNull().default('medium'),
    purpose: pgText('purpose'),
    notes: pgText('notes'),
    outcome: pgText('outcome'),
    nextFollowUpAt: pgTimestamp('next_follow_up_at', { withTimezone: true }),
    status: pgText('status').notNull().default('scheduled'),
    completedAt: pgTimestamp('completed_at', { withTimezone: true }),
    completedBy: pgUuid('completed_by'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    fuScheduledIdx: pgIndex('crm_fu_scheduled_idx').on(table.scheduledAt),
    fuStatusIdx: pgIndex('crm_fu_status_idx').on(table.status),
    fuLeadIdx: pgIndex('crm_fu_lead_idx').on(table.leadId),
  }),
);

// ═════════════════════════════════════════════════════════
// CRM TASKS
// ═════════════════════════════════════════════════════════
export const sqliteCrmTasks = sqliteTableBase(
  'shranix_crm_tasks',
  {
    ...sqliteBase,
    title: sqliteText('title').notNull(),
    description: sqliteText('description'),
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    assignedTo: sqliteText('assigned_to'),
    priority: sqliteText('priority').notNull().default('medium'),
    dueDate: sqliteText('due_date'),
    status: sqliteText('status').notNull().default('open'),
    completedAt: sqliteText('completed_at'),
    completedBy: sqliteText('completed_by'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    taskDueIdx: index('crm_task_due_idx').on(table.dueDate),
    taskStatusIdx: index('crm_task_status_idx').on(table.status),
  }),
);

export const pgCrmTasks = pgTableBase(
  'shranix_crm_tasks',
  {
    ...pgBase,
    title: pgText('title').notNull(),
    description: pgText('description'),
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    assignedTo: pgUuid('assigned_to'),
    priority: pgText('priority').notNull().default('medium'),
    dueDate: pgTimestamp('due_date', { withTimezone: true }),
    status: pgText('status').notNull().default('open'),
    completedAt: pgTimestamp('completed_at', { withTimezone: true }),
    completedBy: pgUuid('completed_by'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    taskDueIdx: pgIndex('crm_task_due_idx').on(table.dueDate),
    taskStatusIdx: pgIndex('crm_task_status_idx').on(table.status),
  }),
);

// ═════════════════════════════════════════════════════════
// CALL LOGS
// ═════════════════════════════════════════════════════════
export const sqliteCallLogs = sqliteTableBase(
  'shranix_call_logs',
  {
    ...sqliteBase,
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    phone: sqliteText('phone'),
    direction: sqliteText('direction').notNull().default('outgoing'),
    callDate: sqliteText('call_date').notNull(),
    callTime: sqliteText('call_time'),
    durationSeconds: sqliteInteger('duration_seconds').notNull().default(0),
    purpose: sqliteText('purpose'),
    outcome: sqliteText('outcome'),
    notes: sqliteText('notes'),
    nextFollowUpAt: sqliteText('next_follow_up_at'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    callLeadIdx: index('crm_call_lead_idx').on(table.leadId),
    callDateIdx: index('crm_call_date_idx').on(table.callDate),
  }),
);

export const pgCallLogs = pgTableBase(
  'shranix_call_logs',
  {
    ...pgBase,
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    phone: pgText('phone'),
    direction: pgText('direction').notNull().default('outgoing'),
    callDate: pgTimestamp('call_date', { withTimezone: true }).notNull(),
    callTime: pgText('call_time'),
    durationSeconds: pgInteger('duration_seconds').notNull().default(0),
    purpose: pgText('purpose'),
    outcome: pgText('outcome'),
    notes: pgText('notes'),
    nextFollowUpAt: pgTimestamp('next_follow_up_at', { withTimezone: true }),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    callLeadIdx: pgIndex('crm_call_lead_idx').on(table.leadId),
    callDateIdx: pgIndex('crm_call_date_idx').on(table.callDate),
  }),
);

// ═════════════════════════════════════════════════════════
// MEETINGS
// ═════════════════════════════════════════════════════════
export const sqliteMeetings = sqliteTableBase(
  'shranix_meetings',
  {
    ...sqliteBase,
    title: sqliteText('title').notNull(),
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    participants: sqliteText('participants'),
    meetingDate: sqliteText('meeting_date').notNull(),
    meetingTime: sqliteText('meeting_time'),
    location: sqliteText('location'),
    purpose: sqliteText('purpose'),
    notes: sqliteText('notes'),
    outcome: sqliteText('outcome'),
    nextAction: sqliteText('next_action'),
    followUpAt: sqliteText('follow_up_at'),
    status: sqliteText('status').notNull().default('scheduled'),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    mtgDateIdx: index('crm_mtg_date_idx').on(table.meetingDate),
  }),
);

export const pgMeetings = pgTableBase(
  'shranix_meetings',
  {
    ...pgBase,
    title: pgText('title').notNull(),
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    participants: pgText('participants'),
    meetingDate: pgTimestamp('meeting_date', { withTimezone: true }).notNull(),
    meetingTime: pgText('meeting_time'),
    location: pgText('location'),
    purpose: pgText('purpose'),
    notes: pgText('notes'),
    outcome: pgText('outcome'),
    nextAction: pgText('next_action'),
    followUpAt: pgTimestamp('follow_up_at', { withTimezone: true }),
    status: pgText('status').notNull().default('scheduled'),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    mtgDateIdx: pgIndex('crm_mtg_date_idx').on(table.meetingDate),
  }),
);

// ═════════════════════════════════════════════════════════
// CRM NOTES
// ═════════════════════════════════════════════════════════
export const sqliteCrmNotes = sqliteTableBase(
  'shranix_crm_notes',
  {
    ...sqliteBase,
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    opportunityId: sqliteText('opportunity_id'),
    quotationId: sqliteText('quotation_id'),
    salesOrderId: sqliteText('sales_order_id'),
    note: sqliteText('note').notNull(),
    isPrivate: sqliteInteger('is_private', { mode: 'boolean' }).notNull().default(false),
    createdBy: sqliteText('created_by'),
    updatedBy: sqliteText('updated_by'),
  },
  (table) => ({
    noteLeadIdx: index('crm_note_lead_idx').on(table.leadId),
    noteCustomerIdx: index('crm_note_customer_idx').on(table.customerId),
  }),
);

export const pgCrmNotes = pgTableBase(
  'shranix_crm_notes',
  {
    ...pgBase,
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    opportunityId: pgUuid('opportunity_id'),
    quotationId: pgUuid('quotation_id'),
    salesOrderId: pgUuid('sales_order_id'),
    note: pgText('note').notNull(),
    isPrivate: pgBoolean('is_private').notNull().default(false),
    createdBy: pgUuid('created_by'),
    updatedBy: pgUuid('updated_by'),
  },
  (table) => ({
    noteLeadIdx: pgIndex('crm_note_lead_idx').on(table.leadId),
    noteCustomerIdx: pgIndex('crm_note_customer_idx').on(table.customerId),
  }),
);

// ═════════════════════════════════════════════════════════
// LEAD ACTIVITIES (unified timeline)
// ═════════════════════════════════════════════════════════
export const sqliteLeadActivities = sqliteTableBase(
  'shranix_lead_activities',
  {
    ...sqliteBase,
    leadId: sqliteText('lead_id'),
    customerId: sqliteText('customer_id'),
    activityType: sqliteText('activity_type').notNull(),
    title: sqliteText('title'),
    description: sqliteText('description'),
    referenceType: sqliteText('reference_type'),
    referenceId: sqliteText('reference_id'),
    userId: sqliteText('user_id'),
    happenedAt: sqliteText('happened_at').notNull(),
    createdBy: sqliteText('created_by'),
  },
  (table) => ({
    actLeadIdx: index('crm_act_lead_idx').on(table.leadId),
    actCustomerIdx: index('crm_act_customer_idx').on(table.customerId),
    actHappenedIdx: index('crm_act_happened_idx').on(table.happenedAt),
  }),
);

export const pgLeadActivities = pgTableBase(
  'shranix_lead_activities',
  {
    ...pgBase,
    leadId: pgUuid('lead_id'),
    customerId: pgUuid('customer_id'),
    activityType: pgText('activity_type').notNull(),
    title: pgText('title'),
    description: pgText('description'),
    referenceType: pgText('reference_type'),
    referenceId: pgUuid('reference_id'),
    userId: pgUuid('user_id'),
    happenedAt: pgTimestamp('happened_at', { withTimezone: true }).notNull(),
    createdBy: pgUuid('created_by'),
  },
  (table) => ({
    actLeadIdx: pgIndex('crm_act_lead_idx').on(table.leadId),
    actCustomerIdx: pgIndex('crm_act_customer_idx').on(table.customerId),
    actHappenedIdx: pgIndex('crm_act_happened_idx').on(table.happenedAt),
  }),
);

// ═════════════════════════════════════════════════════════
// LEAD CONVERSIONS
// ═════════════════════════════════════════════════════════
export const sqliteLeadConversions = sqliteTableBase(
  'shranix_lead_conversions',
  {
    ...sqliteBase,
    leadId: sqliteText('lead_id').notNull(),
    customerId: sqliteText('customer_id').notNull(),
    customerCode: sqliteText('customer_code'),
    matchMethod: sqliteText('match_method').notNull().default('new'),
    matchedCustomerId: sqliteText('matched_customer_id'),
    convertedBy: sqliteText('converted_by'),
    convertedAt: sqliteText('converted_at').notNull(),
    details: sqliteText('details'),
  },
  (table) => ({
    convLeadIdx: uniqueIndex('crm_conv_lead_idx').on(table.leadId),
  }),
);

export const pgLeadConversions = pgTableBase(
  'shranix_lead_conversions',
  {
    ...pgBase,
    leadId: pgUuid('lead_id').notNull(),
    customerId: pgUuid('customer_id').notNull(),
    customerCode: pgText('customer_code'),
    matchMethod: pgText('match_method').notNull().default('new'),
    matchedCustomerId: pgUuid('matched_customer_id'),
    convertedBy: pgUuid('converted_by'),
    convertedAt: pgTimestamp('converted_at', { withTimezone: true }).notNull(),
    details: pgText('details'),
  },
  (table) => ({
    convLeadIdx: pgUniqueIndex('crm_conv_lead_idx').on(table.leadId),
  }),
);
